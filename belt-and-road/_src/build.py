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
    if any(w in k for w in ("rail","hsr")): return "railway"
    return "infrastructure"
def srcs(s): return [u.strip() for u in re.split(r"[;|]",s) if u.strip() and not bad_cn(u.strip())]
E={}
for r in csv.DictReader(open(os.path.join(S,"africa.csv"))):
    E[r["id"]]=dict(id=r["id"],name=r["name"],country=r["country"],region="africa",type=r["type"],kind=r["kind"],lat=float(r["lat"]),lon=float(r["lon"]),
      value=r["value"],backer=r["backer"],china_gets=r["china_gets"],host_case=r["host_case"],confidence=r["confidence"],confidence_reason="",sources=srcs(r["sources"]),origin=r["origin"])
for r in [x for f in ("south_se_asia.csv","south_america.csv","central_asia.csv","middle_east.csv","europe.csv","pacific.csv","central_america_caribbean.csv") for x in csv.DictReader(open(os.path.join(S,f)))]:
    if r["id"] in E: print("duplicate id skipped:",r["id"]); continue
    E[r["id"]]=dict(id=r["id"],name=r["name"],country=r["country"],region=r["region"],type=typ(r["kind"]),kind=r["kind"],lat=float(r["lat"]),lon=float(r["lon"]),
      value=r["value"],backer=r["lender_builder"],china_gets=r["china_gets"],host_case=r["host_position"],confidence=CONF.get(r["confidence"],r["confidence"]),
      confidence_reason=r["confidence_reason"],sources=srcs(r["source_urls"]),origin={"south-america":"south_america.csv","central-asia":"central_asia.csv","middle-east":"middle_east.csv","europe":"europe.csv","pacific":"pacific.csv","central-america-caribbean":"central_america_caribbean.csv"}.get(r["region"],"south_se_asia.csv"))
L=list(E.values())
F=list(L[0].keys())
for p in ("data/belt_and_road.csv",):
    with open(os.path.join(R,p),"w",newline="") as f:
        w=csv.DictWriter(f,F); w.writeheader()
        for e in L: w.writerow({**e,"sources":"; ".join(e["sources"])})
M=json.load(open(os.path.join(S,"meta.json")));GL=json.load(open(os.path.join(S,"glossary.json")))
# Gate: fail the build if any acronym is left without a plain-words expansion.
bare=set()
for e in L:
    for k in ("name","value","backer","china_gets","host_case","confidence_reason"):
        t=e[k]
        for key in sorted(GL,key=len,reverse=True): t=re.sub(r"(?<![A-Za-z])"+re.escape(key)+r"(?![A-Za-z])"," ",t)
        bare|={w for w in re.findall(r"(?<![A-Za-z])[A-Z][A-Z0-9&]{1,}[a-z]?(?![A-Za-z])",t) if w not in M["allow"] and not re.fullmatch(r"[A-Z]?\d+",w)}
if bare: raise SystemExit("bare acronyms without glossary entries: "+", ".join(sorted(bare)))
ids={e["id"] for e in L}
assert all(v["id"] in ids for v in M["events"]), "what's new refers to a missing id"
counts={r:sum(1 for e in L if e["region"]==r) for r in M["regions_added"]}
whats_new=sorted([dict(date=v["date"],id=v["id"],text=v["text"]) for v in M["events"]]+[dict(date=d,region=r,text=f"Region added: {r} ({counts[r]} projects)") for r,d in M["regions_added"].items() if r=="central-america-caribbean"],key=lambda x:x["date"],reverse=True)
import sys
if "--check" in sys.argv: raise SystemExit(0)
json.dump({"data_date":datetime.date.today().isoformat(),"glossary":json.load(open(os.path.join(S,"glossary.json"))),"iso":json.load(open(os.path.join(S,"iso.json"))),"whats_new":whats_new,"regions_added":M["regions_added"],"entries":L},open(os.path.join(R,"data/bri.json"),"w"),indent=1)
from collections import Counter
print(len(L),"entries",Counter(e["region"] for e in L),Counter(e["type"] for e in L))
