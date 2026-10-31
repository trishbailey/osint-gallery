"""Check every http(s) URL in sources.py, index.html and app.js. 404/410/DNS failure = fail; 401/403/429/5xx-by-bot-wall are reported as 'blocked' (kept).
Never fetches .cn hosts.  Run: python3 _src/check_urls.py"""
import re, sys, os, subprocess, urllib.parse
ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..")
urls = set()
for f in ("_src/sources.py", "index.html", "app.js", "_src/bonus_inputs.py", "_src/pools_inputs.py"):
    urls |= set(re.findall(r"https?://[^\s\"'<>)\\]+", open(os.path.join(ROOT, f), encoding="utf-8").read()))
skip = ("googletagmanager.com", "www.w3.org", "127.0.0.1", "localhost", "schema.org")
urls = sorted(u.rstrip(".,;") for u in urls if not any(s in u for s in skip))
bad = []
for u in urls:
    host = urllib.parse.urlparse(u).hostname or ""
    if host.endswith(".cn"): bad.append((u, "cn host")); continue
    r = subprocess.run(["curl", "-s", "-o", "/dev/null", "-L", "--compressed", "-m", "25", "-A", "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/124 Safari/537.36", "-w", "%{http_code}", u], capture_output=True, text=True)
    code = r.stdout.strip()
    tag = "OK" if code.startswith("2") else ("blocked" if code in ("401", "403", "429", "000") or code.startswith("5") else "DEAD")
    print(f"{code} {tag} {u}")
    if tag == "DEAD": bad.append((u, code))
print("dead:", bad); sys.exit(1 if bad else 0)
