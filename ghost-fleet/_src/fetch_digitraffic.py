#!/usr/bin/env python3
"""Poll Finland Digitraffic latest AIS positions (Baltic) and append fleet hits to
<out_dir>/digitraffic-YYYY-MM.csv (imo,mmsi,timestamp,lat,lon,sog,cog,source).
API returns only the latest position per vessel, so run every 15 min (GitHub Actions).
Data: Fintraffic / digitraffic.fi, CC BY 4.0. No key; sends Digitraffic-User header.
Usage: python3 fetch_digitraffic.py <vessels.json> <out_dir>"""
import json,sys,os,gzip,urllib.request,datetime as dt
sys.path.insert(0,os.path.dirname(os.path.abspath(__file__)))
from ais_common import mmsi_map,append_rows
vj,out=sys.argv[1],sys.argv[2]
m=mmsi_map(vj)
req=urllib.request.Request("https://meri.digitraffic.fi/api/ais/v1/locations",
    headers={"Digitraffic-User":"osint-gallery/ghost-fleet","Accept-Encoding":"gzip"})
r=urllib.request.urlopen(req,timeout=60).read()
try: r=gzip.decompress(r)
except OSError: pass
F=json.loads(r)["features"]
rows=[]
for x in F:
    s=str(x.get("mmsi"))
    if s not in m: continue
    p=x["properties"]; lon,lat=x["geometry"]["coordinates"]
    ts=dt.datetime.fromtimestamp(p["timestampExternal"]/1000,dt.timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
    rows.append([m[s],s,ts,lat,lon,p.get("sog"),p.get("cog"),"digitraffic"])
fn=os.path.join(out,f"digitraffic-{dt.datetime.now(dt.timezone.utc):%Y-%m}.csv")
print(f"{len(F)} vessels in feed, {len(m)} tracked MMSIs, {append_rows(fn,rows)} new rows -> {fn}")
