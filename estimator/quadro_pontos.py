"""
QUADRO_PONTOS — count electrical device POINTS (tomadas / AC força / iluminação) and
circuits from the QUADRO DE CARGAS table. The deterministic SPINE of the CABOS half.

Carlos's frame: "the TRI quadro de cargas tells the entire technical story; the planta
tells how they're POSITIONED." So device counts-by-type come from the QUADRO (free,
deterministic, find_tables) and the planta (points.py) gives positions — the two
RECONCILE (= the verification UI). THE BOUNDARY (don't cross it): quadro = spine for
TOMADAS / AC / circuits / cable (1 point ≈ 1 drop, 1:1); planta = luminária DROPS +
infra metres + positions (1 lighting point : N fixtures — the quadro under-counts
lighting, do NOT use it for luminárias). See ARCHITECTURE.md — this is the CABOS half
doing device COUNTS (sibling of schedule.py, which does cable SIZING off the same table).

EXTRACTION is find_tables-first (free; reuses schedule._explode + _to_float). A quadro de
cargas is NOT one table: find_tables splits it into many headerless fragments, only ~1 of
which carries the header row, and a leading DISJUNTOR column shifts the grid on some
fragments (one had 17 cols vs the canonical 16). So rows are read CID-ANCHORED: locate the
CIRC.N column by regex per row, then read every field at an offset RELATIVE to it (the
office's column template = config, validated against the one header row present). Columns
BEFORE the CID are the disjuntor prefix — captured as ENRICHMENT, never relied on (the
authoritative breaker mostly lives in separate 2×2 sub-tables find_tables can't reach).

JOIN to a casa by the board tag. Two schemes seen on Boticário (per-quadro CONFIG):
  • SUFFIX — circuits named `... Q##-T#`; the `-T#` is the board (casa-28 = T2). CLEAN,
    validated: 88 pts / 11 circuits vs Carlos Revu 91 (Δ3 = find_tables dropped 2 rows —
    documented, NOT chased; pin the robust raw qtd-sum, not a tuned number).
  • TITLE — function-named circuits (TOM. ADM, TOMADAS BAR LOUNGE, TOM. RACK) carry NO
    board tag; grouped by the quadro TITLE spatially (casa-20 = PUB on PE06_TRI + ADM +
    COW on PE07_TRI, multi-sheet). Rougher (rot-270 title→table join) → smoke only, NOT pinned.

CLASSIFICATION (NBR 5410) is the SECONDARY signal — reported, NEVER the pinned number.
VA/pt + FASE(mm²) + NOME: ~100 VA/pt = 10A TUG, ~600 = 20A TUE, ≥3000 VA / 4mm² /
named-equip = dedicated. Every AR COND circuit is a real AC-força point — nominal VA is
NOT a força/control discriminator (Carlos oracle: casa-28's 13 board-T2 AR COND @40VA are
força, fan-coil notation; the old ≤100 VA="thermostat signal" guess was refuted). The
disjuntor is authoritative but unreliable from find_tables → VA/pt classifies, disjuntor
enriches when present.

Usage:
    python quadro_pontos.py <quadro.pdf> [--page N]
"""
from __future__ import annotations

import argparse
import collections
import json
import re
from pathlib import Path

import fitz

from schedule import _explode, _to_float

# CIRC.N column — circuit IDs in this project: T#/L#/AC#/I#/EM# (+ TUG/TUE/PLA/TG/QDC/B).
# MUST include I and EM (iluminação / bloco autônomo) — omitting them under-counts the
# lighting circuits (memory: "the CID regex must include I/EM, not just T/L/AC").
CID = re.compile(r"^(L|T|AC|TUG|TUE|PLA|TG|QDC|B|I|EM)[\d.]", re.I)

# Field offsets RELATIVE to the CIRC.N column. This office's quadro-de-cargas template,
# validated against the one header row present on PE06_TRI:
#   CIRC.N | NOME | DIST/(m) | QTD | POT(VA) | FASE-R | FASE-S | FASE-T | TENSAO/(V) |
#   CORR | ICC | FASE(mm²) | NEUTRO | TERRA | ISOLAMENTO | QUEDA
# CID-anchored (not from table start) so a leading disjuntor column can't break it.
# New office = new template (or header-derived) — same config seam as glossary.py.
COLS = {"nome": 1, "dist": 2, "qtd": 3, "pot": 4, "tensao": 8, "fase_mm2": 11}

_SUFFIX = re.compile(r"-\s*(T\d+)\b", re.I)            # board tag in the circuit NOME → casa
_DEDICATED = re.compile(
    r"SECADORA|LAVADORA|FRITA|RACK|M[ÁA]QUINA|GELO|COIFA|FORNO|CHUVEIRO|BOILER|BOMBA|"
    r"MOTOR|INDU[ÇC][ÃA]O|TERMOEL", re.I)


def _board(nome: str) -> str | None:
    m = _SUFFIX.search(nome or "")
    return m.group(1).upper() if m else None


def _is_tom(r: dict) -> bool:
    return "TOM" in (r["nome"] or "").upper()


def _is_ac(r: dict) -> bool:
    return (r["cid"] or "").upper().startswith("AC") or "AR COND" in (r["nome"] or "").upper()


def extract_circuits(pdf_path: str, page_index: int = 0,
                     cols: dict = COLS, min_col: int = 10) -> list[dict]:
    """Every circuit row across all wide (≥min_col) tables, read CID-anchored. Reuses
    schedule._explode to split \\n-stacked cells. disj = the columns before the CID
    (enrichment). qtd/pot are parsed numbers; fase_mm2 is left as the written string."""
    pg = fitz.open(pdf_path)[page_index]
    out = []
    for t in pg.find_tables().tables:
        if t.col_count < min_col:
            continue
        for r in _explode(t.extract()):
            c = [(x or "").strip() for x in r]
            i = next((k for k, v in enumerate(c) if CID.match(v)), None)
            if i is None or i + cols["pot"] >= len(c):     # need at least up to POT(VA)
                continue

            def cell(off: int) -> str:
                j = i + off
                return c[j] if 0 <= j < len(c) else ""     # fase(+11) is optional on short fragments

            qtd = _to_float(cell(cols["qtd"]))
            pot = _to_float(cell(cols["pot"]))
            nome = cell(cols["nome"])
            out.append({
                "cid": c[i],
                "nome": nome,
                "qtd": int(qtd) if qtd is not None else 0,
                "pot_va": pot or 0.0,
                "fase_mm2": cell(cols["fase_mm2"]),
                "tensao": cell(cols["tensao"]),
                "disj": " ".join(c[:i]).strip(),           # leading cols = breaker (enrichment)
                "board": _board(nome),
            })
    return out


def classify(row: dict) -> str:
    """NBR-5410-informed class from VA/pt + FASE(mm²) + NOME. SECONDARY signal — reported,
    never the pinned number. Returns one of: tomada_10a, tomada_20a, dedicado_equip,
    ac_real, iluminacao, outro."""
    nome = (row["nome"] or "").upper()
    cid = (row["cid"] or "").upper()
    qtd = row["qtd"] or 0
    pot = row["pot_va"] or 0.0
    fase = _to_float(row["fase_mm2"]) or 0.0
    vpp = pot / qtd if qtd else 0.0
    if cid.startswith("AC") or "AR COND" in nome:
        # AR COND outlet = real AC-força point. Carlos oracle (casa-28: 13 board-T2 AR COND
        # @40VA are força, fan-coil notation) refuted the old ≤100VA="control signal" guess —
        # nominal VA is NOT a força/control discriminator. Every AR COND circuit = a point.
        return "ac_real"
    if "ILUMINA" in nome or cid.startswith(("I", "L", "EM")):
        return "iluminacao"
    # named equipment / heavy load = dedicated, with OR without a "TOM" prefix (a hardwired
    # MÁQUINA GELO / LAVADORA feeder is as dedicated as a TOM. SECADORA — don't lump it in "outro").
    if _DEDICATED.search(nome) or fase >= 4 or vpp >= 2000:
        return "dedicado_equip"
    if "TOM" not in nome:
        return "outro"
    if vpp >= 550:
        return "tomada_20a"
    return "tomada_10a"


def tally_board(rows: list[dict], board: str) -> dict:
    """ROBUST spine for ONE board: raw qtd-sum of its TOMADA + AC-força circuits, with
    circuit counts. These are the PINNED numbers — deterministic, validated against Carlos's
    Revu oracle. AC-força = every board-tagged AR COND circuit (the fan-coil point; nominal
    VA is not a discriminator). The per-class split rides along as heuristic secondary."""
    tom = [r for r in rows if _is_tom(r) and r["board"] == board]
    ac = [r for r in rows if _is_ac(r) and r["board"] == board]
    return {
        "tomada_pts": sum(r["qtd"] for r in tom),
        "tomada_circuits": len(tom),
        "ac_forca_pts": sum(r["qtd"] for r in ac),
        "ac_forca_circuits": len(ac),
        "circuits": [{"cid": r["cid"], "nome": r["nome"], "qtd": r["qtd"],
                      "vpp": round(r["pot_va"] / r["qtd"]) if r["qtd"] else 0,
                      "class": classify(r), "disj": r["disj"]} for r in tom],
    }


def summarize(rows: list[dict]) -> dict:
    """Whole-sheet roll-up. Robust by-board tomada totals + heuristic by-class +
    no-suffix tomada rows surfaced for HITL per-casa assignment (NOT silently bucketed —
    they may be a casa's service rooms OR the bar's dedicated equip; the human decides)."""
    by_board: dict = collections.defaultdict(lambda: collections.Counter())
    by_class_pts: collections.Counter = collections.Counter()
    by_class_circ: collections.Counter = collections.Counter()
    no_suffix_tomada = []
    no_suffix_ac = []
    for r in rows:
        k = classify(r)
        by_class_pts[k] += r["qtd"]
        by_class_circ[k] += 1
        if _is_tom(r):
            if r["board"]:
                by_board[r["board"]]["pts"] += r["qtd"]
                by_board[r["board"]]["circ"] += 1
            else:
                no_suffix_tomada.append(
                    {"cid": r["cid"], "nome": r["nome"], "qtd": r["qtd"], "class": k})
        elif _is_ac(r):       # AC = a parallel spine (board-tagged → casa; no-suffix → HITL)
            if r["board"]:
                by_board[r["board"]]["ac_pts"] += r["qtd"]
                by_board[r["board"]]["ac_circ"] += 1
            else:
                no_suffix_ac.append(
                    {"cid": r["cid"], "nome": r["nome"], "qtd": r["qtd"], "class": k})
    return {
        "by_board": {b: dict(v) for b, v in sorted(by_board.items())},
        "by_class_pts": dict(by_class_pts),
        "by_class_circuits": dict(by_class_circ),
        "no_suffix_tomada_HITL": no_suffix_tomada,
        "no_suffix_ac_HITL": no_suffix_ac,
        "total_circuit_rows": len(rows),
    }


# casa → board(s). Per-quadro CONFIG (the two join schemes, see module docstring):
#   casa_28 = board T2, SUFFIX scheme on PE06_TRI — VALIDATED. Tomada: 88 pts / 11 circ vs
#   Revu 91 (Δ3). AC-força: 13 board-T2 AR COND (deterministic) vs Revu 15 (Δ2) — the Δ2 is
#   common-area AC (AR COND. SERVIÇOS/COBERTURA/VARANDA) carried no-suffix, assigned to
#   casa-28 via the no_suffix_ac_HITL bucket (Carlos: fan-coil reading). NOT torture-fit.
#   casa_20 = quadros PUB (PE06_TRI) + ADM + COW (PE07_TRI), TITLE scheme, multi-sheet —
#   NOT pinned: function-named circuits carry no -T# tag, so they need the spatial
#   title→table join (rot-270), not the suffix. Smoke only until that join is built.
BOTICARIO_CASAS = {
    "casa_28": {"scheme": "suffix", "boards": ["T2"], "oracle_tomada": 91, "oracle_ac": 15},
}


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("pdf")
    ap.add_argument("--page", type=int, default=0)
    args = ap.parse_args()
    rows = extract_circuits(args.pdf, args.page)
    summ = summarize(rows)
    print(f"# Quadro de cargas — {Path(args.pdf).name}  ({summ['total_circuit_rows']} circuit rows)")
    print("\n## ROBUST spine — points by board (the pinned numbers):")
    for b, v in summ["by_board"].items():
        print(f"  board {b:6} tomada={v.get('pts', 0):4} ({v.get('circ', 0)} circ)   "
              f"ac_força={v.get('ac_pts', 0):4} ({v.get('ac_circ', 0)} circ)")
    print("\n## casa map (config):")
    for casa, cfg in BOTICARIO_CASAS.items():
        pts = sum(summ["by_board"].get(b, {}).get("pts", 0) for b in cfg["boards"])
        circ = sum(summ["by_board"].get(b, {}).get("circ", 0) for b in cfg["boards"])
        ac = sum(summ["by_board"].get(b, {}).get("ac_pts", 0) for b in cfg["boards"])
        o_tom, o_ac = cfg.get("oracle_tomada"), cfg.get("oracle_ac")
        d_tom = f" (Revu {o_tom}, Δ{pts - o_tom:+d})" if o_tom else ""
        d_ac = f" (Revu {o_ac}, Δ{ac - o_ac:+d} → HITL common)" if o_ac else ""
        print(f"  {casa:8} boards={cfg['boards']} scheme={cfg['scheme']:6}")
        print(f"           tomada_pts={pts} ({circ} circ){d_tom}")
        print(f"           ac_força_pts={ac}{d_ac}")
    print("\n## heuristic class split (SECONDARY — not pinned):")
    for k, n in sorted(summ["by_class_pts"].items(), key=lambda x: -x[1]):
        print(f"  {k:16} pts={n:4}  circuits={summ['by_class_circuits'][k]}")
    for label, key in (("tomada", "no_suffix_tomada_HITL"), ("AC", "no_suffix_ac_HITL")):
        if summ[key]:
            print(f"\n## HITL — {len(summ[key])} no-suffix {label} circuits "
                  "(assign to a casa manually):")
            for r in summ[key][:20]:
                print(f"  {r['cid']:6} {r['nome'][:34]:34} qtd={r['qtd']:>3}  [{r['class']}]")
    print("\n" + json.dumps({"by_board": summ["by_board"]}, ensure_ascii=False))


if __name__ == "__main__":
    main()
