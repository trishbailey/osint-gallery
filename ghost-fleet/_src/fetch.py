"""Resolve seeded vessels in Global Fishing Watch API v3 and pull 12 months of events.
Token from env GFW_API_TOKEN (never printed). Writes ../data/vessels.json and ../data/events.json."""
import json,os,sys,time,datetime as dt,urllib.request,urllib.parse,concurrent.futures as cf
G="https://gateway.api.globalfishingwatch.org/v3"
TOK=os.environ["GFW_API_TOKEN"]
HERE=os.path.dirname(os.path.abspath(__file__)); DATA=os.path.join(HERE,"..","data")
def req(path,body=None,tries=5):
    for i in range(tries):
        try:
            r=urllib.request.Request(G+path,data=json.dumps(body).encode() if body else None,
              headers={"Authorization":"Bearer "+TOK,"Content-Type":"application/json","User-Agent":"beacon-ghost-fleet/1.0"})
            return json.load(urllib.request.urlopen(r,timeout=120))
        except urllib.error.HTTPError as e:
            if e.code in (429,500,502,503,504): time.sleep(5*(i+1)); continue
            if e.code in (404,422): return None
            raise RuntimeError(f"HTTP {e.code} on {path.split('?')[0]}") from None
        except Exception: time.sleep(5*(i+1))
    return None
def resolve(v):
    q=urllib.parse.urlencode({"query":v["imo"],"datasets[0]":"public-global-vessel-identity:latest","limit":20})
    j=req("/vessels/search?"+q) or {}
    ids,names,flags,mmsis,owners,reg=[],[],[],[],[],[]; types=set()
    for e in j.get("entries",[]):
        sr=[s for s in e.get("selfReportedInfo",[]) if s.get("imo")==v["imo"]]
        rg=[s for s in e.get("registryInfo",[]) if s.get("imo")==v["imo"]]
        if not sr and not rg: continue
        for c in e.get("combinedSourcesInfo",[]):
            for t in c.get("vesselClassSc",[])+c.get("shiptypes",[]): types.add(str(t.get("value") or t.get("name")).lower())
        for r_ in rg: types.update(g.lower() for g in r_.get("geartypes",[]))
        for s in e.get("selfReportedInfo",[]):
            ids.append(s["id"])
            reg.append({"name":s.get("shipname"),"flag":s.get("flag"),"mmsi":s.get("ssvid"),
              "from":(s.get("transmissionDateFrom") or "")[:10],"to":(s.get("transmissionDateTo") or "")[:10]})
        for o in e.get("registryOwners",[]):
            owners.append({"name":o.get("name"),"flag":o.get("flag"),"from":(o.get("dateFrom") or "")[:10],"to":(o.get("dateTo") or "")[:10]})
    seen=set(); hist=[]
    for h in sorted(reg,key=lambda h:h["from"]):
        k=(h["name"],h["flag"],h["mmsi"])
        if k in seen: continue
        seen.add(k); hist.append(h)
    oseen=set(); own=[o for o in owners if not ((o["name"],o["from"]) in oseen or oseen.add((o["name"],o["from"])))]
    return {**{k:v[k] for k in ("imo","name","mmsi")},"gfwIds":sorted(set(ids)),"history":hist,"owners":own,"types":sorted(types)}
DS={"port":"public-global-port-visits-events:latest","encounter":"public-global-encounters-events:latest",
    "loitering":"public-global-loitering-events:latest","gap":"public-global-gaps-events:latest"}
def events(kind,ids,start,end):
    out=[];off=0
    while True:
        j=req(f"/events?limit=500&offset={off}",{"datasets":[DS[kind]],"vessels":ids,"startDate":start,"endDate":end})
        if not j: break
        out+=j["entries"]
        if not j.get("nextOffset") or len(j["entries"])<500: break
        off=j["nextOffset"]
    return out
def slim(kind,e):
    p=e.get("position") or {}
    d={"t":kind,"s":e["start"][:16],"e":(e.get("end") or e["start"])[:16],"lat":round(p.get("lat",0),3),"lon":round(p.get("lon",0),3),"v":e["vessel"]["id"]}
    rg=e.get("regions") or {}
    d["eez"]=1 if rg.get("eez") else 0
    if kind=="port":
        a=(e.get("port_visit") or {}).get("intermediateAnchorage") or {}
        d["port"]=a.get("name");d["pf"]=a.get("flag")
    if kind=="encounter":
        o=(e.get("encounter") or {}).get("vessel") or {}
        d["with"]=o.get("name");d["wf"]=o.get("flag");d["wid"]=o.get("id")
    if kind=="gap":
        g=e.get("gap") or {}
        d["hrs"]=round(g.get("durationHours") or 0,1)
        on=g.get("onPosition") or {}
        if on: d["lat2"]=round(on.get("lat",0),3);d["lon2"]=round(on.get("lon",0),3)
    if kind=="loitering":
        d["hrs"]=round((e.get("loitering") or {}).get("totalTimeHours") or 0,1)
    return d
CFG=json.load(open(os.path.join(HERE,"config.json")))
SAR_BOXES=CFG["sar_boxes"]
def sar(start,end):
    out=[]
    for name,(a,b,c,d) in SAR_BOXES.items():
        q=urllib.parse.urlencode({"spatial-resolution":"HIGH","temporal-resolution":"DAILY","datasets[0]":"public-global-sar-presence:latest",
          "date-range":f"{start},{end}","format":"JSON","spatial-aggregation":"false","filters[0]":"matched='false'"})
        j=req("/4wings/report?"+q,{"geojson":{"type":"Polygon","coordinates":[[[a,b],[c,b],[c,d],[a,d],[a,b]]]}})
        for ent in (j or {}).get("entries",[]):
            for k,rows in ent.items():
                for r in rows:
                    out.append({"t":"sar","s":(r.get("entryTimestamp") or r["date"])[:16],"lat":round(r["lat"],3),"lon":round(r["lon"],3),"n":r.get("detections",1),"area":name})
    return out
def main():
    seed=json.load(open(os.path.join(HERE,CFG["seed"])))
    with cf.ThreadPoolExecutor(8) as ex: vs=list(ex.map(resolve,seed))
    ok=[v for v in vs if v["gfwIds"]]
    print(f"resolved {len(ok)}/{len(seed)}")
    idmap={i:v["imo"] for v in ok for i in v["gfwIds"]}
    allids=list(idmap); end=dt.date.today(); start=end-dt.timedelta(days=CFG["days_baseline"])
    batches=[allids[i:i+40] for i in range(0,len(allids),40)]
    evs=[]
    jobs=[(k,b) for k in DS for b in batches]
    with cf.ThreadPoolExecutor(6) as ex:
        for k,res in zip([j[0] for j in jobs],ex.map(lambda j:events(j[0],j[1],str(start),str(end)),jobs)):
            evs+=[slim(k,e) for e in res]
    for e in evs: e["imo"]=idmap.get(e.pop("v"))
    evs=[e for e in evs if e["imo"]]
    sar_start=end-dt.timedelta(days=CFG["days_recent"])
    evs+=sar(str(sar_start),str(end))
    evs.sort(key=lambda e:e["s"])
    if len(evs)<100: sys.exit("too few events; keeping previous data")
    os.makedirs(DATA,exist_ok=True)
    json.dump({"generated":dt.datetime.now(dt.timezone.utc).strftime("%Y-%m-%dT%H:%MZ"),"start":str(start),"end":str(end),"vessels":ok},open(os.path.join(DATA,"vessels.json"),"w"),separators=(",",":"))
    json.dump(evs,open(os.path.join(DATA,"events.json"),"w"),separators=(",",":"))
    import collections; print(collections.Counter(e["t"] for e in evs))
if __name__=="__main__": main()
