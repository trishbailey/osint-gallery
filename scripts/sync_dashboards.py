#!/usr/bin/env python3
"""Build every 'live' dashboard in dashboards.json from its repo's main branch
into /<slug>/ of this site, rewriting root-relative paths for the subpath.

Safety: each dashboard is built in a temp dir; /<slug>/ is replaced only if
clone + build succeed. On any failure the previous version stays in place.
Private repos are cloned over SSH with a per-repo read-only deploy key
(env var named by deployKeySecret). Never prints keys. Usage: python3 scripts/sync_dashboards.py [slug ...]
"""
import json, os, re, shutil, subprocess, sys, tempfile

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CFG = json.load(open(os.path.join(ROOT, "dashboards.json")))
SITE = CFG["site"].rstrip("/")
KNOWN_HOSTS = os.environ.get("GITHUB_KNOWN_HOSTS_FILE", "")
SECRET_ENVS = {d["deployKeySecret"] for d in CFG["dashboards"] if d.get("deployKeySecret")}
GA_MAIN, GA_OLD = "G-Z61EKRP8QV", "G-FE6CZGWX0J"  # GA_OLD is retired: stripped, never added
GA_SNIPPET = ('<script async src="https://www.googletagmanager.com/gtag/js?id=' + GA_MAIN + '"></script>'
              "<script>window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}"
              "gtag('js',new Date());gtag('config','" + GA_MAIN + "');</script>")
TEXT = (".html", ".htm", ".css", ".js", ".json", ".xml", ".txt", ".webmanifest", ".svg")

def run(cmd, cwd, env=None):
    return subprocess.run(cmd, cwd=cwd, env=env, shell=isinstance(cmd, str),
                          stdout=subprocess.PIPE, stderr=subprocess.STDOUT, text=True)

def clean_env():
    return {k: v for k, v in os.environ.items() if k not in SECRET_ENVS}

BACK_LINK = ('<a data-alldash href="/#dashboards" title="Back to all dashboards" style="display:flex;align-items:center;'
             'min-height:44px;padding:0 24px;background:#0b1526;color:#c8a24a;font:15px system-ui,-apple-system,Segoe UI,sans-serif;'
             'text-decoration:none">&larr; All dashboards</a>')

def add_back_link(text):
    """Every dashboard gets the same '<- All dashboards' link at the very top (Trish, 2026-11-01). Synced dashboards
    come from other repos, so it is added here, once per page, just before the first <header>."""
    if "data-alldash" in text or "Back to all dashboards" in text or "All tools &amp; dashboards" in text:
        return text
    return re.sub(r"(<header\b)", lambda m: BACK_LINK + m.group(1), text, count=1, flags=re.I)

def rewrite(text, slug, old_url, ext):
    base = "/" + slug + "/"
    if old_url:
        text = re.sub(re.escape(old_url.rstrip("/")) + r"(/|(?=[\"'\s<)]))", SITE + base, text)
    # root-relative URLs (not protocol-relative //, not already prefixed)
    neg = r"(?!/|" + re.escape(slug) + r"/)"
    if ext in (".html", ".htm", ".svg"):
        text = re.sub(r'(\b(?:href|src|action|poster|data-src)=["\'])/' + neg, r"\1" + base, text)
        text = re.sub(r'(\bsrcset=["\'])/' + neg, r"\1" + base, text)
        # unquoted attributes, e.g. <a href=/storylines/x.html>
        text = re.sub(r'(\b(?:href|src|action|poster)=)/' + neg + r'(?=[^\s"\'>]*)', r"\1" + base, text)
    if ext in (".html", ".htm", ".css"):
        text = re.sub(r'(url\(\s*["\']?)/' + neg, r"\1" + base, text)
    if ext in (".html", ".htm", ".js"):
        text = re.sub(r'(\bfetch\(\s*["\'`])/' + neg, r"\1" + base, text)
        text = re.sub(r'(\b(?:location\.href|window\.location)\s*=\s*["\'`])/' + neg, r"\1" + base, text)
    if ext in (".html", ".htm"):
        # remove the retired GA property; add GA_MAIN only when the page lacks it
        text = re.sub(r"[ \t]*gtag\(\s*['\"]config['\"]\s*,\s*['\"]" + GA_OLD + r"['\"]\s*\);?[ \t]*\n?", "", text)
        old_loader = r'<script async src="https://www\.googletagmanager\.com/gtag/js\?id=' + GA_OLD + r'"></script>'
        if "gtag/js?id=" + GA_MAIN in text:
            text = re.sub(r"[ \t]*" + old_loader + r"[ \t]*\n?", "", text)
        else:
            text = re.sub(old_loader, '<script async src="https://www.googletagmanager.com/gtag/js?id=' + GA_MAIN + '"></script>', text)
        if GA_MAIN not in text:
            text = re.sub(r"(<head[^>]*>)", lambda m: m.group(1) + GA_SNIPPET, text, count=1, flags=re.I)
    if ext in (".html", ".htm"):
        text = add_back_link(text)
    if ext in (".html", ".htm") and "data-slash-fix" not in text:
        # /<slug> (no trailing slash) would break relative asset paths; bounce to /<slug>/
        fix = ('<script data-slash-fix>if(location.pathname==="/' + slug + '")'
               'location.replace("/' + slug + '/"+location.search+location.hash);</script>')
        text = re.sub(r"(<head[^>]*>)", lambda m: m.group(1) + fix, text, count=1, flags=re.I)
    return text

def build(d):
    slug, repo = d["slug"], d["repo"]
    key_name = d.get("deployKeySecret", "")
    key = os.environ.get(key_name, "") if key_name else ""
    if d.get("private") and not key:
        print(f"[{slug}] SKIP: private repo and secret {key_name or '(no deployKeySecret)'} is empty; previous version kept")
        return False
    tmp = tempfile.mkdtemp(prefix="dash-")
    try:
        env = clean_env()
        kp = ""
        if key:
            if not (KNOWN_HOSTS and os.path.isfile(KNOWN_HOSTS)):
                print(f"[{slug}] FAIL: GITHUB_KNOWN_HOSTS_FILE missing"); return False
            kp = os.path.join(tmp, "deploy_key")
            fd = os.open(kp, os.O_WRONLY | os.O_CREAT, 0o600)
            os.write(fd, (key.strip() + "\n").encode()); os.close(fd)
            env["GIT_SSH_COMMAND"] = (f"ssh -i {kp} -o IdentitiesOnly=yes -o BatchMode=yes "
                                      f"-o StrictHostKeyChecking=yes -o UserKnownHostsFile={KNOWN_HOSTS}")
            url = f"git@github.com:{repo}.git"
        else:
            url = f"https://github.com/{repo}.git"
        r = run(["git", "clone", "--depth", "1", "--branch", d.get("branch", "main"), url, "src"], tmp, env)
        if kp: os.remove(kp)
        if r.returncode:
            print(f"[{slug}] FAIL clone: {r.stdout[-800:]}"); return False
        src = os.path.join(tmp, "src")
        sha = run(["git", "rev-parse", "HEAD"], src).stdout.strip()
        if d.get("build"):
            r = run(d["build"], src, clean_env())
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
