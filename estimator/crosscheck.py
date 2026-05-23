"""
CROSSCHECK — geometry BOM vs schedule BOM, per Ø (and any per-bitola dict).

Two INDEPENDENT sources of the same quantity validate each other (the trust
triangle's third edge):
  - GEOMETRY (ele.py): conduit metres measured from the plan's CAD lines, split
    by edge-gap → Ø. Reliable for well-separated Ø; ambiguous where drawn widths
    overlap (Ø1" vs Ø1.1/4") and blind to single-line / off-layer feeders (Ø4").
  - SCHEDULE (schedule.py): conduit metres from the quadro de cargas / alimentador
    table, Ø read from the table text. Authoritative for sizing (NBR 5410).

Where they AGREE → high confidence. Where they DIVERGE → that's the signal: the
per-Ø wall (geometry mis-bucketed Ø1↔Ø1.1/4) and the off-layer feeders (Ø4" only
in the schedule) show up as DIVERGE / SCHED_ONLY rows for a human to resolve (HITL).

Per-feeder route cross-check (schedule comp_m vs the traced conduit length for that
exact feeder) is NOT here — it needs per-feeder route tracing on the plan; this
module does the aggregate per-Ø reconciliation, which is what closes the per-Ø wall.
"""
from __future__ import annotations

import re


def _normk(k: str) -> str:
    """Canonicalise a Ø / bitola key. Diameters: the '.' is a fraction separator,
    so 'Ø1.1/4\"' == 'Ø1 1/4\"' (both → '11/4'). Gauges: the '.' is decimal, so keep
    it but drop a trailing '.0' ('185.0' == '185', '2.5' stays)."""
    is_dia = "Ø" in (k or "") or "∅" in (k or "")
    s = re.sub(r'[Ø∅"\s]', "", k or "").replace(",", ".")
    s = re.sub(r"mm2|mm²", "", s, flags=re.I)
    if is_dia:
        s = s.replace(".", "")                       # inch separator → 1.1/4 == 1 1/4
    elif "." in s:
        s = s.rstrip("0").rstrip(".")                # decimal gauge → 185.0 == 185
    return s.strip().upper()


def crosscheck(geom: dict[str, float], sched: dict[str, float],
               label: str = "eletroduto", tol_m: float = 2.0,
               tol_pct: float = 0.05) -> dict:
    """Compare two {key: metres} BOMs. status per key:
    OK (within max(tol_m, tol_pct)), DIVERGE (both present, off), GEOM_ONLY
    (schedule missing it), SCHED_ONLY (geometry missing it — single-line/off-layer)."""
    gk = {_normk(k): (k, float(v)) for k, v in geom.items()}
    sk = {_normk(k): (k, float(v)) for k, v in sched.items()}
    rows = []
    for nk in sorted(set(gk) | set(sk)):
        gname, g = gk.get(nk, (None, 0.0))
        sname, s = sk.get(nk, (None, 0.0))
        if g and s:
            status = "OK" if abs(g - s) <= max(tol_m, tol_pct * max(g, s)) else "DIVERGE"
        elif g:
            status = "GEOM_ONLY"
        else:
            status = "SCHED_ONLY"
        rows.append({"bitola": sname or gname, "geometria_m": round(g, 1),
                     "schedule_m": round(s, 1), "delta_m": round(g - s, 1),
                     "status": status})
    tg, ts = sum(v for _, v in gk.values()), sum(v for _, v in sk.values())
    return {
        "label": label,
        "per_bitola": rows,
        "total_geometria_m": round(tg, 1),
        "total_schedule_m": round(ts, 1),
        "total_delta_m": round(tg - ts, 1),
        "total_delta_pct": round((tg - ts) / ts * 100, 1) if ts else None,
        "divergencias": [r["bitola"] for r in rows if r["status"] != "OK"],
        "ok": all(r["status"] == "OK" for r in rows),
    }


def render(report: dict) -> str:
    """One-line-per-bitola text table for CLI / report."""
    out = [f"CROSSCHECK {report['label']}  (geometria vs schedule)",
           f"{'bitola':<12}{'geom_m':>9}{'sched_m':>10}{'Δm':>8}  status"]
    for r in report["per_bitola"]:
        out.append(f"{r['bitola']:<12}{r['geometria_m']:>9}{r['schedule_m']:>10}"
                   f"{r['delta_m']:>8}  {r['status']}")
    out.append(f"{'TOTAL':<12}{report['total_geometria_m']:>9}"
               f"{report['total_schedule_m']:>10}{report['total_delta_m']:>8}"
               f"  ({report['total_delta_pct']}%)")
    return "\n".join(out)


if __name__ == "__main__":
    import json
    import sys
    geom = json.load(open(sys.argv[1]))
    sched = json.load(open(sys.argv[2]))
    print(render(crosscheck(geom, sched)))
