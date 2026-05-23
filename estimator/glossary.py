"""
Shared BR-electrical vocabulary — the project-agnostic config seam.

The engine never hardcodes a project's layer names. Instead it matches each layer
against this glossary of synonyms → canonical kind. Works on SENAC (`EL-Condutos…
AL-BANDEJA`) and boticário (`ELE_PERF`) alike because it matches the *word*, not
the project prefix. New project = (usually) no code: its layers self-describe.
Where the glossary can't resolve a layer (project abbreviations, dirty layers),
it returns nothing for it → the human maps it (HITL override), saved per project.

Order matters: a SENAC tray layer is `EL-Condutos … AL-BANDEJA` — the group word
"condutos" contains "duto", so BANDEJA must win before ELETRODUTO. Eletroduto is
the fallback run-kind. EXCLUDE always wins (a fitting/box is never a run, even if
its name carries a run word, e.g. `EL-Conexões … AL-DUTO`).
"""
from __future__ import annotations

# canonical kind → synonyms (checked in THIS order; eletroduto last = fallback)
INFRA_KINDS: dict[str, tuple[str, ...]] = {
    "bandeja":    ("bandeja", "eletrocalha", "calha", "leito", "perfilado", "perf"),
    "barramento": ("barramento", "busway", "blindado", "barra blindada"),  # PT canonical, matches ele.py
    "eletroduto": ("duto", "conduto", "eletroduto"),
}

# never a measurable run, regardless of any kind-word in the name:
# fittings (conex), boxes (quadro), annotation, and the grounding/equipotential bus
# (PR-Barramento de equipotencialização) which carries "barramento" but is not a busway run.
EXCLUDE: tuple[str, ...] = ("conex", "quadro", "legenda", "carimbo", "texto",
                            "equipotencial", "aterr", "spda")


def layer_kind(name: str) -> str | None:
    """One layer name → canonical infra kind, or None if excluded/unknown."""
    low = (name or "").lower()
    if any(x in low for x in EXCLUDE):
        return None
    for kind, syns in INFRA_KINDS.items():
        if any(s in low for s in syns):
            return kind
    return None


def derive_layer_kinds(layers: list[str]) -> dict[str, str]:
    """Project's layer names → {layer: kind} for the runs we measure. Unknown/
    excluded layers are omitted (→ HITL maps the residual)."""
    return {name: k for name in layers if (k := layer_kind(name))}
