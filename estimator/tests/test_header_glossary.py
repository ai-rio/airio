"""Header-driven column mapping (the CABLE config seam) — project-agnostic.
Column MEANING comes from the table's OWN header text via a shared header glossary,
not hardcoded positions or per-format assumptions. Pure function, no PDF."""
from header_glossary import map_columns


def test_map_feeder_header():
    # boticário ALIMENTADORES header (the proven feeder table)
    header = ["NOME", "ORIGEM", "DESTINO", "TENSÃO (V)", "POTÊNCIA INST. (kVA)",
              "POTÊNCIA DEM. (kVA)", "QTD CABO", "FASE", "NEUTRO", "TERRA",
              "ISOLAÇÃO", "QUEDA DE TENSÃO", "DIÂMETRO ELETRODUTO", "COMP. (m)"]
    cm = map_columns(header)
    assert cm["eletroduto"] == 12
    assert cm["comp"] == 13
    assert cm["fase"] == 7
    assert cm["neutro"] == 8
    assert cm["terra"] == 9
    assert cm["qtd"] == 6


def test_panel_single_secao_is_gauge():
    # APEX panel: a single "SEÇÃO DO CIRCUITO" gauge (not F/N/T split) → fase gauge
    cm = map_columns(["CIRCUITO", "DESCRIÇÃO", "CORRENTE (A)", "TENSÃO (V)",
                      "POTÊNCIA REAL (W)", "SEÇÃO DO CIRCUITO"])
    assert cm["fase"] == 5
    assert cm["nome"] == 0
    assert "comp" not in cm        # no length column → metres come from the plan / HITL


def test_comp_synonym_dist():
    # panel schedules call the length column DIST.(m), not COMP — same field
    cm = map_columns(["CIRC.N", "NOME", "DIST.", "(m)", "SEÇÃO FASE", "NEUTRO", "TERRA"])
    assert cm["comp"] == 2
    assert cm["fase"] == 4 and cm["neutro"] == 5 and cm["terra"] == 6
