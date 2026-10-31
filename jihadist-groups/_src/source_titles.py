"""Collect every source URL used by the page, fetch its <title> and HTTP status, and cache both in data_in/source_titles.json.
404/410 pages are reported so they can be dropped (401/403/406/429 are kept as paywalls or bot blocks)."""
import json, re, pathlib, subprocess, html, sys, concurrent.futures as cf
root = pathlib.Path(__file__).parent; D = root / "data_in"
urls = set()
for n in ("groups.json", "relations.json", "incidents.json", "momentum.json", "extra_sources.json"):
    p = D / n
    if p.exists(): urls |= set(re.findall(r"https?://[^\s\"'<>\\]+", p.read_text()))
def fix(u):
    u = u.rstrip(".,;")
    while u.endswith(")") and u.count("(") < u.count(")"): u = u[:-1]
    return u
urls = {fix(u) for u in urls if "creativecommons" not in u}
cache_p = D / "source_titles.json"
cache = json.load(open(cache_p)) if cache_p.exists() else {}
UA = "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124 Safari/537.36"
def get(u):
    if u in cache and cache[u].get("status") not in (None, "000", "429"): return u, cache[u]
    try:
        r = subprocess.run(["curl", "-sL", "-m", "20", "-A", UA, "--max-filesize", "3000000", "-r", "0-250000", "-w", "\n%{http_code}", u], capture_output=True)
        body, _, code = r.stdout.rpartition(b"\n")
        t = None
        m = re.search(rb"<title[^>]*>(.*?)</title>", body, re.S | re.I)
        if m: t = re.sub(r"\s+", " ", html.unescape(m.group(1).decode("utf-8", "ignore"))).strip()
        return u, {"status": code.decode(), "title": t}
    except Exception as e:
        return u, {"status": "000", "title": None}
with cf.ThreadPoolExecutor(10) as ex:
    for u, v in ex.map(get, sorted(urls)): cache[u] = v
json.dump(cache, open(cache_p, "w"), indent=1, ensure_ascii=False)
bad = {u: v["status"] for u, v in cache.items() if u in urls and v["status"] in ("404", "410")}
print(len(urls), "urls;", len(bad), "dead:", bad)
