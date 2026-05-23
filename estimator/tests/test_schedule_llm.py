"""B5: the LLM fallback must be DEPLOYABLE. `_extract_via_llm` is a router — it
uses the anthropic SDK (base64 image, no `claude` binary) when ANTHROPIC_API_KEY
is set (container/deploy, billed), else the `claude` CLI subprocess (local, free
subscription). Mocked end-to-end: no real call, no key spend — asserts the ROUTING
and the SDK request shape (base64 image block, model alias → full sk-ant id)."""
import base64
import json
import sys
import types

import schedule


def _stub_render(p, i, out):
    with open(out, "wb") as f:
        f.write(b"\x89PNG\r\nfake-bytes")
    return (10, 10)


def _fake_anthropic(captured: dict):
    """Stand-in `anthropic` module: records create() kwargs, returns a canned msg."""
    mod = types.ModuleType("anthropic")

    class _Msg:
        content = [types.SimpleNamespace(
            type="text",
            text=json.dumps({"feeders": [{"cond_fase_mm2": "2.5"}], "panels": [],
                             "confidence": 0.9, "notes": "ok"}))]
        usage = types.SimpleNamespace(input_tokens=10, output_tokens=20)

    class _Messages:
        def create(self, **kw):
            captured.update(kw)
            return _Msg()

    class Anthropic:
        def __init__(self, *a, **k):
            self.messages = _Messages()

    mod.Anthropic = Anthropic
    return mod


def test_llm_routes_to_sdk_when_key_set(monkeypatch):
    captured: dict = {}
    monkeypatch.setitem(sys.modules, "anthropic", _fake_anthropic(captured))
    monkeypatch.setenv("ANTHROPIC_API_KEY", "sk-ant-test")
    monkeypatch.setattr(schedule, "_render_page", _stub_render)
    # the CLI subprocess must NOT run when a key is present
    monkeypatch.setattr(schedule.subprocess, "run",
                        lambda *a, **k: (_ for _ in ()).throw(
                            AssertionError("CLI used despite ANTHROPIC_API_KEY set")))

    data = schedule._extract_via_llm("dummy.pdf", 0, "sonnet")

    assert data["feeders"][0]["cond_fase_mm2"] == "2.5"           # parsed SDK result
    content = captured["messages"][0]["content"]
    img = next(b for b in content if b["type"] == "image")
    assert img["source"]["type"] == "base64"
    assert img["source"]["media_type"] == "image/png"
    assert base64.standard_b64decode(img["source"]["data"])       # real base64
    assert captured["model"].startswith("claude-")                # alias resolved to full id


def test_llm_routes_to_cli_when_no_key(monkeypatch):
    monkeypatch.delenv("ANTHROPIC_API_KEY", raising=False)
    monkeypatch.setattr(schedule, "_render_page", _stub_render)
    called: dict = {}

    class _Proc:
        returncode = 0
        stderr = ""
        stdout = json.dumps({
            "subtype": "success", "is_error": False,
            "result": json.dumps({"feeders": [{"cond_fase_mm2": "4"}], "panels": [],
                                  "confidence": 0.9, "notes": "ok"}),
            "usage": {"input_tokens": 1, "output_tokens": 2}, "total_cost_usd": 0})

    def _run(argv, *a, **k):
        called["argv"] = argv
        return _Proc()

    monkeypatch.setattr(schedule.subprocess, "run", _run)

    data = schedule._extract_via_llm("dummy.pdf", 0, "sonnet")

    assert data["feeders"][0]["cond_fase_mm2"] == "4"
    assert called["argv"][0] == "claude"                          # subscription CLI path
