"""
ai.rio.br — takeoff ELÉTRICO v0 (self-serve web UI).

Schedule-led electrical takeoff: upload the SCHEDULE sheet (quadro de cargas /
diagrama de alimentadores) → Claude reads the table (vision) → material BOM
(eletroduto por Ø, cabo por bitola counting CONDUTORES not route length). Optional:
also upload the PLANTA → name reconciliation (schedule ↔ plan, HITL gaps) and the
geometry↔schedule metragem cross-check.

The three legs behind it: schedule.py (sizing), ele.py (geometry length),
join.py + crosscheck.py (reconcile + trust). Sizing comes from the table because
plan geometry cannot resolve adjacent Ø nor see off-layer feeders (the per-Ø wall).

Run:
    .venv/bin/uvicorn estimator.app_ele:app --host 0.0.0.0 --port 8001
    # then open http://localhost:8001
"""
from __future__ import annotations

import json
import sys
import uuid
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from fastapi.responses import FileResponse, HTMLResponse

from app import STYLE                    # reuse the v0 brand stylesheet
import crosscheck as cc_mod
import ele as ele_mod
import join as join_mod
import schedule as sched_mod

app = FastAPI(title="ai.rio.br — takeoff elétrico v0")
OUT = Path(__file__).parent / "out" / "web_ele"
OUT.mkdir(parents=True, exist_ok=True)
MAX_BYTES = 30 * 1024 * 1024

PAGE = """<!doctype html><html lang=pt-BR><meta charset=utf-8>
<meta name=viewport content="width=device-width,initial-scale=1">
<title>ai.rio.br — takeoff elétrico v0</title>{style}
<header><h1>ai.rio.br</h1><span class=tag>takeoff v0 · elétrica / força</span></header>
<main>{body}</main></html>"""

FORM = """
<p class=note>Suba o <b>quadro de cargas</b> ou <b>diagrama de alimentadores</b> (PDF).
O sistema lê a tabela (visão da IA) e gera o quantitativo de material — eletroduto por
bitola e cabo por bitola, contando os <b>condutores</b> (mono N+F+T, bi N+FF+T, tri N+FFF+T).</p>
<form class=drop method=post action="/analyze" enctype="multipart/form-data">
  <p><b>Quadro de cargas / alimentadores</b> (obrigatório)<br>
     <input type=file name=schedule accept="application/pdf" required></p>
  <p><b>Planta</b> (opcional — habilita reconciliação + cross-check de metragem)<br>
     <input type=file name=plan accept="application/pdf"></p>
  <p><button type=submit>Extrair takeoff</button></p>
</form>
<p class=note>A leitura da tabela usa visão da IA (~40&nbsp;s). O resultado traz a
<b>confiança</b> e marca para conferência humana o que ficou incerto.</p>
"""


def _bom_rows(d: dict) -> str:
    return "".join(f"<tr><td>{k}</td><td class=n>{v}</td></tr>"
                   for k, v in d.items()) or "<tr><td class=note colspan=2>—</td></tr>"


def _confidence_banner(conf: float) -> str:
    if conf >= 0.8:
        return f'<div class=confirm><b class=ok>CONFIANÇA {conf:.0%}</b> — leitura consistente.</div>'
    return (f'<div class=confirm>⚠ <b class=warn>CONFIANÇA {conf:.0%}</b> — '
            f'<b>CONFIRME (humano)</b> a tabela lida antes de orçar.</div>')


def _feeders_table(feeders: list) -> str:
    if not feeders:
        return ""
    rows = ""
    for f in feeders:
        cond = "/".join(x for x in (f.get("cond_fase_mm2"), f.get("cond_neutro_mm2"),
                                    f.get("cond_terra_mm2")) if x)
        rows += (f"<tr><td>{f.get('nome','')}</td>"
                 f"<td class=note>{f.get('origem','')} → {f.get('destino','')}</td>"
                 f"<td>{f.get('polaridade','') or '?'}</td>"
                 f"<td>{cond} mm²</td><td>{f.get('eletroduto_pol','')}</td>"
                 f"<td class=n>{f.get('comp_m','')}</td></tr>")
    return ("<p class=eyebrow>Alimentadores (tabela lida)</p>"
            "<table><tr><th>Nome</th><th>Origem → Destino</th><th>Pol.</th>"
            "<th>Condutor (F/N/T)</th><th>Ø</th><th>Comp (m)</th></tr>" + rows + "</table>")


def _panels_block(panels: list) -> str:
    if not panels:
        return ""
    items = "".join(f"<li><b>{p.get('nome','?')}</b> "
                    f"(alim. {p.get('alimentado_por','?')}) — "
                    f"{len(p.get('circuits', []))} circuitos</li>" for p in panels)
    return f"<p class=eyebrow>Quadros (quadro de cargas)</p><ul class=note>{items}</ul>"


def _join_block(jn: dict) -> str:
    if not jn:
        return ""
    s = jn["summary"]
    so = ", ".join(m["name"] for m in jn["schedule_only"]) or "—"
    po = ", ".join(m["name"] for m in jn["plan_only"]) or "—"
    return f"""
    <p class=eyebrow>Reconciliação planta ↔ quadro (compatibilização)</p>
    <div class=note>casados: <b class=ok>{s['matched']}</b> ·
      só no quadro (faltam na planta): <b class=warn>{s['schedule_only']}</b> ·
      só na planta (sem quadro): <b class=warn>{s['plan_only']}</b>
      · taxa de casamento {s['match_rate']:.0%}</div>
    <ul class=note><li><b>Conferir — só no quadro:</b> {so}</li>
      <li><b>Conferir — só na planta:</b> {po}</li></ul>"""


def _crosscheck_block(cc: dict | None) -> str:
    if not cc:
        return ""
    rows = ""
    for r in cc["per_bitola"]:
        cls = "ok" if r["status"] == "OK" else "warn"
        rows += (f"<tr><td>{r['bitola']}</td><td class=n>{r['geometria_m']}</td>"
                 f"<td class=n>{r['schedule_m']}</td><td class=n>{r['delta_m']}</td>"
                 f"<td><span class={cls}>{r['status']}</span></td></tr>")
    return f"""
    <p class=eyebrow>Cross-check de metragem — geometria (planta) vs quadro</p>
    <table><tr><th>Bitola</th><th>Geom (m)</th><th>Quadro (m)</th><th>Δ (m)</th><th>Status</th></tr>
    {rows}<tr><td>TOTAL</td><td class=n>{cc['total_geometria_m']}</td>
      <td class=n>{cc['total_schedule_m']}</td><td class=n>{cc['total_delta_m']}</td>
      <td>({cc['total_delta_pct']}%)</td></tr></table>
    <p class=note>OK = duas fontes concordam (use a medida). DIVERGE = bitolas com largura
    desenhada parecida (Ø1\"↔Ø1.1/4\") — confie no quadro. SCHED_ONLY = alimentador que a
    geometria não vê (linha única / fora de camada) — só existe na tabela.</p>"""


def _result_html(token: str, sched: dict, agg: dict, jn: dict | None,
                 cc: dict | None) -> str:
    pol_undef = agg.get("cabo_polaridade_indefinida", [])
    hitl = (f'<div class=confirm>⚠ <b class=warn>Polaridade não lida</b> em '
            f'{len(pol_undef)} linha(s): {", ".join(pol_undef)} — assumido monofásico; '
            f'confirme.</div>' if pol_undef else "")
    return f"""
    {_confidence_banner(sched.get('confidence', 0))}
    {hitl}
    <p class=eyebrow>Eletroduto por bitola (m)</p>
    <table><tr><th>Ø</th><th>Metros</th></tr>{_bom_rows(agg['eletroduto_m_por_pol'])}
      <tr><td><b>TOTAL</b></td><td class=n>{agg['eletroduto_total_m']}</td></tr></table>
    <p class=eyebrow>Cabo por bitola (m) — condutores (F+N+T por polaridade)</p>
    <table><tr><th>Bitola</th><th>Metros</th></tr>{_bom_rows(agg['cabo_m_por_bitola'])}
      <tr><td><b>TOTAL</b></td><td class=n>{agg['cabo_total_m']}</td></tr></table>
    {_feeders_table(sched.get('feeders', []))}
    {_panels_block(sched.get('panels', []))}
    {_join_block(jn)}
    {_crosscheck_block(cc)}
    <p class=note>{sched.get('notes','')}</p>
    <p class=note><a class=dl href="/json/{token}">⬇ baixar takeoff_ele.json</a></p>
    <p class=note style="margin-top:18px"><a class=dl href="/">← outro projeto</a></p>
    """


@app.get("/", response_class=HTMLResponse)
def index() -> str:
    return PAGE.format(style=STYLE, body=FORM)


def _save(upload: UploadFile, dest: Path) -> None:
    data = upload.file.read()
    if len(data) > MAX_BYTES:
        raise HTTPException(413, "Arquivo acima de 30 MB")
    dest.write_bytes(data)


@app.post("/analyze", response_class=HTMLResponse)
def analyze(schedule: UploadFile = File(...),
            plan: UploadFile | None = File(None)) -> str:    # sync → runs in threadpool
    if not (schedule.filename or "").lower().endswith(".pdf"):
        raise HTTPException(400, "Envie o quadro de cargas em PDF")
    token = uuid.uuid4().hex[:12]
    d = OUT / token
    d.mkdir(parents=True, exist_ok=True)
    sched_pdf = d / "schedule.pdf"
    _save(schedule, sched_pdf)

    try:
        sched = sched_mod.extract_schedule(str(sched_pdf))
        agg = sched_mod.aggregate(sched)
    except Exception as e:  # noqa: BLE001 — surface extraction failure to the demo user
        raise HTTPException(422, f"Não consegui ler a tabela: {e}")

    jn = cc = None
    if plan is not None and (plan.filename or "").lower().endswith(".pdf"):
        plan_pdf = d / "plan.pdf"
        _save(plan, plan_pdf)
        try:
            jn = join_mod.join(sched, str(plan_pdf))
            geo = ele_mod.metragem(str(plan_pdf))
            geom_elet = geo.get("eletroduto_por_bitola_m", {})
            if geom_elet:                       # geometry only meaningful if layers recognised
                cc = cc_mod.crosscheck(geom_elet, agg["eletroduto_m_por_pol"])
        except Exception:  # noqa: BLE001 — plan extras are best-effort; schedule already shown
            jn = jn or {"summary": {"matched": 0, "schedule_only": 0, "plan_only": 0,
                                    "match_rate": 0}, "schedule_only": [], "plan_only": []}

    out = {"schedule": sched, "aggregate": agg, "join": jn, "crosscheck": cc}
    (d / "takeoff_ele.json").write_text(json.dumps(out, indent=2, ensure_ascii=False))
    return PAGE.format(style=STYLE, body=_result_html(token, sched, agg, jn, cc))


@app.get("/json/{token}")
def takeoff_json(token: str) -> FileResponse:
    p = OUT / token / "takeoff_ele.json"
    if not p.exists():
        raise HTTPException(404)
    return FileResponse(p, media_type="application/json", filename="takeoff_ele.json")
