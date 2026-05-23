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

Validated on Boticário PE06_1PAV: tomadas = 224 vs a Revu audit (~189 initial, refining up
under the "each circle = 1 point" rule Carlos set). HITL: the human confirms the count on
the OVERLAY (a pin per detected device) — the oracle and the correction seam in one, same
accountability model as count.py and the metragem scale gate.

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
    """Single-linkage connected components by bbox proximity (union-find)."""
    n = len(rects)
    par = list(range(n))

    def find(a):
        while par[a] != a:
            par[a] = par[par[a]]
            a = par[a]
        return a

    for i in range(n):
        ri = rects[i] + (-tol, -tol, tol, tol)
        for j in range(i + 1, n):
            if ri.intersects(rects[j]):
                par[find(i)] = find(j)
    groups = collections.defaultdict(list)
    for i in range(n):
        groups[find(i)].append(i)
    return list(groups.values())


def _detect_cluster(drs: list, spec: dict) -> list:
    """A device = a connected group of strokes whose count is in [nlo,nhi] (the glyph's
    tessellation degree). Rejects 1-stroke ticks/leaders and over-merged blobs."""
    tol = spec.get("tol", 8.0)
    nlo, nhi = spec.get("nlo", 1), spec.get("nhi", 10 ** 9)
    rects = [dr["rect"] for dr in drs]
    out = []
    for g in _connected(rects, tol):
        if nlo <= len(g) <= nhi:
            xs = [(rects[i].x0 + rects[i].x1) / 2 for i in g]
            ys = [(rects[i].y0 + rects[i].y1) / 2 for i in g]
            out.append((sum(xs) / len(xs), sum(ys) / len(ys)))
    return out


_DETECTORS = {"circle": _detect_circle, "cluster": _detect_cluster}


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
BOTICARIO_POINTS = {
    "ELE_ST":  {"device": "tomada", "glyph": "circle", "lo": 7, "hi": 15, "min_curves": 2},
    "ELE_SQ":  {"device": "iluminacao_emergencia", "glyph": "cluster", "tol": 8, "nlo": 8, "nhi": 14},
    "ELE_LEP": {"device": "aterramento", "glyph": "cluster", "tol": 8, "nlo": 1, "nhi": 200},
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
