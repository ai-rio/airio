"""
RECONCILE — join the PLANTA device positions (points.py) to the QUADRO device counts
(quadro_pontos.py) per casa, and SURFACE the Δ. The verification UI's engine.

Carlos's frame: "the TRI quadro tells the entire technical story; the planta tells how
they're POSITIONED." The two halves describe the SAME devices from different documents:
the quadro is the deterministic count-by-type spine (88 tomada / 13 AC-força on casa-28
board T2); the planta is where each one physically sits. Reading them by hand, the
orçamentista cross-checks one against the other — this module is that cross-check.

THE BOUNDARY (what reconciles 1:1, what does NOT):
  • tomada + AC-força  — 1 quadro point ≈ 1 planta drop (1:1) → RECONCILE.
  • luminária          — 1 lighting circuit : N fixtures → NOT 1:1; planta is authoritative
                         (the quadro under-counts) → reported, never reconciled to a Δ.
  • interruptor / caixa de passagem / sensor / aterramento / emergência — no quadro circuit
                         counterpart → PLANTA-ONLY, listed for completeness.

THE PLANTA CANNOT SPLIT tomada from AC by glyph — both ride layer ELE_ST as the identical
circle/square (proven: one path signature, one colour, amperage only in the legend text).
So the split is HITL: the human taps the AC pins on the overlay (points.apply_tags variant
`ponto_forca_ac`); the tagged `by_variant` then reconciles tomada-pins ↔ quadro tomada and
AC-pins ↔ quadro AC-força SEPARATELY. Untagged, every ELE_ST pin defaults to tomada_10a, so
the AC line reads 0 until tagged — that IS the split flow, not a bug.

SURFACE THE Δ, DON'T BALANCE TO ZERO. Δ3 tomada / Δ2 AC-força are open (find_tables drops,
common-area no-suffix AC) pending Carlos's per-circuit Revu. A correct reconciler reports the
Δ with a flag; it never tunes either side to make them equal (the param-torture trap, 210 =
the cautionary tale). status="match" only when the human-bounded planta count genuinely lands
on the deterministic quadro count.

SCOPE is the human-drawn region (the product premise): the planta side must be filtered to a
casa's polygon before it means anything (the whole sheet packs casas 28 + 20 + ampliação +
legend). This module is SCOPE-AGNOSTIC — it reconciles whatever planta summary it is handed.
The scoping lives in regionselect.html (the human draws the boundary, the live count flows in).

THE RULE (ARCHITECTURE.md): new project / new casa = new config (RECONCILE entry), NOT new
code. The map below is Boticário's; the engine is written once.

Usage:
    python reconcile.py <planta.pdf> <quadro.pdf> [--casa casa_28] [--planta-page N] [--quadro-page N]
"""
from __future__ import annotations

import argparse
import json
from pathlib import Path

import points
import quadro_pontos


# casa → how its planta devices map to its quadro counts. Per-casa CONFIG (the join schemes
# live in quadro_pontos.BOTICARIO_CASAS; this adds the planta↔quadro device pairing).
#   pairs           — the 1:1 reconcilable kinds. planta_variants sums the tagged ELE_ST
#                     variants for that kind (tomada = the three amperages; ac_forca = the AC
#                     tag). quadro_field reads tally_board's robust spine number.
#   planta_only     — devices with no quadro counterpart (listed, not reconciled).
#   not_reconciled  — devices present in BOTH docs but NOT 1:1 (luminária 1:N) → reported only.
RECONCILE = {
    "casa_28": {
        "boards": ["T2"],
        "pairs": [
            {"kind": "tomada", "planta_device": "tomada",
             "planta_variants": ["tomada_10a", "tomada_20a_2pt", "tomada_20a_4pt"],
             "quadro_field": "tomada_pts"},
            {"kind": "ac_forca", "planta_device": "tomada",
             "planta_variants": ["ponto_forca_ac"],
             "quadro_field": "ac_forca_pts"},
        ],
        "planta_only": ["interruptor", "iluminacao_emergencia", "aterramento",
                        "caixa_passagem", "sensor_presenca"],
        "not_reconciled": {
            "luminaria": "1 lighting circuit : N fixtures — planta authoritative (quadro under-counts)",
        },
    },
}


def _planta_device_total(entry: dict) -> int:
    """A planta device's net count: the HITL `total` (after drops) if tagged, else raw `count`."""
    if "total" in entry:
        return entry["total"]
    return entry.get("count", 0)


def _planta_kind_count(planta_summary: dict, pair: dict) -> int:
    """Count for one reconcile kind = sum of its variants on the planta device's `by_variant`.
    The planta side of a variant device ALWAYS carries `by_variant` (points.apply_tags fills
    the default for untagged pins) — so an untagged ELE_ST reads as all-tomada / 0-AC, which IS
    the pre-split state. A device with no variant split contributes 0 to a kind (must be tagged
    to attribute)."""
    entry = planta_summary.get(pair["planta_device"])
    if not entry:
        return 0
    by_variant = entry.get("by_variant") or {}
    return sum(by_variant.get(v, 0) for v in pair["planta_variants"])


def reconcile(planta_summary: dict, quadro_tally: dict, cfg: dict) -> dict:
    """Join one casa's planta device summary to its quadro tally → per-kind Δ.

    planta_summary: {device: {count, [total], [by_variant], ...}}  (points.count_points /
                    points.main summary; region-filtered upstream for a real casa).
    quadro_tally:   quadro_pontos.tally_board(rows, board) output (tomada_pts / ac_forca_pts).
    cfg:            a RECONCILE[casa] entry.

    Returns {pairs: [{kind, planta, quadro, delta, status}], planta_only: {dev: n},
             not_reconciled: {dev: reason}}. status ∈ {match, delta}. SURFACES Δ — never
             tunes to zero. The caller (UI / CLI) decides what a non-zero Δ means."""
    pairs = []
    for p in cfg["pairs"]:
        planta_n = _planta_kind_count(planta_summary, p)
        quadro_n = quadro_tally.get(p["quadro_field"], 0)
        delta = planta_n - quadro_n
        pairs.append({"kind": p["kind"], "planta": planta_n, "quadro": quadro_n,
                      "delta": delta, "status": "match" if delta == 0 else "delta"})
    planta_only = {
        d: _planta_device_total(planta_summary[d])
        for d in cfg.get("planta_only", []) if d in planta_summary
    }
    return {"pairs": pairs, "planta_only": planta_only,
            "not_reconciled": dict(cfg.get("not_reconciled", {}))}


def _planta_summary(pdf_path: str, page_index: int) -> dict:
    """Whole-sheet planta summary with HITL tags applied (the points.main pipeline).
    NOTE: whole-sheet — for a real casa, scope to the region polygon (regionselect.html).
    Here so the CLI shows the machinery; the Δ vs a single board is expected to be large."""
    counts = points.count_points(pdf_path, points.BOTICARIO_POINTS, page_index)
    tags = points.load_tags(pdf_path)
    summary = {}
    for dev, r in counts.items():
        spec = next((s for s in points.BOTICARIO_POINTS.values() if s["device"] == dev), {})
        dev_tags = tags.get(dev, {})
        entry = {"count": r["count"]}
        if dev_tags or spec.get("variants"):
            entry.update(points.apply_tags(r, dev_tags, spec))
        summary[dev] = entry
    return summary


def _quadro_tally(pdf_path: str, boards: list[str], page_index: int) -> dict:
    """Sum tally_board across a casa's boards (most casas = one board)."""
    rows = quadro_pontos.extract_circuits(pdf_path, page_index)
    agg = {"tomada_pts": 0, "tomada_circuits": 0, "ac_forca_pts": 0, "ac_forca_circuits": 0}
    for b in boards:
        t = quadro_pontos.tally_board(rows, b)
        for k in agg:
            agg[k] += t[k]
    return agg


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("planta")
    ap.add_argument("quadro")
    ap.add_argument("--casa", default="casa_28")
    ap.add_argument("--planta-page", type=int, default=0)
    ap.add_argument("--quadro-page", type=int, default=0)
    args = ap.parse_args()
    cfg = RECONCILE[args.casa]
    planta = _planta_summary(args.planta, args.planta_page)
    quadro = _quadro_tally(args.quadro, cfg["boards"], args.quadro_page)
    rec = reconcile(planta, quadro, cfg)

    print(f"# Reconcile — {args.casa}  (boards {cfg['boards']})")
    print(f"  planta: {Path(args.planta).name}  (WHOLE SHEET — scope to the casa region for a real Δ)")
    print(f"  quadro: {Path(args.quadro).name}\n")
    print(f"  {'kind':12} {'planta':>7} {'quadro':>7} {'Δ':>6}  status")
    for r in rec["pairs"]:
        print(f"  {r['kind']:12} {r['planta']:>7} {r['quadro']:>7} {r['delta']:>+6}  {r['status']}")
    if rec["planta_only"]:
        print("\n  planta-only (no quadro counterpart):")
        for d, n in rec["planta_only"].items():
            print(f"    {d:24} {n:>5}")
    if rec["not_reconciled"]:
        print("\n  not reconciled (present in both, not 1:1):")
        for d, why in rec["not_reconciled"].items():
            print(f"    {d:24} {why}")
    print("\n" + json.dumps(rec, ensure_ascii=False))


if __name__ == "__main__":
    main()
