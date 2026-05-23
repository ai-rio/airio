"""
ai.rio.br — v0 takeoff demo (self-serve web UI).

Upload a vector planta PDF -> device takeoff + pin overlay. So Sergio can run a
project he knows, remotely, and react. v0 is tuned to the SENAC COM-INC legend
(see RULES in count.py) — other sheets may count partially until their legend is
added. That limitation is intentional and disclosed on the page.

Run:
    .venv/bin/uvicorn estimator.app:app --host 0.0.0.0 --port 8000
    # then open http://localhost:8000
"""
from __future__ import annotations

import json
import sys
import uuid
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))  # so `count` imports under any cwd

from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.responses import HTMLResponse, FileResponse

from count import (extract, summarize, render_overlay, annotated_pdf,
                   pipe_metragem, riser_metragem)  # same dir

app = FastAPI(title="ai.rio.br — takeoff v0")

OUT = Path(__file__).parent / "out" / "web"
OUT.mkdir(parents=True, exist_ok=True)

MAX_BYTES = 30 * 1024 * 1024  # 30 MB

STYLE = """
<style>
  :root { --brand:#FFD400; --fg:#111; --mut:#666; --line:#111; }
  * { box-sizing:border-box; }
  body { margin:0; background:#fff; color:var(--fg);
         font-family:ui-monospace,SFMono-Regular,Menlo,monospace; }
  header { border-bottom:2px solid var(--line); padding:18px 24px; display:flex;
           align-items:baseline; gap:14px; }
  h1 { font-size:20px; margin:0; letter-spacing:.04em; }
  .tag { color:var(--mut); font-size:12px; text-transform:uppercase; letter-spacing:.12em; }
  main { padding:24px; max-width:1100px; }
  .drop { border:2px dashed var(--line); padding:40px; text-align:center; }
  input[type=file] { font:inherit; }
  button { background:var(--brand); border:2px solid var(--line); color:var(--fg);
           font:inherit; font-weight:700; padding:12px 28px; cursor:pointer;
           text-transform:uppercase; letter-spacing:.08em; }
  button:hover { opacity:.9; }
  table { border-collapse:collapse; width:100%; margin:18px 0; }
  th,td { border:1px solid var(--line); padding:10px 14px; text-align:left; font-size:14px; }
  th { background:var(--brand); text-transform:uppercase; letter-spacing:.06em; font-size:12px; }
  td.n { text-align:right; font-weight:700; font-size:18px; }
  .note { color:var(--mut); font-size:12px; line-height:1.5; }
  .ok { color:#0a7d28; } .warn { color:#b06a00; }
  img.plan { width:100%; border:2px solid var(--line); margin-top:10px; }
  iframe.plan { width:100%; height:70vh; border:2px solid var(--line); margin-top:10px; }
  a.dl { color:var(--fg); }
  .eyebrow { font-size:12px; text-transform:uppercase; letter-spacing:.14em; color:var(--mut);
             margin:28px 0 6px; }
  .metr { border:2px solid var(--line); border-left:8px solid var(--brand); padding:14px 18px;
          display:flex; align-items:baseline; gap:14px; }
  .metr .big { font-size:34px; font-weight:700; letter-spacing:.02em; }
  .confirm { border:2px solid var(--line); background:var(--brand); padding:10px 16px;
             margin-bottom:10px; font-size:13px; }
</style>
"""

PAGE = """<!doctype html><html lang=pt-BR><meta charset=utf-8>
<meta name=viewport content="width=device-width,initial-scale=1">
<title>ai.rio.br — takeoff v0</title>{style}
<header><h1>ai.rio.br</h1><span class=tag>takeoff v0 · combate a incêndio</span></header>
<main>{body}</main></html>"""

FORM = """
<p class=note>Suba a planta (PDF vetorial plotado do AutoCAD/Revit). O sistema conta
os dispositivos pelos rótulos do desenho — sem você precisar contar à mão.</p>
<form class=drop method=post action="/analyze" enctype="multipart/form-data">
  <p><input type=file name=file accept="application/pdf" required></p>
  <p><button type=submit>Contar dispositivos</button></p>
</form>
<p class=note><b>v0:</b> calibrado para a legenda da prancha SENAC COM-INC.
Outras pranchas podem contar parcialmente até a legenda delas ser adicionada.</p>
"""


def _result_html(token: str, summary: dict) -> str:
    rows = ""
    for c in summary["counts"].values():
        detail = ""
        if "by_subtype" in c:
            detail = ", ".join(f"{k}={v}" for k, v in sorted(c["by_subtype"].items()))
        rows += (f"<tr><td>{c['label']}</td><td class=n>{c['total']}</td>"
                 f"<td>{detail}</td></tr>")
    cov = ""
    for c in summary["coverage"]:
        miss = c["equipment_without_signage"]
        cls = "ok" if miss == 0 else "warn"
        cov += (f"<li><b>{c['signage']}</b> vs <b>{c['equipment']}</b>: "
                f"{c['equipment_count']} equip. / {c['signage_count']} sinais — "
                f"<span class={cls}>equip. SEM sinalização: {miss}</span> "
                f"(sinais sem equip. próximo: {c['signage_without_equipment_nearby']})</li>")
    proc = ""
    for it in summary.get("procurement", []):
        name = it["item"] + (f" [{it['subtype']}]" if it.get("subtype") else "")
        proc += (f"<tr><td>{name}</td><td class=n>{it['qty']}</td>"
                 f"<td>{it['unit']}</td><td class=note>{it['spec']}</td></tr>")
    m = summary.get("metragem", {})
    r = summary.get("risers", {})
    metr = ""
    if m:
        dev = m.get("developed_para_orcamento_m")
        sc = m.get("scale", {})
        amb = f" — ambíguo: {', '.join(sc.get('candidates', []))}" if sc.get("ambiguous") else ""
        metr = f"""
    <p class=eyebrow>Metragem de tubulação ({m['layer']})</p>
    <div class=confirm>⚠ ESCALA {sc.get('proposed','?')} <span class=note>({sc.get('source','')})</span><br>
      <b>CONFIRME</b> — toda a metragem depende disto{amb}</div>
    <div class=metr><span class=big>{dev} m</span>
      <span class=note>desenvolvido p/ orçamento (conservativo)</span></div>
    <ul class=note>
      <li>tubo horizontal: {m['horizontal_run_m_low']}–{m['horizontal_run_m_high']} m (central {m['horizontal_run_m_central']})</li>
      <li>risers/prumadas: {r.get('riser_markers','?')} × {r.get('floor_height_m','?')} m = {r.get('riser_run_m','?')} m</li>
    </ul>
    <p class=note>Por regra, super-estima (sobra de material &lt; aditivo). Exclui {', '.join(m['excludes'])}.</p>"""
    return f"""
    <p class=eyebrow>Arquivo</p>
    <div class=note>{summary['source']} · página rotacionada {summary['rotation']}°</div>
    {metr}
    <p class=eyebrow>Takeoff (quantitativo)</p>
    <table><tr><th>Dispositivo</th><th>Qtd</th><th>Detalhe</th></tr>{rows}</table>
    <p class=eyebrow>Verificação de sinalização (compatibilização)</p>
    <ul class=note>{cov}</ul>
    <p class=eyebrow>Procurement (pré-compra) — item · qtd · especificação</p>
    <table><tr><th>Item</th><th>Qtd</th><th>Un</th><th>Especificação</th></tr>{proc}</table>
    <p class=note><a class=dl href="/json/{token}">⬇ baixar takeoff.json</a></p>
    <p class=eyebrow>Conferência visual — zoom/pan na planta (marcações sobre o desenho)</p>
    <iframe class=plan src="/pdf/{token}#zoom=page-width" title="planta marcada"></iframe>
    <p class=note><a class=dl href="/pdf/{token}" target=_blank>abrir planta marcada em nova aba ↗</a> · <a class=dl href="/overlay/{token}" target=_blank>versão imagem</a></p>
    <p class=note style="margin-top:18px"><a class=dl href="/">← contar outra planta</a></p>
    """


@app.get("/", response_class=HTMLResponse)
def index() -> str:
    return PAGE.format(style=STYLE, body=FORM)


@app.post("/analyze", response_class=HTMLResponse)
async def analyze(file: UploadFile = File(...)) -> str:
    if not (file.filename or "").lower().endswith(".pdf"):
        raise HTTPException(400, "Envie um arquivo .pdf")
    data = await file.read()
    if len(data) > MAX_BYTES:
        raise HTTPException(413, "Arquivo acima de 30 MB")

    token = uuid.uuid4().hex[:12]
    d = OUT / token
    d.mkdir(parents=True, exist_ok=True)
    pdf_path = d / "input.pdf"
    pdf_path.write_bytes(data)

    try:
        take = extract(str(pdf_path))
        summary = summarize(take)
        summary["metragem"] = pipe_metragem(str(pdf_path))
        summary["risers"] = riser_metragem(str(pdf_path))
        summary["metragem"]["developed_para_orcamento_m"] = (
            summary["metragem"]["horizontal_run_m_high"] + summary["risers"]["riser_run_m"]
        )
        diam = " / ".join(summary["metragem"]["diameters"]) or "ø não detectado"
        summary["procurement"].append({
            "item": "Tubulação de incêndio", "qty": summary["metragem"]["developed_para_orcamento_m"],
            "unit": "m", "spec": f"{diam} · desenvolvido conservativo (confirmar escala)"})
        (d / "takeoff.json").write_text(json.dumps(summary, indent=2, ensure_ascii=False))
        render_overlay(str(pdf_path), take, str(d / "overlay.png"), scale=1.1)
        annotated_pdf(str(pdf_path), take, str(d / "annotated.pdf"))
    except Exception as e:  # noqa: BLE001 — surface parse failures to the demo user
        raise HTTPException(422, f"Não consegui ler esta planta: {e}")

    return PAGE.format(style=STYLE, body=_result_html(token, summary))


@app.get("/overlay/{token}")
def overlay(token: str) -> FileResponse:
    p = OUT / token / "overlay.png"
    if not p.exists():
        raise HTTPException(404)
    return FileResponse(p, media_type="image/png")


@app.get("/pdf/{token}")
def annotated(token: str) -> FileResponse:
    p = OUT / token / "annotated.pdf"
    if not p.exists():
        raise HTTPException(404)
    return FileResponse(p, media_type="application/pdf")  # inline -> browser viewer (zoom/pan)


@app.get("/json/{token}")
def takeoff_json(token: str) -> FileResponse:
    p = OUT / token / "takeoff.json"
    if not p.exists():
        raise HTTPException(404)
    return FileResponse(p, media_type="application/json", filename="takeoff.json")
