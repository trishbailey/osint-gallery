#!/usr/bin/env python3
"""Colour checks the CI does not do for strokes: the arrow colours on the flow map and the North Korea graphics must differ by CIEDE2000 >= 20
from each other and from the land fills, none may be grey, and the strand widths must stay between 4 and 10 px. Exit 1 on failure."""
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
m = re.search(r"var wOf=function\(v\)\{return (\d+)\+(\d+)\*v/VMAX\}", js)
if not m or int(m.group(1)) != 4 or int(m.group(1)) + int(m.group(2)) != 10: bad.append("flow widths are not 4 to 10 px")
vals = [d[k] for d in F["districts"] for k in ("vol", "mob", "pri")] + [c["n"] for c in F["foreign"]]
if "[548," not in js or "27370" not in js: bad.append("legend width samples no longer match the data")
if min(d[k] for d in F["districts"] for k in ("vol", "mob", "pri")) != 548 or max(vals) != 27370: bad.append("legend sample values (548, 27370) differ from the data")
print("flow colours:", "FAIL " + "; ".join(bad) if bad else "ok")
sys.exit(1 if bad else 0)
