"""v1.6.3: spell out acronyms and bare names used as labels on the map and cards."""
import json,pathlib
P=pathlib.Path(__file__).resolve().parents[2]/"data/brief.json";B=json.loads(P.read_text())
for r in B["regions"]:
    if r["name"]=="Great Lakes and eastern DRC":r["name"]="Great Lakes and eastern Congo"
C={c["id"]:c for c in B["conflicts"]}
C["sahel"]["b"]["n"]="Al-Qaeda-linked JNIM (Group for the Support of Islam and Muslims) and Islamic State Sahel"
C["lake-chad"]["title"]="Lake Chad basin: four states vs Islamic State West Africa Province and Boko Haram"
C["lake-chad"]["b"]["n"]="Islamic State West Africa Province (ISWAP) and Boko Haram"
C["lake-chad"]["b"]["m"]=["Boko Haram fights Islamic State West Africa Province as well as the states"]
C["somalia"]["title"]="Somalia: federal government vs al-Shabaab and Islamic State Somalia"
C["somalia"]["details"]=C["somalia"]["details"].replace("IS-Somalia","Islamic State Somalia")
C["drc"]["title"]="Eastern DR Congo: government vs M23 rebels"
C["drc"]["b"]["n"]="M23 rebels (March 23 Movement) and Congo River Alliance (AFC)"
C["libya"]["a"]["n"]="Eastern forces led by Khalifa Haftar (Libyan National Army)"
P.write_text(json.dumps(B,ensure_ascii=False,indent=1))
R=[("AFRICOM airstrikes","US Africa Command (AFRICOM) airstrikes"),("al-Qa'ida, via AQIM","al-Qaeda, via al-Qaeda in the Islamic Maghreb (AQIM)"),
 ("Intelligence to the CSP","Intelligence to the Tuareg separatist alliance (CSP)"),("JNIM and IS Sahel","JNIM and Islamic State Sahel"),
 ("the FDLR threat","the threat from the FDLR, a Hutu-led rebel group in Congo,"),("Training at Camp TURKSOM","Training at Camp TURKSOM, Turkey's military base in Mogadishu"),
 ("Arms via Chad (UAE denies)","Arms via Chad (the United Arab Emirates denies this)")]
def fix(o):
    if isinstance(o,dict):return {k:fix(v) for k,v in o.items()}
    if isinstance(o,list):return [fix(v) for v in o]
    if isinstance(o,str):
        for a,b in R:o=o.replace(a,b)
    return o
B=json.loads(P.read_text());B["conflicts"]=fix(B["conflicts"]);B["galign"]=fix(B["galign"]);P.write_text(json.dumps(B,ensure_ascii=False,indent=1))
