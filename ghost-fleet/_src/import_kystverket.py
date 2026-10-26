"""Convert a Kystverket historical AIS export (Parquet, NLOD licence) into drop-in position CSVs:
data/positions/kystverket-YYYY-MM.csv (imo,mmsi,timestamp,lat,lon,sog,cog,source), one point per ship per 10 min.
MMSIs map to IMOs through vessels.json identity history (date-aware, so reused MMSIs go to the right ship).
Usage: python3 import_kystverket.py <dir with position/*.parquet> [minutes=10]"""
import sys,os,json,glob,collections
import pyarrow.dataset as ds
H=os.path.dirname(os.path.abspath(__file__));D=os.path.join(H,"..","data")
src=sys.argv[1];step=int(sys.argv[2]) if len(sys.argv)>2 else 10
V=json.load(open(os.path.join(D,"vessels.json")))["vessels"]
hist=collections.defaultdict(list)
for v in V:
    for h in v["history"]:
        if h.get("mmsi"): hist[int(h["mmsi"])].append((h.get("from") or "0000",h.get("to") or "9999",v["imo"]))
    if v.get("mmsi"): hist[int(v["mmsi"])].append(("0000","9999",v["imo"]))
def imo(m,day):
    c=[i for a,b,i in hist.get(m,[]) if a<=day<=b+"~"]
    return c[0] if c else (hist[m][-1][2] if m in hist else None)
t=ds.dataset(os.path.join(src,"position")).to_table(columns=["date_time_utc","mmsi","latitude","longitude","speed_over_ground","course_over_ground"]).to_pandas()
t=t.dropna(subset=["latitude","longitude"]).sort_values(["mmsi","date_time_utc"])
t["b"]=t.date_time_utc.dt.floor(f"{step}min");t=t.drop_duplicates(["mmsi","b"])
rows=collections.defaultdict(list);miss=set()
for r in t.itertuples(index=False):
    ts=r.date_time_utc.strftime("%Y-%m-%dT%H:%M:%SZ");i=imo(int(r.mmsi),ts[:10])
    if not i: miss.add(int(r.mmsi));continue
    rows[ts[:7]].append([i,r.mmsi,ts,round(r.latitude,5),round(r.longitude,5),"" if r.speed_over_ground is None else float(r.speed_over_ground),"" if r.course_over_ground is None else float(r.course_over_ground),"kystverket"])
os.makedirs(os.path.join(D,"positions"),exist_ok=True)
for m,rs in sorted(rows.items()):
    with open(os.path.join(D,"positions",f"kystverket-{m}.csv"),"w") as f:
        f.write("imo,mmsi,timestamp,lat,lon,sog,cog,source\n");f.writelines(",".join(map(str,x))+"\n" for x in rs)
print("rows",sum(map(len,rows.values())),"months",len(rows),"unmapped mmsis",sorted(miss))
