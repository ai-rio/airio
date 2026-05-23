"""
Shared BR-electrical vocabulary — the project-agnostic config seam.

The engine never hardcodes a project's layer names. Instead it matches each layer
against this glossary of synonyms → canonical kind. Works on SENAC (`EL-Condutos…
AL-BANDEJA`) and boticário (`ELE_PERF`) alike because it matches the *word*, not
the project prefix. New project = (usually) no code: its layers self-describe.
Where the glossary can't resolve a layer (project abbreviations, dirty layers),
it returns nothing for it → the human maps it (HITL override), saved per project.

Order matters: a SENAC tray layer is `EL-Condutos … AL-BANDEJA` — the group word
"condutos" contains "duto", so the tray kinds must win before ELETRODUTO. Eletroduto
is the fallback run-kind. EXCLUDE always wins (a fitting/box is never a run, even if
its name carries a run word, e.g. `EL-Conexões … AL-DUTO`).

Each tray PRODUCT is its own canonical kind — perfilado ≠ eletrocalha ≠ leito. They
are distinct physical products, bought and priced separately, so a takeoff lists them
as separate lines (Carlos's rule). `bandeja` is treated as a generic name for the
sheet-metal tray → eletrocalha.

Discipline scoping: the glossary classifies BR-ELECTRICAL infra. A compatibilizado
sheet overlays other disciplines whose conduits carry the same run-words — CFTV/dados
(`CE-Condutos`), fire detection (`SDAI`). Those are NOT electrical-power infra; the
discipline EXCLUDE keeps them out of the elétrica takeoff (real FP: SENAC's
Revu-validated sheet carries `CE-Condutos DADOS (Piso)`).
"""
from __future__ import annotations

import re

# canonical kind → synonyms (checked in THIS order; eletroduto last = fallback).
# A synonym is a plain substring EXCEPT a compiled regex (used where a substring
# would over-match — "perf" abbreviates perfilado but must not catch "perfuração").
_PERF = re.compile(r"perf(?![a-z])")          # ELE_PERF ✓  perfilado(see below) / perfuração ✗
INFRA_KINDS: dict[str, tuple] = {
    "eletrocalha": ("eletrocalha", "calha", "bandeja"),        # sheet-metal tray
    "perfilado":   ("perfilad", _PERF),                        # strut profile (perfilado / ELE_PERF)
    "leito":       ("leito",),                                 # ladder tray
    "barramento":  ("barramento", "busway", "blindado", "barra blindada"),  # PT canonical, matches ele.py
    "eletroduto":  ("duto", "conduto", "eletroduto"),          # conduit (fallback)
}

# never a measurable ELÉTRICA run, regardless of any kind-word in the name:
# fittings (conex), boxes (quadro), annotation, the grounding/equipotential bus
# (PR-Barramento de equipotencialização — carries "barramento" but isn't a busway run),
# and OTHER DISCIPLINES' conduits on a compatibilizado overlay (B4): CFTV/dados (`CE-`),
# fire detection (`sdai`/`cftv`), structured-cabling/data ("dados").
EXCLUDE: tuple[str, ...] = ("conex", "quadro", "legenda", "carimbo", "texto",
                            "equipotencial", "aterr", "spda",
                            "ce-", "sdai", "cftv", "dados", "voz")


def _matches(low: str, syn) -> bool:
    return bool(syn.search(low)) if isinstance(syn, re.Pattern) else syn in low


def layer_kind(name: str) -> str | None:
    """One layer name → canonical infra kind, or None if excluded/unknown."""
    low = (name or "").lower()
    if any(x in low for x in EXCLUDE):
        return None
    for kind, syns in INFRA_KINDS.items():
        if any(_matches(low, s) for s in syns):
            return kind
    return None


def derive_layer_kinds(layers: list[str]) -> dict[str, str]:
    """Project's layer names → {layer: kind} for the runs we measure. Unknown/
    excluded layers are omitted (→ HITL maps the residual)."""
    return {name: k for name in layers if (k := layer_kind(name))}
