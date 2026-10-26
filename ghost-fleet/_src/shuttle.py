# Lead finding: the "Pacific shuttle" core and the rise of the Russian flag -> data/shuttle.json
# Executed at the end of story.py (shares voy, vs, by, HOT, V, y1, S, D). All figures rebuild with the data.
import statistics as _st
def _flag_at(imo,d):
    H=[h for h in sorted(vs[imo]["history"],key=lambda x:x.get("from") or "") if (h.get("from") or "")<=d]
    return H[-1]["flag"] if H else None
_P=lambda s:dt.datetime.fromisoformat(s[:10])
_n=collections.Counter(v["imo"] for v in voy); _NV=len(voy); _NS=len(vs)
_core={i for i,c in _n.items() if c>=5}; _cv=[v for v in voy if v["imo"] in _core]
_cl=collections.Counter(v["load"] for v in _cv); _cd=collections.Counter(v["dest"] for v in _cv)
_END=dt.datetime.fromisoformat(V["end"]); _today=_END.strftime("%Y-%m-%d")
# load-to-next-load cycle, by destination of the first voyage; ships not flying the Russian flag at the first load
_ps=collections.defaultdict(list)
for v in voy: _ps[v["imo"]].append(v)
_cyc=collections.defaultdict(list); _cycAll=collections.defaultdict(list)
for i,L_ in _ps.items():
    L_.sort(key=lambda v:v["ld"])
    for a,b in zip(L_,L_[1:]):
        d=(dt.datetime.fromisoformat(b["ev"][0]["e"][:19])-dt.datetime.fromisoformat(a["ev"][0]["e"][:19])).days; _cycAll[a["dest"]].append(d)
        if _flag_at(i,a["ld"])!="RUS": _cyc[a["dest"]].append(d)
def _med(x): return round(_st.median(x),1) if x else None
cycle=[{"dest":k,"days":_med(_cyc[k]),"n":len(_cyc[k]),"daysAll":_med(_cycAll[k]),"nAll":len(_cycAll[k])} for k in ("CHN","IND","TUR")]
# Baltic contrast
_bal=collections.Counter(v["imo"] for v in voy if v["load"] in ("Primorsk","Ust-Luga"))
# Kozmino -> China discharge ports
_kc=[v for v in voy if v["load"]=="Kozmino" and v["dest"]=="CHN"]
_kp=collections.defaultdict(lambda:[0,0.0,0.0])
for v in _kc:
    p=_kp[v["dport"]]; p[0]+=1; p[1]+=v["dp"][0]; p[2]+=v["dp"][1]
ports=[{"port":k,"n":p[0],"lat":round(p[1]/p[0],3),"lon":round(p[2]/p[0],3)} for k,p in sorted(_kp.items(),key=lambda x:-x[1][0]) if p[0]>=5]
_tr=[(_P(v["da"])-_P(v["ld"])).days for v in _kc]
# India / China separation among repeat ships
_two=0;_one=0
for i,L_ in _ps.items():
    ds=[v["dest"] for v in L_ if v["dest"] in ("IND","CHN")]
    if len(ds)>=2: _two+=1; _one+=len(set(ds))==1
# core flags now, top shuttles
_cf=collections.Counter(_flag_at(i,_today) for i in _core)
top=[{"name":(prof.get(i,{}).get("name") or vs[i]["name"]),"imo":i,"n":c,"flag":_flag_at(i,_today),
      "route":"%s → %s"%collections.Counter((v["load"],v["dest"]) for v in voy if v["imo"]==i).most_common(1)[0][0]} for i,c in _n.most_common(8) if i in _core]
# Russian flag: ships flying RUS at window start / mid / end, and monthly share of loading-terminal calls
_snap={d:sum(_flag_at(i,d)=="RUS" for i in vs) for d in (y1,(_END-dt.timedelta(days=182)).strftime("%Y-%m-%d"),_today)}
_LK={n for n,v_ in HOT.items() if v_[0]=="load"}
_mm=collections.defaultdict(lambda:[0,0])
for i,L_ in by.items():
    for e in L_:
        if e["t"]=="port" and e.get("pf")=="RUS" and e.get("hz") in _LK and e["s"][:10]>=y1:
            m=_mm[e["s"][:7]]; m[1]+=1; m[0]+=_flag_at(i,e["s"][:10])=="RUS"
months=[{"m":k,"rus":v_[0],"all":v_[1]} for k,v_ in sorted(_mm.items())]
SH={"window":[y1,_today],"ships":_NS,"voyShips":len(_n),"voyages":_NV,"core":len(_core),"coreVoy":len(_cv),
 "coreShipPct":round(100*len(_core)/_NS),"coreVoyPct":round(100*len(_cv)/_NV),
 "coreKozmino":_cl.get("Kozmino",0),"coreKozPct":round(100*_cl.get("Kozmino",0)/max(1,len(_cv))),
 "coreChina":_cd.get("CHN",0),"coreChinaPct":round(100*_cd.get("CHN",0)/max(1,len(_cv))),
 "cycle":cycle,"transitKozCHN":_med(_tr),"balticShips":len(_bal),"balticMax":max(_bal.values()) if _bal else 0,
 "kozChina":len(_kc),"ports":ports,"repeatIC":_two,"repeatOne":_one,"repeatOnePct":round(100*_one/max(1,_two)),
 "coreFlags":_cf.most_common(6),"top":top,"rusSnap":list(_snap.items()),"rusMonths":months,
 "route":next((r["line"] for r in S.get("routes",[]) if r["from"]=="Kozmino" and r["to"]=="CHN"),None)}
json.dump(SH,open(os.path.join(D,"shuttle.json"),"w"),separators=(",",":"),ensure_ascii=False)
print("SHUTTLE",json.dumps({k:v_ for k,v_ in SH.items() if k not in ("route","rusMonths")},ensure_ascii=False))
