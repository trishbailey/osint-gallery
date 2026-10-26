"""v1.4: A7 in Africa (big picture only, public sources only). Idempotent."""
import json,sys
P=sys.argv[1] if len(sys.argv)>1 else "data/brief.json"
B=json.load(open(P))
NEW=[
 ("cir-a7-africa-2026","Sanctioned and expanding: Russia's A7 network deepens its Africa footprint","Centre for Information Resilience","2026-04-04","https://www.info-res.org/reports/sanctioned-and-expanding-russias-a7-network-deepens-its-africa-footprint/"),
 ("cir-a7-africa-pdf","A7 in Africa (full report)","Centre for Information Resilience","2026-04-04","https://www.info-res.org/app/uploads/2026/04/A7-Africa-Final.pdf"),
 ("cir-a7-abroad-2025","A7 Abroad","Centre for Information Resilience","2025-10-01","https://www.info-res.org/app/uploads/2025/10/A7-Abroad-FINAL-Copy.pdf"),
 ("cir-a7a5-2025","A7A5: Circumventing Sanctions with Stablecoin Cryptocurrency","Centre for Information Resilience","2025-06-25","https://www.info-res.org/app/uploads/2025/06/A7A5-Report-June-2025-Final-Draft-1.pdf"),
 ("lawfare-a7-2025","To Evade Sanctions, the Kremlin Turns to a Convicted Money Launderer","Lawfare","2025-11-18","https://www.lawfaremedia.org/article/to-evade-sanctions--the-kremlin-turns-to-a-convicted-money-launderer"),
 ("elliptic-a7a5-1bn","The rise of A7A5: the Ruble stablecoin now transfers $1 billion per day","Elliptic","2025-07-27","https://www.elliptic.co/insights/the-rise-of-a7a5-the-ruble-stablecoin-now-transfers-1-billion-per-day/"),
 ("coindesk-eu-2026","EU's largest measures against Russia yet include escalation of crypto sanctions evasion","CoinDesk","2026-04-27","https://www.coindesk.com/policy/2026/04/27/eu-s-largest-measures-against-russia-yet-include-escalation-of-crypto-sanctions-evasion"),
 ("lbma-russia-2022","Good Delivery List Update: Gold & Silver Russian Refiners Suspended","LBMA","2022-03-07","https://www.lbma.org.uk/articles/good-delivery-list-update-gold-silver-russian-refiners-suspended"),
 ("interfax-soroma-2025","Mali gold refinery with Russian shareholder to seek Good Delivery status","Interfax","2025-06-27","https://interfax.com/newsroom/top-stories/112321/"),
 ("reuters-soroma-build-2025","Mali starts construction of Russia-backed gold refinery","Reuters","2025-06-17","https://www.reuters.com/world/africa/mali-starts-construction-russia-backed-gold-refinery-2025-06-17/"),
 ("bbc-soroma-2025","Mali gold refinery: military ruler hails construction as assertion of 'economic sovereignty'","BBC","2025-06-17","https://www.bbc.com/news/articles/c98w49220rko"),
 ("adf-a7-2026","Russia Launches Crypto Scheme in Africa","Africa Defense Forum","2026-05-19","https://adf-magazine.com/2026/05/russia-launches-crypto-scheme-in-africa/"),
]
ids={s["id"] for s in B["sources"]}
for i,t,p,d,u in NEW:
    if i not in ids:B["sources"].append({"id":i,"title":t,"publisher":p,"date":d,"url":u,"type":"secondary"})
B["a7"]={
 "cats":{
  "partner":{"c":"#FF1744","n":"Office working through a local partner (reported)"},
  "office":{"c":"#B388FF","n":"Declared office, no reported operations"},
  "outreach":{"c":"#F4FF81","n":"Political outreach, no office"},
  "refinery":{"c":"#80D8FF","n":"Russian-backed gold refinery, no public A7 tie"}},
 "countries":[
  {"iso":"NGA","name":"Nigeria","cat":"partner","t":"A7 opened its Lagos office in September 2025. CIR reports that it appears to operate through a local partner company, and that companies named A7 Africa and A7 Nigeria were registered in Kyrgyzstan to a Nigerian owner. Nigeria's finance minister said he did not attend the opening.","cites":["cir-a7-africa-2026","adf-a7-2026"]},
  {"iso":"ZWE","name":"Zimbabwe","cat":"office","t":"A7 opened a Harare office on the same day as Lagos, in September 2025, with Russia's deputy finance minister and the deputy chairman of the state bank PSB. Zimbabwe's finance minister was visible at the event.","cites":["cir-a7-africa-2026","cir-a7-abroad-2025"]},
  {"iso":"TGO","name":"Togo","cat":"outreach","t":"CIR reports an undisclosed visit to Lomé in January 2026 by a delegation likely linked to A7, and A7 job adverts for a Togo country manager from March 2026. There is no office.","cites":["cir-a7-africa-2026","adf-a7-2026"]},
  {"iso":"MDG","name":"Madagascar","cat":"outreach","t":"CIR reports the same delegation flew on to Antananarivo in January 2026, as Russia's Africa Corps arrived there. There is no office.","cites":["cir-a7-africa-2026","cir-a7-africa-pdf"]},
  {"iso":"EGY","name":"Egypt","cat":"outreach","t":"At the Russia-Africa ministerial forum in Cairo in December 2025, Russia's foreign minister promoted A7 and invited African states to join Nigeria and Zimbabwe on the platform. There is no office.","cites":["cir-a7-africa-pdf"]},
  {"iso":"MLI","name":"Mali","cat":"refinery","t":"Russia's deputy finance minister named Mali among interested countries at the A7 openings. Mali's new Bamako gold refinery is 38% owned by Russia's Yadran Group. No public source we found ties Yadran or the refinery to A7.","cites":["cir-a7-abroad-2025","reuters-mali-refinery","interfax-soroma-2025"]}]}
B["a7route"]={"status":"reported","note":"Each step below is public. No public source traces a single shipment through every step.",
 "steps":[
  {"n":"Sahel gold","t":"Mali produces about 50 t of gold a year. Yadran says most refinery feedstock will be Malian, with gold from other Sahel states such as Burkina Faso also considered.","cites":["reuters-mali-refinery","interfax-soroma-2025","bbc-soroma-2025"]},
  {"n":"Bamako refinery","t":"SOROMA-SA is 62% Malian state and 38% Yadran Group, sized for up to 200 t a year. Building began in June 2025, so it is not yet refining.","cites":["reuters-mali-refinery","reuters-soroma-build-2025","interfax-soroma-2025"]},
  {"n":"UAE","t":"Mali's gold has gone abroad for refining and sale to the UAE, South Africa and Switzerland since 1980. SWISSAID finds most undeclared African gold reaches the UAE.","cites":["reuters-soroma-build-2025","swissaid-uae-2025"]},
  {"n":"USDT and A7A5","t":"A7A5 trades against the dollar token USDT on Kyrgyz exchanges and on Bitpapa, a sanctioned UAE peer-to-peer platform. Its issuer has injected over $1.3 billion in USDT into its own exchange.","cites":["elliptic-a7a5-1bn"]},
  {"n":"Rubles","t":"A7A5 is pegged to the ruble and backed by ruble deposits at PSB, the sanctioned state defence bank that co-owns A7.","cites":["cir-a7a5-2025"]}],
 "parallel":{"n":"Hong Kong channel","t":"An A7 sales presentation in August 2025 put 48% of A7 payments to Hong Kong and 30% to mainland China, mostly in yuan. Africa and others took 6%.","cites":["cir-a7-abroad-2025"]}}
B["a7cog"]=[
 {"n":"State bank layer","t":"PSB, the sanctioned state defence bank, launched A7 in October 2024, co-owns it and holds the deposits behind A7A5. The state development bank VEB.RF backs it financially.","cites":["lawfare-a7-2025","cir-a7a5-2025"]},
 {"n":"Kyrgyz crypto layer","t":"A7A5's issuer and its main exchanges are registered in Kyrgyzstan.","cites":["ofac-a7-2025","elliptic-a7a5-1bn"]},
 {"n":"UAE and Hong Kong intermediaries","t":"Shared web infrastructure links A7 to companies in the UAE and Seychelles, and most A7 payments go to Hong Kong and China.","cites":["cir-a7a5-2025","cir-a7-abroad-2025"]},
 {"n":"Kremlin political cover","t":"A deputy finance minister opened the African offices and the foreign minister promoted A7 to African states in Cairo.","cites":["cir-a7-africa-2026","cir-a7-africa-pdf"]}]
B["a7fric"]=[
 {"n":"United States, Aug 2025","t":"OFAC designated A7, the A7A5 issuer and the Grinex exchange.","cites":["ofac-a7-2025","ofac-sdn-20250814"]},
 {"n":"United Kingdom, 2025","t":"The UK sanctioned A7 in May 2025, and the A7A5 issuer and Grinex in August 2025.","cites":["cir-a7a5-2025","uk-a7a5-2025"]},
 {"n":"European Union, 2025–26","t":"The EU sanctioned A7 in July 2025 and banned A7A5 transactions in October 2025. Its April 2026 package hit the Kyrgyz exchange where much A7A5 trades and banned Russian crypto platforms.","cites":["elliptic-a7a5-1bn","eu-19th-2025","coindesk-eu-2026"]},
 {"n":"LBMA, since 2022","t":"The London bullion market suspended Russian refiners in March 2022. Yadran says the Bamako refinery aims for LBMA Good Delivery status.","cites":["lbma-russia-2022","interfax-soroma-2025"]}]
a=B["goldroutes"]["a7"]
a["label"]="A7 and A7A5, Russia's settlement rail"
a["t"][0]="A7 LLC is a Moscow cross-border payments firm co-owned by the state defence bank Promsvyazbank (PSB). Its ruble token A7A5 is issued in Kyrgyzstan and trades mainly on the Grinex exchange."
a["cites"]=sorted(set(a["cites"])|{"cir-a7a5-2025","cir-a7-africa-2026"})
a["africa"]="A7 opened offices in Nigeria and Zimbabwe in September 2025 and has courted Togo, Madagascar and Mali. No public source traces African gold through A7A5, so the gold leg stays marked reported."
ex=B["explainers"]["sahel"]["paras"]
P4="Russian officials have named Mali as a possible partner for the A7 payments network. When A7 opened its first African offices in September 2025, Russia's deputy finance minister listed Mali among interested countries. [[cir-a7-abroad-2025]] The Bamako refinery's Russian partner is Yadran Group, and no public source we found ties Yadran to A7. [[reuters-mali-refinery,interfax-soroma-2025]] Elliptic reports that A7's ruble token trades against the dollar token USDT in Kyrgyzstan and on a UAE platform, which lets dollars reach rubles outside the banking system. [[elliptic-a7a5-1bn]] PSB describes A7 as a sanctions-resistant settlement system for Russia's trade partners. [[cir-a7-abroad-2025]] The US, UK and EU treat it as sanctions evasion. [[ofac-a7-2025,uk-a7a5-2025,eu-19th-2025]]"
if not any(p["t"].startswith("Russian officials have named Mali") for p in ex):ex.insert(4,{"t":P4})
json.dump(B,open(P,"w"),indent=1,ensure_ascii=False)
print("ok",len(B["sources"]))
