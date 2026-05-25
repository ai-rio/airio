"""REGION-SELECT — human-verifiable device counting on the REAL sheet.

The product premise (wedge lock): the human SEES the count and BOUNDS it. Real BR sheets
are messy — multi-planta, legend samples and outlined TEXT drawn on the device layers,
Bluebeam markups. None of that can be dropped by a dev-side hardcoded rule (a cheat that
won't generalize), and text-on-the-fixture-layer can't be filtered by geometry without
killing real fixtures (a 3-stroke word == a 3-stroke fixture). The reliable, general answer
is two HITL moves the estimator already does by hand:

  • REGION-SELECT — draw the count area; count the device centroids inside it. Drops the
    legend + ampliação + margin notes + other plantas for free.
  • TAP-TO-DROP — tap any stray pin (text FP, legend sample) to exclude it. This is the
    tag-once "drop" mechanism (points.apply_tags); drops export to the <pdf>.points_tags.json
    sidecar so the correction persists and a re-run never re-counts it.

Self-contained HTML proof (no server). Counting stays in points.py (count_points); this is a
thin viewer that ports to the locked Astro/CF stack later. tomada square-glyph is NOT added
yet (held until the region is settled — see BOTICARIO_VALIDATION_RESULTS.md).

Usage:
    python regionselect.py <plan.pdf> [--out OUTDIR] [--zoom 1.6] [--page N]
"""
from __future__ import annotations

import argparse
import base64
import json
from pathlib import Path

import fitz

import points


_COLORS = {
    "tomada": "#d00000",
    "luminaria": "#0a8a3a",
    "interruptor": "#1554d6",
    "iluminacao_emergencia": "#e07000",
    "aterramento": "#9400a0",
}


def build(pdf_path: str, config: dict, out_dir: str, zoom: float = 1.6, page_index: int = 0) -> str:
    counts = points.count_points(pdf_path, config, page_index)

    doc = fitz.open(pdf_path)
    page = doc[page_index]
    page.set_rotation(0)  # same coord space count_points uses
    pix = page.get_pixmap(matrix=fitz.Matrix(zoom, zoom), alpha=False)
    img_w, img_h = pix.width, pix.height
    png_b64 = base64.b64encode(pix.tobytes("png")).decode("ascii")

    devices = []
    for dev, r in sorted(counts.items()):
        pts = [[round(cx * zoom, 1), round(cy * zoom, 1)] for cx, cy in r["centroids"]]
        devices.append({
            "name": dev,
            "color": _COLORS.get(dev, "#444"),
            "total_page": len(pts),
            "points": pts,
        })

    out = Path(out_dir)
    out.mkdir(parents=True, exist_ok=True)
    html = _HTML.replace("__IMG_W__", str(img_w)).replace("__IMG_H__", str(img_h)) \
        .replace("__ZOOM__", repr(zoom)) \
        .replace("__PNG__", png_b64) \
        .replace("__DEVICES__", json.dumps(devices)) \
        .replace("__TITLE__", Path(pdf_path).name)
    html_path = out / "regionselect.html"
    html_path.write_text(html, encoding="utf-8")
    return str(html_path)


_HTML = r"""<!doctype html><html lang="pt-BR"><head><meta charset="utf-8">
<title>Region-select — __TITLE__</title>
<style>
  :root{ --bg:#f6f5f2; --fg:#171717; --muted:#6b6b6b; --border:#1717172a; --brand:#f5c518; }
  *{box-sizing:border-box} html,body{margin:0;height:100%}
  body{display:flex;font-family:ui-monospace,"Space Mono",Menlo,monospace;background:var(--bg);color:var(--fg)}
  #side{width:312px;flex:none;border-right:1px solid var(--border);padding:16px;overflow:auto}
  #stage{flex:1;overflow:auto;position:relative;background:#fff}
  h1{font-size:13px;letter-spacing:.12em;text-transform:uppercase;margin:0 0 4px}
  .sub{font-size:10px;color:var(--muted);margin-bottom:12px;line-height:1.5}
  .btn{font:inherit;font-size:11px;text-transform:uppercase;letter-spacing:.06em;
       border:1px solid var(--fg);background:#fff;color:var(--fg);padding:7px 10px;cursor:pointer;width:100%;margin-bottom:6px}
  .btn:hover{background:var(--fg);color:#fff}
  .btn.go{background:var(--brand);border-color:var(--brand)} .btn.go:hover{opacity:.9;background:var(--brand);color:var(--fg)}
  .btn.on{background:var(--fg);color:#fff}
  .row{display:flex;gap:6px}.row .btn{margin-bottom:0}
  .modes{display:flex;gap:6px;margin:4px 0 10px}
  table{width:100%;border-collapse:collapse;margin-top:12px;font-size:12px}
  td{padding:5px 4px;border-bottom:1px solid var(--border)}
  td.n{text-align:right;font-weight:700}
  .dot{display:inline-block;width:9px;height:9px;margin-right:6px;vertical-align:middle}
  .tot{font-size:11px;color:var(--muted);text-transform:uppercase;letter-spacing:.06em}
  .hint{font-size:10px;color:var(--muted);margin-top:12px;line-height:1.6}
  .zoom{position:sticky;top:8px;left:8px;z-index:5;display:inline-flex;gap:4px;margin:8px}
  .zoom .btn{width:auto;padding:5px 9px;margin:0}
  canvas{display:block}
  label.tg{display:flex;align-items:center;gap:6px;font-size:11px;margin:8px 0;cursor:pointer}
  textarea{width:100%;height:70px;font:inherit;font-size:9px;margin-top:6px;border:1px solid var(--border)}
</style></head><body>
<div id="side">
  <h1>Region-select</h1>
  <div class="sub">__TITLE__<br>Desenhe a área da planta → conta os pontos DENTRO. Descarte pinos falsos (texto/legenda). Compare com seu Revu.</div>
  <div class="tot">modo</div>
  <div class="modes">
    <button class="btn on" id="mArea">desenhar área</button>
    <button class="btn" id="mDrop">descartar pino</button>
  </div>
  <button class="btn go" id="count">Contar área (fechar)</button>
  <button class="btn" id="newarea">+ Nova área (somar)</button>
  <div class="row"><button class="btn" id="undo">Desfazer ponto</button><button class="btn" id="clear">Limpar tudo</button></div>
  <label class="tg"><input type="checkbox" id="showpins" checked> mostrar pinos</label>
  <table id="tbl"></table>
  <div class="tot" id="areas"></div>
  <button class="btn" id="export" style="margin-top:12px">Exportar (área + descartes)</button>
  <textarea id="out" readonly placeholder="JSON da área + pinos descartados (cola no sidecar .points_tags.json)"></textarea>
  <div class="hint">MODO desenhar: clique = vértice; "Contar área" fecha. "Nova área" soma outra (Casa 28 + Casa 20). MODO descartar: clique em cima de um pino p/ removê-lo da contagem (texto/legenda). Clique de novo p/ restaurar.</div>
</div>
<div id="stage">
  <div class="zoom">
    <button class="btn" id="zin">+</button><button class="btn" id="zout">−</button><button class="btn" id="zfit">ajustar</button>
  </div>
  <canvas id="cv" width="__IMG_W__" height="__IMG_H__"></canvas>
</div>
<script>
const DEV = __DEVICES__, ZOOM = __ZOOM__;
const IMG = new Image(); IMG.src = "data:image/png;base64,__PNG__";
const cv = document.getElementById('cv'), ctx = cv.getContext('2d');
let polys = [], cur = [], scale = 1, showPins = true, mode = 'area', hover = null;
const dropped = {};                       // key `${devIdx}|${ptIdx}` -> true
const key = (di,pi) => di+'|'+pi;

IMG.onload = () => { fit(); draw(); };
function fit(){ const s=document.getElementById('stage');
  scale = Math.min(s.clientWidth/cv.width, s.clientHeight/cv.height)*0.98; applyScale(); }
function applyScale(){ cv.style.width=(cv.width*scale)+'px'; cv.style.height=(cv.height*scale)+'px'; }
function ptFromEvent(e){ const r=cv.getBoundingClientRect();
  return [ (e.clientX-r.left)/(r.width/cv.width), (e.clientY-r.top)/(r.height/cv.height) ]; }

function setMode(m){ mode=m;
  document.getElementById('mArea').classList.toggle('on', m==='area');
  document.getElementById('mDrop').classList.toggle('on', m==='drop');
  cv.style.cursor = m==='area' ? 'crosshair' : 'pointer'; }
document.getElementById('mArea').onclick=()=>setMode('area');
document.getElementById('mDrop').onclick=()=>setMode('drop');

cv.addEventListener('click', e => {
  const p = ptFromEvent(e);
  if(mode==='area'){ cur.push(p); draw(); }
  else { toggleNearestPin(p); }
});
cv.addEventListener('dblclick', () => { if(mode==='area') closeCur(); });
cv.addEventListener('mousemove', e => {
  if(mode!=='drop'){ if(hover){ hover=null; draw(); } return; }
  const h = nearestPin(ptFromEvent(e));
  if((h&&hover&&(h[0]!==hover[0]||h[1]!==hover[1])) || (!!h!==!!hover)){ hover=h; draw(); }
});

function nearestPin(p){
  const tol = Math.max(12, 22/scale);     // ~22 SCREEN px at any zoom (scale-aware)
  let best=null, bd=tol;
  for(let di=0; di<DEV.length; di++) for(let pi=0; pi<DEV[di].points.length; pi++){
    const q=DEV[di].points[pi], d=Math.hypot(q[0]-p[0], q[1]-p[1]);
    if(d<bd){ best=[di,pi]; bd=d; }
  }
  return best;
}
function toggleNearestPin(p){
  const best=nearestPin(p);
  if(best){ const k=key(best[0],best[1]); if(dropped[k]) delete dropped[k]; else dropped[k]=true; draw(); count(); }
}
function closeCur(){ if(cur.length>=3){ polys.push(cur); cur=[]; } draw(); count(); }
document.getElementById('count').onclick=closeCur;
document.getElementById('newarea').onclick=()=>{ if(cur.length>=3){polys.push(cur);cur=[];} draw(); count(); };
document.getElementById('undo').onclick=()=>{ cur.pop(); draw(); };
document.getElementById('clear').onclick=()=>{ polys=[]; cur=[]; for(const k in dropped) delete dropped[k]; draw(); count(); };
document.getElementById('showpins').onchange=e=>{ showPins=e.target.checked; draw(); };
document.getElementById('zin').onclick=()=>{ scale*=1.25; applyScale(); };
document.getElementById('zout').onclick=()=>{ scale/=1.25; applyScale(); };
document.getElementById('zfit').onclick=fit;

function inPoly(p, poly){ let x=p[0],y=p[1],inside=false;
  for(let i=0,j=poly.length-1;i<poly.length;j=i++){
    let xi=poly[i][0],yi=poly[i][1],xj=poly[j][0],yj=poly[j][1];
    if(((yi>y)!=(yj>y)) && (x<(xj-xi)*(y-yi)/(yj-yi)+xi)) inside=!inside; }
  return inside; }
function inAny(p){ for(const poly of polys) if(inPoly(p,poly)) return true; return false; }

function draw(){
  ctx.clearRect(0,0,cv.width,cv.height); ctx.drawImage(IMG,0,0);
  if(showPins){
    for(let di=0; di<DEV.length; di++){ const d=DEV[di];
      for(let pi=0; pi<d.points.length; pi++){ const p=d.points[pi];
        if(dropped[key(di,pi)]){ ctx.strokeStyle='#bbb'; ctx.lineWidth=1.6;
          ctx.beginPath(); ctx.arc(p[0],p[1],7,0,7); ctx.stroke();
          ctx.beginPath(); ctx.moveTo(p[0]-5,p[1]-5); ctx.lineTo(p[0]+5,p[1]+5);
          ctx.moveTo(p[0]+5,p[1]-5); ctx.lineTo(p[0]-5,p[1]+5); ctx.stroke();
        } else { ctx.strokeStyle=d.color; ctx.lineWidth=2.2;
          ctx.beginPath(); ctx.arc(p[0],p[1],7,0,7); ctx.stroke(); }
      } }
  }
  if(hover){ const q=DEV[hover[0]].points[hover[1]];     // drop-mode target highlight
    ctx.strokeStyle='#171717'; ctx.lineWidth=2.5;
    ctx.beginPath(); ctx.arc(q[0],q[1],12,0,7); ctx.stroke(); }
  const all=[...polys.map(p=>[p,true]), ...(cur.length?[[cur,false]]:[])];
  for(const [poly,closed] of all){
    ctx.beginPath(); ctx.moveTo(poly[0][0],poly[0][1]);
    for(let i=1;i<poly.length;i++) ctx.lineTo(poly[i][0],poly[i][1]);
    if(closed){ ctx.closePath(); ctx.fillStyle='rgba(245,197,24,.14)'; ctx.fill(); }
    ctx.strokeStyle='#171717'; ctx.lineWidth=2.5; ctx.stroke();
    for(const v of poly){ ctx.fillStyle='#171717'; ctx.fillRect(v[0]-3,v[1]-3,6,6); }
  }
}

function count(){
  const tbl=document.getElementById('tbl'); let rows='',total=0,ndrop=0;
  const bounded=polys.length>0;
  for(let di=0; di<DEV.length; di++){ const d=DEV[di]; let n=0;
    for(let pi=0; pi<d.points.length; pi++){
      if(dropped[key(di,pi)]) continue;
      if(!bounded || inAny(d.points[pi])) n++;
    }
    total+=n;
    rows+=`<tr><td><span class="dot" style="background:${d.color}"></span>${d.name}</td><td class="n">${n}</td></tr>`;
  }
  for(const k in dropped) ndrop++;
  rows+=`<tr><td class="tot">total pontos</td><td class="n">${total}</td></tr>`;
  if(ndrop) rows+=`<tr><td class="tot">descartados</td><td class="n">${ndrop}</td></tr>`;
  tbl.innerHTML=rows;
  document.getElementById('areas').textContent = bounded ? (polys.length+' área(s) — só pontos dentro')
    : 'página inteira (sem área) — inclui legenda/ampliação';
}

document.getElementById('export').onclick=()=>{
  // sidecar shape: {device:{ "<pageIdx>":"drop" }} using the page-order index (matches points.apply_tags)
  const tags={};
  for(const k in dropped){ const [di,pi]=k.split('|').map(Number); const dev=DEV[di].name;
    (tags[dev]=tags[dev]||{})[pi]='drop'; }
  // polygons back to rot0 coords (px / ZOOM) for reuse in python
  const regions = polys.map(poly=>poly.map(([x,y])=>[Math.round(x/ZOOM*100)/100, Math.round(y/ZOOM*100)/100]));
  document.getElementById('out').value = JSON.stringify({tags, regions}, null, 0);
};
count();
</script></body></html>"""


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("pdf")
    ap.add_argument("--out", default="estimator/out_points")
    ap.add_argument("--zoom", type=float, default=1.6)
    ap.add_argument("--page", type=int, default=0)
    args = ap.parse_args()
    path = build(args.pdf, points.BOTICARIO_POINTS, args.out, args.zoom, args.page)
    print(f"region-select → {path}")


if __name__ == "__main__":
    main()
