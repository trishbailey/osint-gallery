# Behaviour classes, adapted from CREA's shadow-fleet typology but computed only from our own
# Global Fishing Watch events (ports, loitering, encounters) over the 12-month window y1..end.
# Executed at the end of story.py (shares EV, vs, HOT, by, voy, isload, hs, prof, y1, end).
# The window is split into 4 quarters (Q = 91 days). Thresholds, in priority order:
#  hub   : >=2 Russia-to-buyer voyages and >=50% of them include loitering in a known transfer
#          area or a ship-to-ship encounter (consistent with transfers; not proof); OR >=6 such
#          loitering/encounter events in the window when it has fewer than 2 full voyages.
#  core  : called at a Russian oil-loading terminal in >=3 of the 4 quarters (one quarter's
#          slack for AIS coverage gaps and dry-dock).
#  dev   : new name, flag or MMSI recorded in the window, and >=2 Russian loading calls since.
#  taxi  : >=1 Russian loading call in the window AND non-Russian, non-transit port calls in
#          >=3 of the 4 quarters (GFW port calls do not say what was loaded, so this marks
#          mixed trade, not confirmed non-Russian loading).
#  other : everything else (including ships with too little data).
Q=91
def qi(s): return min(3,max(0,(dt.datetime.fromisoformat(s[:16])-dt.datetime.fromisoformat(y1)).days//Q))
STSK={n for n,v in HOT.items() if v[0]=="sts"}
vby=collections.defaultdict(list)
for v in voy: vby[v["imo"]].append(v)
def stsev(e): return e["t"]=="encounter" or (e["t"]=="loitering" and e.get("hz") in STSK)
CLS={}
for imo in vs:
    L=[e for e in by.get(imo,[]) if e["s"]>=y1]
    vv=vby.get(imo,[]); vs_=sum(1 for v in vv if v["sts"] or any(e["t"]=="encounter" for e in v["ev"]))
    nsts=sum(1 for e in L if stsev(e))
    loads=[e for e in L if isload(e)]; lq={qi(e["s"]) for e in loads}
    fq={qi(e["s"]) for e in L if e["t"]=="port" and e.get("pf") and e.get("pf") not in ("RUS","UKR") and e.get("port") not in TRANSIT}
    ch=[(x.get("from") or "") for x in hs(imo)[1:] if (x.get("from") or "")>=y1]
    since=sum(1 for e in loads if ch and e["s"]>=max(ch))
    if (len(vv)>=2 and vs_*2>=len(vv)) or (len(vv)<2 and nsts>=6): c="hub"
    elif len(lq)>=3: c="core"
    elif ch and since>=2: c="dev"
    elif loads and len(fq)>=3: c="taxi"
    else: c="other"
    CLS[imo]=c
    if imo in prof: prof[imo]["cls"]=c; prof[imo]["clsWhy"]=[len(vv),vs_,nsts,len(loads),len(lq),len(fq),since]
cc=collections.Counter(CLS.values())
S["classes"]={k:cc.get(k,0) for k in ("hub","core","dev","taxi","other")}
S["classVoy"]={k:sum(len(vby.get(i,[])) for i,c in CLS.items() if c==k) for k in S["classes"]}
print("CLASSES",S["classes"],S["classVoy"])
