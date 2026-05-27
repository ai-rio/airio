# Python engine for CF Containers (a Worker fronts this; see ARCHITECTURE.md).
# Pure PyMuPDF — no claude CLI needed for the find_tables path (the deployable one).
# NOTE: the LLM-vision fallback (_extract_via_llm) uses the claude CLI and will NOT
# work in-container; for prod, swap it to the Anthropic SDK + sk-ant- key. find_tables
# handles the common case, so the container is useful without it.
FROM python:3.12-slim

WORKDIR /app

# PyMuPDF ships manylinux wheels → no system build deps needed.
RUN pip install --no-cache-dir \
    "pymupdf>=1.24" "fastapi>=0.110" "uvicorn[standard]>=0.29" "python-multipart>=0.0.9"

COPY *.py ./

# CF Containers route to the port the container listens on.
# app_api = phase 7+ JSON API surface (the deployable product).
# app_ele = pre-pivot HTML probe; kept on disk for reference but not the entrypoint.
EXPOSE 8080
CMD ["uvicorn", "app_api:app", "--host", "0.0.0.0", "--port", "8080"]
