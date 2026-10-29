#!/usr/bin/env python3
"""Cut the neighbour-country basemap for the flow maps from Natural Earth 1:50m admin-0 (public domain).
Usage: python3 _src/make_basemap.py /path/to/ne_50m_admin_0_countries.geojson
Output: vendor/ne_neighbours.geojson (simplified, 2-decimal coordinates)."""
import json, sys, os
from shapely.geometry import shape, mapping, box
KEEP = ["Ukraine","Belarus","Poland","Lithuania","Latvia","Estonia","Finland","Norway","Sweden","Moldova","Romania","Slovakia","Hungary","Bulgaria",
        "Turkey","Georgia","Armenia","Azerbaijan","Iran","Kazakhstan","Uzbekistan","Turkmenistan","Kyrgyzstan","Tajikistan","Afghanistan","China",
        "Mongolia","North Korea","South Korea","Japan","Pakistan","Czechia","Germany","Greece","Serbia","Iraq","Syria","Russia"]
src = sys.argv[1]
d = json.load(open(src))
clip = box(10, 28, 150, 75)
out = []
for f in d["features"]:
    n = f["properties"]["NAME"]
    if n not in KEEP or n == "Russia": continue  # Russia is drawn from its own regions file
    g = shape(f["geometry"]).intersection(clip).simplify(0.06, preserve_topology=True)
    if g.is_empty: continue
    def rnd(c):
        if isinstance(c[0], (int, float)): return [round(c[0], 2), round(c[1], 2)]
        return [rnd(x) for x in c]
    gm = mapping(g); gm["coordinates"] = rnd(gm["coordinates"])
    out.append({"type": "Feature", "properties": {"name": n}, "geometry": gm})
here = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
json.dump({"type": "FeatureCollection", "features": out}, open(os.path.join(here, "vendor/ne_neighbours.geojson"), "w"), separators=(",", ":"))
print(len(out), "countries", os.path.getsize(os.path.join(here, "vendor/ne_neighbours.geojson")), "bytes")
