"""SERP scraper via Brave Search API. Reads tagsmith/<idea>/*.csv (Google KP,
UTF-16 LE), picks top-10 EN keywords by volume × low-competition, queries Brave,
writes top-10 organic results to serp.db.
Usage: python _serp.py <idea-folder>"""
import csv, json, os, random, sqlite3, sys, time, urllib.parse, urllib.request
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).parent
DB = ROOT / "serp.db"
ENV = ROOT / ".env"
COMP = {"baixo": 1.0, "low": 1.0, "médio": 0.5, "medio": 0.5, "medium": 0.5, "alto": 0.1, "high": 0.1}

def load_env():
    for line in ENV.read_text().splitlines():
        if "=" in line and not line.startswith("#"):
            k, v = line.split("=", 1); os.environ.setdefault(k.strip(), v.strip())

def load_keywords(idea_dir: Path) -> list[str]:
    csv_path = sorted(idea_dir.glob("Keyword Stats*.csv"))[-1]
    rows = list(csv.DictReader(csv_path.read_text(encoding="utf-16").splitlines()[2:], delimiter="\t"))
    scored = []
    for r in rows:
        kw = (r.get("Keyword") or "").strip()
        try: vol = int(float(r.get("Avg. monthly searches") or 0))
        except: vol = 0
        comp = COMP.get((r.get("Competition") or "").strip().lower(), 0.3)
        if kw and vol > 0 and kw.isascii(): scored.append((vol * comp, kw))
    return [k for _, k in sorted(scored, reverse=True)[:10]]

def brave_search(kw: str, token: str) -> list[dict]:
    qs = urllib.parse.urlencode({"q": kw, "count": 10, "country": "US", "search_lang": "en"})
    req = urllib.request.Request(f"https://api.search.brave.com/res/v1/web/search?{qs}",
                                 headers={"X-Subscription-Token": token, "Accept": "application/json"})
    with urllib.request.urlopen(req, timeout=30) as r:
        return json.loads(r.read()).get("web", {}).get("results", [])[:10]

def scrape(idea: str):
    load_env()
    token = os.environ.get("BRAVE_API_KEY") or sys.exit("BRAVE_API_KEY not set in .env")
    idea_dir = ROOT / idea
    if not idea_dir.is_dir(): sys.exit(f"no folder: {idea_dir}")
    kws = load_keywords(idea_dir)
    print(f"[{idea}] top-10 EN keywords: {kws}")
    db = sqlite3.connect(DB)
    db.execute("CREATE TABLE IF NOT EXISTS serp(idea TEXT, keyword TEXT, rank INT, domain TEXT, title TEXT, url TEXT, scraped_at TEXT, PRIMARY KEY(idea, keyword, rank))")
    for kw in kws:
        results = brave_search(kw, token)
        now = datetime.now(timezone.utc).isoformat()
        rows = []
        for i, r in enumerate(results, 1):
            url = r.get("url") or ""
            title = (r.get("title") or "")[:200]
            domain = (r.get("meta_url") or {}).get("hostname") or urllib.parse.urlparse(url).netloc
            domain = domain.removeprefix("www.")
            if domain: rows.append((idea, kw, i, domain, title, url, now))
        db.executemany("INSERT OR REPLACE INTO serp VALUES (?,?,?,?,?,?,?)", rows)
        db.commit()
        print(f"  {kw}: {len(rows)} results")
        time.sleep(random.uniform(1.1, 2.0))
    db.close()
    print(f"[{idea}] done. query: SELECT domain, COUNT(*) c FROM serp WHERE idea='{idea}' GROUP BY domain ORDER BY c DESC LIMIT 10;")

if __name__ == "__main__":
    if len(sys.argv) != 2: sys.exit("usage: python _serp.py <idea-folder>")
    scrape(sys.argv[1])
