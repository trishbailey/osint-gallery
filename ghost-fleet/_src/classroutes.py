# Chapter 6 map: loaded voyages (Russian terminal -> first buyer port) per behaviour class, drawn on real sea lanes.
# Executed at the end of routes.py (shares voy, CLS, D, json, os, collections). Writes data/classroutes.json.
# Identical origin/destination pairs are merged into one line per class with a trip count; 'other' ships (too little data) are left out.
# Geometry comes from searoute-py (MIT) when installed. Otherwise the cached lines in the same file are reused, and a
# pair with no cached line is dropped, never drawn as a straight line across land (CI and the nightly job have no searoute).
CRP=os.path.join(D,"classroutes.json")
_old=json.load(open(CRP)) if os.path.exists(CRP) else {}
_lines=dict(_old.get("lines",{}))
try: import searoute as _sr2
except ImportError: _sr2=None
try:
    from shapely.geometry import LineString as _LS
except ImportError:
    _LS=None
_term=collections.defaultdict(collections.Counter)
for v in voy: _term[v["load"]][(round(v["lp"][0],2),round(v["lp"][1],2))]+=1
_agg=collections.defaultdict(collections.Counter)
for v in voy:
    c=CLS.get(v["imo"])
    if c in (None,"other") or not v.get("dp"): continue
    _agg[c][(v["load"],round(v["dp"][0],1),round(v["dp"][1],1))]+=1
def _route(k):
    lp,la,lo=k; s=_term[lp].most_common(1)[0][0]
    f=lambda a,b:_sr2.searoute(a,b).geometry["coordinates"]
    g=f([s[1],s[0]],[lo,la])
    if any(37.8<y<38.1 and 22.7<x<23.3 for x,y in g):  # searoute uses the Corinth Canal; tankers go round the Peloponnese
        g=f([s[1],s[0]],[22.5,35.9])+f([22.5,35.9],[lo,la])[1:]
    if _LS and len(g)>3: g=list(_LS(g).simplify(.04).coords)
    return [[round(y,2),round(x,2)] for x,y in g]
_rows=[];_used=set()
for c,cnt in _agg.items():
    for k,n in cnt.most_common():
        key=f"{k[0]}|{k[1]}|{k[2]}"
        if key not in _lines and _sr2:
            try: _lines[key]=_route(k)
            except Exception as e: print("classroute failed",key,type(e).__name__)
        if key in _lines: _rows.append([c,key,n]); _used.add(key)
_lines={k:v for k,v in _lines.items() if k in _used}
if _rows:
    json.dump({"lines":_lines,"r":_rows},open(CRP,"w"),separators=(",",":"))
print("CLASSROUTES",len(_rows),"routes,",len(_lines),"lines,",{c:sum(r[2] for r in _rows if r[0]==c) for c in ("hub","core","dev","taxi")})
