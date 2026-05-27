"""
airio container JSON API — phase 7 (S4 Escala) entry point.

Wraps the existing Python analyzers (count.detect_scale, schedule, points, ele,
quadro_pontos) behind a small uvicorn JSON surface. The Astro UI never talks to
this directly; the auxiliary Worker at workers/estimator-container/src/index.ts
fronts it and is the only caller.

S4 surface (this file):
    POST /extract/scale
        body: PDF bytes
        headers/query: page_index (int, default 0), x-airio-correlation-id (str)
        returns 200 JSON:
            {
              scale_denom:   int | null,
              source:        "titleblock_text" | "not_found",
              evidence_text: str | null,
              evidence_bbox: [x0, y0, x1, y1] | null,
              page_size_pt:  [w, h]
            }

        Empty extraction = 200 with scale_denom: null + source: not_found.
        5xx reserved for unhandled crashes only.

Per docs/spec/backend-persistence-plan.md "Container JSON API surface" +
"Two-sided instrumentation". Container logs container_request_start|done
per request with correlation_id; the Astro side logs the matching pair
around env.ESTIMATOR.fetch().

Run locally:
    .venv/bin/uvicorn app_api:app --host 0.0.0.0 --port 8080
"""
from __future__ import annotations

import json
import re
import sys
import time
import uuid
from pathlib import Path
from typing import Optional

import fitz  # PyMuPDF
from fastapi import FastAPI, Header, HTTPException, Query, Request
from fastapi.responses import JSONResponse

sys.path.insert(0, str(Path(__file__).resolve().parent))

import count as count_mod  # noqa: E402

app = FastAPI(title="airio estimator container API")

# --- structured logging ------------------------------------------------------


def _log(event: str, **fields) -> None:
    """Emit one structured JSON log line to stdout (CF Logs picks up)."""
    rec = {"event": event, "ts_ms": int(time.time() * 1000), **fields}
    print(json.dumps(rec, ensure_ascii=False), flush=True)


@app.middleware("http")
async def _instrument(request: Request, call_next):
    correlation_id = (
        request.headers.get("x-airio-correlation-id")
        or f"ctn-{uuid.uuid4().hex[:12]}"
    )
    endpoint = request.url.path
    start = time.time()
    _log("container_request_start", endpoint=endpoint, correlation_id=correlation_id)
    try:
        response = await call_next(request)
        duration_ms = int((time.time() - start) * 1000)
        _log(
            "container_request_done",
            endpoint=endpoint,
            correlation_id=correlation_id,
            duration_ms=duration_ms,
            status=response.status_code,
        )
        response.headers["x-airio-correlation-id"] = correlation_id
        return response
    except Exception as exc:  # noqa: BLE001 — re-raised after logging
        duration_ms = int((time.time() - start) * 1000)
        _log(
            "container_request_error",
            endpoint=endpoint,
            correlation_id=correlation_id,
            duration_ms=duration_ms,
            error=str(exc),
        )
        raise


# --- /extract/scale ----------------------------------------------------------

# Mirrors count.detect_scale's two-branch regex (count.py:294) so titleblock
# `ESC. 1:50` wins and eletroduto labels (`Ø 1/2"`, `TUBO 1/2"`, `1-1/2"`) never
# false-match. ESC-prefixed → \d{1,3} (denom 1–999). Bare → \d{2,3} (denom ≥ 10)
# AND `^...$` anchored on the single-word path so a fraction inside a longer
# word (`Ø1/4`, `1-1/2`) can never produce a match.
_SCALE_RX_ESC = re.compile(
    r"ESC[.:]?\s*1\s*[/:]\s*(\d{1,3})\b",
    re.IGNORECASE,
)
_SCALE_RX_BARE_WORD = re.compile(r"^1\s*[/:]\s*(\d{2,3})$")
_SCALE_RX_BARE_PAIR = re.compile(r"(?:^|\s)1\s*[/:]\s*(\d{2,3})(?:\s|$)")


def _match_scale(
    words: list,
) -> tuple[Optional[int], Optional[str], Optional[list[float]]]:
    """Pure regex/voting core of /extract/scale — no PyMuPDF.

    `words` is a list of PyMuPDF word tuples
    `(x0, y0, x1, y1, text, block_no, line_no, word_no)`. Returns
    `(denom, evidence_text, [x0, y0, x1, y1])` or `(None, None, None)`.

    Two passes: single-word then adjacent-word pairs (catches `ESC.` + `1:50`
    split across tokens). Inch markers (`"`) eliminate the word entirely —
    eletroduto sizing is the dominant false-positive (see
    reference_br_quadro_conventions).
    """
    candidates: list[tuple[int, str, list[float]]] = []

    # Single-word pass.
    for w in words:
        x0, y0, x1, y1, txt = w[0], w[1], w[2], w[3], w[4]
        if '"' in txt:
            continue  # inch marker — eletroduto label, not a scale
        m = _SCALE_RX_ESC.search(txt) or _SCALE_RX_BARE_WORD.match(txt)
        if m:
            candidates.append((int(m.group(1)), txt, [x0, y0, x1, y1]))

    # Adjacent-word-pair pass — catches `ESC.` + `1:50` split across tokens.
    by_line: dict[tuple[int, int], list[tuple[float, float, float, float, str]]] = {}
    for w in words:
        x0, y0, x1, y1, txt = w[0], w[1], w[2], w[3], w[4]
        block_no, line_no = w[5], w[6]
        by_line.setdefault((block_no, line_no), []).append((x0, y0, x1, y1, txt))
    for seq in by_line.values():
        for i in range(len(seq) - 1):
            a, b = seq[i], seq[i + 1]
            if '"' in a[4] or '"' in b[4]:
                continue
            joined = f"{a[4]} {b[4]}"
            m = _SCALE_RX_ESC.search(joined) or _SCALE_RX_BARE_PAIR.search(joined)
            if m:
                bbox = [
                    min(a[0], b[0]),
                    min(a[1], b[1]),
                    max(a[2], b[2]),
                    max(a[3], b[3]),
                ]
                candidates.append((int(m.group(1)), joined, bbox))

    if not candidates:
        return None, None, None
    # Most common denom wins; pick the first bbox for that denom.
    denoms = [c[0] for c in candidates]
    winning = max(set(denoms), key=denoms.count)
    for d, txt, bbox in candidates:
        if d == winning:
            return d, txt, bbox
    return None, None, None


def _find_scale_evidence(
    page: fitz.Page,
) -> tuple[Optional[int], Optional[str], Optional[list[float]]]:
    """PDF wrapper around `_match_scale` — pulls word geometry off `page`."""
    words = page.get_text("words")  # (x0, y0, x1, y1, word, block_no, line_no, word_no)
    return _match_scale(words)


@app.post("/extract/scale")
async def extract_scale(
    request: Request,
    page_index: int = Query(0, ge=0),
    x_airio_correlation_id: Optional[str] = Header(default=None),
) -> JSONResponse:
    body = await request.body()
    if not body:
        raise HTTPException(400, "Empty request body — expected PDF bytes")
    try:
        doc = fitz.open(stream=body, filetype="pdf")
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(400, f"Invalid PDF: {exc}")

    if page_index >= doc.page_count:
        raise HTTPException(
            400,
            f"page_index {page_index} out of range (doc has {doc.page_count} pages)",
        )

    page = doc[page_index]
    page_size_pt = [float(page.rect.width), float(page.rect.height)]

    denom, evidence_text, evidence_bbox = _find_scale_evidence(page)

    if denom is None:
        return JSONResponse(
            {
                "scale_denom": None,
                "source": "not_found",
                "evidence_text": None,
                "evidence_bbox": None,
                "page_size_pt": page_size_pt,
            }
        )

    return JSONResponse(
        {
            "scale_denom": denom,
            "source": "titleblock_text",
            "evidence_text": evidence_text,
            "evidence_bbox": evidence_bbox,
            "page_size_pt": page_size_pt,
        }
    )


@app.get("/healthz")
def healthz() -> dict:
    return {"ok": True}
