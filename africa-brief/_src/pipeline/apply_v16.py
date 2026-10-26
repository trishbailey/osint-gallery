"""v1.6: foreign-power flags, conflict face-off cards, A7 cut to a minimum. Public sources only. Idempotent."""
import json,sys
P=sys.argv[1] if len(sys.argv)>1 else "data/brief.json"
B=json.load(open(P))
NEW=[
 ("reuters-senegal-fr-2025","France ends permanent troop presence in Senegal","Reuters","2025-07-17","https://www.reuters.com/world/africa/france-ends-permanent-troop-presence-senegal-2025-07-17/"),
 ("f24-senegal-2025","France hands back last military bases in Senegal, ending 65-year troop presence","France 24","2025-07-17","https://www.france24.com/en/africa/20250717-france-to-shut-last-military-bases-in-senegal-ending-65-year-troop-presence"),
 ("voa-assab-2021","UAE Dismantles Eritrea Base as it Pulls Back After Yemen War (AP)","VOA / Associated Press","2021-02-18","https://www.voanews.com/a/africa_uae-dismantles-eritrea-base-it-pulls-back-after-yemen-war/6202212.html"),
 ("mee-uae-bases-2025","How the UAE built a circle of bases to control the Gulf of Aden","Middle East Eye","2025-09-01","https://www.middleeasteye.net/news/uae-yemen-somalia-circle-bases-control-gulf-of-aden"),
 ("ss-puntland-2025","Puntland denies reports of UAE military activity in Bosaso","Somali Signal","2025-05-07","https://somalisignal.com/puntland-denies-reports-of-uae-military-activity-in-bosaso/"),
 ("hol-bosaso-2025","OSINT analysts spot suspected UAE radar installation at Bosaso base in Puntland","Hiiraan Online","2025-04-15","https://www.hiiraan.com/news4/2025/Apr/201139/osint_analysts_spot_suspected_uae_radar_installation_at_bosaso_base_in_puntland.aspx"),
 ("un-libya-2021","Final report of the Panel of Experts on Libya (S/2021/229)","UN Security Council","2021-03-08","https://docs.un.org/en/S/2021/229"),
 ("ap-libya-embargo-2021","Experts: Libya rivals UAE, Russia, Turkey violate UN embargo","AP","2021-03-16","https://apnews.com/article/turkey-north-africa-qatar-libya-united-arab-emirates-20a2ad9c585f40ec291585dbf8e9ed22"),
 ("reuters-turksom-2017","Turkey opens military base in Mogadishu to train Somali soldiers","Reuters","2017-09-30","https://www.reuters.com/article/world/turkey-opens-military-base-in-mogadishu-to-train-somali-soldiers-idUSKCN1C50J9/"),
 ("reuters-eth-drones-2021","U.S. concerned over Turkey's drone sales to conflict-hit Ethiopia","Reuters","2021-12-22","https://www.reuters.com/world/africa/exclusive-us-concerned-over-turkeys-drone-sales-conflict-hit-ethiopia-2021-12-22/"),
 ("wapo-dedebit-2022","Ethiopian airstrike on Dedebit camp in Tigray killed dozens with Turkish-made drone","Washington Post","2022-03-24","https://www.washingtonpost.com/world/interactive/2022/ethiopia-tigray-dedebit-drone-strike/"),
 ("state-jeddah-2023","Jeddah Declaration of Commitment to Protect the Civilians of Sudan","US Department of State","2023-05-11","https://www.state.gov/jeddah-declaration-of-commitment-to-protect-the-civilians-of-sudan"),
 ("gitoc-wa-gold-2022","Re-examining Russia's presence in West Africa's gold sector (Risk Bulletin 3)","Global Initiative Against Transnational Organized Crime","2022-03-01","https://riskbulletins.globalinitiative.net/wea-obs-003/01-russias-presence-in-west-africas-gold-sector.html"),
 ("acss-bloodgold-2023","The Blood Gold Report: How the Kremlin is Using Wagner to Launder Billions in African Gold","Africa Center for Strategic Studies","2023-12-01","https://africacenter.org/security-article/the-blood-gold-report-how-the-kremlin-is-using-wagner-to-launder-billions-in-african-gold/"),
 ("ofac-gold-advisory-2023","Africa Gold Advisory","US Treasury (OFAC) and partners","2023-06-27","https://ofac.treasury.gov/system/files/2023-06/africa_gold_advisory_06272023.pdf"),
]
ids={s["id"] for s in B["sources"]}
for i,t,p,d,u in NEW:
    if i not in ids:B["sources"].append({"id":i,"title":t,"publisher":p,"date":d,"url":u,"type":"secondary"})

CAP={"China":{"n":"China (Belt & Road)","f":"cnflag","ll":[116.4,39.9],"cap":"Beijing"},
 "Russia":{"n":"Russia","f":"ruflag","ll":[37.6,55.75],"cap":"Moscow"},
 "US":{"n":"United States","f":"usflag","ll":[-77.04,38.9],"cap":"Washington"},
 "France":{"n":"France","f":"frflag","ll":[2.35,48.86],"cap":"Paris"},
 "UAE":{"n":"United Arab Emirates","f":"aeflag","ll":[54.37,24.45],"cap":"Abu Dhabi"},
 "Turkey":{"n":"Turkey","f":"trflag","ll":[32.85,39.93],"cap":"Ankara"},
 "Saudi":{"n":"Saudi Arabia","f":"saflag","ll":[46.72,24.71],"cap":"Riyadh"},
 "Iran":{"n":"Iran","f":"irflag","ll":[51.39,35.69],"cap":"Tehran"},
 "Rwanda":{"n":"Rwanda","f":"rwflag","ll":[30.06,-1.95],"cap":"Kigali"},
 "Chad":{"n":"Chad","f":"tdflag","ll":[15.04,12.13],"cap":"N'Djamena"},
 "Egypt":{"n":"Egypt","f":"egflag","ll":[31.24,30.04],"cap":"Cairo"}}
I=[]
def a(iso,host,p,t,st,c,ended=False):I.append({"iso":iso,"host":host,"p":p,"t":t,"st":st,"cites":c,"ended":ended})
# Russia
a("MLI","Mali","Russia","Africa Corps troops back the military government (Wagner until June 2025)","documented",["reuters-mali-2025","reuters-wagner-mali-2021"])
a("MLI","Mali","Russia","Russia's Yadran Group holds 38% of the new Bamako gold refinery","documented",["reuters-mali-refinery"])
a("BFA","Burkina Faso","Russia","About 100 Africa Corps personnel since January 2024","reported",["reuters-bf-ru-2024"])
a("NER","Niger","Russia","Defence-ministry instructors and an air-defence system since April 2024","documented",["reuters-niger-ru-2024"])
a("NER","Niger","Russia","Talks on Rosatom reactors and uranium, no contract reported","reported",["reuters-niger-nuclear-2025"])
a("CAF","Central African Republic","Russia","About 1,500 Wagner fighters guard the government; Wagner-linked firms hold gold rights","documented",["icg-car-2026","ofac-wagner-gold"])
a("LBY","Libya","Russia","Africa Corps logistics hub at al-Khadim airbase, backing Haftar's eastern forces","reported",["rfi-alkhadim-2025","cnn-libya-flights-2024"])
a("SDN","Sudan","Russia","Naval-base deal near Port Sudan with the army-led government, unratified","documented",["reuters-ru-sudan-base-2025","bbc-ru-sudan-base-2025"])
a("SDN","Sudan","Russia","Wagner missiles to the RSF in 2023","reported",["cnn-wagner-rsf-2023"])


# US
a("SOM","Somalia","US","AFRICOM airstrikes: 124 in 2025, many against IS-Somalia in Puntland","documented",["africom-isis-somalia-2025","hiiraan-africom-2026"])
a("NER","Niger","US","Left Air Base 201 (Agadez) and withdrew in September 2024","documented",["africom-niger-2024"],True)
a("COD","DR Congo","US","Brokered the June 2025 DRC-Rwanda peace deal and a minerals framework","documented",["state-drc-rwanda-2025","state-reif-2025"])
a("RWA","Rwanda","US","Party to the US-brokered DRC-Rwanda peace deal and minerals framework","documented",["state-drc-rwanda-2025","state-reif-2025"])
a("SDN","Sudan","US","Co-hosted the 2023 Jeddah talks between the army and the RSF with Saudi Arabia","documented",["state-jeddah-2023"])
# France
a("TCD","Chad","France","Handed over its last base in January 2025 after Chad ended the defence pact","documented",["ap-chad-2025"],True)
a("SEN","Senegal","France","Handed back its last bases in July 2025","documented",["reuters-senegal-fr-2025","f24-senegal-2025"],True)
a("DJI","Djibouti","France","Permanent base of about 1,500 people, now France's Africa headquarters","documented",["f24-senegal-2025"])
a("NER","Niger","France","Niger nationalised Orano's uranium mine SOMAIR in June 2025","documented",["reuters-somair-2025","orano-somair-2025"],True)
# UAE
a("SDN","Sudan","UAE","Arms to the RSF via eastern Chad, found credible by UN experts; the UAE denies it","alleged",["un-sudan-2024"])
a("SDN","Sudan","UAE","UAE-based firms bought RSF-linked Sudanese gold","documented",["ofac-rsf-2025","sentry-rsf-uae"])
a("TCD","Chad","UAE","Eastern Chad named by UN experts as the supply route to the RSF","alleged",["un-sudan-2024"])
a("LBY","Libya","UAE","Arms to Haftar's eastern forces in breach of the UN embargo, per UN experts","documented",["un-libya-2021","ap-libya-embargo-2021"])
a("SOL","Somaliland","UAE","Military facilities at Berbera port and airfield since 2017","reported",["mee-uae-bases-2025"])
a("SOM","Somalia (Puntland)","UAE","Bosaso airbase run by the UAE, reportedly used to supply the RSF; Puntland denies a UAE base","reported",["hol-bosaso-2025","mee-uae-bases-2025","ss-puntland-2025"])
a("ERI","Eritrea","UAE","Assab base used for the Yemen war, dismantled from 2019 to 2021","documented",["voa-assab-2021"],True)
a("MLI","Mali","UAE","Main buyer of Mali's gold exports","documented",["swissaid-gold-2024","gitoc-wa-gold-2022"])
a("GHA","Ghana","UAE","Main buyer of African artisanal gold, including Ghana's","documented",["swissaid-gold-2024"])
# Turkey
a("SOM","Somalia","Turkey","Camp TURKSOM, Turkey's largest overseas base, trains Somali troops","documented",["reuters-turksom-2017"])
a("SDN","Sudan","Turkey","Baykar drones supplied to the army","documented",["wapo-baykar-2025"])
a("ETH","Ethiopia","Turkey","Armed drones sold to the government during the Tigray war","reported",["reuters-eth-drones-2021","wapo-dedebit-2022"])
a("LBY","Libya","Turkey","Officers, drones and air defences for the Tripoli government since 2020","documented",["icg-turkey-libya-2020"])
# Saudi
a("SDN","Sudan","Saudi","Co-hosted the 2023 Jeddah talks between the army and the RSF","documented",["state-jeddah-2023"])
# Iran
a("SDN","Sudan","Iran","Drones to the army","reported",["reuters-iran-drones-2024","rferl-iran-base-2024"])
a("ETH","Ethiopia","Iran","Iranian-made drones seen in Ethiopia in 2021","reported",["wapo-dedebit-2022"])
# China from BRI
CISO={"Kenya":"KEN","Djibouti":"DJI","Tanzania":"TZA","DR Congo":"COD","Angola (top)":"AGO","Nigeria":"NGA","Cameroon":"CMR","Namibia":"NAM","Zimbabwe":"ZWE"}
for b in B["bri"]:
    cs=[b["country"]] if b["country"]!="Ethiopia / Djibouti" else ["Ethiopia","Djibouti"]
    for c in cs:
        iso=CISO.get(c,{"Ethiopia":"ETH"}.get(c))
        if iso:a(iso,c.replace(" (top)",""),"China",b["name"],"documented",b.get("cites",[]))
a("DJI","Djibouti","China","People's Liberation Army support base, opened 2017","documented",["reuters-djib-base-2017"])
B["powers"]={"caps":CAP,"items":I,"order":["China","Russia","US","France","UAE","Turkey","Saudi","Iran"]}

# conflict face-off cards
GA={"jnim":"al-Qa'ida, via AQIM","issp":"Islamic State","iswap":"Islamic State","shabaab":"al-Qa'ida","is":"Islamic State"}
def bk(p,t,st,c):return {"p":p,"t":t,"st":st,"cites":c}
B["conflicts"]=[
 {"id":"sudan","region":"sudan","title":"Sudan: army vs Rapid Support Forces","iso":["SDN"],
  "a":{"n":"Sudanese Armed Forces (army-led government)","m":["Allied joint forces of Darfur armed movements"],"b":[bk("Turkey","Baykar drones","documented",["wapo-baykar-2025"]),bk("Iran","Drones","reported",["reuters-iran-drones-2024"]),bk("Egypt","Drones and political support","reported",["reuters-egypt-drones-2026","reuters-sudan-backers-2023"]),bk("Russia","Naval-base deal, unratified","documented",["reuters-ru-sudan-base-2025"])]},
  "b":{"n":"Rapid Support Forces (RSF)","m":["Allied Arab militias in Darfur"],"b":[bk("UAE","Arms via Chad (UAE denies); gold purchases","alleged",["un-sudan-2024","ofac-rsf-2025"]),bk("Russia","Wagner missiles in 2023","reported",["cnn-wagner-rsf-2023"])]},
  "med":[bk("Saudi","Co-hosted Jeddah talks (2023)","documented",["state-jeddah-2023"]),bk("US","Co-hosted Jeddah talks (2023)","documented",["state-jeddah-2023"])],
  "details":"The army says it defends the state against a rebel militia. The RSF says it fights an Islamist-aligned army and for a civilian transition. The UAE denies arming the RSF.","cites":["reuters-sudan-backers-2023","un-sudan-2024","reuters-elfasher-2025"]},
 {"id":"sahel","region":"sahel","title":"Central Sahel: military governments vs jihadist groups","iso":["MLI","BFA","NER"],
  "a":{"n":"Military governments of Mali, Burkina Faso and Niger","m":["Alliance of Sahel States","Volunteer militias in Burkina Faso"],"b":[bk("Russia","Africa Corps troops and air support","documented",["reuters-mali-2025","reuters-bf-ru-2024","reuters-niger-ru-2024"])]},
  "b":{"n":"JNIM and Islamic State Sahel","g":["jnim","issp"],"m":["Tuareg separatist alliance (CSP), a separate front in northern Mali"],"b":[bk("Ukraine","Intelligence to the CSP, alleged by Mali; the rebels deny outside help","alleged",["reuters-mali-ukraine-2024","reuters-mali-rebels-2024"])]},
  "details":"The juntas say Russia helps where France failed. JNIM and IS Sahel fight each other as well as the states. The CSP says it fights for northern self-rule.","cites":["reuters-mali-2025","acled-issp-2024"]},
 {"id":"lake-chad","region":"lake-chad","title":"Lake Chad basin: four states vs ISWAP and Boko Haram","iso":["NGA","TCD","CMR","NER"],
  "a":{"n":"Nigeria, Chad, Cameroon and Niger","m":["Multinational Joint Task Force","Civilian Joint Task Force vigilantes"],"b":[]},
  "b":{"n":"ISWAP and Boko Haram (JAS)","g":["iswap"],"m":["Boko Haram fights ISWAP as well as the states"],"b":[]},
  "details":"No foreign state backs either side in our sources. ISWAP attacks surged in 2025.","cites":["iss-iswap-2025","reuters-nigeria-surge-2025"]},
 {"id":"somalia","region":"horn","title":"Somalia: federal government vs al-Shabaab and IS-Somalia","iso":["SOM"],
  "a":{"n":"Somali federal government and Puntland","m":["Clan militias","African Union mission"],"b":[bk("US","AFRICOM airstrikes","documented",["africom-isis-somalia-2025"]),bk("Turkey","Training at Camp TURKSOM","documented",["reuters-turksom-2017"])]},
  "b":{"n":"al-Shabaab and Islamic State Somalia","g":["shabaab","is"],"m":[],"b":[]},
  "details":"Puntland leads the campaign against IS-Somalia in the Golis Mountains, backed by US strikes.","cites":["africom-isis-somalia-2025","hiiraan-africom-2026"]},
 {"id":"drc","region":"great-lakes","title":"Eastern DR Congo: government vs M23","iso":["COD"],
  "a":{"n":"DR Congo armed forces","m":["Wazalendo militias"],"b":[]},
  "b":{"n":"M23 / Congo River Alliance (AFC)","m":[],"b":[bk("Rwanda","Troops and weapons, per UN experts","documented",["un-drc-2024"])]},
  "med":[bk("US","Brokered the June 2025 peace deal","documented",["state-drc-rwanda-2025"])],
  "details":"Rwanda denies supporting M23 and cites the FDLR threat on its border. M23 holds the Rubaya coltan mines.","cites":["un-drc-2024","un-drc-s2024-969"]},
 {"id":"libya","region":"north","title":"Libya: East vs West (ceasefire since 2020)","iso":["LBY"],
  "a":{"n":"Haftar's eastern forces (Libyan National Army)","m":[],"b":[bk("Russia","Africa Corps logistics hub","reported",["rfi-alkhadim-2025"]),bk("UAE","Arms, per UN experts","documented",["un-libya-2021"])]},
  "b":{"n":"Tripoli government and allied western forces","m":[],"b":[bk("Turkey","Officers, drones and air defences","documented",["icg-turkey-libya-2020"])]},
  "details":"No active front since the 2020 ceasefire, but both camps keep foreign military backing.","cites":["icg-libya-update-2","ap-libya-embargo-2021"]},
 {"id":"car","region":"car","title":"Central African Republic: government vs armed groups","iso":["CAF"],
  "a":{"n":"President Touadéra's government","m":[],"b":[bk("Russia","About 1,500 Wagner fighters","documented",["icg-car-2026"])]},
  "b":{"n":"Armed rebel groups","m":[],"b":[]},
  "details":"The government calls the Russians invited instructors. Wagner-linked firms hold gold rights.","cites":["icg-car-2026","ofac-wagner-gold"]},
 {"id":"ethiopia","region":"horn","title":"Ethiopia: federal government vs Tigray forces (war 2020–22)","iso":["ETH"],
  "a":{"n":"Ethiopian federal government","m":[],"b":[bk("Turkey","Armed drones","reported",["reuters-eth-drones-2021"]),bk("Iran","Drones","reported",["wapo-dedebit-2022"])]},
  "b":{"n":"Tigray forces","m":[],"b":[]},
  "details":"Tension with Eritrea has risen since 2025.","cites":["reuters-eth-drones-2021","reuters-eth-eri-2025"]},
 {"id":"mozambique","region":"southern","title":"Northern Mozambique: government vs Islamic State Mozambique","iso":["MOZ"],
  "a":{"n":"Mozambique government","m":[],"b":[bk("Rwanda","Troops in Cabo Delgado","documented",["acled-rwanda-moz-2025"])]},
  "b":{"n":"Islamic State Mozambique","g":["is"],"m":[],"b":[]},
  "details":"Rwandan troops protect the area around the TotalEnergies gas project.","cites":["acled-rwanda-moz-2025","club-moz-rwanda-2025"]},
]
B["galign"]=GA
# A7 cut: drop map layer, steps, cards; keep 1-2 sentences in money flows
for k in ("a7","a7route","a7cog","a7fric"):B.pop(k,None)
ex=B["explainers"]["sahel"]["paras"]
B["explainers"]["sahel"]["paras"]=[p for p in ex if "A7" not in p["t"]]
g=B["goldroutes"]
g["a7"]={"t":"Russia's A7 payment network and its ruble stablecoin A7A5 are one reported route by which Sahel gold proceeds can reach Russia. No public source traces a specific shipment of African gold through it.","cites":["cir-a7-africa-2026","cir-a7a5-2025","elliptic-a7a5-1bn"]}
g["crypto"]={"label":"UAE to crypto and stablecoins","status":"reported",
 "t":"Sahel gold from Mali, Burkina Faso and Niger mostly goes to the UAE, where Russian-linked networks have sold African gold for cash. Researchers report that proceeds can then move through the dollar token USDT and the ruble token A7A5, but no public source gives a tonnage or traces a specific Sahel shipment into crypto.",
 "cites":["gitoc-wa-gold-2022","acss-bloodgold-2023","ofac-wagner-gold","cir-a7-abroad-2025","elliptic-a7a5-1bn"]}
json.dump(B,open(P,"w"),ensure_ascii=False,indent=1)
print("ok",len(I),len(B["conflicts"]))
