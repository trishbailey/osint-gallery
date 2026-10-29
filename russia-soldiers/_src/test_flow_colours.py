#!/usr/bin/env python3
"""Colour checks the CI does not do for strokes: the arrow colours on the flow map and the North Korea graphics must differ by CIEDE2000 >= 20
from each other and from the land fills, none may be grey, and the arrow widths must follow the 4 to 10 px square-root scale and the legend samples must match it. Exit 1 on failure."""
import json, os, re, sys, math
HERE = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.join(HERE, "..")
sys.path.insert(0, os.path.join(ROOT, "..", "scripts"))
import ci_check as C
rgb = lambda h: tuple(int(h[i:i + 2], 16) for i in (1, 3, 5))
lab = lambda h: C.srgb_to_lab(rgb(h))
F = json.load(open(os.path.join(ROOT, "data", "flows.json"))); N = json.load(open(os.path.join(ROOT, "data", "nk.json")))
LAND = ["#1b3258", "#0f1c36", "#0b1526"]
bad = []
for name, cols in (("flow map", [v["color"] for v in F["types"].values()]), ("north korea", [v["color"] for v in N["kinds"].values()])):
    for i, a in enumerate(cols):
        L, A, B = lab(a)
        if math.hypot(A, B) < 6 and 22 <= L <= 92: bad.append(f"{name}: {a} is grey")
        for l in LAND:
            d = C.ciede2000(lab(a), lab(l))
            if d < 20: bad.append(f"{name}: {a} against land {l} dE {d:.1f}")
        for b in cols[i + 1:]:
            d = C.ciede2000(lab(a), lab(b))
            if d < 20: bad.append(f"{name}: {a} against {b} dE {d:.1f}")
js = open(os.path.join(ROOT, "flows.js"), encoding="utf-8").read()
m = re.search(r"var wOf=function\(v\)\{return (\d+)\+(\d+)\*Math\.sqrt\(v/VMAX\)\}", js)
if not m or int(m.group(1)) != 4 or int(m.group(1)) + int(m.group(2)) != 10: bad.append("flow widths are not 4 to 10 px on the square-root scale")
if (F["wmin"], F["wspan"]) != (4, 6): bad.append("flows.json width scale is not 4 + 6 * sqrt(v / vmax)")
vals = [a[k] for a in F["arrows"] for k in ("low", "high")]
if F["vmax"] != max(vals): bad.append("vmax is not the largest high value")
w = lambda v: 4 + 6 * math.sqrt(v / F["vmax"])
for v in vals:
    if not 4 <= w(v) <= 10 + 1e-9: bad.append(f"width of {v} is outside 4 to 10 px")
lows = {a["low"] for a in F["arrows"]}
for x in F["samples"]:
    if x["v"] not in lows: bad.append(f"legend sample {x['v']} is not an arrow value")
    if abs(x["w"] - w(x["v"])) > 0.01: bad.append(f"legend sample {x['v']} width {x['w']} differs from the scale {w(x['v']):.2f}")
if len(F["samples"]) < 4 or len({round(x["w"], 1) for x in F["samples"]}) < 4: bad.append("legend samples are not four distinct widths")
sm = sorted(F["arrows"], key=lambda a: a["low"])
if (sm[0]["high"] > 15000 or w(sm[0]["low"]) - 4 < 0.4): bad.append("smallest arrow is not visibly wider than 4 px")
print("flow colours:", "FAIL " + "; ".join(bad) if bad else "ok")
sys.exit(1 if bad else 0)
