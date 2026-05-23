"""Glossary-driven, project-agnostic layer→kind derivation (the config seam).
Pure function — no PDF. Tests the behavior that matters: classify infra runs by
the project's OWN layer names via a SHARED glossary, exclude fittings/boxes, and
work across projects (SENAC `EL-Condutos…` AND boticário `ELE_PERF`) with no
per-project code. Each tray PRODUCT is its own kind (perfilado ≠ eletrocalha ≠
leito) — they are bought and priced separately."""
from glossary import derive_layer_kinds, layer_kind


def test_glossary_derives_layer_kinds_cross_project():
    layers = [
        "EL-Condutos 03. AL-DUTO AG (Teto)",   # SENAC conduit
        "EL-Condutos 02. AL-BANDEJA (Teto)",   # SENAC tray (bandeja = eletrocalha family)
        "EL-Barramento blindado 01. AL-BW",    # SENAC busway
        "EL-Conexões 03. AL-DUTO AG",          # SENAC FITTING — has "DUTO" but must exclude
        "0. QUADROS",                          # box — exclude
        "ELE_PERF",                            # boticário perfilado — its OWN kind, NO per-project code
        "ELE_CALHA",                           # boticário eletrocalha
        "ELE_TX",                              # boticário text — not infra
    ]
    kinds = derive_layer_kinds(layers)
    assert kinds["EL-Condutos 03. AL-DUTO AG (Teto)"] == "eletroduto"
    assert kinds["EL-Condutos 02. AL-BANDEJA (Teto)"] == "eletrocalha"
    assert kinds["EL-Barramento blindado 01. AL-BW"] == "barramento"
    assert kinds["ELE_PERF"] == "perfilado"           # perfilado is its OWN product, not eletrocalha
    assert kinds["ELE_CALHA"] == "eletrocalha"        # the cross-project win (OCP)
    # exclusions: fitting/box/text never count as a run, even if a kind-word matches
    assert "EL-Conexões 03. AL-DUTO AG" not in kinds  # "DUTO" present but it's a fitting
    assert "0. QUADROS" not in kinds
    assert "ELE_TX" not in kinds


def test_glossary_excludes_other_disciplines():
    """B4: the glossary is discipline-blind by default — a CFTV/dados conduit
    (`CE-Condutos`) or fire-detection (`SDAI`) layer carries a run-word but is NOT
    electrical-power infra. It must not be measured in the elétrica takeoff. This
    FP is real: SENAC's Revu-validated sheet carries `CE-Condutos DADOS (Piso)`."""
    assert layer_kind("CE-Condutos DADOS (Piso)") is None     # SENAC CFTV/dados — real FP
    assert layer_kind("CE-Condutos") is None                  # bare CE- prefix
    assert layer_kind("SDAI-Eletroduto") is None              # fire detection
    assert layer_kind("CFTV-Conduto") is None
    # but a real electrical conduit/eletrocalha must still resolve
    assert layer_kind("EL-Condutos 03. AL-DUTO AG") == "eletroduto"
    assert layer_kind("ELE_CALHA") == "eletrocalha"


def test_glossary_perf_word_boundary():
    """B4: 'perf' abbreviates perfilado (ELE_PERF), but must NOT match unrelated
    words like 'perfuração' (drilling) or 'perfeito'. Token-bounded match only."""
    assert layer_kind("ELE_PERF") == "perfilado"              # abbreviation — keep
    assert layer_kind("ELE_PERFILADO") == "perfilado"         # full word — keep
    assert layer_kind("A_PERFURACAO_40") is None              # drilling — reject
    assert layer_kind("PERFEITO") is None                     # not infra — reject
