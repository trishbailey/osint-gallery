#!/usr/bin/env python3
"""Colour checks the CI does not do for strokes: the arrow colours on the flow map and the North Korea graphics must differ by CIEDE2000 >= 20
from each other and from the land fills, none may be grey, and the arrow widths must follow the linear scale (3 px minimum, 56 px at the largest high figure, 34 px on phones). Exit 1 on failure."""
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
m = re.search(r"var wOf=function\(v\)\{return Math\.max\(F\.wmin,\(ph\(\)\?F\.wmax_ph:F\.wmax\)\*v/VMAX\)\}", js)
if not m: bad.append("flows.js width function is not the linear max(wmin, wmax * v / vmax)")
if "sqrt" in js[:js.index("function legend")]: bad.append("flows.js still uses a square-root scale")
if (F["wmin"], F["wmax"], F["wmax_ph"]) != (3, 56, 34): bad.append("flows.json width scale is not 3 / 56 / 34 px")
vals = [a[k] for a in F["arrows"] for k in ("low", "high")]
if F["vmax"] != max(vals): bad.append("vmax is not the largest high value")
w = lambda v, mx=56: max(3, mx * v / F["vmax"])
if abs(w(F["vmax"]) - 56) > 1e-9: bad.append("the largest high figure is not drawn at 56 px")
if F["clamp_below"] != round(3 / 56 * F["vmax"]): bad.append("clamp_below does not match the 3 px minimum")
for a in F["arrows"]:
    if a["low"] >= F["clamp_below"] and abs(w(a["low"]) - 56 * a["low"] / F["vmax"]) > 1e-9: bad.append(f"{a['id']} is not proportional above the minimum")
    if a["low"] < F["clamp_below"] and w(a["low"]) != 3: bad.append(f"{a['id']} is under the minimum but not drawn at 3 px")
sm = sorted(F["arrows"], key=lambda a: a["low"])
if w(max(a["low"] for a in F["arrows"])) / w(sm[0]["low"]) < 10: bad.append("biggest arrow is not at least 10 times as wide as the smallest")
if "samples" in F or "fz-in" in js or "Square-root" in js: bad.append("the width key list or the zoom buttons are still present")
print("flow colours:", "FAIL " + "; ".join(bad) if bad else "ok")
sys.exit(1 if bad else 0)
