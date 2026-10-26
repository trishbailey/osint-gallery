"""Build page data from fetched GFW data + curated research + optional dropped-in AIS CSVs.
Drop-in CSVs: ghost-fleet/data/positions/*.csv with header containing imo or mmsi, timestamp (ISO, UTC), lat, lon.
Outputs data/map.json, data/profiles.json, data/tracks.json."""
import json,os,glob,csv,collections,datetime as dt
H=os.path.dirname(os.path.abspath(__file__)); D=os.path.join(H,"..","data")
V=json.load(open(os.path.join(D,"vessels.json"))); EV=json.load(open(os.path.join(D,"events.json")))
end=dt.datetime.fromisoformat(V["end"]); cut=(end-dt.timedelta(days=json.load(open(os.path.join(H,"config.json")))["days_recent"])).strftime("%Y-%m-%d")
vs={v["imo"]:v for v in V["vessels"] if not v.get("types") or any("tanker" in t for t in v["types"])}
EV=[e for e in EV if e.get("imo") is None or e["imo"] in vs]
mmsi2imo={h["mmsi"]:v["imo"] for v in V["vessels"] for h in v["history"] if h.get("mmsi")}
recent=[e for e in EV if e["s"]>=cut]
# SAR: aggregate to 0.05 degree cells
sar=collections.Counter(); sarA={}
for e in recent:
    if e["t"]=="sar":
        k=(round(e["lat"]*20)/20,round(e["lon"]*20)/20,e["s"][:10]); sar[k]+=e.get("n",1); sarA[k]=e["area"]
vev=[e for e in recent if e["t"]!="sar"]
mapj={"generated":V["generated"],"from":cut,"to":V["end"],"events":vev,
      "sar":[{"lat":k[0],"lon":k[1],"d":k[2],"n":n,"area":sarA[k]} for k,n in sar.items()]}
# tracks
pts=collections.defaultdict(list)
for e in vev:
    pts[e["imo"]].append((e["s"],e["lat"],e["lon"]))
    if e["e"]!=e["s"]: pts[e["imo"]].append((e["e"],e.get("lat2",e["lat"]),e.get("lon2",e["lon"])))
extra=0
for f in glob.glob(os.path.join(D,"positions","*.csv")):
    for r in csv.DictReader(open(f,newline="")):
        r={k.lower().strip():(v or "").strip() for k,v in r.items()}
        imo=r.get("imo") or mmsi2imo.get(r.get("mmsi",""))
        ts=r.get("timestamp") or r.get("basedatetime") or r.get("# timestamp","")
        if imo in vs and ts and ts[:10]>=cut:
            try: pts[imo].append((ts.replace(" ","T")[:16],round(float(r["lat"]),3),round(float(r.get("lon") or r.get("longitude")),3))); extra+=1
            except Exception: pass
tracks={i:sorted(set(p)) for i,p in pts.items() if len(p)>=2}
CFG=json.load(open(os.path.join(H,"config.json")))
HOT={k:(v["kind"],v["lat"],v["lon"],v["km"]) for k,v in CFG["hotspots"].items()}
import math
def near(lat,lon):
    for n,(k,a,b,r) in HOT.items():
        if math.hypot((lat-a)*111,(lon-b)*111*math.cos(math.radians(a)))<=r: return n,k
    return None,None
for e in EV:
    if e["t"]!="sar":
        n,k=near(e["lat"],e["lon"])
        if n: e["hz"]=n
mapj["hot"]=[{"n":n,"k":k,"lat":a,"lon":b,"r":r} for n,(k,a,b,r) in HOT.items()]
INF=json.load(open(os.path.join(D,"infra.json")))
segs=[]
for k,lst in INF.items():
    for f in lst:
        c=f["c"]
        for i in range(len(c)-1):
            (x1,y1),(x2,y2)=c[i],c[i+1]
            segs.append((min(x1,x2)-.05,max(x1,x2)+.05,min(y1,y2)-.05,max(y1,y2)+.05,x1,y1,x2,y2,k,f["n"]))
def nearinf(lat,lon):
    kx=111*math.cos(math.radians(lat))
    for a,b,c_,d,x1,y1,x2,y2,k,n in segs:
        if not(a<=lon<=b and c_<=lat<=d): continue
        px,py=(lon-x1)*kx,(lat-y1)*111; dx,dy=(x2-x1)*kx,(y2-y1)*111
        L=dx*dx+dy*dy; t=0 if L==0 else max(0,min(1,(px*dx+py*dy)/L))
        if math.hypot(px-t*dx,py-t*dy)<=2: return ("undersea cable " if k=="cable" else "pipeline ")+n
    return None
for e in EV:
    if e["t"] in ("loitering","gap"):
        n=nearinf(e["lat"],e["lon"])
        if n: e["inf"]=n
RM={"owner":"Registered owner","commerce manager":"Commercial manager","security manager":"Safety (ISM) manager","P&I Club":"Insurer (P&I club)"}
OW=json.load(open(os.path.join(D,"owners.json"))) if os.path.exists(os.path.join(D,"owners.json")) else {}
OW={i:[{**x,"role":RM[x["role"]]} for x in L if x["role"] in RM] for i,L in OW.items()}
JAM=json.load(open(os.path.join(D,"jam.json"))) if os.path.exists(os.path.join(D,"jam.json")) else None
try: import h3
except ImportError: h3=None
def jammed(e):
    if not (JAM and h3): return False
    d=JAM["days"].get(e["s"][:10]); 
    if not d: return False
    return h3.latlng_to_cell(e["lat"],e["lon"],4) in {h for h,_ in d}
for e in EV:
    if e["t"]=="gap" and jammed(e): e["jam"]=1
# networks: companies (owner/commercial/ISM) linked to 3+ listed ships
co=collections.defaultdict(set); cinfo={}
for i,L in OW.items():
    for x in L:
        if x["role"].startswith("Insurer"): continue
        k=x["name"].strip().upper(); co[k].add(i); cinfo[k]={"name":x["name"],"country":x["country"]}
nets=sorted([{"name":cinfo[k]["name"],"country":cinfo[k]["country"],"ships":sorted(v)} for k,v in co.items() if len(v)>=3],key=lambda n:-len(n["ships"]))[:40]
addr=collections.defaultdict(set)
for i,L in OW.items():
    for x in L:
        if x.get("address") and len(x["address"])>12: addr[x["address"].strip().upper()].add(x["name"].strip().upper())
shared=[{"address":a.title(),"companies":sorted(c)} for a,c in addr.items() if len(c)>=3]
# profiles
def top(c,n=5): return [[k,v] for k,v in c.most_common(n)]
prof={}
byv=collections.defaultdict(list)
for e in EV:
    if e["t"]!="sar": byv[e["imo"]].append(e)
for imo,v in vs.items():
    es=byv.get(imo,[]); old=[e for e in es if e["s"]<cut]; new=[e for e in es if e["s"]>=cut]
    om=max(1,(dt.datetime.fromisoformat(cut)-dt.datetime.fromisoformat(V["start"])).days/30); nm=3
    rate=lambda L,t,m: round(sum(1 for e in L if e["t"]==t)/m,1)
    po=collections.Counter(f'{e["port"]}|{e.get("pf") or ""}' for e in old if e["t"]=="port" and e.get("port"))
    pn=collections.Counter(f'{e["port"]}|{e.get("pf") or ""}' for e in new if e["t"]=="port" and e.get("port"))
    base={t:[rate(old,t,om),rate(new,t,nm)] for t in ("port","loitering","gap","encounter")}
    notes=[]
    if not es: notes.append("No port calls, loitering, gaps or encounters were recorded in the 12 months of Global Fishing Watch data.")
    elif old and not new: notes.append("Active earlier in the year but no recorded events in the last 90 days, which can mean the ship is idle, broadcasting under a different identity, or has gone dark.")
    elif new and not old: notes.append("All recorded activity falls in the last 90 days; there is no earlier baseline to compare.")
    else:
        newports=[k.split("|")[0] for k in pn if k not in po]
        if newports: notes.append("Recent calls at ports not visited in the previous nine months: "+", ".join(p.title() for p in newports[:4])+".")
        lo,ln=base["loitering"]
        if ln>=2*max(lo,0.3) and ln>=1: notes.append(f"Loitering at sea rose to {ln} a month, against {lo} a month earlier in the year.")
        elif lo>=1 and ln<=lo/2: notes.append(f"Loitering at sea fell to {ln} a month, from {lo} a month earlier in the year.")
        if base["gap"][1]>base["gap"][0] and base["gap"][1]>0: notes.append("More AIS signal gaps than in the previous nine months.")
        if not notes: notes.append("Recent activity follows the same ports and rhythm as the previous nine months.")
    sts=collections.Counter(e["hz"] for e in new if e["t"]=="loitering" and HOT.get(e.get("hz"),("",))[0]=="sts")
    if sts: notes.append("Loitered in areas where ship-to-ship oil transfers are often reported: "+", ".join(f"{k} ({v}×)" for k,v in sts.most_common(3))+".")
    ld=collections.Counter(e["hz"] for e in new if e["t"]=="port" and HOT.get(e.get("hz"),("",))[0]=="load")
    if ld: notes.append("Called at Russian oil-loading ports: "+", ".join(f"{k} ({v}×)" for k,v in ld.most_common(3))+".")
    ci=collections.Counter(e["inf"] for e in new if e.get("inf"))
    if ci: notes.append("Loitered or went silent within about 2 km of seabed infrastructure: "+", ".join(f"{k} ({v}×)" for k,v in ci.most_common(3))+".")
    gz=[e for e in new if e["t"]=="gap"]
    if gz: notes.append(f"Transponder went silent {len(gz)} time(s) in the last 90 days, for {round(sum(e.get('hrs',0) for e in gz))} hours in total.")
    ow=OW.get(imo,[])
    nown=len({x["name"].upper() for x in ow if x["role"]=="Registered owner"}); nman=len({x["name"].upper() for x in ow if "manager" in x["role"]})
    if nown>=3 or nman>=4: notes.append(f"Ownership churn: {nown} registered owners and {nman} managers on record.")
    ins=[e for e in new if e["t"]=="loitering" and e.get("hz") and HOT[e["hz"]][0]=="sts"]
    if ins:
        out_=sum(1 for e in ins if not e.get("eez")); notes.append(f"Of its loitering in transfer areas, {out_} event(s) were on the high seas and {len(ins)-out_} inside a coastal state's exclusive economic zone (EEZ).")
    gj=[e for e in new if e["t"]=="gap"]
    if gj:
        nj=sum(1 for e in gj if e.get("jam"))
        notes.append(f"{nj} of {len(gj)} recent transponder gaps began where aircraft reported GPS interference that day, which can explain lost signals; the other {len(gj)-nj} began in areas without reported interference, more consistent with a deliberate switch-off." )
    nn=len({h["name"] for h in v["history"] if h["name"]}); nf=len({h["flag"] for h in v["history"] if h["flag"]})
    if nn>=3 or nf>=3: notes.append(f"Identity churn: {nn} names and {nf} flags appear in its tracking history.")
    prof[imo]={"imo":imo,"name":(max(v["history"],key=lambda h:h["to"] or "")["name"] if v["history"] else None) or v["name"],"history":v["history"],"owners":v["owners"],
      "base":base,"portsBefore":top(po),"portsRecent":top(pn),"notes":notes,"companies":ow,"churn":[nn,nf,nown,nman],"n90":len(new)}
mapj["nets"]=nets;mapj["shared"]=shared
for n,o in (("map.json",mapj),("tracks.json",tracks),("profiles.json",prof)):
    json.dump(o,open(os.path.join(D,n),"w"),separators=(",",":"),ensure_ascii=False)
print("near-infra",sum(1 for e in vev if e.get("inf")),"events90",collections.Counter(e["t"] for e in vev),"sarcells",len(mapj["sar"]),"tracks",len(tracks),"csvpts",extra,
      "pts/track median",sorted(len(t) for t in tracks.values())[len(tracks)//2] if tracks else 0)
exec(open(os.path.join(H,"story.py")).read())
