"""
Header-driven column mapping — the CABLE config seam (sibling of glossary.py for infra).

A schedule table's HEADER names its own columns; map them to canonical fields by
header text, not by fixed positions or per-format assumptions. Works across the
feeder/alimentador table and the panel quadro-de-cargas because each table tells
you what its columns are. Where a header is non-standard, the field stays unmapped
→ HITL maps it.

Guards for real ambiguities seen in BR schedules:
- "QUEDA DE TENSÃO" carries "tensão" but is voltage-DROP, not the voltage column.
- "FASE-R / FASE-S / FASE-T" are per-phase POWER columns, NOT the conductor gauge —
  only a bare "FASE" (under SEÇÃO/CONDUTOR) is the fase gauge.
"""
from __future__ import annotations

import re

_PHASE_POWER = re.compile(r"fase[\s\-]?[rst]\b")   # FASE-R / FASE S / FASET → power, not gauge


def _field(cell: str) -> str | None:
    c = (cell or "").lower().strip()
    if any(s in c for s in ("eletroduto", "diâmetro", "diametro")):
        return "eletroduto"
    if any(s in c for s in ("comprimento", "comp", "distância", "distancia", "dist")):
        return "comp"
    if "qtd" in c or "quantidade" in c:
        return "qtd"
    if "neutro" in c:
        return "neutro"
    if "terra" in c or "aterr" in c:
        return "terra"
    if "fase" in c and not _PHASE_POWER.search(c):
        return "fase"
    if "seção" in c or "secao" in c:          # single "Seção do Circuito" = the circuit gauge
        return "fase"
    if ("tensão" in c or "tensao" in c) and "queda" not in c:
        return "voltage"
    if any(s in c for s in ("circuito", "circ", "nome", "tag")):
        return "nome"
    return None


def map_columns(header: list[str]) -> dict[str, int]:
    """Header cells → {canonical_field: column_index}. First column wins per field;
    unmapped fields are simply absent (→ HITL / fallback)."""
    out: dict[str, int] = {}
    for i, cell in enumerate(header):
        f = _field(cell)
        if f and f not in out:
            out[f] = i
    return out
