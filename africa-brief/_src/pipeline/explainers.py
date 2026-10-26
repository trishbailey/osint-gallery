"""Region explainers, Sankey flows and extra sources. Every item cites source ids."""
import json
SRC=[
("reuters-benin-54-2025","Benin says Al Qaeda affiliate attack killed 54 soldiers last week","Reuters","2025-04-24","https://www.reuters.com/world/africa/benin-says-al-qaeda-affiliate-attack-killed-54-soldiers-last-week-2025-04-24/"),
("acled-rwanda-moz-2025","Rwanda in Mozambique: Limits to civilian protection","ACLED","2025-06-01","https://acleddata.com/report/rwanda-mozambique-limits-civilian-protection"),
("club-moz-rwanda-2025","Mozambique: New Rwandan contingent in Cabo Delgado replaces existing one - minister","Club of Mozambique","2025-02-06","https://clubofmozambique.com/news/mozambique-new-rwandan-contingent-in-cabo-delgado-replaces-existing-one-minister/"),
("reuters-nigeria-surge-2025","Surge in attacks signals jihadist comeback in Nigeria's northeast","Reuters","2025-04-29","https://www.reuters.com/world/africa/surge-attacks-signals-jihadist-comeback-nigerias-northeast-2025-04-29/"),
("iss-iswap-2025","Lake Chad Basin's military bases in ISWAP's crosshairs","ISS Africa","2025-07-14","https://issafrica.org/iss-today/lake-chad-basin-s-military-bases-in-iswap-s-crosshairs"),
("reuters-car-court-2026","Central African Republic court validates Touadera's re-election","Reuters","2026-01-19","https://www.reuters.com/world/africa/central-african-republic-court-validates-touaderas-re-election-2026-01-19/"),
("icg-car-2026","Central African Republic: Consolidating Security Gains after the Elections","International Crisis Group","2026-01-01","https://www.crisisgroup.org/qna/africa/central-african-republic-russia-rwanda/centrafrique-apres-les-elections-consolider-les-gains-securitaires"),
("reuters-eth-eri-2025","Explainer: Why are Ethiopia and Eritrea on the brink of a possible war?","Reuters","2025-03-14","https://www.reuters.com/world/africa/why-are-ethiopia-eritrea-brink-possible-war-2025-03-14/"),
("bbc-eth-eri-2025","Escalating war of words between Ethiopia and Eritrea triggers fears of conflict","BBC Monitoring","2025-11-23","https://www.bbc.com/news/articles/cvgwg042vr4o"),
("reuters-elfasher-2025","Sudan's RSF says it captured al-Fashir army headquarters","Reuters","2025-10-26","https://www.reuters.com/world/africa/sudans-rsf-says-it-captured-al-fashir-army-headquarters-2025-10-26/"),
("swissaid-uae-2025","United Arab Emirates: More Than Ever a Hub for Conflict Gold (press release on 2024 UAE Comtrade data)","SWISSAID","2025-11-04","https://www.swissaid.ch/en/media/united-arab-emirates-more-than-ever-a-hub-for-conflict-gold/"),
("un-drc-s2024-969","UN Group of Experts on the DRC, final report S/2024/969","UN Security Council","2024-12-27","https://documents.un.org/doc/undoc/gen/n24/373/37/pdf/n2437337.pdf"),
("reuters-drc-rwanda-coltan-2025","Congo rebels muddy minerals market with illegal Rwanda exports, says UN report","Reuters","2025-01-08","https://www.reuters.com/world/africa/congo-rebels-muddy-minerals-market-with-illegal-rwanda-exports-says-un-report-2025-01-08/"),
("wits-cobalt-2024","China imports of cobalt mattes and intermediates (HS 810510) by partner, 2024","World Bank WITS / UN Comtrade","2025-01-01","https://wits.worldbank.org/trade/comtrade/en/country/CHN/year/2024/tradeflow/Imports/partner/ALL/product/810510"),
("radiotamazuj-drones-2026","Sudan drone strikes kill 306 in three weeks, UN rights body says","Radio Tamazuj","2026-10-25","https://www.radiotamazuj.org/en/news/article/sudan-drone-strikes-kill-306-in-three-weeks-un-rights-body-says"),
("lemonde-alg-niger-2026","En Algérie, le Parlement autorise l'envoi d'unités militaires au Niger","Le Monde Afrique","2026-10-25","https://www.lemonde.fr/afrique/article/2026/10/25/en-algerie-le-parlement-autorise-l-envoi-d-unites-militaires-au-niger_6800111_3212.html"),
("ucdp-ged","UCDP Georeferenced Event Dataset v26.1 and Candidate GED v26.01.26.09","Uppsala Conflict Data Program","2026-10-01","https://ucdp.uu.se/downloads/"),
]
I=lambda t,*c:{"t":t,"c":list(c)}
EX={
"sahel":{
 "who":[I("Juntas in Mali, Burkina Faso and Niger fight JNIM (al-Qaeda) and Islamic State affiliates; Mali's army works with Russia's Africa Corps, which replaced Wagner in 2025.","reuters-mali-2025","gitoc-acled-2024"),
        I("Algeria's parliament approved sending troops to Niger in Oct 2026, its first foreign deployment since 1973.","lemonde-alg-niger-2026")],
 "drivers":[I("Armed groups tax and protect artisanal gold sites in Burkina Faso, Mali and Niger, which gives them income and local standing.","gitoc-acled-2024","reuters-niger-gold-2025"),
        I("The juntas have reasserted state control of mining: Niger moved to nationalise Orano's SOMAIR uranium mine, and Mali began building a Russia-backed refinery.","reuters-somair-2025","reuters-mali-refinery")],
 "money":[I("SWISSAID found 405 t of African gold entering the UAE in 2022 that African states had not declared as exports; it put 80-85% of African artisanal gold flows through the UAE.","swissaid-gold-2024"),
        I("Russia's Yadran Group holds a stake in the planned Mali refinery; Rosatom signed for nuclear reactor plans with Niger.","reuters-mali-refinery","reuters-niger-nuclear-2025")],
 "case":[I("Juntas: Western forces failed to stop the insurgency, and control of gold and uranium returns revenue to citizens.","reuters-somair-2025"),
        I("France and Orano: SOMAIR operated under valid agreements, and Orano opposes nationalisation as unlawful.","orano-somair-2025"),
        I("Russia presents Africa Corps as state-to-state security help requested by Bamako.","reuters-mali-2025")]},
"lake-chad":{
 "who":[I("Boko Haram and Islamic State West Africa Province (ISWAP) fight the armies of Nigeria, Cameroon, Chad and Niger.","reuters-nigeria-surge-2025","iss-iswap-2025"),
        I("France handed over its last base in Chad in Jan 2025 after Chad ended the defence pact.","ap-chad-2025")],
 "drivers":[I("Lake Chad shrank by about 90% between 1963 and 2001, cutting fishing, farming and grazing livelihoods.","fao-lakechad"),
        I("ISS counted at least 15 ISWAP attacks on remote military outposts in the first half of 2025; defectors said Islamic State sent trainers.","iss-iswap-2025")],
 "money":[I("ISS reports that ISWAP seizes weapons from overrun bases and extorts civilians on the islands it controls.","iss-iswap-2025")],
 "case":[I("Nigeria set up the remote outposts to resettle displaced civilians in destroyed towns.","iss-iswap-2025"),
        I("Chad says ending the French pact restores full sovereignty over its security choices.","ap-chad-2025")]},
"sudan":{
 "who":[I("The Sudanese Armed Forces (SAF) and the Rapid Support Forces (RSF) have fought since April 2023; the RSF took the SAF headquarters in El Fasher in Oct 2025.","reuters-elfasher-2025"),
        I("SAF backers: Turkish Baykar drones, Iranian drones and Egyptian support. RSF backers: UAE-linked supply networks found credible by UN experts.","wapo-baykar-2025","reuters-iran-drones-2024","reuters-egypt-drones-2026","un-sudan-2024")],
 "drivers":[I("Gold is the main hard-currency source for both sides; the RSF's commercial roots lie in Jebel Amer gold in Darfur.","guardian-jebelamer-2020","un-sudan-2024"),
        I("The war has hit the Gezira farm scheme, Sudan's breadbasket; UN rights chief said drone strikes killed 306 people in three weeks in Oct 2026.","fao-sudan-ag-2024","radiotamazuj-drones-2026")],
 "money":[I("The UAE imported 29 t of gold directly from Sudan in 2024, plus 18 t from Chad and 9 t from Libya, which SWISSAID calls exit points for RSF gold.","swissaid-uae-2025"),
        I("OFAC sanctioned UAE-based firms for supplying the RSF with money and equipment.","ofac-rsf-2025")],
 "case":[I("SAF: it is the legitimate national army defending the state against a rebel militia.","reuters-sudan-backers-2023"),
        I("RSF: it says it fights a regime of former Bashir-era Islamists.","reuters-sudan-backers-2023"),
        I("UAE: it denies arming any party and says its flights carry aid.","un-sudan-2024")]},
"great-lakes":{
 "who":[I("M23/AFC holds much of North and South Kivu; UN experts reported 3,000-4,000 Rwandan troops fighting alongside it.","un-drc-2024"),
        I("The US brokered a DRC-Rwanda peace agreement and a regional economic framework in 2025.","state-drc-rwanda-2025","state-reif-2025")],
 "drivers":[I("Rubaya's coltan mines, held by M23 since April 2024, supply a large share of world tantalum.","un-drc-s2024-969","usgs-tantalum"),
        I("Rwanda cites the FDLR, a militia with roots in the 1994 genocide, as a security threat on its border.","un-drc-2024")],
 "money":[I("UN experts found at least 150 t of coltan was fraudulently exported from Rubaya to Rwanda and mixed with Rwandan output; M23 collected at least $800,000 a month in taxes.","un-drc-s2024-969","reuters-drc-rwanda-coltan-2025"),
        I("China imported 628,191 t of cobalt intermediates from the DRC in 2024, 98% of its imports by weight.","wits-cobalt-2024")],
 "case":[I("Rwanda: it denies backing M23 and says it defends itself against the FDLR.","un-drc-2024"),
        I("DRC: it calls M23 a Rwandan proxy looting its minerals.","un-drc-2025"),
        I("US: the framework links peace to legal mineral trade and investment.","state-reif-2025")]},
"car":{
 "who":[I("President Touadéra won a third term in the Dec 2025 vote, validated with 77.9%; Wagner fighters (about 1,500) and Rwandan troops back his government.","reuters-car-court-2026","icg-car-2026")],
 "drivers":[I("Armed groups and state forces compete over gold, diamond and timber zones; Wagner-linked firms hold gold rights including Ndassima.","ofac-wagner-gold","icg-car-2026")],
 "money":[I("Crisis Group reports that Russians run gold mines, cut timber and receive tax exemptions in return for security; OFAC sanctioned Wagner gold firms.","icg-car-2026","ofac-wagner-gold")],
 "case":[I("Bangui: Russian and Rwandan forces delivered security gains that UN peacekeeping did not.","icg-car-2026"),
        I("Moscow presses for Africa Corps, under its defence ministry, to replace Wagner and for CAR to pay more.","icg-car-2026")]},
"horn":{
 "who":[I("Ethiopia and Eritrea traded threats over Ethiopian claims to Eritrea's Assab port through 2025; Eritrea signed a security pact with Egypt.","reuters-eth-eri-2025","bbc-eth-eri-2025"),
        I("In Somalia, AFRICOM ran 124 strikes in 2025 against ISIS-Somalia and al-Shabaab.","hiiraan-africom-2026","africom-isis-somalia-2025")],
 "drivers":[I("Ethiopia opened the GERD dam in Sept 2025; Egypt says it threatens its Nile water.","reuters-gerd-2025"),
        I("Landlocked Ethiopia's leaders call sea access existential.","bbc-eth-eri-2025")],
 "money":[I("China financed and built the Addis Ababa-Djibouti railway and runs its first overseas military base in Djibouti.","aiddata-addis-djib","reuters-djib-base-2017")],
 "case":[I("Ethiopia: GERD is a development project and sea access a peaceful goal.","reuters-gerd-2025","reuters-eth-eri-2025"),
        I("Eritrea: Ethiopia's push is irredentism and a red line.","bbc-eth-eri-2025"),
        I("Egypt: the dam was filled without a binding agreement.","reuters-gerd-2025")]},
"coastal-wa":{
 "who":[I("JNIM has spread from the Sahel into northern Benin and Togo; Benin said 54 soldiers died in an April 2025 attack.","reuters-benin-54-2025")],
 "drivers":[I("Artisanal gold reached 39% of Ghana's output in 2024.","ecofin-ghana-asm-2025"),
        I("Lekki port in Nigeria (CHEC 52.5%) and Côte d'Ivoire's Baleine field anchor coastal investment.","pti-lekki-2023","eni-baleine")],
 "money":[I("The UAE imported 52 t of gold from Togo in 2024, a country that produces almost none.","swissaid-uae-2025")],
 "case":[I("Benin's government at first said eight soldiers died, then acknowledged 54.","reuters-benin-54-2025")]},
"southern":{
 "who":[I("An Islamic State-linked insurgency in Cabo Delgado is fought by Mozambique's army and over 4,000 Rwandan troops.","acled-rwanda-moz-2025","club-moz-rwanda-2025")],
 "drivers":[I("TotalEnergies' $20bn Mozambique LNG project lifted force majeure in Oct 2025.","reuters-mozlng-2025"),
        I("Zimbabwe's artisanal miners produce most of its gold, bought by the state's Fidelity refinery.","herald-zim-asm-2025","fgr-2024")],
 "money":[I("The EU funded the Rwandan deployment through the European Peace Facility.","club-moz-rwanda-2025"),
        I("Chinese firms bought Zimbabwe's Arcadia and Bikita lithium mines.","reuters-huayou-arcadia-2021","yicai-sinomine-2022")],
 "case":[I("Mozambique says the Rwandan troops are rotations under a bilateral agreement, not an escalation.","club-moz-rwanda-2025"),
        I("ACLED notes Rwanda's counter-insurgency record but limits to civilian protection.","acled-rwanda-moz-2025")]},
"north":{
 "who":[I("Libya is split between Tripoli and Haftar's eastern LNA, which hosts Russian Africa Corps logistics at al-Khadim airbase.","eia-libya","rfi-alkhadim-2025")],
 "drivers":[I("Oil revenue is split between rival authorities; the east shut fields in Aug 2024.","eia-libya"),
        I("Algeria supplies gas to Europe via Medgaz and approved sending troops to Niger in Oct 2026.","medgaz-faq","lemonde-alg-niger-2026")],
 "money":[I("The UAE imported 27 t of gold from Egypt and 9 t from Libya in 2024.","swissaid-uae-2025")],
 "case":[]},
}
SANKEY={"gold":[
 ("Sudan","UAE",29,"2024","swissaid-uae-2025"),("Chad","UAE",18,"2024","swissaid-uae-2025"),("Libya","UAE",9,"2024","swissaid-uae-2025"),
 ("Egypt","UAE",27,"2024","swissaid-uae-2025"),("Uganda","UAE",31,"2024","swissaid-uae-2025"),("Rwanda","UAE",19,"2024","swissaid-uae-2025"),
 ("Togo","UAE",52,"2024","swissaid-uae-2025"),("Russia","UAE",66,"2024","swissaid-uae-2025"),("UAE","Switzerland",316,"Jan-Sep 2025","swissaid-uae-2025")],
 "battery":[("DRC (Rubaya, M23-held)","Rwanda",150,"2024 (coltan, at least)","un-drc-s2024-969"),("DRC","China",628191,"2024 (cobalt intermediates, gross t)","wits-cobalt-2024")]}
def merge(B):
    have={s["id"] for s in B["sources"]}
    for i,t,p,d,u in SRC:
        if i not in have: B["sources"].append({"id":i,"title":t,"publisher":p,"date":d,"url":u,"type":"secondary"})
    B["explainers"]=EX
    B["sankey"]={k:[{"from":a,"to":b,"t":v,"year":y,"cite":c} for a,b,v,y,c in L] for k,L in SANKEY.items()}
    return B
if __name__=="__main__":
    p="site/data/brief.json";B=json.load(open(p));json.dump(merge(B),open(p,"w"),ensure_ascii=False,indent=1);print("ok",len(B["sources"]))
