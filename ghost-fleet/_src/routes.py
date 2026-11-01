# Sea-lane geometry for the chapter-1 flows (China, India, Turkey). Executed at the end of classes.py.
# Uses searoute-py (MIT) when installed; otherwise keeps the cached data/routes.json (CI has no searoute).
# End point of each flow = the most-used destination port for that load-port/country pair.
RP=os.path.join(D,"routes.json")
old=json.load(open(RP)) if os.path.exists(RP) else {}
try: import searoute as _sr
except ImportError: _sr=None
pc=collections.defaultdict(collections.Counter)
for v in voy:
    if v["dest"] in ("CHN","IND","TUR") and CLS.get(v["imo"])!="other": pc[(v["load"],v["dest"])][(round(v["dp"][0],2),round(v["dp"][1],2))]+=1
R={}
for (lp,dc),c in pc.items():
    k=f"{lp}|{dc}"; n=sum(c.values())
    if n<3: continue
    end=c.most_common(1)[0][0]; start=next(f["a"] for f in S["flows"] if f["from"]==lp) if any(f["from"]==lp for f in S["flows"]) else None
    if start is None: continue
    if _sr:
        try:
            sr=lambda a,b:_sr.searoute(a,b).geometry["coordinates"]
            g=sr([start[1],start[0]],[end[1],end[0]])
            if any(37.8<y<38.1 and 22.7<x<23.3 for x,y in g):  # searoute uses the Corinth Canal; tankers go round the Peloponnese
                g=sr([start[1],start[0]],[22.5,35.9])+sr([22.5,35.9],[end[1],end[0]])[1:]
            R[k]={"n":n,"line":[[round(y,2),round(x,2)] for x,y in g]}; continue
        except Exception as e: print("searoute failed",k,type(e).__name__)
    if k in old: R[k]={**old[k],"n":n}
if R: json.dump(R,open(RP,"w"),separators=(",",":"))
S["routes"]=[{"from":k.split("|")[0],"to":k.split("|")[1],"n":v["n"],"line":v["line"]} for k,v in (R or old).items()]
print("ROUTES",len(S["routes"]),[(r["from"],r["to"],r["n"],len(r["line"])) for r in S["routes"]])

exec(open(os.path.join(H,"classroutes.py")).read())
