"""Unit tests — pure logic, no PDFs. Lock the rules that are easy to break in a
refactor: the conductor cable rule and the geometry↔schedule cross-check."""
import schedule
import crosscheck


def test_conductor_rule_mono_bi_tri():
    """Carlos's rule: mono N+F+T, tri N+FFF+T; each conductor at its own gauge;
    neutro/terra only if present; qtd parallels fase+neutro, terra ×1."""
    data = {"feeders": [
        {"comp_m": "10", "polaridade": "mono", "cond_fase_mm2": "2.5",
         "cond_neutro_mm2": "2.5", "cond_terra_mm2": "2.5", "qtd_cabos": "1"},
        {"comp_m": "10", "polaridade": "tri", "cond_fase_mm2": "6.0",
         "cond_neutro_mm2": "6.0", "cond_terra_mm2": "6.0", "qtd_cabos": "1"},
        {"comp_m": "10", "polaridade": "tri", "cond_fase_mm2": "95.0",   # motor, no neutro
         "cond_neutro_mm2": "", "cond_terra_mm2": "50.0", "qtd_cabos": "1"},
        {"comp_m": "10", "polaridade": "tri", "cond_fase_mm2": "185.0",  # parallel ×2
         "cond_neutro_mm2": "185.0", "cond_terra_mm2": "95.0", "qtd_cabos": "2"},
    ], "panels": []}
    cab = schedule.aggregate(data)["cabo_m_por_bitola"]
    assert cab["2.5mm²"] == 30      # mono: (1F+1N+1T)×10
    assert cab["6.0mm²"] == 50      # tri:  (3F+1N+1T)×10
    assert cab["95.0mm²"] == 40     # motor 3F@95 (30) + parallel terra 95 (10)
    assert cab["50.0mm²"] == 10     # motor terra
    assert cab["185.0mm²"] == 80    # (3F+1N)×2×10


def test_unknown_polarity_flagged():
    data = {"feeders": [{"comp_m": "10", "polaridade": "", "cond_fase_mm2": "4.0",
                         "cond_neutro_mm2": "4.0", "cond_terra_mm2": "4.0"}], "panels": []}
    agg = schedule.aggregate(data)
    assert agg["cabo_polaridade_indefinida"]      # surfaced for HITL, not silently guessed


def test_crosscheck_flags_per_bitola():
    """The per-Ø wall as a regression guard: well-separated Ø agree; the
    overlapping pair diverges; the off-layer feeder is schedule-only."""
    geom = {'Ø3/4"': 52.3, 'Ø1"': 8.2, 'Ø1.1/4"': 131.2, 'Ø2"': 124.5, 'Ø3"': 72.0}
    sched = {'Ø3/4"': 52.35, 'Ø1"': 14.84, 'Ø1.1/4"': 119.89, 'Ø2"': 123.35,
             'Ø3"': 71.82, 'Ø4"': 6.97}
    r = crosscheck.crosscheck(geom, sched)
    st = {row["bitola"]: row["status"] for row in r["per_bitola"]}
    assert st['Ø3/4"'] == "OK" and st['Ø2"'] == "OK" and st['Ø3"'] == "OK"
    assert st['Ø1"'] == "DIVERGE" and st['Ø1.1/4"'] == "DIVERGE"
    assert st['Ø4"'] == "SCHED_ONLY"
    assert abs(r["total_delta_pct"]) < 1            # totals within 1%


def test_crosscheck_key_normalisation():
    # Ø1.1/4" == Ø1 1/4" must collapse to one row
    r = crosscheck.crosscheck({'Ø1.1/4"': 100.0}, {'Ø1 1/4"': 100.0})
    assert len(r["per_bitola"]) == 1 and r["per_bitola"][0]["status"] == "OK"
