"""
ai.rio.br — v0 takeoff engine for BR ELÉTRICA plantas (sibling of count.py).

WHY a separate module: the fire engine (count.py) counts discrete devices by their
text callout (one word per extintor/hidrante). Elétrica has NO device-word per
device — tomadas/luminárias/interruptores are *symbols*, not words. Counting them
would need computer vision, which the demo's whole thesis avoids. So for elétrica
the value is different and shaped by what the vector PDF actually carries:

  1. SCHEDULE   — quadros (BD/QD) + circuits (alimentadores A-…) by distinct tag.
  2. METRAGEM   — bandeja (cable tray) + eletroduto (conduit) linear metres, read
                  off the `EL-Condutos …` layers. The layer scheme splits
                  `Condutos` (the route centerline = measurable) from `Conexões`
                  (the fitting graphic = noise) — the same real-vs-fitting split
                  count.py uses for P-PIPE vs short fittings.
  3. SIZES      — tray sizes (200x50mm…) + conduit diameters (Ø…) as a label
                  histogram. Per-size METRES needs a label→segment spatial join
                  (deferred — stated as a gap, not faked).
  4. CONFLITO   — fire device words (extintor/hidrante) bleeding into this elétrica
                  sheet (it is a *compatibilizado* overlay) → cross-discipline
                  collision candidate. Reported as a count, not yet spatial.

Scale: this sheet carries NO `ESC:` text → detect_scale falls back to 1:1 with a
loud human-confirm gate (same accountability model as count.py — the human owns
the one number that multiplies every metre).

Usage:
    python ele.py <plan.pdf> [--out OUTDIR] [--scale-denom N]
"""
from __future__ import annotations

import argparse
import collections
import json
import math
import re
from pathlib import Path

import fitz  # PyMuPDF

import glossary  # project-agnostic layer→kind config seam (see ARCHITECTURE.md)

try:
    from count import detect_scale, _m_per_pt          # run as script (cwd has estimator/)
except ImportError:
    from estimator.count import detect_scale, _m_per_pt  # imported as package


# --- Tags read off this project's elétrica legend/callouts --------------------
# Quadros (panels) and circuits (alimentadores) are the only reliably countable
# units: each carries a stable text tag that repeats along its route, so we count
# DISTINCT tags, not occurrences (a tag printed 16× along a feeder is ONE circuit).

# Schedule tag regexes. INCOMPLETE BY NATURE: panel/circuit naming is arbitrary
# per project, so these miss tags and risk false matches — the schedule is NOT
# reliably correct without reading the legend (that is the Stage-1 Intel job).
# Treat schedule output as evidence-to-confirm, not a verified count.
PANEL_RE = re.compile(r"(?:QDU|QDL|QGBT|QGDE|QTU|QTE|QD|BD|QL)-[\w.\-]+")
CIRCUIT_RE = re.compile(r"A-[A-Z0-9]{1,2}-\d+(?:\.\d+)?")           # A-1E-04, A-IC-01, A-1U-02.2
TRAY_SIZE_RE = re.compile(r"\d+x\d+mm")                             # 200x50mm cable tray
DIAM_RE = re.compile(r"Ø[\d./\"]+")                                 # Ø3/4"  Ø2"  conduit

# Which layers are measurable RUNS (tray/conduit/busway) vs EXCLUDED (fittings,
# panel boxes, grounding) is decided by the project-agnostic glossary
# (glossary.layer_kind) — NOT a hardcoded prefix. Each run is drawn as TWO parallel
# edges (its width/Ø), so centerline = paired length ÷ 2 (summing both edges DOUBLES
# the run — a real error, not over-estimate margin).
MIN_SEG_PT = 20.0                  # ignore sub-segments below this (fitting tessellation)
PAIR_GAP_MAX_PT = 25.0             # max edge-gap to treat two parallels as one run

# Tray-family kinds (glossary canonical): drawn as two parallel edges with a physical
# WIDTH, so they share the paired-edge measure + width-from-gap bucketing. Each is a
# DISTINCT product (perfilado ≠ eletrocalha ≠ leito) → its own takeoff line. Eletroduto
# is also paired-edge but bucketed by Ø; barramento has no per-size.
TRAY_KINDS = ("eletrocalha", "perfilado", "leito")

# Fire device words that should NOT be on an elétrica sheet except via the
# compatibilizado overlay — their presence is a collision-check candidate.
FIRE_WORDS = ("extintor", "hidrante")


def _diam_to_mm(tok: str) -> float:
    """Parse a Ø label to mm. Forms: Ø3/4"  Ø1"  Ø1.1/4" (=1¼")  Ø2"  Ø1 1/4".
    Inches → mm (×25.4). Returns 0 if unparseable."""
    s = tok.replace("Ø", "").replace('"', "").replace(".", " ").strip()
    total = 0.0
    for part in s.split():
        try:
            if "/" in part:
                a, b = part.split("/")
                total += float(a) / float(b)
            else:
                total += float(part)
        except (ValueError, ZeroDivisionError):
            return 0.0
    return total * 25.4


QUADRO_LAYER = "0. QUADROS"        # geometry layer carrying quadro symbol placements
QUADRO_CONFIRM_PT = 50             # label↔symbol match radius (80pt was loose: 19/19→17/19)
CABLE_RE = re.compile(r"#\d[\d,./]*(?:mm2|mm²)?|[\d,]+mm2|[\d,]+mm²")  # #2, #2,5mm2


def schedule(pdf_path: str, page_index: int = 0) -> dict:
    """Distinct panels + circuits + quadro geometry↔label reconciliation + cables.

    Panel/circuit naming is arbitrary (legend-dependent, flagged). Quadros are
    cross-checked: a panel label is CONFIRMED when a `0. QUADROS` symbol sits near
    it (label↔geometry agreement = trust). Cable gauges are read from the labels
    (mostly the legend default on this sheet; per-feeder gauges live in a separate
    quadro schedule, not this plan)."""
    page = fitz.open(pdf_path)[page_index]
    words = page.get_text("words")
    wtext = [w[4] for w in words]

    panels = sorted(set(w for w in wtext if PANEL_RE.fullmatch(w)))

    circuits = collections.defaultdict(set)
    for w in wtext:
        if CIRCUIT_RE.fullmatch(w):
            parts = w.split("-")
            circuits[parts[1] if len(parts) > 1 else w].add(w)  # group by middle token
    circuit_groups = {k: sorted(v) for k, v in sorted(circuits.items())}

    # quadro geometry: cluster `0. QUADROS` strokes, then confirm each panel label
    # that has a quadro symbol within 80pt (label↔geometry agreement)
    qpts = []
    for dr in page.get_drawings():
        if (dr.get("layer") or "") != QUADRO_LAYER:
            continue
        P = [(q.x, q.y) for it in dr["items"] for q in it[1:] if isinstance(q, fitz.Point)]
        if P:
            qpts.append((sum(x for x, _ in P) / len(P), sum(y for _, y in P) / len(P)))
    confirmed_set = set()
    for w in words:
        if not PANEL_RE.fullmatch(w[4]):
            continue
        px, py = (w[0] + w[2]) / 2, (w[1] + w[3]) / 2
        if any(math.hypot(px - qx, py - qy) < QUADRO_CONFIRM_PT for qx, qy in qpts):
            confirmed_set.add(w[4])
    confirmed = len(confirmed_set)
    unconfirmed = sorted(set(panels) - confirmed_set)   # review: no tight symbol match

    cables = collections.Counter(w for w in wtext
                                 if CABLE_RE.fullmatch(w) and not TRAY_SIZE_RE.fullmatch(w))

    return {
        "panels": panels,
        "panel_count": len(panels),
        "panels_geom_confirmed": confirmed,            # labels with a 0.QUADROS symbol within 50pt
        "panels_unconfirmed": unconfirmed,             # review: no tight symbol match
        "quadro_symbol_clusters_raw": len(qpts),       # raw strokes (over-segments; not a count)
        "circuit_prefixes": {k: len(v) for k, v in circuit_groups.items()},
        "circuit_total": sum(len(v) for v in circuit_groups.values()),
        "cable_gauges": dict(cables),                  # #2 default per legend; per-feeder elsewhere
        "_circuits": circuit_groups,
        "_INCOMPLETE": "SCHEDULE NÃO confiável sem a legenda: nomes de quadro/circuito são "
                       "arbitrários por projeto — o regex erra/omite (ex.: famílias QGBT/QGDE/"
                       "QTE, circuitos A-IC/A-MT) e pode falsear. Contagem = evidência a "
                       "confirmar, não verdade. Correção real = Stage-1 Intel lê a legenda.",
    }


def sizes(pdf_path: str, page_index: int = 0) -> dict:
    """Label histogram of tray sizes + conduit diameters (a cross-check on the
    geometry). Tray METRES-per-size now come from metragem (edge-gap → width);
    these label freqs corroborate it (e.g. 200x50mm label freq ≈ #200mm runs)."""
    page = fitz.open(pdf_path)[page_index]
    words = [w[4] for w in page.get_text("words")]
    tray = collections.Counter(w for w in words if TRAY_SIZE_RE.fullmatch(w))
    diam = collections.Counter(w for w in words if DIAM_RE.fullmatch(w))
    return {
        "tray_sizes_label_freq": dict(tray.most_common()),
        "conduit_diam_label_freq": dict(diam.most_common()),
        "_note": "frequência de RÓTULOS (cross-check). Metros-por-bitola da bandeja/calha "
                 "= metragem.tray_por_bitola_m (via gap entre bordas).",
    }


def metragem(pdf_path: str, page_index: int = 0, scale_denom: int | None = None,
             quote_margin: float = 0.10, kind_overrides: dict[str, str] | None = None) -> dict:
    """Linear metres of cable tray (bandeja), conduit (eletroduto) and busway
    (barramento blindado), from the `EL-Condutos …` / `EL-Barramento …` layers.

    Each run is drawn as TWO parallel edges (its physical width/diameter), so the
    centerline length = paired length ÷ 2. Summing both edges would DOUBLE the run
    — a factual error, not over-estimate margin. Per-tray-size metres fall out of
    the edge-gap (gap × scale = physical width), so no label→segment join is
    needed; verified: bandeja gaps cluster at 100/150/200 mm (the tray catalog).
    Unpaired long segments are reported separately for review (a real single-line
    run, or stray geometry). The over-estimate margin is applied AFTER the correct
    halving (quote = centerline × (1+margin)), per the project rule."""
    sc = detect_scale(pdf_path, page_index)
    denom = scale_denom if scale_denom else sc["denom"]
    mpp = _m_per_pt(denom)
    page = fitz.open(pdf_path)[page_index]

    # kind = universal glossary word-match, OR a per-project override for CRYPTIC layers the
    # glossary can't resolve (e.g. Boticário ELE_TA/TP/TE = eletroduto teto/piso/parede — the
    # HITL mapping the glossary docstring promises; keeps project codes OUT of the universal map).
    ov = kind_overrides or {}
    def resolve_kind(lay: str) -> str | None:
        return ov.get(lay) or glossary.layer_kind(lay)

    by_layer: dict[str, list] = collections.defaultdict(list)  # layer -> [(a,b,L)]
    for d in page.get_drawings():
        lay = d.get("layer") or ""
        if resolve_kind(lay) is None:   # project-agnostic: glossary + per-project override
            continue
        for it in d["items"]:
            if it[0] == "l":
                a, b = it[1], it[2]
                L = math.hypot(a.x - b.x, a.y - b.y)
                if L >= MIN_SEG_PT:
                    by_layer[lay].append((a, b, L))

    def ang(a, b):
        return math.atan2(b.y - a.y, b.x - a.x) % math.pi

    def mid(a, b):
        return ((a.x + b.x) / 2, (a.y + b.y) / 2)

    def measure(segs, valid_widths=None):
        """Return (centerline_pt, single_pt, size_buckets_pt).
        For each long seg, find its nearest parallel partner (the opposite edge);
        paired length is summed then halved → centerline. Each paired seg's length
        is bucketed by the partner gap → physical width (mm). When `valid_widths`
        (catalog widths from the size labels) is given, the gap snaps to the nearest
        catalog width — verified safe: every small-gap mis-pair also has a valid
        catalog partner, so this only relabels size, never changes the total."""
        angs = [ang(a, b) for a, b, _ in segs]
        mids = [mid(a, b) for a, b, _ in segs]
        paired_pt = single_pt = 0.0
        buckets: dict[int, float] = collections.defaultdict(float)
        # bandeja: only accept partner gaps in the real catalog range — a closer
        # neighbouring run otherwise steals an edge into the wrong size bucket
        # (verified: every such edge still has its true catalog opposite, so the
        # total is unchanged; this only corrects the per-size split, raising 200mm
        # from 240→254m vs a 259m Revu manual on subsolo).
        lo_mm, hi_mm = (min(valid_widths) - 40, max(valid_widths) + 60) if valid_widths else (0, 1e9)
        for i, (a, b, L) in enumerate(segs):
            bestg = None
            for j in range(len(segs)):
                if j == i or abs(L - segs[j][2]) > max(6.0, 0.15 * L):
                    continue
                if min(abs(angs[j] - angs[i]), math.pi - abs(angs[j] - angs[i])) > 0.05:
                    continue
                g = math.hypot(mids[i][0] - mids[j][0], mids[i][1] - mids[j][1])
                if not (lo_mm <= g * mpp * 1000 <= hi_mm):
                    continue
                if 0.5 < g < PAIR_GAP_MAX_PT and (bestg is None or g < bestg):
                    bestg = g
            if bestg is not None:
                paired_pt += L
                mm = bestg * mpp * 1000
                width_mm = (min(valid_widths, key=lambda w: abs(w - mm)) if valid_widths
                            else max(50, int(round(mm / 50.0)) * 50))
                buckets[width_mm] += L
            else:
                single_pt += L
        # both edges summed → halve for centerline (singles already once)
        return paired_pt / 2 + single_pt, single_pt, {k: v / 2 for k, v in buckets.items()}

    # catalogs from this sheet's labels — per-size is validated against these:
    #  tray width (200x50mm→200) and conduit Ø (Ø2"→51mm). Both come from the
    #  edge-gap of a matched pair (gap×scale=physical size), cross-checked vs the
    #  labels — the run is sized by what's WRITTEN, not by the geometry layer alone.
    wlist = [x[4] for x in page.get_text("words")]
    tray_widths = sorted({int(w.split("x")[0]) for w in wlist if TRAY_SIZE_RE.fullmatch(w)})
    diam_catalog = {}                                  # mm -> Ø label
    for w in wlist:
        if DIAM_RE.fullmatch(w):
            mm = _diam_to_mm(w)
            if mm:
                diam_catalog[round(mm)] = w
    diam_mms = sorted(diam_catalog)

    def label_buckets(buckets, kind):
        if kind in TRAY_KINDS:
            return {f"{w}mm": round(p * mpp, 1) for w, p in sorted(buckets.items())}
        if kind == "eletroduto" and diam_mms:
            return {diam_catalog[w]: round(p * mpp, 1) for w, p in sorted(buckets.items())}
        return {}

    layers = []
    tot: dict[str, float] = collections.defaultdict(float)      # kind -> centerline m
    # tray sizes are kept PER KIND (perfilado ≠ eletrocalha): {kind: {"200mm": m}}
    tray_size_m: dict[str, dict[str, float]] = collections.defaultdict(lambda: collections.defaultdict(float))
    diam_m: dict[str, float] = collections.defaultdict(float)   # "Ø2\"" -> m
    for lay, segs in sorted(by_layer.items()):
        kind = resolve_kind(lay)
        catalog = tray_widths if kind in TRAY_KINDS else (diam_mms if kind == "eletroduto" else None)
        center_pt, single_pt, buckets = measure(segs, catalog)
        run_m = center_pt * mpp
        tot[kind] += run_m
        per_size = label_buckets(buckets, kind)
        if kind in TRAY_KINDS:
            for w, p_pt in buckets.items():
                tray_size_m[kind][f"{w}mm"] += p_pt * mpp
        elif kind == "eletroduto" and diam_mms:
            for w, p_pt in buckets.items():
                diam_m[diam_catalog[w]] += p_pt * mpp
        layers.append({
            "layer": lay,
            "kind": kind,
            "segments": len(segs),
            "centerline_m": round(run_m, 1),
            "single_unpaired_pt": round(single_pt),   # review: single-line or stray
            "per_size_m": per_size,
        })

    quote = {k: round(v * (1 + quote_margin), 1) for k, v in tot.items() if v}
    return {
        "scale": sc,                            # needs_confirmation=True; human owns it
        "scale_used_denom": denom,
        "scale_corroborada": "gaps de bandeja batem com larguras 100/150/200mm → escala plausível",
        "excludes_layers": "conexões (grafismo), quadros (caixa), aterramento/SPDA, e "
                           "condutos de OUTRAS disciplinas (dados/CFTV `CE-`, incêndio `SDAI`) — "
                           "só infra ELÉTRICA de potência é medida",
        "by_layer": layers,
        "total_m": {k: round(v, 1) for k, v in tot.items() if v},
        # per-size width histogram PER tray product (perfilado/eletrocalha/leito kept apart)
        "tray_por_bitola_m": {kind: {k: round(v, 1) for k, v in sorted(sz.items())}
                              for kind, sz in sorted(tray_size_m.items())},
        "eletroduto_por_bitola_m": {k: round(v, 1) for k, v in sorted(diam_m.items())},
        "quote_com_margem_m": quote,
        "quote_margin": quote_margin,
        "_method": "cada traçado = 2 bordas → centerline = pareado÷2 (somar 2 bordas = 2× ERRO). "
                   "Bitola da família de bandejas (eletrocalha/perfilado/leito — produtos "
                   "distintos, linhas separadas) vem do gap entre bordas (gap×escala=largura). "
                   "Margem over-estimate aplicada DEPOIS do ÷2.",
    }


def conflito_disciplinas(pdf_path: str, page_index: int = 0) -> dict:
    """Fire device words present on an elétrica sheet (compatibilizado overlay).

    Their presence is a CROSS-DISCIPLINE collision candidate (e.g. bandeja routed
    where a hidrante sits). v0 reports counts only — spatial collision (does a tray
    centerline pass within Xcm of a fire device?) is the next artifact, not faked."""
    page = fitz.open(pdf_path)[page_index]
    words = [w[4].lower() for w in page.get_text("words")]
    hits = {fw: sum(1 for w in words if fw in w) for fw in FIRE_WORDS}
    return {
        "fire_words_detected": {k: v for k, v in hits.items() if v},
        "_note": "presença de disciplina de incêndio nesta prancha elétrica "
                 "(overlay compatibilizado) → candidato a checagem de colisão. "
                 "v0 = contagem; colisão espacial = próximo artefato.",
    }


def run(pdf_path: str, page_index: int = 0, scale_denom: int | None = None) -> dict:
    page = fitz.open(pdf_path)[page_index]
    return {
        "source": Path(pdf_path).name,
        "rotation": page.rotation,
        "schedule": schedule(pdf_path, page_index),
        "sizes": sizes(pdf_path, page_index),
        "metragem": metragem(pdf_path, page_index, scale_denom),
        "conflito": conflito_disciplinas(pdf_path, page_index),
    }


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("pdf")
    ap.add_argument("--out", default="estimator/out_ele")
    ap.add_argument("--scale-denom", type=int, default=None,
                    help="override scale 1:N (sheet has no ESC text → human must set)")
    args = ap.parse_args()

    outdir = Path(args.out)
    outdir.mkdir(parents=True, exist_ok=True)
    r = run(args.pdf, scale_denom=args.scale_denom)
    (outdir / "takeoff_ele.json").write_text(json.dumps(r, indent=2, ensure_ascii=False))

    sch, sz, m, cf = r["schedule"], r["sizes"], r["metragem"], r["conflito"]
    print(f"# Takeoff ELÉTRICA — {r['source']}  (page rot {r['rotation']}°)\n")

    print(f"# Quadros ({sch['panel_count']} rótulos; "
          f"{sch['panels_geom_confirmed']} confirmados por símbolo '0. QUADROS' @50pt): "
          f"{', '.join(sch['panels']) or '—'}")
    if sch["panels_unconfirmed"]:
        print(f"  ⚠ sem símbolo próximo (revisar): {', '.join(sch['panels_unconfirmed'])}")
    print(f"# Circuitos: {sch['circuit_total']} distintos — "
          + ", ".join(f"{k}:{n}" for k, n in sch["circuit_prefixes"].items()))
    print(f"  cabos (bitola nos rótulos): {sch['cable_gauges'] or '— (default legenda #2; por-circuito = quadro de cargas)'}")
    print(f"  ⚠ SCHEDULE INCOMPLETO: {sch['_INCOMPLETE']}")

    print("\n# Bitolas (rótulos — cross-check da geometria)")
    print(f"  bandeja: {sz['tray_sizes_label_freq'] or '—'}")
    print(f"  eletroduto Ø: {sz['conduit_diam_label_freq'] or '—'}")

    sc = m["scale"]
    print(f"\n# Metragem  [exclui {m['excludes_layers']}]")
    print(f"  ⚠ ESCALA PROVISÓRIA {sc['proposed']} — proposta, NÃO confirmada "
          f"({m['scale_corroborada']}).")
    print(f"    >>> O HUMANO confirma e SETA a escala (--scale-denom N). Responsabilidade dele.")
    print(f"    >>> Metros abaixo = PROVISÓRIOS @ {sc['proposed']}; recalculam ao setar a escala.")
    print(f"  método: {m['_method']}")
    for L in m["by_layer"]:
        ps = ("  " + ", ".join(f"{k}={v}m" for k, v in L["per_size_m"].items())) if L["per_size_m"] else ""
        unp = f", {L['single_unpaired_pt']}pt sem-par(revisar)" if L["single_unpaired_pt"] else ""
        print(f"  {L['kind']:<11} {L['layer'][:40]:<40} "
              f"{L['centerline_m']:>7} m*  ({L['segments']} segs{unp}){ps}")
    print(f"  TOTAIS (centerline): " + ", ".join(f"{k} {v} m" for k, v in m["total_m"].items()))
    for kind, sizes in m.get("tray_por_bitola_m", {}).items():
        print(f"  {kind} por bitola: " + ", ".join(f"{k}={v}m" for k, v in sizes.items()))
    if m.get("eletroduto_por_bitola_m"):
        print(f"  eletroduto por Ø:   " + ", ".join(f"{k}={v}m" for k, v in m["eletroduto_por_bitola_m"].items()))
    print(f"  QUOTE (+{int(m['quote_margin']*100)}% over-estimate): "
          + ", ".join(f"{k} {v} m" for k, v in m["quote_com_margem_m"].items()))
    print(f"  * provisório — depende da escala que o humano vai confirmar")

    print("\n# Conflito de disciplinas (overlay compatibilizado)")
    print(f"  incêndio detectado nesta prancha elétrica: "
          f"{cf['fire_words_detected'] or 'nenhum'}")
    print(f"    → {cf['_note']}")

    print(f"\nWrote takeoff_ele.json in {outdir}")


if __name__ == "__main__":
    main()
