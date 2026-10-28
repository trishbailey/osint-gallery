"""Natural Earth admin-1 via mapshaper has counter-clockwise exterior rings; d3-geo needs clockwise. Rewrites vendor/ru_admin1.geojson in place (idempotent)."""
import json, os
from shapely.geometry import shape, mapping
from shapely.geometry.polygon import orient
p = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "vendor", "ru_admin1.geojson")
gj = json.load(open(p, encoding="utf-8"))
for ft in gj["features"]:
    g = shape(ft["geometry"])
    parts = list(g.geoms) if g.geom_type == "MultiPolygon" else [g]
    parts = [orient(x, sign=-1.0) for x in parts]
    ft["geometry"] = {"type": "MultiPolygon", "coordinates": [mapping(x)["coordinates"] for x in parts]}
json.dump(gj, open(p, "w", encoding="utf-8"), separators=(",", ":"), ensure_ascii=False)
print("rewound", len(gj["features"]))
