"""Shared helpers for AIS position collectors (drop-in CSVs in ghost-fleet/data/positions/)."""
import json,os,csv
HDR=["imo","mmsi","timestamp","lat","lon","sog","cog","source"]
def mmsi_map(vj):
    """MMSI->IMO, only MMSIs in use inside the dashboard window (avoid reassigned MMSIs)."""
    J=json.load(open(vj)); m={}
    for v in J["vessels"]:
        for h in v.get("history",[]):
            if h.get("mmsi") and h.get("to","")>=J["start"]: m[str(h["mmsi"])]=str(v["imo"])
        if v.get("mmsi"): m.setdefault(str(v["mmsi"]),str(v["imo"]))
    return m
def append_rows(fn,rows):
    """Append rows (lists in HDR order), deduped on (mmsi,timestamp). Returns count written."""
    os.makedirs(os.path.dirname(fn),exist_ok=True)
    seen=set()
    if os.path.exists(fn):
        for r in csv.DictReader(open(fn,newline="")): seen.add((r["mmsi"],r["timestamp"]))
    new=[]
    for r in rows:
        k=(str(r[1]),r[2])
        if k in seen: continue
        seen.add(k); new.append(r)
    if not new: return 0
    hdr=not os.path.exists(fn) or os.path.getsize(fn)==0
    with open(fn,"a",newline="") as f:
        w=csv.writer(f)
        if hdr: w.writerow(HDR)
        w.writerows(new)
    return len(new)
