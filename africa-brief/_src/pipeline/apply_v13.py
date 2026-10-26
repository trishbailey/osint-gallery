"""v1.3: gold routes (Africa->UAE, UAE->Switzerland, UAE->crypto/A7A5), A7 rail, gold text. Idempotent.
Usage: python apply_v13.py ../../data/brief.json"""
import json,sys
P=sys.argv[1];B=json.load(open(P))
SRC=[
 ("swissaid-trail-article","On the trail of African gold (summary article)","SWISSAID","2024-05-30","https://www.swissaid.ch/en/articles/on-the-trail-of-african-gold/","secondary"),
 ("ofac-polyus-2024","Treasury takes sweeping aim at Russia's financial infrastructure (jy2404), Sudakov gold laundering network","US Treasury","2024-06-12","https://home.treasury.gov/news/press-releases/jy2404","primary"),
 ("ofac-a7-2025","Treasury sanctions cryptocurrency exchange and network enabling sanctions evasion (sb0225): Grinex, A7, A71, A7 Agent, Old Vector","US Treasury","2025-08-14","https://home.treasury.gov/news/press-releases/sb0225","primary"),
 ("ofac-sdn-20250814","Cyber-related designations, SDN list entries for A7 LLC, Grinex, Old Vector","OFAC","2025-08-14","https://ofac.treasury.gov/recent-actions/20250814","primary"),
 ("uk-a7a5-2025","UK targets sanctions circumvention and crypto networks exploited by Russia","UK FCDO","2025-08-20","https://www.gov.uk/government/news/uk-targets-sanctions-circumvention-and-crypto-networks-exploited-by-russia","primary"),
 ("eu-19th-2025","19th package of sanctions against Russia: crypto providers and A7A5","Council of the EU","2025-10-23","https://www.consilium.europa.eu/en/press/press-releases/2025/10/23/19th-package-of-sanctions-against-russia-eu-targets-russian-energy-third-country-banks-and-crypto-providers/","primary"),
 ("elliptic-a7a5-2025","The rise of A7A5: the ruble stablecoin now transfers $1 billion per day","Elliptic","2025-07-27","https://www.elliptic.co/insights/the-rise-of-a7a5-the-ruble-stablecoin-now-transfers-1-billion-per-day/","secondary"),
 ("elliptic-a7a5-2026","A7A5: the ruble-backed stablecoin crosses $100 billion in transactions","Elliptic","2026-01-21","https://www.elliptic.co/insights/a7a5-the-ruble-backed-stablecoin-100-billion-in-transactions/","secondary"),
 ("elliptic-a7-leaks","The A7 leaks: the role of crypto in Russian sanctions evasion and election interference","Elliptic","2025","https://www.elliptic.co/insights/the-a7-leaks-the-role-of-crypto-in-russian-sanctions-evasion-and-election-interference/","secondary"),
 ("ft-a7a5-2025","Whale-watching the stablecoin trade in ersatz roubles for sort-of dollars (FT Alphaville, on the FT's A7A5 investigation)","Financial Times","2025","https://www.ft.com/content/650769ea-5679-44c1-99bc-dd060232bfed","secondary"),
 ("chainalysis-a7a5-2025","How A7A5 and Grinex enable the Russian shadow crypto economy","Chainalysis","2025-08","https://www.chainalysis.com/blog/a7a5-grinex-russian-crypto-economy-ofac-sanctions-august-2025/","secondary"),
 ("sentry-rsf-uae","The RSF's business network in the UAE","The Sentry","2025","https://thesentry.org/reports/sudan-rsf-business-network-in-the-uae/","secondary"),
]
have={s["id"] for s in B["sources"]}
for i,t,p,d,u,ty in SRC:
    if i not in have:B["sources"].append({"id":i,"title":t,"publisher":p,"date":d,"url":u,"type":ty})
inflow=[f for f in B["sankey"]["gold"] if f["to"]=="UAE"]
B["goldroutes"]={
 "uae":{"label":"Africa to the UAE (Dubai)","inflows":inflow,
   "smuggled":{"t":405,"year":"2022","cite":"swissaid-gold-2024","what":"African gold imported by the UAE that was not declared for export in Africa (66.5% of the UAE's African gold imports)"},
   "decade":{"t":2569,"year":"2012-2022","cite":"swissaid-gold-2024"},
   "cases":[
     {"status":"documented","t":"OFAC sanctioned UAE-based AZ Gold, managed by an RSF figure, for buying gold from Sudan.","cites":["ofac-rsf-2025"]},
     {"status":"documented","t":"OFAC said Dubai-based Industrial Resources joined a Wagner-linked scheme that turned CAR gold into US dollars and moved cash to Russia by hand.","cites":["ofac-wagner-gold"]},
     {"status":"reported","t":"The Sentry traced RSF-linked businessmen behind four Dubai gold companies.","cites":["sentry-rsf-uae"]}]},
 "ch":{"label":"UAE to Switzerland","t":316,"year":"Jan-Sep 2025","cite":"swissaid-uae-2025","decade":{"t":1670,"year":"2012-2022","cite":"swissaid-trail-article"},
   "note":"Swiss rules record refined gold by its last place of processing, so gold from Dubai counts as Emirati."},
 "crypto":{"label":"UAE to crypto and stablecoins",
   "cases":[
     {"status":"documented","t":"OFAC said a network laundering gold for sanctioned Russian miner Polyus converted gold-sale payments into fiat and cryptocurrency through UAE and Hong Kong front companies, including Dubai's Red Coast Metals Trading DMCC. The gold was Russian, not African.","cites":["ofac-polyus-2024"]}],
   "gap":"We found no published volume of African gold converted to crypto in the UAE, and no source tying a specific African gold shipment to a crypto conversion."},
 "a7":{"label":"A7A5, Russia's settlement rail","status":"reported",
   "t":["A7 LLC is a Moscow cross-border payments firm owned by Ilan Shor and the state defence bank Promsvyazbank (PSB). Its ruble token A7A5 is issued by Old Vector in Kyrgyzstan and trades mainly on the Grinex exchange.",
        "The US sanctioned A7, Grinex and Old Vector in August 2025, the UK sanctioned Grinex and Old Vector the same month, and the EU banned A7A5 transactions in October 2025.",
        "Elliptic counts more than $100 billion in A7A5 transfers by January 2026, mostly as a bridge between rubles and the dollar token USDT."],
   "cites":["ofac-a7-2025","ofac-sdn-20250814","uk-a7a5-2025","eu-19th-2025","elliptic-a7a5-2025","elliptic-a7a5-2026","elliptic-a7-leaks","ft-a7a5-2025","chainalysis-a7a5-2025"],
   "africa":"None of these sources links A7 or A7A5 to African gold or trade. It is shown as the Russian settlement rail that a gold-to-crypto route could feed into, not as a documented Africa link."}}
def setp(reg,idx,txt,c):
    ps=B["explainers"][reg]["paras"]
    if idx<len(ps):ps[idx]={"t":txt,"c":c}
setp("sudan",1,"Gold is the main source of hard currency for both sides, and most of it goes to the UAE. The RSF's business network began in the {{jebelamer|Jebel Amer}} mines of Darfur. [[guardian-jebelamer-2020]] SWISSAID counts 29 t of gold the UAE imported directly from Sudan in 2024, plus imports via Chad and Libya that it treats as exit routes for RSF gold. [[swissaid-uae-2025]] The US Treasury sanctioned UAE-based AZ Gold, managed by an RSF figure, for buying Sudanese gold. [[ofac-rsf-2025]]",["guardian-jebelamer-2020","swissaid-uae-2025","ofac-rsf-2025"])
ps=B["explainers"]["sahel"]["paras"];
if "80-85%" not in ps[2]["t"]:
    ps[2]["t"]+=" SWISSAID names Mali among the three largest gold-smuggling countries in Africa and finds that 80-85% of African artisanal gold is exported to the UAE. [[swissaid-gold-2024]]";ps[2]["c"]=list(dict.fromkeys(ps[2]["c"]+["swissaid-gold-2024"]))
ps=B["explainers"]["car"]["paras"]
if "Industrial Resources" not in ps[1]["t"]:
    ps[1]["t"]+=" Treasury said Dubai-based Industrial Resources joined a scheme that turned CAR gold into dollars and moved cash to Russia by hand. [[ofac-wagner-gold]]";ps[1]["c"]=list(dict.fromkeys(ps[1]["c"]+["ofac-wagner-gold"]))
ps=B["explainers"]["north"]["paras"]
if not any("9 t" in p["t"] for p in ps):
    ps.insert(3,{"t":"Libya is also a gold corridor. SWISSAID counts 9 t of gold the UAE imported from Libya in 2024 and treats Libya as one exit route for Sudanese gold. [[swissaid-uae-2025]]","c":["swissaid-uae-2025"]})
json.dump(B,open(P,"w"),ensure_ascii=False,indent=1)
print("ok",len(B["sources"]))
