"""
ai.rio.br — v0 takeoff engine for BR low-voltage / fire-protection plantas.

Counts devices from vector PDFs plotted from AutoCAD/Revit by reading the text
callouts each device carries (no computer vision). Tuned to ONE project's legend
via RULES below — that is intentional for v0 ("learn each project's legend").

Pipeline:  extract callout words -> count by device rule -> pin overlay -> report

Coordinate note: these sheets are often rotated (this one is 270deg). PyMuPDF
returns word coords in the *unrotated* page frame and the renderer rotates page
content + any shapes we draw together, so we work entirely in native coords and
let the render apply rotation. Do NOT pre-transform to display space.

Usage:
    python count.py <plan.pdf> [--out OUTDIR] [--dpi-scale 1.6]
"""
from __future__ import annotations

import argparse
import json
import math
import re
from dataclasses import dataclass, field
from pathlib import Path

import fitz  # PyMuPDF


# --- Legend rules (tuned to SIA-COM-INC SENAC sheet) --------------------------
# Each device is identified by a word that appears in its callout block.
# `subtype` optionally refines the count by a sibling word on the same line.

@dataclass
class DeviceRule:
    key: str                 # machine name
    label: str               # human label (pt-BR)
    color: tuple             # RGB 0..1 for the overlay pin
    radius: float            # pin radius in native pts
    match: "callable"        # (word_text) -> bool ; anchors one instance
    subtype_words: tuple = ()  # words that, if found near anchor, split the count
    spec: str = ""           # material spec from legend (for procurement)
    subtype_specs: dict = field(default_factory=dict)  # per-subtype spec override


# Material specs read from THIS sheet's legend (tuned, like the count rules).
# Carried into the report so procurement can pre-process. Stage-1 Intel would
# later extract these per-file instead of hardcoding.
RULES: list[DeviceRule] = [
    DeviceRule(
        key="extintor",
        label="Extintor portátil",
        color=(0.85, 0.0, 0.0),
        radius=22,
        match=lambda t: t == "6Kg",            # every extintor callout carries "<TIPO> 6Kg"
        subtype_words=("ABC", "CO2"),
        spec="6 kg · KIDDE ou equivalente",
        subtype_specs={
            "ABC": "Fosfato monoamônico 55 (A,B,C) · 6 kg · 3-A:20-B:C · KIDDE ou equiv.",
            "CO2": "Gás carbônico (CO₂) · 6 kg · 5-B:C · KIDDE ou equiv.",
        },
    ),
    DeviceRule(
        key="hidrante",
        label="Hidrante / caixa de incêndio",
        color=(0.0, 0.0, 0.85),
        radius=22,
        match=lambda t: bool(re.fullmatch(r"HID-\d+", t)),
        spec="Caixa de incêndio · tubulação ø65 (DN65)",
    ),
    DeviceRule(
        key="sinal_extintor",
        label="Sinalização extintor (cód 23)",
        color=(0.0, 0.6, 0.0),
        radius=12,
        match=lambda t: t == "23",
        spec="Placa 150×150 mm · fundo vermelho · pictograma fotoluminescente",
    ),
    DeviceRule(
        key="sinal_hidrante",
        label="Sinalização hidrante (cód 24A)",
        color=(1.0, 0.5, 0.0),
        radius=12,
        match=lambda t: t == "24A",
        spec="Abrigo de mangueira/hidrante · 150×150 mm · fundo vermelho · fotoluminescente",
    ),
]

# Which signage covers which equipment, for the coverage check.
COVERAGE = [
    ("sinal_extintor", "extintor", 130.0),   # cód 23 should sit near an extintor
    ("sinal_hidrante", "hidrante", 170.0),   # cód 24A should sit near a hidrante
]


# --- Stage-1 Intel bridge -----------------------------------------------------
# Palette for pins when rules come from Intel (cosmetic only).
_INTEL_PALETTE = [(0.85, 0, 0), (0, 0, 0.85), (0, 0.6, 0), (1, 0.5, 0),
                  (0.6, 0, 0.6), (0, 0.6, 0.6)]


def rules_from_intel(ruleset: dict) -> list[DeviceRule]:
    """Convert a Stage-1 Intel ruleset (intel.derive_ruleset) into DeviceRule objects.

    Only the device-count mapping is taken from Intel; pin color/radius are cosmetic
    defaults. pipe_layer/scale from Intel are NOT used — metragem keeps count.py's
    verified P-PIPE + detect_scale (Intel's layer/scale guesses are still unstable).
    """
    out = []
    for i, d in enumerate(ruleset["devices"]):
        if d["match_kind"] == "regex":
            rx = re.compile(d["match_token"])
            match = lambda t, rx=rx: bool(rx.fullmatch(t))
        else:
            match = lambda t, tok=d["match_token"]: t == tok
        out.append(DeviceRule(
            key=d["key"],
            label=d["label"],
            color=_INTEL_PALETTE[i % len(_INTEL_PALETTE)],
            radius=18,
            match=match,
            subtype_words=tuple(d.get("subtype_tokens") or ()),
            spec=d.get("spec", ""),
            subtype_specs={s["subtype"]: s["spec"] for s in d.get("subtype_specs") or []},
        ))
    return out


# --- Core ---------------------------------------------------------------------

@dataclass
class Instance:
    key: str
    subtype: str | None
    center: tuple            # (x, y) native pts
    tag: str                 # the matched word


@dataclass
class Takeoff:
    source: str
    page_rect: tuple
    rotation: int
    instances: list[Instance] = field(default_factory=list)

    def by_key(self, key: str) -> list[Instance]:
        return [i for i in self.instances if i.key == key]


def _subtype(word, words, choices, r: float = 45.0) -> str | None:
    """Nearest choice word within `r` native pts. Rotation-agnostic (these sheets
    are rotated, so callout words sit on a vertical axis — Euclidean is safest)."""
    wc = ((word[0] + word[2]) / 2, (word[1] + word[3]) / 2)
    best, best_d = None, r
    for w in words:
        if w[4] not in choices:
            continue
        d = math.hypot((w[0] + w[2]) / 2 - wc[0], (w[1] + w[3]) / 2 - wc[1])
        if d < best_d:
            best, best_d = w[4], d
    return best


def extract(pdf_path: str, page_index: int = 0,
            rules: list[DeviceRule] | None = None) -> Takeoff:
    rules = rules if rules is not None else RULES
    doc = fitz.open(pdf_path)
    page = doc[page_index]
    words = page.get_text("words")
    take = Takeoff(
        source=Path(pdf_path).name,
        page_rect=(page.rect.width, page.rect.height),
        rotation=page.rotation,
    )
    for rule in rules:
        for w in words:
            if not rule.match(w[4]):
                continue
            st = _subtype(w, words, rule.subtype_words) if rule.subtype_words else None
            take.instances.append(
                Instance(
                    key=rule.key,
                    subtype=st,
                    center=((w[0] + w[2]) / 2, (w[1] + w[3]) / 2),
                    tag=w[4],
                )
            )
    doc.close()
    return take


def _dist(a, b) -> float:
    return math.hypot(a[0] - b[0], a[1] - b[1])


def coverage_report(take: Takeoff) -> list[dict]:
    """Conservative check: does every equipment have its sign? Report extras as info,
    not as defects — extra wall/pillar signs for the same equipment are legitimate."""
    out = []
    for sign_key, equip_key, r in COVERAGE:
        signs = take.by_key(sign_key)
        equip = take.by_key(equip_key)
        equip_centers = [e.center for e in equip]
        sign_centers = [s.center for s in signs]
        equip_no_sign = [
            e.center for e in equip
            if not equip_centers or min((_dist(e.center, s) for s in sign_centers), default=9e9) > r
        ]
        signs_no_equip = [
            s.center for s in signs
            if not equip_centers or min((_dist(s.center, e) for e in equip_centers), default=9e9) > r
        ]
        out.append({
            "equipment": equip_key,
            "signage": sign_key,
            "radius_pts": r,
            "equipment_count": len(equip),
            "signage_count": len(signs),
            "equipment_without_signage": len(equip_no_sign),     # the real defect signal
            "signage_without_equipment_nearby": len(signs_no_equip),  # likely 2nd signs; review
            "_equip_no_sign_pts": [[round(x), round(y)] for x, y in equip_no_sign],
            "_orphan_sign_pts": [[round(x), round(y)] for x, y in signs_no_equip],
        })
    return out


PIPE_LAYER = "P-PIPE"
SCALE_DENOM = 75            # "ESC.: 1/75" printed on the sheet (TRUSTED, not yet calibrated)
M_PER_PT = (25.4 / 72.0) * SCALE_DENOM / 1000.0   # paper points -> real metres

# Riser (prumada) estimate. Floor height comes from the CORTE level marks
# (1ºPAV: +5.61 → +9.75 = 4.14 m, measured empirically, corte scale 1:50).
# Project rule (Carlos): OVER-estimate beats under-estimate — leftover material is
# cheaper than aditivos mid-project. So riser metres use full floor height per marker.
FLOOR_HEIGHT_M = 4.14
RISER_TOKENS = ("DESCE", "SOBE")
PLAN_X_MAX_DISP = 3550     # display-x cutoff: plan vs legend/title block (generous, leans high)


def riser_metragem(pdf_path: str, floor_height_m: float = FLOOR_HEIGHT_M,
                   page_index: int = 0) -> dict:
    """Vertical pipe (prumadas) = riser-marker count × floor height.

    The corte geometry is fragmented/duplicated and unreliable to sum directly, so
    we count DESCE/SOBE markers on the PLAN (legend excluded by display position)
    and multiply by the floor height read from the corte level marks. Conservative
    by design — counts each marker at full floor height.
    """
    doc = fitz.open(pdf_path)
    page = doc[page_index]
    rm = page.rotation_matrix
    count = 0
    for w in page.get_text("words"):
        if w[4] not in RISER_TOKENS:
            continue
        c = fitz.Point((w[0] + w[2]) / 2, (w[1] + w[3]) / 2) * rm  # -> display coords
        if c.x < PLAN_X_MAX_DISP:   # on the plan, not in the legend
            count += 1
    doc.close()
    return {
        "riser_markers": count,
        "floor_height_m": floor_height_m,
        "floor_height_source": "corte level marks (+5.61→+9.75=4.14m, esc 1:50 empirical)",
        "riser_run_m": round(count * floor_height_m),
        "method": "marker_count × floor_height (conservativo: altura cheia por marcador)",
    }


def _seg_lengths(items) -> list[float]:
    out = []
    for it in items:
        if it[0] == "l":
            out.append(math.hypot(it[1].x - it[2].x, it[1].y - it[2].y))
        elif it[0] == "c":
            q = it[1:]
            out += [math.hypot(q[i].x - q[i + 1].x, q[i].y - q[i + 1].y) for i in range(len(q) - 1)]
    return out


def _m_per_pt(denom: int) -> float:
    return (25.4 / 72.0) * denom / 1000.0


def detect_scale(pdf_path: str, page_index: int = 0) -> dict:
    """Read the plot scale off the sheet, propose it, flag for HUMAN confirmation.

    Scale is one number that multiplies every metre — wrong scale = silently wrong
    everything. So the tool DETECTS + PROPOSES, the human RATIFIES. Resolution order:
    (1) stated ratio in sheet text (ESC: 1/N), (2) fallback CAD default 1:1. Always
    returns needs_confirmation=True; the human owns the final call.
    """
    page = fitz.open(pdf_path)[page_index]
    txt = page.get_text("text")
    found = re.findall(r'ESC[.:]?\s*1\s*[/:]\s*(\d{1,3})|(?:^|\s)1\s*[/:]\s*(\d{2,3})(?:\s|$)', txt)
    denoms = [int(a or b) for a, b in found if (a or b)]
    if denoms:
        # most common stated ratio wins; list all distinct as evidence
        denom = max(set(denoms), key=denoms.count)
        distinct = sorted(set(denoms))
        return {
            "denom": denom,
            "m_per_pt": _m_per_pt(denom),
            "proposed": f"1:{denom}",
            "source": "lido do carimbo/texto da prancha (ESC)",
            "candidates": [f"1:{d}" for d in distinct],
            "ambiguous": len(distinct) > 1,
            "needs_confirmation": True,
        }
    return {
        "denom": 1,
        "m_per_pt": _m_per_pt(1),
        "proposed": "1:1",
        "source": "NENHUMA escala no texto — fallback CAD 1:1 (provavelmente ERRADO p/ prancha plotada)",
        "candidates": [],
        "ambiguous": False,
        "needs_confirmation": True,
    }


def pipe_metragem(pdf_path: str, page_index: int = 0, min_seg_pt: float = 20.0,
                  scale_denom: int | None = None) -> dict:
    """Linear metres of pipe on the P-PIPE CAD layer.

    Pipe is drawn as double parallel lines, so a paired run is counted ÷2. Returns
    a RANGE, never a single number. Scale is auto-detected (override via scale_denom)
    and flagged for human confirmation; fittings and vertical risers are excluded.
    """
    sc = detect_scale(pdf_path, page_index)
    denom = scale_denom if scale_denom else sc["denom"]
    mpp = _m_per_pt(denom)
    doc = fitz.open(pdf_path)
    page = doc[page_index]
    diameters = sorted(set(re.findall(r'ø\s*\d+|DN\s*\d+', page.get_text("text"))))
    segs = []  # (a, b, length) for long segments on the pipe layer
    for d in page.get_drawings():
        if (d.get("layer") or "") != PIPE_LAYER:
            continue
        for it in d["items"]:
            if it[0] == "l":
                a, b = it[1], it[2]
                L = math.hypot(a.x - b.x, a.y - b.y)
                if L >= min_seg_pt:
                    segs.append((a, b, L))
    doc.close()

    def ang(a, b):
        return math.atan2(b.y - a.y, b.x - a.x) % math.pi

    def mid(a, b):
        return ((a.x + b.x) / 2, (a.y + b.y) / 2)

    paired = unpaired = 0.0
    for i, (a, b, L) in enumerate(segs):
        A, m = ang(a, b), mid(a, b)
        partner = False
        for j, (c, d, L2) in enumerate(segs):
            if i == j or abs(L - L2) > 3:
                continue
            if min(abs(ang(c, d) - A), math.pi - abs(ang(c, d) - A)) > 0.03:
                continue
            m2 = mid(c, d)
            if 1.0 < math.hypot(m[0] - m2[0], m[1] - m2[1]) < 12.0:  # parallel pipe-wall gap
                partner = True
                break
        (paired, unpaired) = (paired + L, unpaired) if partner else (paired, unpaired + L)

    paired_m, unpaired_m = paired * mpp, unpaired * mpp
    central = paired_m / 2 + unpaired_m   # double-line pairs ÷2, singles once
    return {
        "layer": PIPE_LAYER,
        "scale": sc,                       # detected + needs_confirmation (human owns it)
        "diameters": [d.replace(" ", "") for d in diameters],
        "horizontal_run_m_low": round(central * 0.88),
        "horizontal_run_m_central": round(central),
        "horizontal_run_m_high": round(central * 1.12),
        "double_line_detected": paired > unpaired,
        "excludes": ["risers verticais (precisa do corte/prancha 04/04)",
                     "conexões/curvas curtas (<13cm)"],
    }


def summarize(take: Takeoff, rules: list[DeviceRule] | None = None) -> dict:
    rules = rules if rules is not None else RULES
    counts = {}
    procurement = []   # one line per material spec, for pre-processing procurement
    for rule in rules:
        items = take.by_key(rule.key)
        entry = {"label": rule.label, "total": len(items), "spec": rule.spec}
        if rule.subtype_words:
            sub = {}
            for it in items:
                sub[it.subtype or "?"] = sub.get(it.subtype or "?", 0) + 1
            entry["by_subtype"] = sub
        counts[rule.key] = entry
        if not items:
            continue
        # procurement: split by subtype when specs differ, else one line
        if rule.subtype_specs:
            for st, n in sorted(entry.get("by_subtype", {}).items()):
                procurement.append({"item": rule.label, "subtype": st, "qty": n,
                                    "unit": "un", "spec": rule.subtype_specs.get(st, rule.spec)})
        else:
            procurement.append({"item": rule.label, "qty": len(items),
                                "unit": "un", "spec": rule.spec})
    return {
        "source": take.source,
        "rotation": take.rotation,
        "counts": counts,
        "coverage": coverage_report(take),
        "procurement": procurement,
    }


def _draw_pins(page, take: Takeoff, rules: list[DeviceRule] | None = None) -> None:
    rules = rules if rules is not None else RULES
    shape = page.new_shape()
    rule_by_key = {r.key: r for r in rules}
    for inst in take.instances:
        r = rule_by_key[inst.key]
        shape.draw_circle(fitz.Point(*inst.center), r.radius)
        shape.finish(color=r.color, width=3, fill=None)
    shape.commit()


def render_overlay(pdf_path: str, take: Takeoff, out_png: str, scale: float = 1.6,
                   page_index: int = 0, rules: list[DeviceRule] | None = None) -> tuple[int, int]:
    doc = fitz.open(pdf_path)
    page = doc[page_index]
    _draw_pins(page, take, rules)
    pix = page.get_pixmap(matrix=fitz.Matrix(scale, scale))
    pix.save(out_png)
    doc.close()
    return pix.width, pix.height


def annotated_pdf(pdf_path: str, take: Takeoff, out_pdf: str, page_index: int = 0,
                  rules: list[DeviceRule] | None = None) -> None:
    """Write a copy of the PDF with pins drawn ON the vector page. Served in an
    iframe so the human gets the native viewer (zoom/pan/search) for a quick check —
    crisp at any zoom, unlike a flat PNG of a 4612×2384 plotter sheet."""
    doc = fitz.open(pdf_path)
    _draw_pins(doc[page_index], take, rules)
    doc.save(out_pdf, garbage=3, deflate=True)
    doc.close()


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("pdf")
    ap.add_argument("--out", default="estimator/out")
    ap.add_argument("--scale", type=float, default=1.6)
    ap.add_argument("--intel", action="store_true",
                    help="derive device rules from the legend via Stage-1 Claude "
                         "(falls back to hardcoded RULES on any failure)")
    ap.add_argument("--model", default="sonnet", help="Claude model for --intel")
    args = ap.parse_args()

    outdir = Path(args.out)
    outdir.mkdir(parents=True, exist_ok=True)

    rules = None   # None ⇒ count.py's hardcoded RULES
    if args.intel:
        try:
            try:
                from intel import derive_ruleset          # run as script (cwd has estimator/)
            except ImportError:
                from estimator.intel import derive_ruleset  # imported as package
            ruleset = derive_ruleset(args.pdf, model=args.model)
            rules = rules_from_intel(ruleset)
            print(f"[intel] {len(rules)} device rules from legend "
                  f"(model={ruleset.get('_usage', {}).get('model')}) — "
                  f"pipe_layer/scale ignored, metragem uses verified P-PIPE/detect_scale")
        except Exception as e:
            print(f"[intel] FAILED ({e}) — falling back to hardcoded RULES")
            rules = None

    take = extract(args.pdf, rules=rules)
    summary = summarize(take, rules=rules)
    summary["metragem"] = pipe_metragem(args.pdf)
    summary["risers"] = riser_metragem(args.pdf)
    # conservative quoting figure: horizontal HIGH bound + risers (over-estimate by design)
    summary["metragem"]["developed_para_orcamento_m"] = (
        summary["metragem"]["horizontal_run_m_high"] + summary["risers"]["riser_run_m"]
    )
    # pipe is a material too: qty in metres, spec = diameter(s)
    diam = " / ".join(summary["metragem"]["diameters"]) or "ø não detectado"
    summary["procurement"].append({
        "item": "Tubulação de incêndio", "qty": summary["metragem"]["developed_para_orcamento_m"],
        "unit": "m", "spec": f"{diam} · desenvolvido conservativo (confirmar escala)"})

    (outdir / "takeoff.json").write_text(json.dumps(summary, indent=2, ensure_ascii=False))
    w, h = render_overlay(args.pdf, take, str(outdir / "overlay.png"), scale=args.scale, rules=rules)
    annotated_pdf(args.pdf, take, str(outdir / "annotated.pdf"), rules=rules)

    # console report
    print(f"# Takeoff — {summary['source']}  (page rot {summary['rotation']}°)")
    for key, c in summary["counts"].items():
        line = f"  {c['label']:<34} {c['total']:>3}"
        if "by_subtype" in c:
            line += "   " + ", ".join(f"{k}={v}" for k, v in sorted(c["by_subtype"].items()))
        print(line)
    print("\n# Signage coverage")
    for cov in summary["coverage"]:
        print(f"  {cov['signage']} vs {cov['equipment']}: "
              f"{cov['equipment_count']} equip / {cov['signage_count']} signs | "
              f"equip WITHOUT sign={cov['equipment_without_signage']} "
              f"(orphan signs nearby-none={cov['signage_without_equipment_nearby']})")
    m, r = summary["metragem"], summary["risers"]
    sc = m["scale"]
    print(f"\n# Metragem de tubulação ({m['layer']})")
    print(f"  ⚠ ESCALA {sc['proposed']} — {sc['source']}")
    print(f"    >>> CONFIRME (humano): a metragem inteira depende disto"
          + (f"  [ambíguo: {sc['candidates']}]" if sc.get('ambiguous') else ""))
    print(f"  tubo horizontal: {m['horizontal_run_m_low']}–{m['horizontal_run_m_high']} m "
          f"(central {m['horizontal_run_m_central']} m)")
    print(f"  risers (prumadas): {r['riser_markers']} × {r['floor_height_m']} m = {r['riser_run_m']} m")
    print(f"  DESENVOLVIDO p/ orçamento (conservativo): {m['developed_para_orcamento_m']} m")
    print(f"  diâmetros: {', '.join(m['diameters']) or 'não detectado'}")
    print(f"  exclui: conexões/curvas curtas (<13cm)")

    print("\n# Procurement (item · qtd · especificação)")
    for it in summary["procurement"]:
        st = f" [{it['subtype']}]" if it.get("subtype") else ""
        print(f"  {it['item']}{st}: {it['qty']} {it['unit']} — {it['spec']}")

    print(f"\nWrote takeoff.json, overlay.png ({w}x{h}), annotated.pdf in {outdir}")


if __name__ == "__main__":
    main()
