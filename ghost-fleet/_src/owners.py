"""Owner/manager links for listed ships from OpenSanctions mirror of Ukraine GUR War&Sanctions data (names, roles, countries, dates only).
Writes ../data/owners.json; keeps old file on failure."""
import json,os,urllib.request,collections,re
D=os.path.join(os.path.dirname(os.path.abspath(__file__)),"..","data")
try:
    raw=urllib.request.urlopen(urllib.request.Request("https://data.opensanctions.org/datasets/latest/ua_war_sanctions/entities.ftm.json",headers={"User-Agent":"beacon"}),timeout=300).read().decode().splitlines()
except Exception as e:
    print("owners fetch failed, keeping old:",type(e).__name__); raise SystemExit(0)
E={};links=[]
for l in raw:
    e=json.loads(l)
    if e["schema"] in ("UnknownLink","Ownership"): links.append(e)
    else: E[e["id"]]=e
want={v["imo"] for v in json.load(open(os.path.join(D,"vessels.json")))["vessels"]}
vid={}
for i,e in E.items():
    if e["schema"]=="Vessel":
        for n in e["properties"].get("imoNumber",[]):
            m=re.search(r"\d{7}",n)
            if m and m.group() in want: vid[i]=m.group()
def ent(i):
    e=E.get(i) or {};p=e.get("properties",{})
    return {"name":(p.get("name") or ["?"])[0],"country":(p.get("country") or p.get("jurisdiction") or [""])[0].upper(),"address":(p.get("address") or [""])[0]}
out=collections.defaultdict(list)
for l in links:
    p=l["properties"]
    a=(p.get("subject") or p.get("owner") or [None])[0]; b=(p.get("object") or p.get("asset") or [None])[0]
    role=(p.get("role") or ["linked company"])[0]
    for ship,co in ((a,b),(b,a)):
        if ship in vid and co in E and E[co]["schema"]!="Vessel":
            c=ent(co); out[vid[ship]].append({"role":role,**c,"from":(p.get("startDate") or [""])[0][:10],"to":(p.get("endDate") or [""])[0][:10]})
json.dump(out,open(os.path.join(D,"owners.json"),"w"),separators=(",",":"),ensure_ascii=False)
print("ships with company links",len(out),collections.Counter(x["role"] for v in out.values() for x in v).most_common(10))
