#!/usr/bin/env python3
"""Build every 'live' dashboard in dashboards.json from its repo's main branch
into /<slug>/ of this site, rewriting root-relative paths for the subpath.

Safety: each dashboard is built in a temp dir; /<slug>/ is replaced only if
clone + build succeed. On any failure the previous version stays in place.
Never prints tokens. Usage: python3 scripts/sync_dashboards.py [slug ...]
"""
import json, os, re, shutil, subprocess, sys, tempfile

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CFG = json.load(open(os.path.join(ROOT, "dashboards.json")))
SITE = CFG["site"].rstrip("/")
TOKEN = os.environ.get("DASHBOARD_READ_TOKEN", "").strip()
GA_MAIN, GA_SITE = "G-Z61EKRP8QV", "G-FE6CZGWX0J"
TEXT = (".html", ".htm", ".css", ".js", ".json", ".xml", ".txt", ".webmanifest", ".svg")

def run(cmd, cwd, env=None):
    return subprocess.run(cmd, cwd=cwd, env=env, shell=isinstance(cmd, str),
                          stdout=subprocess.PIPE, stderr=subprocess.STDOUT, text=True)

def scrub(s):
    return s.replace(TOKEN, "***") if TOKEN else s

def rewrite(text, slug, old_url, ext):
    base = "/" + slug + "/"
    if old_url:
        text = re.sub(re.escape(old_url.rstrip("/")) + r"(/|(?=[\"'\s<)]))", SITE + base, text)
    # root-relative URLs (not protocol-relative //, not already prefixed)
    neg = r"(?!/|" + re.escape(slug) + r"/)"
    if ext in (".html", ".htm", ".svg"):
        text = re.sub(r'(\b(?:href|src|action|poster|data-src)=["\'])/' + neg, r"\1" + base, text)
        text = re.sub(r'(\bsrcset=["\'])/' + neg, r"\1" + base, text)
    if ext in (".html", ".htm", ".css"):
        text = re.sub(r'(url\(\s*["\']?)/' + neg, r"\1" + base, text)
    if ext in (".html", ".htm", ".js"):
        text = re.sub(r'(\bfetch\(\s*["\'`])/' + neg, r"\1" + base, text)
        text = re.sub(r'(\b(?:location\.href|window\.location)\s*=\s*["\'`])/' + neg, r"\1" + base, text)
    if ext in (".html", ".htm") and GA_MAIN in text and GA_SITE not in text:
        text = re.sub(r"(gtag\(\s*['\"]config['\"]\s*,\s*['\"]" + GA_MAIN + r"['\"]\s*\);?)",
                      r"\1gtag('config','" + GA_SITE + "');", text, count=1)
    return text

def build(d):
    slug, repo = d["slug"], d["repo"]
    if d.get("private") and not TOKEN:
        print(f"[{slug}] SKIP: private repo and DASHBOARD_READ_TOKEN is not set; previous version kept")
        return False
    tmp = tempfile.mkdtemp(prefix="dash-")
    try:
        url = (f"https://x-access-token:{TOKEN}@github.com/{repo}.git" if TOKEN
               else f"https://github.com/{repo}.git")
        r = run(["git", "clone", "--depth", "1", "--branch", d.get("branch", "main"), url, "src"], tmp)
        if r.returncode:
            print(f"[{slug}] FAIL clone: {scrub(r.stdout)[-800:]}"); return False
        src = os.path.join(tmp, "src")
        sha = run(["git", "rev-parse", "HEAD"], src).stdout.strip()
        if d.get("build"):
            env = {k: v for k, v in os.environ.items() if k != "DASHBOARD_READ_TOKEN"}
            r = run(d["build"], src, env)
            if r.returncode:
                print(f"[{slug}] FAIL build at {sha[:7]}: {r.stdout[-1500:]}"); return False
        pub = os.path.join(src, d.get("publish", "public"))
        if not os.path.isfile(os.path.join(pub, "index.html")):
            print(f"[{slug}] FAIL: {d.get('publish')}/index.html missing at {sha[:7]}"); return False
        out = os.path.join(tmp, "out")
        shutil.copytree(pub, out)
        for dp, _, files in os.walk(out):
            for f in files:
                p = os.path.join(dp, f); ext = os.path.splitext(f)[1].lower()
                if ext not in TEXT: continue
                try: t = open(p, encoding="utf-8").read()
                except UnicodeDecodeError: continue
                n = rewrite(t, slug, d.get("oldUrl", ""), ext)
                if n != t: open(p, "w", encoding="utf-8").write(n)
        open(os.path.join(out, ".source"), "w").write(f"{repo}@{sha}\n")
        dest = os.path.join(ROOT, slug)
        if os.path.isdir(os.path.join(dest, "_src")):
            print(f"[{slug}] FAIL: /{slug}/ is an in-repo dashboard (has _src/); refusing to overwrite"); return False
        if os.path.exists(dest): shutil.rmtree(dest)
        shutil.copytree(out, dest)
        print(f"[{slug}] OK {repo}@{sha[:7]}")
        return True
    finally:
        shutil.rmtree(tmp, ignore_errors=True)

def point_cards_at_subpaths(done):
    """Once a dashboard is served from /<slug>/, point its tools.json card there."""
    path = os.path.join(ROOT, "tools.json")
    data = json.load(open(path, encoding="utf-8"))
    changed = False
    for d in done:
        for card in data.get("dashboards", []):
            new = f"{SITE}/{d['slug']}/"
            if card.get("id") == d.get("cardId", d["slug"]) and card.get("enterUrl") != new:
                card["enterUrl"] = new; changed = True
    if changed:
        open(path, "w", encoding="utf-8").write(json.dumps(data, indent=2, ensure_ascii=False) + "\n")

def main():
    only = set(sys.argv[1:])
    results = {}
    for d in CFG["dashboards"]:
        if d.get("status") != "live" or not d.get("repo"): continue
        if only and d["slug"] not in only: continue
        results[d["slug"]] = build(d)
    point_cards_at_subpaths([d for d in CFG["dashboards"] if results.get(d["slug"])])
    failed = [s for s, ok in results.items() if not ok]
    if failed: print("Not updated (previous version kept):", ", ".join(failed))
    return 0

if __name__ == "__main__":
    sys.exit(main())
