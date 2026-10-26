"""Validate site/data/brief.json (adapted from world-brief pipeline/validate_feature.py)."""
import json,re,sys
B=json.load(open(sys.argv[1] if len(sys.argv)>1 else "site/data/brief.json"));E=[]
src={s["id"]:s for s in B["sources"]}
for s in src.values():
    if not s["url"].startswith("http") or not s.get("date"): E.append(f"source {s['id']}: url/date")
    if re.search(r"\.cn(/|$|:)",s["url"]): E.append(f"source {s['id']}: .cn not allowed")
FORE=re.compile(r"\b(will likely|is expected to|could soon|likely to|should|must)\b",re.I)
for kind in ("regions","resources","links","bri"):
    for x in B[kind]:
        if not set(x.get("cites",[]))<=set(src): E.append(f"{kind} {x['id']}: unknown cite")
        if kind!="regions" and not x.get("cites"): E.append(f"{kind} {x['id']}: cites required")
        for v in x.values():
            if isinstance(v,str) and FORE.search(v): E.append(f"{kind} {x['id']}: forecast/prescriptive word '{FORE.search(v).group()}'")
REG={r["id"] for r in B["regions"]}|{"continental"}
for x in B["resources"]:
    for k in ("lonlat","quantity","controller","confidence"):
        if not x.get(k): E.append(f"resource {x['id']}: {k} required")
    if x.get("conflict_region") and x["conflict_region"] not in REG: E.append(f"resource {x['id']}: unknown region")
    if x["confidence"] not in ("documented","credible allegation","reported"): E.append(f"resource {x['id']}: bad confidence")
for l in B["links"]:
    if l["region"] not in REG: E.append(f"link {l['id']}: unknown region")
    for k in ("actions","returns","position","confidence"):
        if not l.get(k): E.append(f"link {l['id']}: {k} required (steelman each side)")
    if l["confidence"] not in ("documented","credible allegation","reported"): E.append(f"link {l['id']}: bad confidence")
for b in B.get("bri",[]):
    for k in ("lonlat","value","lender_builder","china_gets","host_position","confidence"):
        if not b.get(k): E.append(f"bri {b['id']}: {k} required")
    if b.get("region") and b["region"] not in REG: E.append(f"bri {b['id']}: unknown region")
    if b["confidence"] not in ("documented","credible allegation","reported"): E.append(f"bri {b['id']}: bad confidence")
CIT=re.compile(r"\[\[([^\]]+)\]\]");SEMI=re.compile(r";\s+\S")
PK={r:{p["k"] for p in L} for r,L in B.get("places",{}).items()}
def chk_text(where,t,rid=None):
    t2=CIT.sub("",t)
    if SEMI.search(t2): E.append(f"{where}: semicolon-joined sentence (split into separate sentences)")
    if FORE.search(t2): E.append(f"{where}: forecast/prescriptive word '{FORE.search(t2).group()}'")
    if re.search(r"actions? (vs\.?|versus|over) statements",t2,re.I): E.append(f"{where}: 'actions vs statements' text not allowed")
    for c in [c.strip() for m in CIT.findall(t) for c in m.split(",")]:
        if c not in src: E.append(f"{where}: unknown cite {c}")
    for k in re.findall(r"\{\{([^|}]+)\|",t):
        if rid and k not in PK.get(rid,set()): E.append(f"{where}: unknown place {k}")
for rid,ex in B.get("explainers",{}).items():
    if rid not in REG: E.append(f"explainer {rid}: unknown region")
    if set(ex)-{"bottom","paras","c"}: E.append(f"explainer {rid}: old section keys {set(ex)-{'bottom','paras','c'}}")
    if not CIT.search(ex.get("bottom","")): E.append(f"explainer {rid}: bottom line needs a cite")
    chk_text(f"explainer {rid}/bottom",ex.get("bottom",""),rid)
    for i,p in enumerate(ex.get("paras",[])):
        if not CIT.search(p["t"]): E.append(f"explainer {rid}/p{i}: cites required")
        chk_text(f"explainer {rid}/p{i}",p["t"],rid)
for kind in ("regions","resources","links","bri"):
    for x in B[kind]:
        for f,v in x.items():
            if isinstance(v,str) and f not in ("url",) and SEMI.search(v): E.append(f"{kind} {x['id']}.{f}: semicolon-joined sentence")
for g,x in B.get("groups",{}).items():
    if not set(x["cites"])<=set(src): E.append(f"group {g}: unknown cite")
    if x.get("parent") and x["parent"] not in B["groups"]: E.append(f"group {g}: unknown parent")
for r in B.get("russia",[]):
    for c in r["cites"]+r["backs_cites"]+[c for o in r["opp_backers"] for c in o["cites"]]:
        if c not in src: E.append(f"russia {r['id']}: unknown cite {c}")
    for o in r["opp_backers"]:
        if o["status"] not in ("documented","reported","alleged"): E.append(f"russia {r['id']}: bad status")
    for f in r["fights"]:
        if f["g"] and f["g"] not in B["groups"]: E.append(f"russia {r['id']}: unknown group {f['g']}")
    chk_text(f"russia {r['id']}/steelman",r["steelman"])
for k,L in B.get("sankey",{}).items():
    for f in L:
        if not f.get("t") or not f.get("year") or f.get("cite") not in src: E.append(f"sankey {k} {f.get('from')}->{f.get('to')}: figure, year and cite required")
import os;sys.path.insert(0,os.path.dirname(os.path.abspath(__file__)))
from storylines import S as SL
for s in SL:
    if s["region"] not in REG|{"continent"}: E.append(f"storyline {s['id']}: unknown region")
    for c in s["cites"]:
        if c not in src: E.append(f"storyline {s['id']}: unknown cite {c}")
    for f in ("origins","drivers","aims","direction","counter","stakes","unresolved"):
        if not s.get(f): E.append(f"storyline {s['id']}: {f} required")
        else: chk_text(f"storyline {s['id']}.{f}",s[f])
    if re.search(r"watch for|scenario",json.dumps(s),re.I): E.append(f"storyline {s['id']}: no watch-for lines or scenarios")
print("\n".join(E) or "PASS");sys.exit(1 if E else 0)
