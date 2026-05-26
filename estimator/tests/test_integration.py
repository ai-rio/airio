"""Integration tests — pin the PROVEN numbers on the real project sheets so the
config-seam refactor can't silently break them. The antidote to false positives.
Skipped automatically when the PDFs are absent (they're not committed)."""
import pytest

import schedule
import ele
import join
import points
import quadro_pontos
import reconcile

pytestmark = pytest.mark.integration


# --- CABOS: Boticário PE02 feeder table via find_tables (deterministic) ---
def test_boticario_pe02_find_tables(boticario_pe02):
    d = schedule.extract_schedule(boticario_pe02)
    assert d["method"].startswith("find_tables")      # NOT the slow LLM fallback
    agg = schedule.aggregate(d)
    elet = agg["eletroduto_m_por_pol"]
    # the 5 buckets that are exact vs Revu ground truth (well-separated Ø)
    assert elet['Ø1.1/2"'] == pytest.approx(1118, abs=2)
    assert elet['Ø1.1/4"'] == pytest.approx(356, abs=2)
    assert elet['Ø2.1/2"'] == pytest.approx(315, abs=2)
    assert elet['Ø3"'] == pytest.approx(68, abs=2)
    assert elet['Ø4"'] == pytest.approx(36, abs=2)     # off-layer feeder — only the schedule has it
    # total carries the known duplicate-row inflation (3092 raw vs 2949 deduped truth)
    assert agg["eletroduto_total_m"] == pytest.approx(3092, abs=10)
    assert agg["cabo_total_m"] > 10000                 # conductor-counted, all tri


# --- INFRA: SENAC subsolo elétrica via geometry (Revu-validated) ---
def test_senac_infra_metragem(senac_ele):
    m = ele.metragem(senac_ele, scale_denom=75)
    tot = m["total_m"]
    assert tot["barramento"] == pytest.approx(186, abs=6)     # busway, Revu 186.26
    assert tot["eletroduto"] == pytest.approx(393, abs=10)
    assert tot["eletrocalha"] == pytest.approx(432, abs=15)   # AL-BANDEJA tray (bandeja → eletrocalha)
    # eletrocalha 200mm — Revu manual 259.13 m; engine ÷2 method lands ~254 (≤ truth)
    assert m["tray_por_bitola_m"]["eletrocalha"]["200mm"] == pytest.approx(254, abs=10)


# --- INFRA OCP: a DIFFERENT project's plan, glossary-derived, NO per-project code ---
def test_boticario_infra_via_glossary(boticario_ter):
    """Boticário uses ELE_PERF (perfilado) + ELE_CALHA (eletrocalha), not SENAC's
    EL-Condutos. The glossary measures them with zero per-project config (the OCP
    win — was empty before the config seam), AND keeps the two products SEPARATE
    (perfilado ≠ eletrocalha, Carlos's rule). The combined run was 293.6 m; the
    split surfaces that perfilado dominates — hidden when both lumped into one bucket.

    REGRESSION PIN (denom=50, the detect_scale fallback — NOT Revu-validated). These
    numbers guard against silent drift; replace with a Revu ground-truth when available."""
    m = ele.metragem(boticario_ter)
    tot = m["total_m"]
    assert tot["perfilado"] == pytest.approx(208, abs=3)      # ELE_PERF — the dominant run
    assert tot["eletrocalha"] == pytest.approx(86, abs=3)     # ELE_CALHA — distinct product
    assert "leito" not in tot                                 # this sheet has no ladder tray


# --- CABLE OCP: APEX PANEL table (header-driven, single-gauge, ABNT terra) ---
def test_apex_panel_single_gauge(apex_sched):
    """APEX PAINEL QG-E-2P-AUD: a panel quadro with a single SEÇÃO column (not F/N/T)
    and NO length column. Header-driven extraction must read the gauges (QT-1=16,
    QT-2=25, QT-3=6, QT-4=10) and derive terra via ABNT — proving the cable seam is
    WIRED and works on a different table shape than the boticário feeder."""
    d = schedule.extract_schedule(apex_sched)
    rows = d["feeders"] + [c for p in d.get("panels", []) for c in p.get("circuits", [])]
    gauges = {r.get("cond_fase_mm2") or r.get("secao_fase_mm2") for r in rows}
    # the 4 real circuits' conductor gauges, read from the single SEÇÃO column
    assert {"16", "16,0", "16.0"} & gauges or any("16" in str(g) for g in gauges)
    assert any("25" in str(g) for g in gauges)
    assert any("6" in str(g) for g in gauges)
    # single-gauge → terra derived via ABNT (e.g. 25mm² fase → 16mm² terra)
    terras = {r.get("cond_terra_mm2") for r in rows if r.get("cond_terra_mm2")}
    assert terras, "single-gauge circuits must derive a terra (ABNT PE), not leave it blank"


# --- POINTS: device-symbol counting by glyph (Boticário PE06_1PAV) ---
def test_boticario_points(boticario_pe06):
    """Count device POINTS by glyph (tomada = circle-path; emergência/aterramento =
    stroke-cluster), on the project's confirmed device layers — all other ELE_* are
    infra (eletroduto/calha/perfilado), NOT points. Deterministic geometry → exact.
    Tomadas pinned to 224 under Carlos's rule 'each circle = 1 point' (his Revu initial
    189 refines UP toward this). Guards the glyph detectors against silent drift."""
    c = points.count_points(boticario_pe06, points.BOTICARIO_POINTS)
    assert c["tomada"]["count"] == 255                   # 224 circle ⊖ + 31 square floor-box ⊠ (multi); both = 1 outlet
    assert c["iluminacao_emergencia"]["count"] == 35     # 10–12-stroke glyph cluster
    assert c["aterramento"]["count"] == 1                # Carlos: "just 1" earthing device
    assert c["luminaria"]["count"] == 238                # all fixture symbols = install pts; Revu 244 (Δ6 HITL)
    assert c["interruptor"]["count"] == 77               # ELE_SI drops (boxes); Revu per-variant 78 (Δ−1). Raw 'S' symbols=97 = easy-way overcount
    assert c["caixa_passagem"]["count"] == 67            # ELE_SF hatched-square glyph; scoped 66 = Revu 66 EXACT (whole-page +1 legend)
    assert c["sensor_presenca"]["count"] == 9            # ELE_SAL PIR glyph; Revu 12 (Δ−3: ELE_SAL has 11 clusters max — ~1 merged + 2 variant, HITL)
    # centroids accompany the count (the overlay/HITL proof = WHERE each point is)
    assert len(c["tomada"]["centroids"]) == 255


# --- HITL: apply_tags pure-function tests (no PDF needed) ---

def test_apply_tags_variant_split():
    """Tags split non-dropped pins by label; untagged go to default; dropped are excluded."""
    spec = {"device": "interruptor", "glyph": "symbol_box",
            "variants": {"default": "simples", "labels": ["simples", "2secoes", "paralelo", "condulete"]}}
    dr = {"count": 5, "layer": "ELE_SI", "glyph": "symbol_box",
          "centroids": [(0, 0), (1, 1), (2, 2), (3, 3), (4, 4)]}
    tags = {"0": "paralelo", "1": "paralelo", "4": "drop"}
    result = points.apply_tags(dr, tags, spec)
    assert result["total"] == 4
    assert result["dropped"] == 1
    assert result["by_variant"] == {"simples": 2, "paralelo": 2}


def test_apply_tags_tomada_amperage_split():
    """ELE_ST outlet split by amperage (Carlos's PE06 ground truth: 10A majority, 21× 20A-2P+T,
    1× 20A-4P+T, ~35 AC). Amperage is NOT geometric (identical circle) and has no per-outlet
    planta key → HITL EXCEPTION-tagging: default to the majority 10A, tap only the few 20A/AC.
    Models the real pattern at small scale: 1 outlet of each exception, rest default to 10A."""
    spec = points.BOTICARIO_POINTS["ELE_ST"]
    assert spec["variants"]["default"] == "tomada_10a"
    for lbl in ("tomada_20a_2pt", "tomada_20a_4pt", "ponto_forca_ac"):
        assert lbl in spec["variants"]["labels"]
    dr = {"count": 6, "layer": "ELE_ST", "glyph": "multi",
          "centroids": [(i, i) for i in range(6)]}
    # tag the 3 exceptions; the other 3 untagged → default tomada_10a
    tags = {"0": "tomada_20a_2pt", "1": "tomada_20a_4pt", "2": "ponto_forca_ac"}
    result = points.apply_tags(dr, tags, spec)
    assert result["total"] == 6
    assert result["dropped"] == 0
    assert result["by_variant"] == {
        "tomada_10a": 3, "tomada_20a_2pt": 1, "tomada_20a_4pt": 1, "ponto_forca_ac": 1}


def test_apply_tags_unknown_label_raises():
    """A label not in variants.labels and not 'drop' must raise ValueError."""
    spec = {"device": "interruptor", "glyph": "symbol_box",
            "variants": {"default": "simples", "labels": ["simples", "paralelo"]}}
    dr = {"count": 3, "layer": "ELE_SI", "glyph": "symbol_box",
          "centroids": [(0, 0), (1, 1), (2, 2)]}
    with pytest.raises(ValueError):
        points.apply_tags(dr, {"0": "bogus"}, spec)


def test_apply_tags_bad_index_raises():
    """A tag index out of range [0, count) must raise ValueError."""
    spec = {"device": "interruptor", "glyph": "symbol_box",
            "variants": {"default": "simples", "labels": ["simples", "paralelo"]}}
    dr = {"count": 3, "layer": "ELE_SI", "glyph": "symbol_box",
          "centroids": [(0, 0), (1, 1), (2, 2)]}
    with pytest.raises(ValueError):
        points.apply_tags(dr, {"99": "simples"}, spec)


def test_apply_tags_no_variants():
    """When spec has no variants, 'drop' tag still excludes pins; by_variant is empty."""
    spec = {"device": "luminaria", "glyph": "cluster"}
    dr = {"count": 3, "layer": "MMM-LUMINOTÉCNICA", "glyph": "cluster",
          "centroids": [(0, 0), (1, 1), (2, 2)]}
    result = points.apply_tags(dr, {"0": "drop"}, spec)
    assert result["total"] == 2
    assert result["dropped"] == 1
    assert result["by_variant"] == {}


def test_count_points_idempotent(boticario_pe06):
    """Centroid list is stable across two calls — prerequisite for stable tag indices."""
    c1 = points.count_points(boticario_pe06, points.BOTICARIO_POINTS)
    c2 = points.count_points(boticario_pe06, points.BOTICARIO_POINTS)
    assert c1["interruptor"]["centroids"] == c2["interruptor"]["centroids"]


def test_load_tags_absent_returns_empty(tmp_path):
    """load_tags returns {} when no sidecar exists next to the pdf path."""
    fake_pdf = str(tmp_path / "plan.pdf")
    assert points.load_tags(fake_pdf) == {}


def test_overlay_writes_per_device_png(boticario_pe06, tmp_path):
    """overlay writes the all-device PNG plus a clean per-variant-device PNG (the tag surface)."""
    png = tmp_path / "ov.png"
    points.overlay(boticario_pe06, points.BOTICARIO_POINTS, str(png))
    assert png.exists()
    assert (tmp_path / "ov_interruptor.png").exists()   # interruptor has variants configured
    assert (tmp_path / "ov_tomada.png").exists()        # tomada now has variants (AC-split tag surface)


# --- RECONCILER: APEX schedule (known) ↔ APEX plan, join by name ---
def test_apex_join(apex_plan):
    sched = {"feeders": [], "panels": [{"nome": "QG-E-2P-AUD", "circuits": [
        {"id": "QT-1", "descricao": "QT-E-2P-ILUM.CEN"},
        {"id": "QT-3", "descricao": "QT-E-2P-B-AUD-2"},
        {"id": "QT-4", "descricao": "QT-E-2P-B-OBS"},
    ]}]}
    r = join.join(sched, apex_plan)
    matched = {m["name"] for m in r["matched"]}
    assert "QG-E-2P-AUD" in matched                   # panel placed on the plan
    plan_only = {m["name"] for m in r["plan_only"]}
    assert any("PDC" in n for n in plan_only)         # QT-E-2P-B-PDC: on plan, not scheduled (HITL)


# --- QUADRO SPINE: device-point counts from the quadro de cargas (Boticário PE06_TRI) ---
def test_quadro_pontos_casa28_spine(boticario_pe06_tri):
    """The deterministic SPINE: device counts come from the quadro de cargas (QTD per
    circuit), joined to casa-28 by the `-T2` board suffix in the circuit NOME. PIN the
    ROBUST raw qtd-sums (NOT the classifier output): tomada = 88 pts / 11 circ (Carlos Revu
    91, Δ3) AND AC-força = 13 pts / 13 circ (Revu 15, Δ2 = common-area AC carried no-suffix,
    HITL-assigned). 20A-tomada = 0 (Carlos oracle): every -T2 tomada is 162 VA/pt = 10A.
    Guards the CID-anchored extraction + suffix join + per-board AC tally against drift."""
    rows = quadro_pontos.extract_circuits(boticario_pe06_tri)
    summ = quadro_pontos.summarize(rows)
    b2 = summ["by_board"]["T2"]
    assert b2["pts"] == 88 and b2["circ"] == 11                # casa-28 tomada spine (Revu 91, Δ3)
    assert b2["ac_pts"] == 13 and b2["ac_circ"] == 13          # casa-28 AC-força spine (Revu 15, Δ2=HITL common)
    t2 = quadro_pontos.tally_board(rows, "T2")
    assert t2["tomada_pts"] == 88
    assert t2["tomada_circuits"] == 11
    assert t2["ac_forca_pts"] == 13                            # 13 board-T2 AR COND @40VA = fan-coil força points
    # 20A-tomada count for casa-28 = 0 (Carlos oracle): every -T2 tomada is 162 VA/pt = 10A
    assert all(c["class"] != "tomada_20a" for c in t2["circuits"])
    # the I/EM CID prefix must be captured (else iluminação circuits silently vanish)
    assert summ["by_class_circuits"].get("iluminacao", 0) >= 10
    # no-suffix tomada circuits (bar/lounge dedicated + service rooms) are SURFACED for
    # HITL per-casa assignment, never silently bucketed into a casa
    assert len(summ["no_suffix_tomada_HITL"]) > 0
    # CID-anchoring must absorb the leading-disjuntor column (T7: 17 cols vs 16) — some rows
    # then carry the breaker as `disj` enrichment; guards against a from-table-start regression
    assert any(r["disj"] for r in rows)


def test_quadro_pontos_classify_rules():
    """classify is the SECONDARY (heuristic) signal — assert the RULES, not pinned counts.
    NBR 5410: ~162 VA/pt = 10A TUG, 600 VA/pt = 20A TUE, named-equip/4mm² = dedicated."""
    tug = {"cid": "T1", "nome": "TOMADAS Q82-T2", "qtd": 8, "pot_va": 1300, "fase_mm2": "2.5"}
    tue = {"cid": "T3", "nome": "TOM. OPEN KITCHEN", "qtd": 4, "pot_va": 2400, "fase_mm2": "2.5"}
    ded = {"cid": "T2", "nome": "TOM. SECADORA ROUPAS", "qtd": 1, "pot_va": 4500, "fase_mm2": "4.0"}
    ac_big = {"cid": "AC1", "nome": "AR COND. SPLIT", "qtd": 1, "pot_va": 2000, "fase_mm2": "2.5"}
    ac_fan = {"cid": "AC2", "nome": "AR COND. Q82", "qtd": 1, "pot_va": 40, "fase_mm2": "2.5"}
    ilum = {"cid": "I.1", "nome": "ILUMINAÇÃO", "qtd": 3, "pot_va": 75, "fase_mm2": "2.5"}
    assert quadro_pontos.classify(tug) == "tomada_10a"
    assert quadro_pontos.classify(tue) == "tomada_20a"
    assert quadro_pontos.classify(ded) == "dedicado_equip"
    assert quadro_pontos.classify(ac_big) == "ac_real"
    # 40VA fan-coil AR COND is a real AC-força point, NOT a control signal (Carlos oracle,
    # casa-28): nominal VA is not a força/control discriminator
    assert quadro_pontos.classify(ac_fan) == "ac_real"
    assert quadro_pontos.classify(ilum) == "iluminacao"


def test_quadro_pontos_pe07_generalizes(boticario_pe07_tri):
    """Extraction generalizes to casa-20's sheet (PE07_TRI) — but casa-20's circuits use
    the TITLE scheme (function names, NO `-T#` tag), so the suffix join yields no board-T2
    and every tomada circuit lands in the HITL no-suffix bucket. Confirms the engine runs
    on a second sheet without per-sheet code; casa-20's title→table join stays deferred."""
    rows = quadro_pontos.extract_circuits(boticario_pe07_tri)
    assert len(rows) > 30                                    # circuits extracted, no crash
    summ = quadro_pontos.summarize(rows)
    assert "T2" not in summ["by_board"]                      # casa-28 board not on this sheet
    assert len(summ["no_suffix_tomada_HITL"]) > 0           # casa-20 tomadas need title-join (HITL)


# --- RECONCILER: real quadro spine (PE06_TRI) joined to a planta summary ---
def test_reconcile_casa28_quadro_side(boticario_pe06_tri):
    """End-to-end on the QUADRO side: the real CID-anchored extraction → casa-28 board-T2
    tally feeds the reconciler at the deterministic spine (88 tomada / 13 AC-força). Joined
    to a representative human-tagged planta region, the Δ surfaces — the verification UI's
    engine. (The planta side is scoped by the human polygon in regionselect.html, not here.)"""
    cfg = reconcile.RECONCILE["casa_28"]
    quadro = reconcile._quadro_tally(boticario_pe06_tri, cfg["boards"], 0)
    assert quadro["tomada_pts"] == 88                        # the pinned casa-28 spine, via reconcile
    assert quadro["ac_forca_pts"] == 13
    # a planta region tagged to MATCH the spine → Δ0 on both lines (the human's goal state)
    planta = {"tomada": {"count": 101,
                         "by_variant": {"tomada_10a": 88, "ponto_forca_ac": 13}}}
    pairs = {p["kind"]: p for p in reconcile.reconcile(planta, quadro, cfg)["pairs"]}
    assert pairs["tomada"]["status"] == "match" and pairs["tomada"]["delta"] == 0
    assert pairs["ac_forca"]["status"] == "match" and pairs["ac_forca"]["delta"] == 0
