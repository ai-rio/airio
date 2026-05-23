"""
SCHEDULE — Claude reads an electrical schedule sheet (quadro de cargas /
diagrama de alimentadores) and emits the structured feeder + circuit data.

This is the SIZING source of truth (NBR 5410): conductor gauge, eletroduto Ø,
and run length per feeder/circuit come from the schedule TABLE, not from plan
geometry — which can only measure length and cannot resolve adjacent Ø nor see
single-line feeders (the per-Ø wall, see RESULTS.md). Geometry stays the LENGTH
source; this fills sizing and the off-plan feeders. Joined to runs by panel/
feeder name downstream.

Why VISION (not text-parse): schedule LAYOUTS vary per office/sheet (proven on 3
projects — a deterministic per-format parser returned 0 cross-format). On dense
sheets (diagram + table + legend) the linear text stream SCRAMBLES, so reading
the rendered image generalizes where text-parsing fails. Claude reads any layout.

Routed through the `claude -p` CLI (like intel.py) so it authenticates with the
user's Claude subscription OAuth — no billed API key. The image is handed to the
model via an `@path` mention, so the Read tool is ALLOWED (only Read).

NOTE (ToS / portability): the subscription licenses interactive Claude Code use;
fine for local demo/discovery, but a shipped/CI build must switch to a billed
sk-ant- key + the anthropic SDK (vision messages API).
"""
from __future__ import annotations

import collections
import json
import os
import re
import subprocess
import tempfile

import fitz

DEFAULT_MODEL = "sonnet"         # haiku is faster but returned EMPTY on a dense 40-row
                                 # table — too weak; sonnet reads it. Trimmed schema (below)
                                 # cuts output ~35% to keep sonnet under the timeout.
RENDER_LONG_EDGE = 3000          # target px long edge — legible tables, fast vision

INSTRUCTIONS = """\
You read Brazilian electrical schedules from construction drawings and extract \
their tabular data. The sheet may carry a FEEDER table (ALIMENTADORES — panel→panel \
runs) and/or one or more PANEL load schedules (QUADRO DE CARGAS — circuits inside a \
panel). Read the rendered IMAGE as the source of truth; the text dump (if given) may \
be scrambled by the sheet layout — use it only as a spelling aid.

Extract EVERY real data row. Rules:
- Numbers use BR format (comma decimal): keep them as written strings (e.g. "1.1/4", "2,5").
- eletroduto_pol: the conduit Ø as written (inches, e.g. "4", "1.1/2", "3/4"). "" if absent.
- comp_m: run length in metres (the COMP / DIST column). "" if absent.
- Conductor sizes (mm²): fase / neutro / terra. When a row lists fewer values, fill \
what exists and leave the rest "".
- polaridade: how many PHASES the run uses — "mono" (1 fase), "bi" (2 fases), or \
"tri" (3 fases). Determine it from: the loaded phase columns (FASE-R / FASE-S / \
FASE-T — count how many carry power), or the breaker poles (1P/2P/3P), or context \
(a 220 V circuit is usually mono; a 380 V feeder between phases is usually tri). \
This sets the conductor count: mono = N+F+T (3 cables), bi = N+FF+T (4), tri = \
N+FFF+T (5) — i.e. (1 neutro) + (1/2/3 fases) + (1 terra/earthing). Use "" only if \
genuinely undeterminable (a human will confirm).
- Skip RESERVA / spare rows (no real load), but you MAY note how many.
- Do NOT invent rows, sizes, or lengths. If a cell is unreadable, use "" and lower \
your confidence. Read carefully — these feed a material bill of quantities."""

SCHEMA = {
    "type": "object",
    "properties": {
        "feeders": {"type": "array", "items": {"type": "object", "properties": {
            "nome": {"type": "string"}, "origem": {"type": "string"},
            "destino": {"type": "string"}, "qtd_cabos": {"type": "string"},
            "cond_fase_mm2": {"type": "string"}, "cond_neutro_mm2": {"type": "string"},
            "cond_terra_mm2": {"type": "string"}, "polaridade": {"type": "string"},
            "eletroduto_pol": {"type": "string"}, "comp_m": {"type": "string"}}}},
        "panels": {"type": "array", "items": {"type": "object", "properties": {
            "nome": {"type": "string"}, "alimentado_por": {"type": "string"},
            "circuits": {"type": "array", "items": {"type": "object", "properties": {
                "id": {"type": "string"}, "descricao": {"type": "string"},
                "qtd": {"type": "string"}, "secao_fase_mm2": {"type": "string"},
                "secao_neutro_mm2": {"type": "string"}, "secao_terra_mm2": {"type": "string"},
                "polaridade": {"type": "string"},
                "eletroduto_pol": {"type": "string"}, "comp_m": {"type": "string"}}}}}}},
        "confidence": {"type": "number"},
        "notes": {"type": "string"},
    },
    "required": ["feeders", "panels", "confidence", "notes"],
}


# ---------------------------------------------------------------------------
# PRIMARY: deterministic grid extraction via PyMuPDF find_tables() — instant,
# free, no LLM. Reads the table grid spatially (ruling lines + cell alignment),
# so it generalises across layouts and is immune to the linear-text scramble.
# Column MEANING is mapped by CELL CONTENT (not fixed positions, not per-format
# anchors): the Ø column is the one carrying inch tokens (3/4, 1.1/2…), gauges are
# the decimal-mm² columns, etc. LLM is the fallback for grids this can't detect.
# ---------------------------------------------------------------------------
GAUGE_SET = {"1.5", "2.5", "4", "6", "10", "16", "25", "35", "50", "70",
             "95", "120", "150", "185", "240", "300", "400", "500"}
_VOLT = {"380", "220", "127", "440", "208", "480"}
_ISO = {"EPR", "PVC", "XLPE", "PP", "HEPR"}


def _explode(rows: list) -> list:
    """A find_tables cell can hold N stacked values joined by '\\n' (two feeder
    rows detected as one). Split every cell and zip → one logical row each."""
    out = []
    for row in rows:
        parts = [(c or "").split("\n") for c in row]
        n = max(len(p) for p in parts)
        for i in range(n):
            out.append([(p[i] if i < len(p) else "").strip() for p in parts])
    return out


def _gnorm(v: str) -> str:
    return v.replace(",", ".").rstrip("0").rstrip(".") if v else ""


def _is_gauge(v: str) -> bool:                       # decimal mm²: "185.0","2,5"
    v = (v or "").strip().replace("mm²", "").replace("mm2", "").strip()
    return ("." in v or "," in v) and _gnorm(v) in GAUGE_SET
def _is_inch(v: str) -> bool:                        # Ø token: 4, 1.1/4, 3/4, 2.1/2
    return bool(re.fullmatch(r'\d|\d\.\d/\d|\d/\d', (v or "").strip().replace('"', "")))
def _is_int(v: str) -> bool:
    return bool(re.fullmatch(r"\d{1,4}", (v or "").strip()))
def _is_pct(v: str) -> bool:
    return (v or "").strip().endswith("%")


def _classify_columns(flat: list) -> dict:
    """Content heuristic → {eletroduto, comp, qtd, gauges:[...], voltage, iso}.
    Robust signals: the Ø column is the one with '/'-fractions (gauges never have
    '/'); gauge columns are decimal mm² in the catalog; comp is the last bare-int
    column; voltage is the {380/220} column; qtd is a small-int column."""
    if not flat:
        return {}
    ncol = max(len(r) for r in flat)
    col = lambda j: [r[j] for r in flat if j < len(r) and r[j]]
    score = {"frac": [0]*ncol, "inch": [0]*ncol, "gauge": [0]*ncol, "int": [0]*ncol,
             "volt": [0]*ncol, "iso": [0]*ncol, "pct": [0]*ncol}
    for j in range(ncol):
        for v in col(j):
            if "/" in v and _is_inch(v): score["frac"][j] += 1
            if _is_inch(v): score["inch"][j] += 1
            if _is_gauge(v): score["gauge"][j] += 1
            if _is_int(v): score["int"][j] += 1
            if v.strip() in _VOLT: score["volt"][j] += 1
            if v.strip().upper() in _ISO: score["iso"][j] += 1
            if _is_pct(v): score["pct"][j] += 1
    def argmax(key, exclude=()):
        best, bj = 0, None
        for j in range(ncol):
            if j in exclude: continue
            if score[key][j] > best: best, bj = score[key][j], j
        return bj
    iso = argmax("iso")
    volt = argmax("volt")
    # Ø column: prefer the one with fractions; else the inch column that isn't volt
    elet = argmax("frac") if any(score["frac"]) else argmax("inch", exclude={volt})
    gauges = [j for j in range(ncol) if score["gauge"][j] >= max(2, 0.4*len(flat))]
    used = set(filter(lambda x: x is not None, [iso, volt, elet])) | set(gauges)
    int_cols = [j for j in range(ncol) if score["int"][j] >= max(2, 0.4*len(flat))
                and j not in used]
    comp = max(int_cols) if int_cols else None       # comp = last bare-int column
    qtd = next((j for j in int_cols if j != comp), None)
    return {"eletroduto": elet, "comp": comp, "qtd": qtd, "gauges": gauges,
            "voltage": volt, "iso": iso, "ncol": ncol}


def _polaridade_from_volt(v: str) -> str:
    v = (v or "").strip()
    return "tri" if v in {"380", "440", "480", "208"} else ("mono" if v == "220" else "")


def _rows_to_feeders(flat: list, cm: dict) -> list:
    """Build feeder dicts from classified rows. gauges in column order →
    fase/neutro/terra (3 = F/N/T; 2 = F/T, motor no-neutro on a tri sheet)."""
    g = cm.get("gauges", [])
    out = []
    for r in flat:
        if cm.get("comp") is None or cm["comp"] >= len(r):
            continue
        comp = r[cm["comp"]]
        if not _is_int(comp) and not re.fullmatch(r"\d+[.,]\d+", comp or ""):
            continue                                  # not a data row (header/blank)
        fase = r[g[0]] if len(g) >= 1 and g[0] < len(r) else ""
        neutro = r[g[1]] if len(g) >= 3 and g[1] < len(r) else ""
        terra = r[g[-1]] if len(g) >= 2 and g[-1] < len(r) else ""
        volt = r[cm["voltage"]] if cm.get("voltage") is not None and cm["voltage"] < len(r) else ""
        out.append({
            "nome": r[0] if r else "",                # col0 (may merge origem/destino)
            "cond_fase_mm2": fase, "cond_neutro_mm2": neutro, "cond_terra_mm2": terra,
            "qtd_cabos": r[cm["qtd"]] if cm.get("qtd") is not None and cm["qtd"] < len(r) else "1",
            "polaridade": _polaridade_from_volt(volt),
            "eletroduto_pol": r[cm["eletroduto"]] if cm.get("eletroduto") is not None
                              and cm["eletroduto"] < len(r) else "",
            "comp_m": comp,
        })
    return out


def _extract_via_find_tables(pdf_path: str, page_index: int = 0) -> dict | None:
    """Try every detected table, score by schedule signal, build feeders from the
    best. Returns None if no table looks like a schedule (→ caller falls back to LLM)."""
    pg = fitz.open(pdf_path)[page_index]
    best, best_score = None, 0
    for t in pg.find_tables().tables:
        flat = _explode(t.extract())
        if len(flat) < 3:
            continue
        cm = _classify_columns(flat)
        # signal = needs a Ø column + at least one gauge column + a comp column
        if cm.get("eletroduto") is None or not cm.get("gauges") or cm.get("comp") is None:
            continue
        feeders = _rows_to_feeders(flat, cm)
        sc = len([f for f in feeders if f["eletroduto_pol"] and f["comp_m"]])
        if sc > best_score:
            best, best_score = (feeders, cm), sc
    if not best or best_score < 3:
        return None
    feeders, cm = best
    return {
        "feeders": feeders, "panels": [], "confidence": 0.9, "method": "find_tables",
        "notes": f"find_tables: {len(feeders)} linhas; colunas {cm}. "
                 "Polaridade inferida da tensão (380→tri); confirmar. "
                 "Linhas duplicadas (tabela vs chamada no desenho) NÃO deduplicadas — revisar.",
    }


def extract_schedule(pdf_path: str, page_index: int = 0,
                     model: str = DEFAULT_MODEL, force_llm: bool = False) -> dict:
    """Schedule extraction, find_tables-FIRST. Deterministic grid parse when a
    table is detected (instant, free); LLM-vision fallback otherwise. `force_llm`
    skips straight to the fallback (for borderless tables you know need vision)."""
    if not force_llm:
        det = _extract_via_find_tables(pdf_path, page_index)
        if det:
            _validate(det)
            return det
    return _extract_via_llm(pdf_path, page_index, model)


def _render_page(pdf_path: str, page_index: int, out_png: str) -> tuple[int, int]:
    """Render capped at RENDER_LONG_EDGE px. A full 21MP plotter sheet HANGS the
    vision call (the 8MP crop runs in ~30s); cap the long edge so the call returns.
    For a sheet where the table is a small corner, the table may then be too small —
    crop-to-table is the next step; this keeps the common case (table fills the sheet)
    fast and legible."""
    page = fitz.open(pdf_path)[page_index]
    zoom = RENDER_LONG_EDGE / max(page.rect.width, page.rect.height)
    zoom = min(max(zoom, 0.5), 3.0)
    pix = page.get_pixmap(matrix=fitz.Matrix(zoom, zoom))
    pix.save(out_png)
    return pix.width, pix.height


def _extract_via_llm(pdf_path: str, page_index: int = 0,
                     model: str = DEFAULT_MODEL) -> dict:
    """FALLBACK: render the sheet → Claude vision (CLI) → validated dict. Used only
    when find_tables can't detect a usable grid (borderless/scanned tables). Slow +
    output-bound (a 40-row table ≈ 13k tokens ≈ minutes) — that's why it's the fallback."""
    png = os.path.join(tempfile.gettempdir(), f"sched_{os.getpid()}_{page_index}.png")
    _render_page(pdf_path, page_index, png)

    system = (INSTRUCTIONS
              + "\n\nReturn ONLY a single JSON object (no markdown, no prose) "
                "conforming to this JSON Schema. Set confidence 0..1 = how sure you "
                "are the table was read completely and correctly:\n" + json.dumps(SCHEMA))
    # Image is the source of truth (vision generalises across layouts; the linear
    # text stream scrambles on dense sheets). No text dump → leaner + faster call.
    prompt = f"Extract the electrical schedule from this sheet image: @{png}"

    env = {k: v for k, v in os.environ.items() if k != "ANTHROPIC_API_KEY"}
    try:
        proc = subprocess.run(
            ["claude", "-p", prompt,
             "--model", model,
             "--output-format", "json",
             "--system-prompt", system,
             "--allowedTools", "Read"],
            text=True, capture_output=True, cwd=tempfile.gettempdir(),
            env=env, timeout=420,
        )
    except subprocess.TimeoutExpired:
        raise RuntimeError("claude CLI timed out after 420s")
    if proc.returncode != 0:
        raise RuntimeError(f"claude CLI failed ({proc.returncode}): {proc.stderr[-500:]}")
    env_out = json.loads(proc.stdout)
    if env_out.get("is_error") or env_out.get("subtype") != "success":
        raise RuntimeError(f"claude CLI error: subtype={env_out.get('subtype')}")
    raw = env_out["result"].strip()
    if raw.startswith("```"):
        raw = re.sub(r"^```[a-zA-Z]*\n?|\n?```$", "", raw).strip()
    try:
        data = json.loads(raw)
    except json.JSONDecodeError:
        m = re.search(r"\{.*\}", raw, re.DOTALL)
        if not m:
            raise RuntimeError(f"no JSON in CLI result: {raw[:200]!r}")
        data = json.loads(m.group(0))
    _validate(data)
    u = env_out.get("usage", {})
    data["_usage"] = {"input": u.get("input_tokens", 0), "output": u.get("output_tokens", 0),
                      "cost_usd": env_out.get("total_cost_usd", 0), "model": model}
    return data


def _validate(data: dict) -> None:
    """AI output is untrusted — assert shape before aggregation consumes it."""
    if not isinstance(data, dict):
        raise ValueError("schedule result is not an object")
    for k in ("feeders", "panels"):
        if not isinstance(data.get(k), list):
            data[k] = []                       # tolerate omission; aggregate handles empty
    if not data["feeders"] and not data["panels"]:
        raise ValueError("schedule has neither feeders nor panels")


def _norm_pol(p: str) -> str:
    p = (p or "").strip().strip('"').replace("Ø", "").replace("∅", "").strip()
    return f'Ø{p}"' if p else ""


def _to_float(s: str) -> float | None:
    s = (s or "").strip().replace(".", "").replace(",", ".") if "," in (s or "") else (s or "").strip()
    try:
        return float(s)
    except ValueError:
        return None


_PHASES = {"mono": 1, "monofasico": 1, "monofásico": 1, "1": 1, "1p": 1,
           "bi": 2, "bifasico": 2, "bifásico": 2, "2": 2, "2p": 2,
           "tri": 3, "trifasico": 3, "trifásico": 3, "3": 3, "3p": 3}


def _n_phases(pol: str) -> int | None:
    return _PHASES.get((pol or "").strip().lower())


def aggregate(data: dict) -> dict:
    """Deterministic BOM from the extracted schedule.

    Eletroduto metres = Σ comp by Ø (one run per row). Cable metres counts ACTUAL
    CONDUCTORS, not route length: per row = (n fases) + neutro + terra, each at its
    own gauge (Carlos's rule: mono N+F+T, bi N+FF+T, tri N+FFF+T). A conductor is
    only counted if its gauge is present (motor/AC feeders are FFF+T, no neutro).
    `qtd` (parallel cables per phase) multiplies fases + neutro; terra ×1.
    Rows with no polaridade are summed into `cabo_polaridade_indefinida` for HITL."""
    elet = collections.defaultdict(float)
    cable = collections.defaultdict(float)
    no_len = 0
    unknown_pol = []
    rows = list(data.get("feeders", []))
    for p in data.get("panels", []):
        rows += p.get("circuits", [])
    for r in rows:
        comp = _to_float(r.get("comp_m", ""))
        pol = _norm_pol(r.get("eletroduto_pol", ""))
        if comp is None:
            no_len += 1
            continue
        if pol:
            elet[pol] += comp
        n = _n_phases(r.get("polaridade", ""))
        fase = r.get("cond_fase_mm2") or r.get("secao_fase_mm2") or ""
        neutro = r.get("cond_neutro_mm2") or r.get("secao_neutro_mm2") or ""
        terra = r.get("cond_terra_mm2") or r.get("secao_terra_mm2") or ""
        qtd = _to_float(r.get("qtd_cabos") or r.get("qtd") or "1") or 1.0
        if n is None:                          # polarity unknown → flag, don't guess
            unknown_pol.append(r.get("nome") or r.get("id") or "?")
            n = 1
        if fase:
            cable[f"{fase}mm²"] += comp * n * qtd          # n fases × parallel sets
        if neutro:
            cable[f"{neutro}mm²"] += comp * qtd            # 1 neutro per set
        if terra:
            cable[f"{terra}mm²"] += comp                   # 1 terra (earthing)
    return {
        "eletroduto_m_por_pol": {k: round(v, 1) for k, v in
                                 sorted(elet.items(), key=lambda x: -x[1])},
        "eletroduto_total_m": round(sum(elet.values()), 1),
        "cabo_m_por_bitola": {k: round(v, 1) for k, v in
                              sorted(cable.items(), key=lambda x: -x[1])},
        "cabo_total_m": round(sum(cable.values()), 1),
        "linhas_sem_comprimento": no_len,
        "cabo_polaridade_indefinida": unknown_pol,   # HITL: rows where polarity unread
    }


if __name__ == "__main__":
    import sys
    d = extract_schedule(sys.argv[1], int(sys.argv[2]) if len(sys.argv) > 2 else 0)
    agg = aggregate(d)
    print(json.dumps({"extracted": d, "aggregate": agg}, indent=2, ensure_ascii=False))
