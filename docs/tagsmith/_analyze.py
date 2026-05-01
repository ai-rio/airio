#!/usr/bin/env python3
"""Score Google Keyword Planner exports per contender folder.

Reads UTF-16 TSV exports, normalizes to per-contender scoreboard.
"""
from __future__ import annotations

import csv
import json
import re
from pathlib import Path

ROOT = Path(__file__).parent

CONTENDER_LABELS = {
    "yt-summary": "1. YouTube → Summary / Notes",
    "og-image": "2. OG Image Generator",
    "resume-portfolio": "3. Hosted Resume / Portfolio",
    "price-tracker": "4. BR Ecom Price Tracker",
    "markup-generator": "5. Schema Markup Generator",
    "csv-cleaner": "6. CSV / Spreadsheet AI Cleaner",
    "anaon-feedback": "7. Anonymous Feedback Link",
    "time-monitor": "8. Uptime Monitor",
    "converter": "9. HEIC → JPG Converter",
    "visibility": "10. AEO Brand Citation Tracker",
}

COMPETITION_SCORE = {"Baixo": 1, "Low": 1, "Médio": 2, "Medium": 2, "Alto": 3, "High": 3}


def parse_money(raw: str) -> float | None:
    if raw is None:
        return None
    s = raw.strip().strip('"').replace(".", "").replace(",", ".")
    if not s:
        return None
    try:
        return float(s)
    except ValueError:
        return None


def parse_int(raw: str) -> int:
    if raw is None or raw.strip() == "":
        return 0
    try:
        return int(float(raw.replace(",", ".")))
    except ValueError:
        return 0


def read_kp_csv(path: Path) -> list[dict]:
    raw = path.read_bytes()
    if raw.startswith(b"\xff\xfe") or raw.startswith(b"\xfe\xff"):
        text = raw.decode("utf-16")
    else:
        text = raw.decode("utf-8", errors="replace")
    lines = text.splitlines()
    if len(lines) < 4:
        return []
    header = lines[2].split("\t")
    rows: list[dict] = []
    reader = csv.reader(lines[3:], delimiter="\t", quotechar='"')
    for row in reader:
        if not row or not row[0].strip():
            continue
        d = {header[i]: (row[i] if i < len(row) else "") for i in range(len(header))}
        rows.append(d)
    return rows


def is_keyword_planner(path: Path) -> bool:
    return path.name.lower().startswith("keyword stats") or path.name.lower().endswith(".csv") and "keyword" in path.name.lower()


def lang_of(keyword: str) -> str:
    pt_markers = re.compile(
        r"\b("
        r"para|de|para\sa|do|da|dos|das|com|sem|grátis|gratis|gratuito|"
        r"como|onde|qual|fazer|criar|gerador|currículo|curriculo|imagem|"
        r"vídeo|video|texto|alerta|preço|preco|monitorar|baixar|abrir|"
        r"converter|português|portugues"
        r")\b",
        re.IGNORECASE,
    )
    return "pt" if pt_markers.search(keyword) else "en"


def analyze_folder(folder: Path) -> dict:
    all_rows: list[dict] = []
    for f in sorted(folder.glob("*.csv")):
        if "Zone.Identifier" in f.name:
            continue
        if "time_series" in f.name.lower():
            continue
        all_rows.extend(read_kp_csv(f))

    out = {
        "key": folder.name,
        "label": CONTENDER_LABELS.get(folder.name, folder.name),
        "total_keywords": len(all_rows),
        "total_volume": 0,
        "en_volume": 0,
        "pt_volume": 0,
        "competition": {"low": 0, "med": 0, "high": 0},
        "avg_cpc_high": 0.0,
        "avg_cpc_low": 0.0,
        "top_en": [],
        "top_pt": [],
        "files": [f.name for f in folder.glob("*.csv") if "Zone" not in f.name],
    }

    if not all_rows:
        return out

    cpc_high_vals: list[float] = []
    cpc_low_vals: list[float] = []

    keyed: list[tuple[str, int, str, float | None, float | None, str]] = []
    for r in all_rows:
        kw = (r.get("Keyword") or "").strip()
        if not kw:
            continue
        vol = parse_int(r.get("Avg. monthly searches", "") or "0")
        comp = (r.get("Competition") or "").strip()
        cpc_low = parse_money(r.get("Top of page bid (low range)", ""))
        cpc_high = parse_money(r.get("Top of page bid (high range)", ""))
        lang = lang_of(kw)

        out["total_volume"] += vol
        if lang == "pt":
            out["pt_volume"] += vol
        else:
            out["en_volume"] += vol

        if comp in ("Baixo", "Low"):
            out["competition"]["low"] += 1
        elif comp in ("Médio", "Medium"):
            out["competition"]["med"] += 1
        elif comp in ("Alto", "High"):
            out["competition"]["high"] += 1

        if cpc_low is not None:
            cpc_low_vals.append(cpc_low)
        if cpc_high is not None:
            cpc_high_vals.append(cpc_high)

        keyed.append((kw, vol, comp, cpc_low, cpc_high, lang))

    if cpc_high_vals:
        out["avg_cpc_high"] = round(sum(cpc_high_vals) / len(cpc_high_vals), 2)
    if cpc_low_vals:
        out["avg_cpc_low"] = round(sum(cpc_low_vals) / len(cpc_low_vals), 2)

    keyed.sort(key=lambda x: x[1], reverse=True)
    seen_en, seen_pt = set(), set()
    for kw, vol, comp, lo, hi, lang in keyed:
        norm = re.sub(r"\s+", " ", kw.lower()).strip()
        if lang == "en" and norm not in seen_en and len(out["top_en"]) < 10:
            seen_en.add(norm)
            out["top_en"].append({"kw": kw, "vol": vol, "comp": comp, "cpc_high": hi})
        elif lang == "pt" and norm not in seen_pt and len(out["top_pt"]) < 10:
            seen_pt.add(norm)
            out["top_pt"].append({"kw": kw, "vol": vol, "comp": comp, "cpc_high": hi})

    return out


def score_contender(c: dict) -> int:
    """0-100 composite score."""
    vol = c["total_volume"]
    if vol >= 5_000_000:
        v_score = 40
    elif vol >= 1_000_000:
        v_score = 32
    elif vol >= 200_000:
        v_score = 24
    elif vol >= 50_000:
        v_score = 16
    elif vol >= 10_000:
        v_score = 8
    else:
        v_score = 2

    total_comp = sum(c["competition"].values()) or 1
    low_pct = c["competition"]["low"] / total_comp
    c_score = int(low_pct * 25)

    cpc = c["avg_cpc_high"] or 0
    if cpc >= 30:
        m_score = 20
    elif cpc >= 10:
        m_score = 16
    elif cpc >= 3:
        m_score = 12
    elif cpc >= 1:
        m_score = 8
    else:
        m_score = 4

    has_pt = c["pt_volume"] >= 10_000
    has_en = c["en_volume"] >= 10_000
    bilingual = 15 if (has_pt and has_en) else (8 if has_en or has_pt else 0)

    return v_score + c_score + m_score + bilingual


def main() -> None:
    contenders = []
    for folder in sorted(ROOT.iterdir()):
        if not folder.is_dir():
            continue
        if folder.name.startswith("_") or folder.name.startswith("."):
            continue
        if folder.name not in CONTENDER_LABELS:
            continue
        c = analyze_folder(folder)
        c["score"] = score_contender(c)
        contenders.append(c)

    contenders.sort(key=lambda c: c["score"], reverse=True)

    (ROOT / "_scoreboard.json").write_text(json.dumps(contenders, indent=2, ensure_ascii=False))

    md = ["# Tiiny Research — Scoreboard\n"]
    md.append("Source: Google Keyword Planner exports (per-folder CSVs).\n")
    md.append("Score = volume + low-competition share + CPC tier + bilingual bonus (max 100).\n")

    md.append("\n## Ranking\n")
    md.append("| Rank | Contender | Score | Total Vol | EN Vol | PT Vol | Avg CPC (high) | Low-Comp % |")
    md.append("|---|---|---|---|---|---|---|---|")
    for i, c in enumerate(contenders, 1):
        total_comp = sum(c["competition"].values()) or 1
        low_pct = c["competition"]["low"] / total_comp * 100
        md.append(
            f"| {i} | {c['label']} | **{c['score']}** | {c['total_volume']:,} | "
            f"{c['en_volume']:,} | {c['pt_volume']:,} | R${c['avg_cpc_high']:.2f} | {low_pct:.0f}% |"
        )

    md.append("\n## Per-Contender Detail\n")
    for c in contenders:
        md.append(f"\n### {c['label']} — score {c['score']}\n")
        md.append(f"- Total keywords: {c['total_keywords']:,}")
        md.append(f"- Total volume/mo: {c['total_volume']:,}")
        md.append(f"- EN volume: {c['en_volume']:,} | PT volume: {c['pt_volume']:,}")
        md.append(
            f"- Competition: {c['competition']['low']} low / "
            f"{c['competition']['med']} med / {c['competition']['high']} high"
        )
        md.append(f"- Avg CPC (high): R${c['avg_cpc_high']:.2f} | (low): R${c['avg_cpc_low']:.2f}")

        if c["top_en"]:
            md.append("\n**Top EN keywords:**")
            md.append("| Keyword | Volume | Comp | CPC High |")
            md.append("|---|---|---|---|")
            for k in c["top_en"]:
                cpc = f"R${k['cpc_high']:.2f}" if k["cpc_high"] is not None else "—"
                md.append(f"| {k['kw']} | {k['vol']:,} | {k['comp']} | {cpc} |")

        if c["top_pt"]:
            md.append("\n**Top PT keywords:**")
            md.append("| Keyword | Volume | Comp | CPC High |")
            md.append("|---|---|---|---|")
            for k in c["top_pt"]:
                cpc = f"R${k['cpc_high']:.2f}" if k["cpc_high"] is not None else "—"
                md.append(f"| {k['kw']} | {k['vol']:,} | {k['comp']} | {cpc} |")

    (ROOT / "SCOREBOARD.md").write_text("\n".join(md))
    print(f"Wrote {ROOT / 'SCOREBOARD.md'}")
    print(f"Wrote {ROOT / '_scoreboard.json'}")
    print()
    print("Top 3:")
    for c in contenders[:3]:
        print(f"  {c['score']:>3}  {c['label']}  ({c['total_volume']:,} vol)")


if __name__ == "__main__":
    main()
