"""Build page data from fetched GFW data + curated research + optional dropped-in AIS CSVs.
Drop-in CSVs: ghost-fleet/data/positions/*.csv with header containing imo or mmsi, timestamp (ISO, UTC), lat, lon.
Outputs data/map.json, data/profiles.json, data/tracks.json."""
import json,os,glob,csv,collections,datetime as dt
H=os.path.dirname(os.path.abspath(__file__)); D=os.path.join(H,"..","data")
V=json.load(open(os.path.join(D,"vessels.json"))); EV=json.load(open(os.path.join(D,"events.json")))
end=dt.datetime.fromisoformat(V["end"]); cut=(end-dt.timedelta(days=90)).strftime("%Y-%m-%d")
vs={v["imo"]:v for v in V["vessels"]}
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
HOT={ # name, kind, lat, lon, radius km  (areas named in public reporting; see README)
 "Laconian Gulf (Greece)":("sts",36.6,22.8,60),"Kalamata, off southern Greece":("sts",36.9,22.0,40),"Ceuta and Alboran Sea":("sts",35.9,-5.2,60),
 "Gulf of Oman off Fujairah and Sohar":("sts",25.2,56.8,120),"Malaysia, east of Singapore (EOPL)":("sts",1.5,104.6,80),"Off Lomé, Togo":("sts",5.9,1.3,80),
 "Primorsk":("load",60.35,28.68,25),"Ust-Luga":("load",59.68,28.4,25),"Novorossiysk":("load",44.7,37.8,30),"Taman":("load",45.1,36.7,25),"Kozmino":("load",42.73,133.0,30),"Murmansk":("load",69.0,33.1,40),
 "Danish straits":("choke",55.5,11.2,120),"Gulf of Finland":("choke",59.9,26.0,150)}
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
    gz=[e for e in new if e["t"]=="gap"]
    if gz: notes.append(f"Transponder went silent {len(gz)} time(s) in the last 90 days, for {round(sum(e.get('hrs',0) for e in gz))} hours in total.")
    nn=len({h["name"] for h in v["history"] if h["name"]}); nf=len({h["flag"] for h in v["history"] if h["flag"]})
    if nn>=3 or nf>=3: notes.append(f"Identity churn: {nn} names and {nf} flags appear in its tracking history.")
    prof[imo]={"imo":imo,"name":(max(v["history"],key=lambda h:h["to"] or "")["name"] if v["history"] else None) or v["name"],"history":v["history"],"owners":v["owners"],
      "base":base,"portsBefore":top(po),"portsRecent":top(pn),"notes":notes,"n90":len(new)}
for n,o in (("map.json",mapj),("tracks.json",tracks),("profiles.json",prof)):
    json.dump(o,open(os.path.join(D,n),"w"),separators=(",",":"),ensure_ascii=False)
print("events90",collections.Counter(e["t"] for e in vev),"sarcells",len(mapj["sar"]),"tracks",len(tracks),"csvpts",extra,
      "pts/track median",sorted(len(t) for t in tracks.values())[len(tracks)//2] if tracks else 0)
