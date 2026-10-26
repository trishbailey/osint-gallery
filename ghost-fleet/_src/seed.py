"""Seed shadow-fleet vessel list from public UK FCDO, US OFAC and EU (Reg. 833/2014 Annex XLII, via the EU Official Journal) Russia lists (via OpenSanctions mirrors)."""
import csv,io,json,re,urllib.request,os
csv.field_size_limit(10**9)
SRC={"gb_fcdo_sanctions":"GB-RUS","us_ofac_sdn":"RUS","eu_journal_sanctions":"EU-RUS"}
out={}
for d,prog in SRC.items():
    raw=urllib.request.urlopen(f"https://data.opensanctions.org/datasets/latest/{d}/targets.simple.csv",timeout=120).read().decode()
    for r in csv.DictReader(io.StringIO(raw)):
        if r["schema"]!="Vessel" or prog not in r["program_ids"]: continue
        imo=re.findall(r"IMO(\d{7})",r["identifiers"])
        if not imo: continue
        mmsi=[x for x in r["identifiers"].split(";") if re.fullmatch(r"\d{9}",x)]
        v=out.setdefault(imo[0],{"imo":imo[0],"name":r["name"].upper(),"mmsi":"","lists":[]})
        if mmsi and not v["mmsi"]: v["mmsi"]=mmsi[0]
        if d not in v["lists"]: v["lists"].append(d)
json.dump(sorted(out.values(),key=lambda v:v["imo"]),open(os.path.join(os.path.dirname(__file__),"vessels_seed.json"),"w"),indent=0)
print(len(out),"vessels")
