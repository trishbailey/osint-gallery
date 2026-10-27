#!/usr/bin/env python3
"""Every repost-speed figure on the Axis page must come from data.json, with the right unit.
Run: python3 axis-network/_src/test_figures.py   (exit 1 on mismatch). Run by scripts/ci_check.py."""
import json, os, re, sys, html
H = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
D = json.load(open(os.path.join(H, "data.json")))
page = html.unescape(re.sub(r"<[^>]+>", "", open(os.path.join(H, "index.html"), encoding="utf-8").read()))

def to_seconds(phrase):
    n = 0
    for v, u in re.findall(r"(\d+(?:\.\d+)?)\s*(hour|minute|second)s?", phrase):
        n += float(v) * {"hour": 3600, "minute": 60, "second": 1}[u]
    return n

errs = []
iq = D["threats"].get("iraqi")
if iq:
    for label, pat in [("median (spread section)", r"a median of ([^.]*?) after the original"),
                       ("half within (summary)", r"half of them within ([^;]*?);")]:
        m = re.search(pat, page)
        if not m:
            errs.append(f"{label}: sentence not found"); continue
        shown, want = to_seconds(m.group(1)), iq["med"]
        # 'about' wording rounds to the minute above an hour; allow 1 minute (or 1 second below an hour)
        tol = 60 if want >= 3600 else 1
        if abs(shown - want) > tol:
            errs.append(f"{label}: page says '{m.group(1)}' ({shown:.0f}s) but data.json median is {want}s")
    if f"{iq['n']} times in the last 30 days" not in page:
        errs.append(f"repost count {iq['n']} from data.json not on page")
    if iq.get("claim"):
        m = re.search(r"reposted the Oct 14 strike claim after (\d+) seconds", page)
        if not m or int(m.group(1)) != iq["claim"][1]:
            errs.append(f"claim lag on page {m and m.group(1)} != data.json {iq['claim'][1]}s")
# no bare decimal minutes/hours (the old '3.4 minutes' bug: a fraction printed with a guessed unit)
for m in re.finditer(r"\b\d+\.\d+\s+(minutes?|hours?|seconds?)\b", page):
    errs.append(f"decimal duration '{m.group(0)}': derive the unit from seconds with dur()")
for e in errs:
    print("FAIL:", e)
print("axis-network figures:", "OK" if not errs else f"{len(errs)} problem(s)")
sys.exit(1 if errs else 0)
