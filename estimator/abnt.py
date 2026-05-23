"""
ABNT NBR 5410 domain rules.

`abnt_pe_gauge` — sizes the protective conductor (terra / PE) from the phase gauge
when a circuit lists a single gauge (the terra isn't given explicitly). The PE
shrinks for bigger phases (you don't run a 120mm² earth for a 120mm² feeder):
  - fase ≤ 16 mm²  → PE = fase
  - 16 < fase ≤ 35 → PE = 16
  - fase > 35      → PE = fase / 2, rounded UP to the next commercial gauge
"""
from __future__ import annotations

COMMERCIAL = (1.5, 2.5, 4, 6, 10, 16, 25, 35, 50, 70, 95, 120, 150, 185, 240, 300, 400, 500)


def abnt_pe_gauge(fase_mm2: float) -> float:
    """Phase gauge (mm²) → protective-conductor gauge (mm²) per NBR 5410."""
    s = float(fase_mm2)
    if s <= 16:
        pe = s
    elif s <= 35:
        pe = 16.0
    else:
        pe = s / 2
    # commercial gauge ≥ pe (a real cable you can buy)
    return next((g for g in COMMERCIAL if g >= pe), pe)
