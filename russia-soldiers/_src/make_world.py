"""One-off: trims Natural Earth 1:110m admin-0 (public domain; copy kept in belt-and-road/data) to data/world110.json for the Foreign recruits maps:
name, label point (lon, lat) and geometry rounded to 2 decimals. Antarctica is dropped. Run: python3 _src/make_world.py"""
import json, os
HERE = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.join(HERE, "..")
g = json.load(open(os.path.join(ROOT, "..", "belt-and-road", "data", "ne_110m.geojson"), encoding="utf-8"))
def rnd(c): return [round(c[0], 2), round(c[1], 2)] if isinstance(c[0], (int, float)) else [rnd(x) for x in c]
out = []
for f in g["features"]:
    p = f["properties"]
    if p["ADMIN"] == "Antarctica": continue
    out.append(dict(type="Feature", properties=dict(name=p["ADMIN"], lx=round(p["LABEL_X"], 2), ly=round(p["LABEL_Y"], 2)), geometry=dict(type=f["geometry"]["type"], coordinates=rnd(f["geometry"]["coordinates"]))))
json.dump(dict(type="FeatureCollection", features=out), open(os.path.join(ROOT, "data", "world110.json"), "w"), separators=(",", ":"))
print(len(out))
