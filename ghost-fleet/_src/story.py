# Story data: evasion-chain voyages, identity churn, networks, headline numbers -> data/story.json
# Executed at the end of build.py (shares EV, vs, HOT, OW, P/profiles, end, D).
y1=(end-dt.timedelta(days=365)).strftime("%Y-%m-%d")
by=collections.defaultdict(list)
for e in EV:
    if e["t"]!="sar" and e.get("imo") and (e.get("e") or e["s"])>=y1: by[e["imo"]].append(e)
TRANSIT={"PORT SAID","SUEZ SOUTH ANCHORAGE","SUEZ","ISMAILIA","ISTANBUL","RUMELIFENERI","CANAKKALE","GIBRALTAR","CEUTA","SKAGEN","SINGAPORE","PORT LOUIS","LAS PALMAS","MALTA","VALLETTA","KERCH","SUEZ PORT","ISMAILIYA"}
LOADK={n for n,v in HOT.items() if v[0]=="load"}
def isload(e): return e["t"]=="port" and e.get("pf")=="RUS" and e.get("hz") in LOADK
voy=[]
for imo,L in by.items():
    L.sort(key=lambda e:e["s"]); ports=[e for e in L if e["t"]=="port"]
    for i,p in enumerate(ports):
        if not isload(p) or p["e"]<y1: continue
        nxt=next((q for q in ports[i+1:] if q.get("pf") not in ("RUS","UKR") and q.get("port") not in TRANSIT and q["s"]>p["e"]),None)
        if not nxt: continue
        if any(isload(q) for q in ports[i+1:] if q["s"]<nxt["s"]): continue
        mid=[e for e in L if e["t"] in ("loitering","gap","encounter") and p["e"]<=e["s"]<=nxt["s"]]
        sts=[e for e in mid if e["t"]=="loitering" and HOT.get(e.get("hz"),("",))[0]=="sts"]
        gaps=[e for e in mid if e["t"]=="gap"]
        voy.append({"imo":imo,"load":p["hz"],"lp":[p["lat"],p["lon"]],"ld":p["e"][:10],"dest":nxt.get("pf"),"dport":nxt.get("port"),
                    "dp":[nxt["lat"],nxt["lon"]],"da":nxt["s"][:10],"sts":len(sts),"gap":len(gaps),"ev":[p]+mid+[nxt]})
dc=collections.Counter(v["dest"] for v in voy); NV=len(voy)
big3=sum(dc[c] for c in ("IND","CHN","TUR"))
# flows
fl=collections.defaultdict(lambda:{"n":0,"lat":0,"lon":0})
for v in voy:
    f=fl[(v["load"],v["dest"])]; f["n"]+=1; f["lat"]+=v["dp"][0]; f["lon"]+=v["dp"][1]; f["lp"]=v["lp"]
flows=[{"from":k[0],"to":k[1],"n":f["n"],"a":f["lp"],"b":[round(f["lat"]/f["n"],2),round(f["lon"]/f["n"],2)]} for k,f in fl.items() if f["n"]>=3]
# identity changes in 12 months
def hs(imo): return sorted(vs[imo]["history"],key=lambda x:x.get("from") or "")
chg=[i for i in vs if len(hs(i))>1 and any((x.get("from") or "")>=y1 for x in hs(i)[1:])]
lo=collections.Counter(e["hz"] for L in by.values() for e in L if e["t"]=="loitering" and HOT.get(e.get("hz"),("",))[0]=="sts")
lp=collections.Counter(v["load"] for v in voy)
chain=[v for v in voy if v["sts"] and v["dest"] in ("IND","CHN","TUR")]
S={"window":[y1,end.strftime("%Y-%m-%d")],"voyages":NV,"dest":dc.most_common(8),"big3":big3,"chain":len(chain),
   "changed":len(chg),"ships":len(vs),"sts":lo.most_common(5),"loads":lp.most_common(6),"flows":flows}
print("STORY",json.dumps({k:v for k,v in S.items() if k!="flows"}))
CH={"chain":chain,"voy":voy,"chg":chg}

def nm(i): return prof.get(i,{}).get("name") or vs[i]["name"]
def slimv(L): return [{k:e[k] for k in ("t","s","e","lat","lon","port","pf","hrs","hz","inf","lat2","lon2") if k in e} for e in L]
def pick(imo,pred):
    return next(v for v in sorted(voy,key=lambda v:v["ld"],reverse=True) if v["imo"]==imo and pred(v))
try: cv=pick("9293002",lambda v:v["sts"] and v["dest"]=="IND")
except StopIteration: cv=sorted(chain,key=lambda v:v["ld"])[-1]  # fallback if the case ship drops out of the 12-month window
tw=[v for v in voy if v["imo"]=="9248801"]
gO=[e for e in by["9151890"] if e["t"]=="gap" or (e["t"]=="port" and "2026-03-20"<=e["s"]<="2026-07-15")]
nets=mapj.get("nets",[])
net=max(nets,key=lambda n:sum(1 for v in voy if v["imo"] in n["ships"])) if nets else None
nv=[v for v in voy if net and v["imo"] in net["ships"]]
gj=[e for L in by.values() for e in L if e["t"]=="gap"]
jc=[e for e in gj if JAM and e["s"][:10] in JAM["days"]]
S.update({"gaps":len(gj),"gapShips":len({e["imo"] for e in gj}),"gapsJamWindow":len(jc),"gapsJam":sum(1 for e in jc if e.get("jam")),
 "netName":net and net["name"],"netShips":net and len(net["ships"]),"netVoy":len(nv)})
def vline(v): return [v["lp"]]+[[e["lat"],e["lon"]] for e in v["ev"][1:-1]]+[v["dp"]]
S["cases"]={
 "chain":{"imo":cv["imo"],"name":nm(cv["imo"]),"load":cv["load"],"ld":cv["ld"],"dest":cv["dest"],"da":cv["da"],"ev":slimv(cv["ev"]),"line":vline(cv)},
 "identity":{"imo":"9248801","name":nm("9248801"),"hist":[[x.get("name"),x.get("flag"),(x.get("from") or "")[:10]] for x in hs("9248801")],
   "voy":[{"ld":v["ld"],"load":v["load"],"dest":v["dest"],"line":[v["lp"],v["dp"]]} for v in tw]},
 "network":{"name":net and net["name"],"ships":[[i,nm(i)] for i in (net["ships"] if net else []) if i in vs],
   "flows":[[v["lp"],v["dp"],nm(v["imo"])] for v in nv]},
 "dark":{"imo":"9151890","name":nm("9151890"),"ev":slimv(gO)},
 "allgaps":slimv(gj)}
exec(open(os.path.join(H,"classes.py")).read())
json.dump(prof,open(os.path.join(D,"profiles.json"),"w"),separators=(",",":"),ensure_ascii=False)
json.dump(S,open(os.path.join(D,"story.json"),"w"),separators=(",",":"))
os.remove(os.path.join(D,"story_stats.json")) if os.path.exists(os.path.join(D,"story_stats.json")) else None
print("STORY2",{k:S[k] for k in ("gaps","gapShips","gapsJamWindow","gapsJam","netName","netShips","netVoy")})
print("CHAIN",[(e["t"],e["s"][:10],e.get("port"),e.get("hz"),e.get("hrs")) for e in cv["ev"]])
print("ID",S["cases"]["identity"]["hist"],[(v["ld"],v["load"],v["dest"]) for v in tw])
print("DARK",[(e["t"],e["s"][:10],e.get("port"),e.get("pf"),e.get("hrs")) for e in gO])
