"""Chapter 2 close-up base map: Natural Earth 10m countries (public domain, naturalearthdata.com)
clipped to a box around each waiting area, plus Natural Earth populated places (pop >= 100k).
Usage: python3 waiting_land.py <ne_10m_admin_0_countries.geojson> <ne_10m_populated_places_simple.geojson>
Writes ../data/waiting_10m.json. Run once; the file is static and not rebuilt nightly."""
import json, math, os, sys
from shapely.geometry import shape, box, mapping
D = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "data")
M = json.load(open(os.path.join(D, "map.json")))
S = json.load(open(os.path.join(D, "story.json")))
cnt = dict(S["sts"])
hot = {h["n"]: h for h in M["hot"] if h["k"] == "sts" and cnt.get(h["n"])}
countries = json.load(open(sys.argv[1]))["features"]
places = json.load(open(sys.argv[2]))["features"]
geoms = [(f["properties"]["ADMIN"], shape(f["geometry"])) for f in countries]
out = {"regions": [], "land": [], "cities": []}
q = lambda c: [round(v, 3) for v in c]
def rnd(g):
    m = mapping(g)
    def r(c): return [r(x) for x in c] if isinstance(c[0], (list, tuple)) else q(c)
    return {"type": m["type"], "coordinates": r(m["coordinates"])}
for name, h in hot.items():
    rad = h["r"] * (1 + math.sqrt(cnt[name]) / 12)           # km, same scale as the circle on the map
    half = max(1.8 * rad, 300) / 111.0                          # degrees of latitude
    hl = half / max(.2, math.cos(math.radians(h["lat"])))
    bb = [h["lat"] - half, h["lon"] - hl, h["lat"] + half, h["lon"] + hl]
    out["regions"].append({"n": name, "lat": h["lat"], "lon": h["lon"], "rad": round(rad, 1), "bbox": [round(v, 2) for v in bb]})
    clip = box(bb[1], bb[0], bb[3], bb[2])
    for cn, g in geoms:
        if not g.intersects(clip): continue
        c = g.intersection(clip).simplify(0.002)
        if c.is_empty: continue
        out["land"].append({"type": "Feature", "properties": {"n": cn}, "geometry": rnd(c)})
    for p in places:
        pr = p["properties"]
        la, lo = pr["latitude"], pr["longitude"]
        if pr["pop_max"] >= 100000 and bb[0] <= la <= bb[2] and bb[1] <= lo <= bb[3]:
            out["cities"].append([pr["name"], round(la, 3), round(lo, 3), pr["pop_max"]])
seen = set(); out["cities"] = [c for c in out["cities"] if not (c[0], c[1]) in seen and not seen.add((c[0], c[1]))]
json.dump(out, open(os.path.join(D, "waiting_10m.json"), "w"), separators=(",", ":"), ensure_ascii=False)
print(len(out["land"]), "land features,", len(out["cities"]), "cities;", os.path.getsize(os.path.join(D, "waiting_10m.json")) // 1024, "KB")
for r in out["regions"]: print(r)
