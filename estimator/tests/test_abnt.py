"""ABNT NBR 5410 protective-conductor (terra/PE) sizing — the rule that governs a
single-gauge circuit's earthing (PE shrinks for bigger fases). Confirmed by Carlos."""
import pytest

from abnt import abnt_pe_gauge


@pytest.mark.parametrize("fase, pe", [
    (2.5, 2.5), (10, 10), (16, 16),     # ≤16 → PE = fase
    (25, 16), (35, 16),                 # 16<fase≤35 → PE = 16
    (50, 25), (70, 35), (95, 50),       # >35 → fase/2 → next commercial gauge
    (120, 70), (150, 95), (185, 95), (240, 120),
])
def test_abnt_pe_gauge(fase, pe):
    assert abnt_pe_gauge(fase) == pe
