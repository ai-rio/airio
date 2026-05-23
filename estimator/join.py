"""
JOIN — reconcile the SCHEDULE (sizing source, schedule.py) against the PLAN
geometry (placement source) by panel / circuit / feeder NAME.

The schedule says WHAT must exist and its sizing (Ø, cable, polaridade); the plan
says WHERE it is. Joining by name closes the trust triangle and surfaces the
compatibilização gaps a human must resolve (HITL):
  - matched      → name in both (schedule entry placed on the plan) — trusted.
  - schedule_only→ in the schedule but NOT found on this plan sheet (missing
                   placement, or it lives on another floor) — review.
  - plan_only    → a panel/circuit label on the plan with NO schedule entry
                   (undocumented / fed elsewhere) — review.

Name matching is convention-agnostic: it uses the schedule's own authoritative
names and looks each up in the plan's text, normalized (accent/case/separator
folded). No per-project regex for the matched set; the plan_only scan uses a
loose panel-shape just to surface undocumented labels.

The geometry METRAGEM cross-check (schedule comp_m vs measured route length) needs
ele.py reconfigured for the plan's layer scheme — carried as a TODO, not done here.
"""
from __future__ import annotations

import re
import unicodedata

import fitz

# loose "looks like a panel/circuit tag" shape, only for the plan_only surface
PANELISH = re.compile(r"^(QG|QGBT|QGLF|QT|QF|QL|QDL|QDU|QD|BD|QE|QTA)[-.\w]*[-.]\w", re.I)


def _norm(s: str) -> str:
    """Fold accents/case/separators so 'QL-NE-T' == 'ql ne t' == 'QLNET'."""
    s = unicodedata.normalize("NFKD", s or "").encode("ascii", "ignore").decode()
    return re.sub(r"[\s._\-]+", "", s).upper()


def schedule_names(sched: dict) -> dict[str, tuple[str, str]]:
    """norm -> (kind, original_name) for every panel/circuit/feeder the schedule names."""
    names: dict[str, tuple[str, str]] = {}
    for p in sched.get("panels", []):
        if p.get("nome"):
            names[_norm(p["nome"])] = ("panel", p["nome"])
        for c in p.get("circuits", []):
            for key in (c.get("descricao"), c.get("id")):
                if key and _norm(key) not in names:
                    names[_norm(key)] = ("circuit", key)
    for f in sched.get("feeders", []):
        for key in (f.get("nome"), f.get("origem"), f.get("destino")):
            if key and _norm(key) not in names:
                names[_norm(key)] = ("feeder", key)
    return names


def plan_labels(plan_pdf: str, page_index: int = 0) -> list[tuple[str, float, float]]:
    pg = fitz.open(plan_pdf)[page_index]
    return [(w[4], (w[0] + w[2]) / 2, (w[1] + w[3]) / 2) for w in pg.get_text("words")]


def join(sched: dict, plan_pdf: str, page_index: int = 0) -> dict:
    """Reconcile a schedule dict against a plan PDF by name. Returns matched /
    schedule_only / plan_only + the schedule BOM carried through."""
    snames = schedule_names(sched)
    labels = plan_labels(plan_pdf, page_index)
    plan_norm: dict[str, tuple[str, float, float]] = {}
    for t, x, y in labels:
        if len(t) > 2:
            plan_norm.setdefault(_norm(t), (t, x, y))

    matched, schedule_only = [], []
    for nrm, (kind, orig) in snames.items():
        if nrm in plan_norm:
            t, x, y = plan_norm[nrm]
            matched.append({"name": orig, "kind": kind, "x": round(x), "y": round(y)})
        else:
            schedule_only.append({"name": orig, "kind": kind})

    seen, plan_only = set(), []
    for t, x, y in labels:
        n = _norm(t)
        if n in snames or n in seen or not PANELISH.match(t):
            continue
        seen.add(n)
        plan_only.append({"name": t, "x": round(x), "y": round(y)})

    return {
        "matched": sorted(matched, key=lambda m: m["name"]),
        "schedule_only": sorted(schedule_only, key=lambda m: m["name"]),
        "plan_only": sorted(plan_only, key=lambda m: m["name"]),
        "summary": {"matched": len(matched), "schedule_only": len(schedule_only),
                    "plan_only": len(plan_only),
                    "match_rate": round(len(matched) / max(1, len(snames)), 2)},
        "todo": "metragem cross-check (schedule comp_m vs measured route) needs ele.py "
                "reconfigured for this plan's layer scheme",
    }


if __name__ == "__main__":
    import json
    import sys
    sched = json.load(open(sys.argv[1]))
    sched = sched.get("extracted", sched)          # accept schedule.py's wrapped output
    page = int(sys.argv[3]) if len(sys.argv) > 3 else 0
    print(json.dumps(join(sched, sys.argv[2], page), indent=2, ensure_ascii=False))
