"""One-time migration of the phase-1 research files in data_in/ to Trish's decisions (28 Oct 2026).
Run once; it is idempotent. Edits data_in/*.json in place."""
import json, pathlib
D = pathlib.Path(__file__).parent / "data_in"
L = lambda n: json.load(open(D / n))
def S(n, o): json.dump(o, open(D / n, "w"), indent=1, ensure_ascii=False)

G = L("groups.json"); R = L("relations.json"); I = L("incidents.json"); M = L("momentum.json")
by = {g["id"]: g for g in G}

FAM = {"al-Qaeda network": "al-qaeda", "Islamic State network": "islamic-state",
       "Iran-backed Shia axis": "iran-axis", "Iran-backed axis": "iran-axis",
       "Independent / nationalist": "independent", "Independent and nationalist": "independent"}
NAMES = {"al-qaeda": "al-Qaeda network", "islamic-state": "Islamic State network",
         "iran-axis": "Iran-backed axis", "independent": "Independent and nationalist"}

# decision 3: Southeast Asian IS-pledged groups move to the Islamic State network
for i in ("jad", "di-maute", "biff", "dawlah-islamiyah"):
    by[i]["family"] = "Islamic State network"

# additions confirmed by live sources on 28 Oct 2026
def add(g):
    if g["id"] not in by:
        G.append(g); by[g["id"]] = g
base = {"aliases": [], "contested_fields": [], "coords_note": "Approximate centre of the main operating area, assigned by the researcher; not a headquarters.",
        "kind": "group", "in_main": True, "leadership_change_last_24_months": None, "strength": None, "notes": ""}
add({**base, "id": "jmm", "name": "Jaish al-Adl and the People's Fighters Front (Army of Justice, Baluch coalition)",
     "aliases": ["Jaish al-Adl", "People's Fighters Front", "Jebhe-ye Mobarezin-e Mardomi (JMM)"], "family": "Independent / nationalist",
     "status": "active (fighting under a four-group coalition formed December 2025)", "countries": ["Iran", "Pakistan (sanctuary, reported)"],
     "areas": "Sistan and Baluchestan province, Iran", "base_lat": 27.3, "base_lon": 61.8,
     "leader": {"name": None, "since": None, "since_confidence": None, "confidence": None, "source": None,
                "note": "No successor to the founder-leader is publicly named."},
     "leadership_change_last_24_months": "5 Nov 2024: founder-leader Salahuddin Farooqui (Abdolrahim Mullahzadeh) killed in a joint Iran–Pakistan operation that also killed his deputies (analyst account; Iran and Pakistan did not publish a full account).",
     "contested_fields": [{"field": "current leadership", "confidence": "low", "reason": "No public successor; the coalition name varies between sources."}],
     "notes": "The Long War Journal counts 11 coalition-claimed attacks and 37 armed incidents in the province since January 2026. Analyst estimates of fighter numbers (100 to 600) rest on weak sources, so none is shown.",
     "sources": ["https://www.longwarjournal.org/archives/2026/10/insurgent-attacks-surge-in-southeastern-iran.php",
                 "https://www.rferl.org/a/iran-sistan-baluchistan-insurgency-jaish/33877179.html",
                 "https://www.al-monitor.com/originals/2026/09/how-new-baluch-militant-coalition-raises-pressure-iran-pakistan-border",
                 "https://talshiardi.substack.com/p/baluch-separatist-group-jaish-al"]})
add({**base, "id": "hgb", "name": "Hafiz Gul Bahadur group (Waziri Taliban faction)", "aliases": ["Hafiz Gul Bahadur network", "Asud al-Khorasan (affiliated unit)"],
     "family": "Independent / nationalist", "status": "active", "countries": ["Pakistan", "Afghanistan (sanctuary, reported by Pakistan)"],
     "areas": "North Waziristan, Bannu and Kohat, Khyber Pakhtunkhwa", "base_lat": 32.95, "base_lon": 70.1,
     "leader": {"name": "Hafiz Gul Bahadur", "since": "not verified", "since_confidence": "low", "confidence": "high",
                "source": "https://www.nytimes.com/2026/09/19/world/asia/pakistan-mosque-attack-bahadur.html", "note": "Described as one of the longest-surviving commanders in the region."},
     "contested_fields": [{"field": "role in Ittehad-ul-Mujahideen Pakistan", "confidence": "medium", "reason": "The New York Times and the South Asia Terrorism Portal say the alliance is led by this group; the UN Monitoring Team says al-Qaeda in the Indian Subcontinent formed its backbone."}],
     "notes": "The alliance it leads claimed the 18 September 2026 Kohat police-compound attack that killed at least 22 people.",
     "sources": ["https://www.nytimes.com/2026/09/19/world/asia/pakistan-mosque-attack-bahadur.html",
                 "https://www.satp.org/south-asia-intelligence-review-Volume-25-No-16",
                 "https://khyberchronicles.pk/a-new-name-after-the-miranshah-attack-who-is-aswad-al-khorasan/",
                 "https://wenewsenglish.com/afghanistan-based-terror-network-behind-bannu-suicide-attack/"]})
add({**base, "id": "ansaru", "name": "Ansaru (Jama'atu Ansarul Muslimina fi Biladis Sudan, Vanguard for the Protection of Muslims in Black Africa)",
     "aliases": ["Ansaru", "JAMBS", "Mahmuda (linked cell)"], "family": "al-Qaeda network", "status": "weakened (top leaders jailed)",
     "countries": ["Nigeria"], "areas": "Niger, Kwara and Kogi states, Kainji National Park area", "base_lat": 10.0, "base_lon": 5.3,
     "leader": {"name": None, "since": None, "since_confidence": None, "confidence": None, "source": None, "note": "No public successor to the jailed emir."},
     "leadership_change_last_24_months": "May to Jul 2025: emir Mahmud Usman (Abu Bara'a) and deputy Mahmud al-Nigeri were arrested; both received life sentences on 20 Jul 2026.",
     "contested_fields": [{"field": "al-Qaeda link", "confidence": "medium", "reason": "Nigerian prosecutors say the leaders trained with JNIM; this is the prosecution's account."}],
     "notes": "The leaders were charged over the 2022 Kuje prison break and the 2022 attack on Wawa cantonment.",
     "sources": ["https://www.channelstv.com/2026/07/20/court-jails-two-ansaru-commanders-for-life-over-terrorism/",
                 "https://www.vanguardngr.com/2026/07/two-al-qaeda-linked-terrorists-bag-life-sentences-after-pleading-guilty/",
                 "https://www.premiumtimesng.com/news/headlines/817608-the-untold-story-of-two-notorious-terrorists-captured-by-nigerian-govt.html",
                 "https://apnews.com/article/nigeria-militant-leaders-arrested-59391894574805512f870fcc0b1c6635"]})
add({**base, "id": "trf", "name": "The Resistance Front (Kashmir front for Lashkar-e-Taiba)", "aliases": ["TRF"], "family": "Independent / nationalist",
     "status": "active (small; claimed two attacks in July 2026)", "countries": ["India (Jammu and Kashmir)"], "areas": "Kashmir Valley",
     "base_lat": 33.7, "base_lon": 75.1,
     "leader": {"name": "Saifullah Sajid Jatt (named by India's National Investigation Agency as a top commander)", "since": "not verified", "since_confidence": "low", "confidence": "low",
                "source": "https://www.indiatoday.in/india/story/national-investigation-agency-chargesheet-pahalgam-terrorist-attack-pakistan-lies-involvement-links-saifullah-sajid-jatt-2914401-2026-05-20", "note": "Indian agency account; Pakistan rejects it."},
     "contested_fields": [{"field": "leader", "confidence": "low", "reason": "Single Indian-government source; Pakistan denies involvement."}],
     "notes": "The South Asia Terrorism Portal describes it as a Lashkar-e-Taiba proxy.",
     "sources": ["https://indianexpress.com/article/india/manhunt-in-valley-as-terror-attack-claims-2-trf-link-being-probed-10814018/",
                 "https://www.eurasiareview.com/04082026-india-terror-resurgence-in-jk-analysis/",
                 "https://satp.org/terrorist-profile/india-jammukashmir/the-resistance-front-trf",
                 "https://www.indiatoday.in/india/story/national-investigation-agency-chargesheet-pahalgam-terrorist-attack-pakistan-lies-involvement-links-saifullah-sajid-jatt-2914401-2026-05-20"]})
add({**base, "id": "ghuraba", "name": "Katibat al-Ghuraba al-Faransiya (Battalion of the Strangers, French-speaking fighters)", "aliases": ["Katibat al-Ghoraba al-Faransiya"],
     "family": "al-Qaeda network", "status": "active (a few dozen members)", "countries": ["Syria"], "areas": "Idlib, north-west Syria", "base_lat": 35.9, "base_lon": 36.6,
     "leader": {"name": "Oumar Diaby", "since": "not verified", "since_confidence": "low", "confidence": "medium", "source": "https://docs.un.org/en/S/2026/651", "note": "UN para 65."},
     "strength": {"range": "a few dozen members", "source": "https://docs.un.org/en/S/2026/651", "confidence": "medium", "note": "UN para 65.", "attribution": "UN Monitoring Team, 38th report"},
     "notes": "Still hostile to the Syrian government of Ahmad al-Sharaa.", "sources": ["https://docs.un.org/en/S/2026/651"]})
add({**base, "id": "is-sinai", "name": "Islamic State Sinai Province (Wilayat Sinai)", "aliases": ["Ansar Bayt al-Maqdis"], "family": "Islamic State network",
     "in_main": False, "status": "dormant (no claimed attack since 2023)", "countries": ["Egypt"], "areas": "North Sinai", "base_lat": 31.0, "base_lon": 33.8,
     "leader": {"name": None, "since": None, "since_confidence": None, "confidence": None, "source": None, "note": "No public leader."},
     "notes": "Egyptian operations, tribal militias and amnesty offers reduced it to a small remnant; the Mapping Militants Project dates the last claimed attack to December 2022 and the US State Department says it claimed none in 2024.",
     "sources": ["https://www.dni.gov/nctc/terrorist_groups/isis_sinai.html", "https://www.ecoi.net/en/document/2145054.html", "https://mappingmilitants.org/profiles/islamic-state-sinai-province"]})

# Mozambique and Somalia: both estimates are already in strength.range with attribution; also make them structured
by["is-mozambique"]["strength"]["estimates"] = [
    {"range": "400–500 fighters", "source_name": "UN Monitoring Team, 38th report", "url": "https://docs.un.org/en/S/2026/651"},
    {"range": "250–300 fighters", "source_name": "Africa Center for Strategic Studies", "url": "https://africacenter.org/spotlight/en-2026b-mig-10yr/"}]
by["is-somalia"]["strength"]["estimates"] = [
    {"range": "150–250 fighters", "source_name": "UN Monitoring Team, 38th report", "url": "https://docs.un.org/en/S/2026/651"},
    {"range": "500–600 fighters", "source_name": "Somali security and intelligence experts, quoted by VOA", "url": None}]

# state: active / governing / dormant ; counted: shown in the totals
DORMANT = {"ji", "mit", "asg", "hurras-al-din", "is-sinai"}
for g in G:
    g["family_id"] = FAM[g["family"]]; g["family"] = NAMES[g["family_id"]]
    if g["kind"] == "umbrella": g["state"] = "umbrella"
    elif g["id"] in DORMANT: g["state"] = "dormant"
    elif g["kind"] == "governing": g["state"] = "governing"
    else: g["state"] = "active"
    g["counted"] = g["state"] in ("active", "governing")
    g["in_main"] = g["counted"]
by["taliban"].update(status="now governing (Afghanistan)", notes="Governs Afghanistan since August 2021.")
by["hts"].update(status="now governing (core of the Syrian government)", notes="Its leader is Syria's president since the fall of the Assad government.")
by["hts"]["leader"]["note"] = "Syria's president; the UN removed him and the group from its Security Council list in late 2025 and February 2026."
by["hts"]["leader"]["note"] = "Leads the Syrian government."
for t in (by["ji"], by["mit"], by["asg"], by["hurras-al-din"]): pass
by["al-shabaab"]["leadership_change_last_24_months"] = by["al-shabaab"]["leadership_change_last_24_months"].replace("designated replacement", "named replacement")
for k in ("taliban", "hts", "ji", "jad", "mit", "asg", "biff", "di-maute", "dawlah-islamiyah", "hurras-al-din", "is-sinai"):
    n = by[k].get("notes") or ""
    n = n.replace(" Included as a flagged node pending Trish's decision.", "").replace("Included as a flagged node pending Trish's decision.", "")
    n = n.replace("Listed so the Southeast Asia picture is complete; excluded from the active count.", "Listed so the Southeast Asia picture is complete; not counted in the totals.")
    by[k]["notes"] = n

# relations
rel = {(r["source"], r["target"], r["type"]) for r in R["relations"]}
def addrel(**r):
    r.setdefault("note", None)
    if (r["source"], r["target"], r["type"]) not in rel: R["relations"].append(r); rel.add((r["source"], r["target"], r["type"]))
addrel(source="jmm", target="iran", type="rivalry/fighting", basis="documented", confidence="medium", url="https://www.longwarjournal.org/archives/2026/10/insurgent-attacks-surge-in-southeastern-iran.php", description="The coalition claimed five attacks on Iranian security forces in seven days in early October 2026.", note="Claims by the group; Iranian figures differ.")
addrel(source="hgb", target="imp", type="cooperation", basis="reported", confidence="medium", url="https://www.satp.org/south-asia-intelligence-review-Volume-25-No-16", description="The South Asia Terrorism Portal and the New York Times say the Hafiz Gul Bahadur group leads the alliance; the UN says al-Qaeda in the Indian Subcontinent formed its backbone.", note="Contested leadership of the alliance.")
addrel(source="hgb", target="ttp", type="cooperation", basis="reported", confidence="medium", url="https://wenewsenglish.com/afghanistan-based-terror-network-behind-bannu-suicide-attack/", description="Pakistani officials describe the group as a close ally of the Pakistani Taliban and say both plan attacks from Afghanistan.", note="Pakistani official account.")
addrel(source="ansaru", target="jnim", type="cooperation", basis="reported", confidence="medium", url="https://www.vanguardngr.com/2026/07/two-al-qaeda-linked-terrorists-bag-life-sentences-after-pleading-guilty/", description="Nigerian prosecutors say Ansaru's leaders were trained by JNIM in Mali.", note="Prosecution account in a guilty plea.")
addrel(source="ansaru", target="al-qaeda-core", type="split from / affiliate of", basis="reported", confidence="medium", url="https://www.channelstv.com/2026/07/20/court-jails-two-ansaru-commanders-for-life-over-terrorism/", description="Nigerian officials call Ansaru an al-Qaeda affiliate.")
addrel(source="trf", target="let", type="split from / affiliate of", basis="reported", confidence="medium", url="https://satp.org/terrorist-profile/india-jammukashmir/the-resistance-front-trf", description="The South Asia Terrorism Portal describes the front as a Lashkar-e-Taiba proxy.", note="India's National Investigation Agency makes the same link.")
addrel(source="ghuraba", target="syria-gov", type="rivalry/fighting", basis="documented", confidence="medium", url="https://docs.un.org/en/S/2026/651", description="The few dozen members remain hostile to the Syrian government.")
addrel(source="ghuraba", target="al-qaeda-core", type="split from / affiliate of", basis="reported", confidence="medium", url="https://docs.un.org/en/S/2026/651", description="The UN describes the battalion as al-Qaeda-aligned.")
addrel(source="is-sinai", target="is-core", type="split from / affiliate of", basis="documented", confidence="high", url="https://www.dni.gov/nctc/terrorist_groups/isis_sinai.html", description="The US National Counterterrorism Center lists it as an Islamic State branch.")
for r in R["relations"]:
    if r["source"] == "iran" and r["target"] == "iri": pass

# incidents: drop the context-only and the very small entries; add JMM
keep = []
for x in I["incidents"]:
    if x["group"] in ("hamas",) and "context" in (x.get("note") or "").lower(): continue
    keep.append(x)
I["incidents"] = keep
if not any(x["group"] == "jmm" for x in I["incidents"]):
    I["incidents"].append({"group": "jmm", "date": "2026-10-02", "date_precision": "range (2 to 8 Oct)", "place": "Rask and Iranshahr area, Sistan and Baluchestan, Iran",
        "lat": 26.9, "lon": 61.9, "confidence": "medium",
        "description": "The Baluch coalition claims five attacks on Iranian security forces in seven days, including a mine and gunfire attack on a Guards vehicle at Rudmahi that killed five.",
        "note": "Claims by the coalition; Iranian figures for losses are lower.", "url": "https://www.longwarjournal.org/archives/2026/10/insurgent-attacks-surge-in-southeastern-iran.php", "urls_extra": []})

# momentum
mm = {m["id"] for m in M}
def addm(i, t, reason, srcs, c):
    if i not in mm: M.append({"id": i, "trend": t, "reason": reason, "sources": srcs, "confidence": c})
addm("jmm", "rising", "Four Baluch groups merged in December 2025, and the coalition claimed five attacks in seven days in October 2026.", ["https://www.longwarjournal.org/archives/2026/10/insurgent-attacks-surge-in-southeastern-iran.php"], "medium")
addm("hgb", "rising", "The alliance it leads claimed the 18 September 2026 Kohat attack and a 21 February 2026 Bannu bombing.", ["https://www.satp.org/south-asia-intelligence-review-Volume-25-No-16", "https://wenewsenglish.com/afghanistan-based-terror-network-behind-bannu-suicide-attack/"], "medium")
addm("ansaru", "declining", "Its emir and deputy are in prison with life sentences since 20 July 2026.", ["https://www.channelstv.com/2026/07/20/court-jails-two-ansaru-commanders-for-life-over-terrorism/"], "medium")
addm("trf", "insufficient evidence", "It claimed two killings in July 2026, which is too few events to show a direction.", ["https://indianexpress.com/article/india/manhunt-in-valley-as-terror-attack-claims-2-trf-link-being-probed-10814018/"], "low")
addm("ghuraba", "insufficient evidence", "The UN reports only that a few dozen members remain.", ["https://docs.un.org/en/S/2026/651"], "low")
addm("is-sinai", "declining", "It has claimed no attack since 2023 and Egypt describes the area as free of attacks.", ["https://www.dni.gov/nctc/terrorist_groups/isis_sinai.html", "https://www.ecoi.net/en/document/2145054.html"], "medium")
for m in M:
    if m["id"] == "hts": m["reason"] = "Now the core of Syria's government."; m["sources"] = [s for s in m["sources"] if "sanctions" not in s] or ["https://news.un.org/en/story/2025/11/1166303"]

S("groups.json", G); S("relations.json", R); S("incidents.json", I); S("momentum.json", M)
print(len(G), sum(g["counted"] for g in G), len(R["relations"]), len(I["incidents"]), len(M))
