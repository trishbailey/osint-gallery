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
        if not l.get(k): E.append(f"link {l['id']}: {k} required (actions over statements; steelman)")
    if l["confidence"] not in ("documented","credible allegation","reported"): E.append(f"link {l['id']}: bad confidence")
for b in B.get("bri",[]):
    for k in ("lonlat","value","lender_builder","china_gets","host_position","confidence"):
        if not b.get(k): E.append(f"bri {b['id']}: {k} required")
    if b.get("region") and b["region"] not in REG: E.append(f"bri {b['id']}: unknown region")
    if b["confidence"] not in ("documented","credible allegation","reported"): E.append(f"bri {b['id']}: bad confidence")
for rid,ex in B.get("explainers",{}).items():
    if rid not in REG: E.append(f"explainer {rid}: unknown region")
    for sec,items in ex.items():
        for it in items:
            if not it["c"]: E.append(f"explainer {rid}/{sec}: cites required")
            if not set(it["c"])<=set(src): E.append(f"explainer {rid}/{sec}: unknown cite {set(it['c'])-set(src)}")
            if FORE.search(it["t"]): E.append(f"explainer {rid}/{sec}: forecast/prescriptive word")
for k,L in B.get("sankey",{}).items():
    for f in L:
        if not f.get("t") or not f.get("year") or f.get("cite") not in src: E.append(f"sankey {k} {f.get('from')}->{f.get('to')}: figure, year and cite required")
print("\n".join(E) or "PASS");sys.exit(1 if E else 0)
