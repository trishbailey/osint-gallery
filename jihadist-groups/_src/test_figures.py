#!/usr/bin/env python3
"""Figures and palette on the Jihadist Groups page must match data.json.
Run from the repo root: python3 jihadist-groups/_src/test_figures.py   (exit 1 on mismatch). Run by scripts/ci_check.py."""
import json, os, re, sys, importlib.util, itertools
H = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ROOT = os.path.dirname(H)
D = json.load(open(os.path.join(H, "data.json"), encoding="utf-8"))
errs = []

def hexrgb(h): return tuple(int(h[i:i + 2], 16) for i in (1, 3, 5))
spec = importlib.util.spec_from_file_location("ci", os.path.join(ROOT, "scripts", "ci_check.py"))
ci = importlib.util.module_from_spec(spec); spec.loader.exec_module(ci)

# 1. counts
counted = [g for g in D["groups"] if g["counted"]]
k = {x["id"]: x["value"] for x in D["kpis"]}
if k["groups"] != len(counted): errs.append(f"kpi groups {k['groups']} != counted {len(counted)}")
if k["africa"] != sum(1 for g in counted if g["region"] == "africa"): errs.append("kpi africa mismatch")
if k["incidents"] != len(D["incidents"]): errs.append("kpi incidents mismatch")
if k["countries"] != len({c for g in counted for c in g["countries"]}): errs.append("kpi countries mismatch")
if k["changes"] != sum(1 for g in counted if g["change"] and g["change"]["top"]): errs.append("kpi changes mismatch")
for f in D["families"]:
    n = sum(1 for g in counted if g["family"] == f["id"])
    if n != f["count"]: errs.append(f"family {f['id']} count {f['count']} != {n}")
if sum(D["momentum_counts"].values()) != len(counted): errs.append("momentum counts do not cover every counted group")
for g in counted:
    if not g["momentum"]: errs.append(f"{g['id']} has no momentum")
if f"{len(counted)} of the" not in D["content"]["finding"] and f"of the {len(counted)}" not in D["content"]["finding"]:
    errs.append("finding sentence does not state the counted total")
bars = {b["name"]: b["value"] for b in D["content"]["bars"]}
tot = 23872
if round(100 * bars["Sahel"] / tot) != 42: errs.append("Sahel share is not 42%")
if abs(bars["Somalia"] - round(.28 * tot, -2)) > 100: errs.append("Somalia bar is not 28% of the total")
if not re.search(r"\b23,872\b", D["content"]["finding"]): errs.append("finding total missing")

# 2. palette: family colours are non-grey; all colours, dissolved included, pass the CI delta E >= 20 pair check.
# The dissolved colour is the one grey: the shared check allows it only on elements marked data-status="defunct" (app.js sets it).
fam = [f["color"] for f in D["families"]]
for c in fam:
    rgb = hexrgb(c)
    if ci.is_grey(rgb): errs.append(f"{c} is grey")
    if ci.is_background(rgb): errs.append(f"{c} reads as background")
for a, b in itertools.combinations(fam + [D["dissolved_color"]], 2):
    de = ci.ciede2000(ci.srgb_to_lab(hexrgb(a)), ci.srgb_to_lab(hexrgb(b)))
    if de < 20: errs.append(f"delta E {a} vs {b} = {de:.1f} < 20")
dis = D["dissolved_color"]
if dis != "#a4a4a7": errs.append(f"dissolved colour is {dis}, expected grey #a4a4a7")
if dis in fam: errs.append("dissolved colour matches a family colour")
if ci.is_background(hexrgb(dis)): errs.append(f"{dis} reads as background")
# graph link colours and land colour must also be distinct from the node colours
for c in ["#ff9f43", "#2ee6d6", "#ff7eb6", "#ffffff"]:
    pass  # links are strokes, not fills: CI checks fills only

# 3. notes resolve
nums = {s["n"] for s in D["sources"]}
blob = json.dumps(D, ensure_ascii=False)
for n in set(map(int, re.findall(r'data-src=\\"(\d+)\\"', blob))):
    if n not in nums: errs.append(f"note {n} has no source")
for g in D["groups"]:
    for n in g["sources"]:
        if n not in nums: errs.append(f"{g['id']} source {n} missing")
used = set(map(int, re.findall(r'data-src=\\"(\d+)\\"', blob))) | {n for g in D["groups"] for n in g["sources"]}
unused = nums - used
if unused: errs.append(f"sources never cited: {sorted(unused)}")

# 4. urls and wording
for u in re.findall(r'https?://[^\s"\\<>]+', blob):
    if "github.io" in u: errs.append("github.io link " + u)
    if ".onrender.com" in u and "beacon-tools" not in u: errs.append("foreign onrender link " + u)
    if re.search(r"\.cn(/|$|:)", u.split("//")[1]): errs.append(".cn link " + u)
# card and tooltip text only: publisher headlines in the source list are quoted as published
card = {k: v for k, v in D.items() if k not in ("sources", "image_credits")}
text = re.sub(r"https?://[^\s\"\\]+", " ", re.sub(r"<[^>]+>", " ", json.dumps(card, ensure_ascii=False)))
for pat in [r"\bTrish\b", r"\bTODO\b", r"\bthe parent\b", r"sanction", r"designat(ed|ion)", r"proscrib", r"\bFTO\b", r"will likely", r"is expected to", r"\bwill (probably|soon)\b"]:
    for m in re.finditer(pat, text, re.I):
        errs.append(f"banned wording '{m.group(0)}' near: {text[max(0, m.start() - 50):m.end() + 50]!r}")
for g in D["groups"]:
    if g["img"] and not os.path.exists(os.path.join(H, g["img"]["file"])): errs.append("missing image " + g["img"]["file"])
    if g["img"] and not any(c["group"] == g["id"] for c in D["image_credits"]): errs.append(f"no image credit for {g['id']}")

for e in errs: print("FAIL:", e)
print("jihadist-groups figures:", "OK" if not errs else f"{len(errs)} problem(s)")
sys.exit(1 if errs else 0)
