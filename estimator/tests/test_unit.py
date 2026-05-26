"""Unit tests — pure logic, no PDFs. Lock the rules that are easy to break in a
refactor: the conductor cable rule and the geometry↔schedule cross-check."""
import schedule
import crosscheck
import reconcile


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


def test_is_gauge_bare_integer():
    """B3: a gauge may be written as a bare integer ('185','16','50'), not only a
    decimal ('185.0'). _is_gauge must accept catalog ints, and _gnorm must NOT
    corrupt them (the bug: rstrip('0') turned '50'→'5', '150'→'15'). Non-catalog
    ints stay False; decimals keep working."""
    g = schedule._is_gauge
    assert g("185") and g("16") and g("4") and g("6")        # bare-int catalog gauges (B3)
    assert g("50") and g("150") and g("500")                 # trailing-zero ints (the _gnorm trap)
    assert g("185.0") and g("2,5") and g("16.0")             # decimals still resolve
    assert not g("17") and not g("7") and not g("1000")      # not in the catalog
    assert not g("") and not g("foo")
    assert schedule._gnorm("50") == "50" and schedule._gnorm("150") == "150"   # not "5"/"15"
    assert schedule._gnorm("185.0") == "185" and schedule._gnorm("2,5") == "2.5"


def test_to_float_br_number_formats():
    """B6: '.' is decimal in THIS project (500.00, 185.0) but thousands in BR
    (1.500 = 1500). Disambiguate by trailing-group-of-3, don't blindly strip."""
    f = schedule._to_float
    assert f("6") == 6                    # plain int
    assert f("500.00") == 500             # US-style decimal (must NOT become 50000)
    assert f("185,0") == 185              # BR decimal comma
    assert f("1.500") == 1500             # BR thousands (the bug: was 1.5)
    assert f("1.234.567") == 1234567      # BR thousands, multi-group
    assert f("1.5") == 1.5                # decimal (1 trailing digit, not thousands)
    assert f("12.345,6") == 12345.6       # BR thousands + decimal


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


def test_reconcile_split_surfaces_delta():
    """The reconcile join (pure): planta ELE_ST splits tomada vs AC by the HITL `by_variant`
    tags → tomada-pins ↔ quadro tomada, AC-pins ↔ quadro AC-força, SEPARATELY. Surfaces Δ,
    never balances to zero. planta-only devices listed; luminária reported as not-1:1."""
    cfg = reconcile.RECONCILE["casa_28"]
    # a human-tagged casa-28 region: 88 tomada-pins (86×10A + 2×20A) + 13 AC-pins
    planta = {
        "tomada": {"count": 101, "total": 101, "dropped": 0,
                   "by_variant": {"tomada_10a": 86, "tomada_20a_2pt": 2, "ponto_forca_ac": 13}},
        "luminaria": {"count": 75},
        "interruptor": {"count": 36},
        "aterramento": {"count": 1},
    }
    quadro = {"tomada_pts": 88, "ac_forca_pts": 13}        # the deterministic casa-28 spine
    rec = reconcile.reconcile(planta, quadro, cfg)
    pairs = {p["kind"]: p for p in rec["pairs"]}
    assert pairs["tomada"] == {"kind": "tomada", "planta": 88, "quadro": 88,
                               "delta": 0, "status": "match"}
    assert pairs["ac_forca"] == {"kind": "ac_forca", "planta": 13, "quadro": 13,
                                 "delta": 0, "status": "match"}
    assert rec["planta_only"] == {"interruptor": 36, "aterramento": 1}   # absent devices omitted
    assert "luminaria" in rec["not_reconciled"]                          # 1:N, reported only


def test_reconcile_nonzero_delta_flagged():
    """A non-zero Δ is reported with status='delta' — the reconciler NEVER tunes a side to
    zero (param-torture trap). quadro Revu 91/15 vs planta 88/13 → the known Δ3/Δ2 surface."""
    cfg = reconcile.RECONCILE["casa_28"]
    planta = {"tomada": {"by_variant": {"tomada_10a": 88, "ponto_forca_ac": 13}}}
    quadro = {"tomada_pts": 91, "ac_forca_pts": 15}
    pairs = {p["kind"]: p for p in reconcile.reconcile(planta, quadro, cfg)["pairs"]}
    assert pairs["tomada"]["delta"] == -3 and pairs["tomada"]["status"] == "delta"
    assert pairs["ac_forca"]["delta"] == -2 and pairs["ac_forca"]["status"] == "delta"


def test_reconcile_untagged_is_all_tomada():
    """Pre-split state: an UNTAGGED ELE_ST (points.apply_tags fills the tomada_10a default)
    reads as all-tomada / 0-AC — the AC line stays 0 until the human taps the AC pins."""
    cfg = reconcile.RECONCILE["casa_28"]
    planta = {"tomada": {"count": 101, "by_variant": {"tomada_10a": 101}}}
    pairs = {p["kind"]: p for p in
             reconcile.reconcile(planta, {"tomada_pts": 88, "ac_forca_pts": 13}, cfg)["pairs"]}
    assert pairs["tomada"]["planta"] == 101                  # everything defaults to tomada
    assert pairs["ac_forca"]["planta"] == 0                  # nothing tagged AC yet
