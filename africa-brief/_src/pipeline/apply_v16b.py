"""v1.6 gold Sankey from UN Comtrade HS 7108 mirror imports, 2023 (see comtrade_7108_2023.json for every source cell)."""
import json,sys,os
P=sys.argv[1] if len(sys.argv)>1 else "data/brief.json"
B=json.load(open(P));S=json.load(open(os.path.join(os.path.dirname(__file__),"comtrade_7108_2023.json")))
if not any(s["id"]=="comtrade-7108-2023" for s in B["sources"]):
    B["sources"].append({"id":"comtrade-7108-2023","title":"UN Comtrade, HS 7108 (gold) imports by partner, 2023, as reported by each importing country","publisher":"UN Comtrade","date":"2023","url":"https://comtradeplus.un.org/TradeFlow?Frequency=A&Flows=M&CommodityCodes=7108&Partners=0&Reporters=all&period=2023&AggregateBy=none&BreakdownMode=plus","type":"primary"})
g=B["goldroutes"]
g["sankey"]={"year":2023,"unit":"tonnes","links":S["links"],"reexports":S["reexports"],"total":S["total"],
 "excluded":[{"origin":e["origin"],"hub":e["hub"],"tonnes":round(e["kg"]/1000,1),"why":e["why"]} for e in S["excluded"]],
 "smuggled":{"share":"66.5%","t":405,"year":2022,"cite":"swissaid-gold-2024","what":"SWISSAID estimate: share of the UAE's African gold imports not declared as exports by African countries (2022, latest year estimated). It overlaps the declared bands; it is not extra gold."},
 "cites":["comtrade-7108-2023"],"note":"Weights reported by each importing country (mirror data), HS 7108, 2023. UAE onward exports are partner imports from the UAE and include gold of all origins, so stage 3 does not balance with African inflows."}
g["uae"].pop("inflows",None)
g["uae"]["cases"]=[c for c in g["uae"]["cases"] if "Russian gold" not in c["t"]]
json.dump(B,open(P,"w"),ensure_ascii=False,indent=1);print("ok")
