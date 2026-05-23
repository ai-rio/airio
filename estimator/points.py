"""
POINTS — count electrical device POINTS (tomadas, luminárias, emergência, aterramento)
from plan geometry.

Devices are SYMBOLS, not text (no per-device callout), so they're counted by matching the
repeated GLYPH on each device layer — NOT by clustering raw strokes (which over-counts: a
circle splits from its diameter line, and adjacent outlets merge into blobs). Two detectors:

  • "circle" — one symbol = a single bezier-curve PATH (the ABNT tomada ⊘: a ~9pt circle).
    Count the circle-paths directly; the diameter line(s)/stem are separate strokes, ignored.
  • "cluster" — one symbol = a connected group of N strokes (emergência block, aterramento).
    Connected components by touching bbox, kept when the stroke-count matches the glyph
    (rejects 1-stroke leader-ticks and over-merged blobs).

PROJECT-AGNOSTIC engine; the layer→(device, glyph) map is CONFIG (new project = new config,
see ARCHITECTURE.md) — same seam as glossary.py (infra) / header_glossary.py (cable). The
RUN layers (eletroduto/eletrocalha/perfilado) are NOT points — they belong to ele.metragem.

Validated on Boticário PE06_1PAV: tomadas = 224 (Revu ~189 initial, refining up under the
"each circle = 1 point" rule Carlos set); luminárias = 238 install points (Revu 244 after
refine — Δ6, the deterministic geometry sits in a 236-240 band; the residual is likely a
few long battens the frame filter drops, left for HITL not param-torture); interruptores =
97 (Revu raw 103 WITH legend → Δ−6; plan-only ≈ 99 once the 5 legend samples are dropped,
Δ−2 there is a coincidence of composition — the legend FPs roughly offset a few missed plan
glyphs, so trust the Δ−6 same-composition number, not the lucky Δ−2). HITL: the human
confirms the count on the OVERLAY (a pin per detected device) — the oracle and the
correction seam in one, same accountability model as count.py and the metragem scale gate.

Usage:
    python points.py <plan.pdf> [--out OUTDIR] [--page N]
"""
from __future__ import annotations

import argparse
import collections
import json
from pathlib import Path

import fitz


def _square_bbox(r: fitz.Rect, lo: float, hi: float, square_tol: float) -> bool:
    w, h = r.width, r.height
    return lo <= w <= hi and lo <= h <= hi and abs(w - h) <= square_tol


def _detect_circle(drs: list, spec: dict) -> list:
    """A device = a single path with ≥min_curves bezier curves and a ~square bbox in
    [lo,hi] (the symbol's circle). One centroid per matched path."""
    lo, hi = spec.get("lo", 7), spec.get("hi", 15)
    square_tol, minc = spec.get("square_tol", 4), spec.get("min_curves", 2)
    out = []
    for dr in drs:
        if sum(1 for it in dr["items"] if it[0] == "c") < minc:
            continue
        r = dr["rect"]
        if _square_bbox(r, lo, hi, square_tol):
            out.append(((r.x0 + r.x1) / 2, (r.y0 + r.y1) / 2))
    return out


def _connected(rects: list, tol: float) -> list:
    """Single-linkage connected components by bbox proximity (union-find), pruned by a
    spatial grid so it stays ~O(n) on dense layers — luminotécnica carries ~10k strokes
    where the naive O(n²) pass times out. Each rect is bucketed into every grid cell it
    covers (so long strokes/leaders are never missed); only rects sharing a cell are
    tested. Same result as the brute-force pass, just without the far-pair comparisons."""
    n = len(rects)
    par = list(range(n))

    def find(a):
        while par[a] != a:
            par[a] = par[par[a]]
            a = par[a]
        return a

    cell = 16.0

    def cells(r):
        for cx in range(int(r.x0 // cell), int(r.x1 // cell) + 1):
            for cy in range(int(r.y0 // cell), int(r.y1 // cell) + 1):
                yield (cx, cy)

    grid: dict = collections.defaultdict(list)
    for i, r in enumerate(rects):
        for c in cells(r):
            grid[c].append(i)
    for i, r in enumerate(rects):
        ri = r + (-tol, -tol, tol, tol)
        seen = set()
        for c in cells(ri):
            for j in grid.get(c, ()):
                if j > i and j not in seen and ri.intersects(rects[j]):
                    seen.add(j)
                    par[find(i)] = find(j)
    groups = collections.defaultdict(list)
    for i in range(n):
        groups[find(i)].append(i)
    return list(groups.values())


def _detect_cluster(drs: list, spec: dict) -> list:
    """A device = a connected group of strokes whose count is in [nlo,nhi] (the glyph's
    tessellation degree). Rejects 1-stroke ticks/leaders and over-merged blobs; an
    optional `frame_min` also rejects a cluster whose SMALLER bbox side exceeds it — a
    boxed text/legend frame (both sides large) as opposed to a thin fixture or batten."""
    tol = spec.get("tol", 8.0)
    nlo, nhi = spec.get("nlo", 1), spec.get("nhi", 10 ** 9)
    frame_min = spec.get("frame_min", float("inf"))
    rects = [dr["rect"] for dr in drs]
    out = []
    for g in _connected(rects, tol):
        if not (nlo <= len(g) <= nhi):
            continue
        gr = [rects[i] for i in g]
        bw = max(r.x1 for r in gr) - min(r.x0 for r in gr)
        bh = max(r.y1 for r in gr) - min(r.y0 for r in gr)
        if min(bw, bh) > frame_min:
            continue
        xs = [(r.x0 + r.x1) / 2 for r in gr]
        ys = [(r.y0 + r.y1) / 2 for r in gr]
        out.append((sum(xs) / len(xs), sum(ys) / len(ys)))
    return out


def _detect_symbol(drs: list, spec: dict) -> list:
    """A device = a single self-contained path whose bbox falls in the glyph size window
    [wlo,whi]×[hlo,hhi] — the simplest detector: no curve/square requirement, just size.
    For one-path glyphs that aren't circles (the interruptor 'S', drawn as one polyline).
    The size window rejects the layer's leader ticks (≈0.1pt-wide stubs) and flat conduit
    segments (≈1pt-tall) without separating co-drawn legend samples (same size as the plan
    glyphs) — those few stay in, and the HITL drops them on the overlay (they cluster in
    the symbology strip). The window is per-project CONFIG (new layer/project retunes the
    numbers, not this mechanism), same seam as glossary.py — see ARCHITECTURE.md."""
    wlo, whi = spec.get("wlo", 5), spec.get("whi", 20)
    hlo, hhi = spec.get("hlo", 3), spec.get("hhi", 15)
    out = []
    for dr in drs:
        r = dr["rect"]
        if wlo <= r.width <= whi and hlo <= r.height <= hhi:
            out.append(((r.x0 + r.x1) / 2, (r.y0 + r.y1) / 2))
    return out


_DETECTORS = {"circle": _detect_circle, "cluster": _detect_cluster,
              "symbol": _detect_symbol}


def count_points(pdf_path: str, config: dict, page_index: int = 0) -> dict:
    """Per device layer in `config`, detect its glyph instances → count + centroids.
    config: {layer: {"device": str, "glyph": "circle"|"cluster", ...detector spec}}."""
    page = fitz.open(pdf_path)[page_index]
    page.set_rotation(0)                       # work in geometry coords (rotation-independent)
    by_layer: dict[str, list] = collections.defaultdict(list)
    for dr in page.get_drawings():
        by_layer[dr.get("layer") or ""].append(dr)
    out = {}
    for layer, spec in config.items():
        cents = _DETECTORS[spec["glyph"]](by_layer.get(layer, []), spec)
        out[spec["device"]] = {"count": len(cents), "layer": layer,
                               "glyph": spec["glyph"], "centroids": cents}
    return out


# Boticário device-point config (its self-describing layers, confirmed by Carlos):
#   ELE_ST = tomadas (circle ⊘), ELE_SQ = iluminação de emergência, ELE_LEP = aterramento.
#   ALL OTHER ELE_* layers are infrastructure (eletroduto/calha/perfilado) — NOT points.
#   Luminárias live on MMM-LUMINOTÉCNICA as several fixture glyphs (downlight ⊘9, batten,
#   ⊕ corridor, arandela…). They are counted as ONE total = the install POINTS ("drops"):
#   the customer buys the fixtures, the installer prices the drop (caixa + eletroduto +
#   condutor + mão-de-obra), which is type-blind — so fixture SKU is a downstream BOM split,
#   not a points concern. frame_min drops the boxed text/legend frames on the layer.
#   ELE_SI = interruptores (confirmed by the PE06 symbology legend: 5 variants — simples,
#   simples 2 seções, simples condulete, paralelo, paralelo condulete — all the blue 'S').
#   Counted as drops via the size-window "symbol" detector. UNLIKE luminárias, the installer
#   SUPPLIES interruptores, so the correct BOM splits per variant (paralelo costs more: 3-way
#   wire + 2 boxes); that per-variant split is the next refinement, no per-variant oracle yet.
BOTICARIO_POINTS = {
    "ELE_ST":  {"device": "tomada", "glyph": "circle", "lo": 7, "hi": 15, "min_curves": 2},
    "ELE_SQ":  {"device": "iluminacao_emergencia", "glyph": "cluster", "tol": 8, "nlo": 8, "nhi": 14},
    "ELE_LEP": {"device": "aterramento", "glyph": "cluster", "tol": 8, "nlo": 1, "nhi": 200},
    "MMM-LUMINOTÉCNICA": {"device": "luminaria", "glyph": "cluster", "tol": 5, "nlo": 2, "frame_min": 60},
    "ELE_SI":  {"device": "interruptor", "glyph": "symbol", "wlo": 5, "whi": 20, "hlo": 3, "hhi": 15},
}

_COLORS = [(1, 0, 0), (0, 0.55, 0), (0, 0, 1), (1, 0.5, 0), (0.6, 0, 0.6)]


def overlay(pdf_path: str, config: dict, out_png: str, page_index: int = 0,
            long_edge: int = 2600) -> dict:
    """Render the plan with a colored pin per detected device (the HITL proof: WHERE each
    counted point is). Returns the counts; the human verifies/corrects on this image."""
    counts = count_points(pdf_path, config, page_index)
    page = fitz.open(pdf_path)[page_index]
    page.set_rotation(0)
    shp = page.new_shape()
    for i, (_device, r) in enumerate(sorted(counts.items())):
        for cx, cy in r["centroids"]:
            shp.draw_circle(fitz.Point(cx, cy), 9)
        shp.finish(color=_COLORS[i % len(_COLORS)], width=1.8)
    shp.commit()
    z = min(long_edge / max(page.rect.width, page.rect.height), 4)
    page.get_pixmap(matrix=fitz.Matrix(z, z), alpha=False).save(out_png)
    return counts


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("pdf")
    ap.add_argument("--out", default="estimator/out_points")
    ap.add_argument("--page", type=int, default=0)
    args = ap.parse_args()
    outdir = Path(args.out)
    outdir.mkdir(parents=True, exist_ok=True)
    png = str(outdir / "points_overlay.png")
    counts = overlay(args.pdf, BOTICARIO_POINTS, png, args.page)
    summary = {d: {"count": r["count"], "layer": r["layer"]} for d, r in counts.items()}
    (outdir / "points.json").write_text(json.dumps(summary, indent=2, ensure_ascii=False))
    print(f"# Pontos — {Path(args.pdf).name}")
    for d, r in sorted(counts.items()):
        print(f"  {d:<24} {r['count']:>4}  (layer {r['layer']}, glyph {r['glyph']})")
    print(f"  overlay → {png}")


if __name__ == "__main__":
    main()
