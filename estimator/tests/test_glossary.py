"""Glossary-driven, project-agnostic layer→kind derivation (the config seam).
Pure function — no PDF. Tests the behavior that matters: classify infra runs by
the project's OWN layer names via a SHARED glossary, exclude fittings/boxes, and
work across projects (SENAC `EL-Condutos…` AND boticário `ELE_PERF`) with no
per-project code."""
from glossary import derive_layer_kinds


def test_glossary_derives_layer_kinds_cross_project():
    layers = [
        "EL-Condutos 03. AL-DUTO AG (Teto)",   # SENAC conduit
        "EL-Condutos 02. AL-BANDEJA (Teto)",   # SENAC tray
        "EL-Barramento blindado 01. AL-BW",    # SENAC busway
        "EL-Conexões 03. AL-DUTO AG",          # SENAC FITTING — has "DUTO" but must exclude
        "0. QUADROS",                          # box — exclude
        "ELE_PERF",                            # boticário perfilado — tray, NO per-project code
        "ELE_TX",                              # boticário text — not infra
    ]
    kinds = derive_layer_kinds(layers)
    assert kinds["EL-Condutos 03. AL-DUTO AG (Teto)"] == "eletroduto"
    assert kinds["EL-Condutos 02. AL-BANDEJA (Teto)"] == "bandeja"
    assert kinds["EL-Barramento blindado 01. AL-BW"] == "barramento"
    assert kinds["ELE_PERF"] == "bandeja"             # the cross-project win (OCP)
    # exclusions: fitting/box/text never count as a run, even if a kind-word matches
    assert "EL-Conexões 03. AL-DUTO AG" not in kinds  # "DUTO" present but it's a fitting
    assert "0. QUADROS" not in kinds
    assert "ELE_TX" not in kinds
