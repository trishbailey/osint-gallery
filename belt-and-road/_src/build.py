"""Merge _src/africa.csv (14 African entries) + _src/south_se_asia.csv (South/SE Asia) -> belt-and-road/data/belt_and_road.csv + data/bri.json.
Drops any .cn source URLs. Stdlib only."""
import os,csv,json,re,datetime
S=os.path.dirname(os.path.abspath(__file__)); R=os.path.dirname(S)  # S=_src inputs, R=published page dir
bad_cn=lambda u: re.search(r"://[^/]*\.cn(/|:|$)",u)
CONF={"documented":"high","reported":"medium","claimed":"low"}
def typ(k):
    k=k.lower()
    for t in ("port","railway","military","min","loan"):
        if t in k: return {"min":"mine","military":"military base","loan":"loan"}.get(t,t)
    if "naval" in k or "base" in k: return "military base"
    if any(w in k for w in ("rail","hsr","metro")): return "railway"
    return "infrastructure"
def srcs(s): return [u.strip() for u in re.split(r"[;|]",s) if u.strip() and not bad_cn(u.strip())]
E={}
for r in csv.DictReader(open(os.path.join(S,"africa.csv"))):
    E[r["id"]]=dict(id=r["id"],name=r["name"],country=r["country"],region="africa",type=r["type"],kind=r["kind"],lat=float(r["lat"]),lon=float(r["lon"]),
      value=r["value"],backer=r["backer"],china_gets=r["china_gets"],host_case=r["host_case"],confidence=r["confidence"],confidence_reason="",sources=srcs(r["sources"]),origin=r["origin"])
for r in csv.DictReader(open(os.path.join(S,"south_se_asia.csv"))):
    if r["id"] in E: print("duplicate id skipped:",r["id"]); continue
    E[r["id"]]=dict(id=r["id"],name=r["name"],country=r["country"],region=r["region"],type=typ(r["kind"]),kind=r["kind"],lat=float(r["lat"]),lon=float(r["lon"]),
      value=r["value"],backer=r["lender_builder"],china_gets=r["china_gets"],host_case=r["host_position"],confidence=CONF.get(r["confidence"],r["confidence"]),
      confidence_reason=r["confidence_reason"],sources=srcs(r["source_urls"]),origin="south_se_asia.csv")
L=list(E.values())
F=list(L[0].keys())
for p in ("data/belt_and_road.csv",):
    with open(os.path.join(R,p),"w",newline="") as f:
        w=csv.DictWriter(f,F); w.writeheader()
        for e in L: w.writerow({**e,"sources":"; ".join(e["sources"])})
json.dump({"data_date":datetime.date.today().isoformat(),"entries":L},open(os.path.join(R,"data/bri.json"),"w"),indent=1)
from collections import Counter
print(len(L),"entries",Counter(e["region"] for e in L),Counter(e["type"] for e in L))
