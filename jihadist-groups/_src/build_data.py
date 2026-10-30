"""Build ../data.json from the research files in data_in/.
Every number on the page is derived here; test_figures.py re-derives and checks them.
Run:  python3 jihadist-groups/_src/build_data.py"""
import json, re, html, pathlib, collections

ROOT = pathlib.Path(__file__).parent
D = ROOT / "data_in"
OUT = ROOT.parent / "data.json"
L = lambda n: json.load(open(D / n))

ASOF = "2026-10-30"
WINDOW = ("2026-09-30", "2026-10-30")

# ---- colours: ONE place. The page reads these from data.json. ------------------------------
FAMILY_COLORS = {"al-qaeda": "#3d9be9", "islamic-state": "#e8575a", "iran-axis": "#2fc48d", "independent": "#b78cf2"}
# Marker colour for dissolved or dormant groups: grey, allowed by the shared colour check only on elements marked data-status="defunct".
DISSOLVED_COLOR = "#9aa6b8"

FAMILIES = [
    {"id": "al-qaeda", "name": "al-Qaeda network", "blurb": "Al-Qaeda's core and the regional groups that follow it."},
    {"id": "islamic-state", "name": "Islamic State network", "blurb": "The Islamic State core, its provinces and the local groups that pledged to it."},
    {"id": "iran-axis", "name": "Iran-backed axis", "blurb": "Groups Iran funds or arms in Lebanon, Yemen, Iraq and Palestine, including the Sunni groups Hamas and Palestinian Islamic Jihad."},
    {"id": "independent", "name": "Independent and nationalist", "blurb": "Groups with their own agenda, including the Taliban and Hayat Tahrir al-Sham, which now govern their countries."},
]

LABEL = {
    "al-qaeda-core": "al-Qaeda core", "aqap": "AQAP", "aqim": "AQIM", "jnim": "JNIM", "al-shabaab": "al-Shabaab", "aqis": "AQIS",
    "imp": "Ittehad-ul-Mujahideen", "tip": "Turkistan Islamic Party", "hurras-al-din": "Hurras al-Din", "ansaru": "Ansaru", "ghuraba": "Katibat al-Ghuraba",
    "is-core": "Islamic State core", "is-syria": "Islamic State Syria", "is-iraq": "Islamic State Iraq", "iskp": "Islamic State Khorasan",
    "ispp": "Islamic State Pakistan", "iswap": "Islamic State West Africa", "issp": "Islamic State Sahel", "lakurawa": "Lakurawa",
    "iscap-adf": "Islamic State Central Africa", "is-mozambique": "Islamic State Mozambique", "is-somalia": "Islamic State Somalia",
    "is-libya": "Islamic State Libya", "is-yemen": "Islamic State Yemen", "jund-al-khilafah": "Jund al-Khilafah", "is-sinai": "Islamic State Sinai",
    "jad": "Jamaah Ansharut Daulah", "di-maute": "Maute group", "biff": "BIFF Bungos faction", "dawlah-islamiyah": "Dawlah Islamiyah",
    "hezbollah": "Hezbollah", "houthis": "Houthis", "hamas": "Hamas", "pij": "Palestinian Islamic Jihad", "kataib-hezbollah": "Kataib Hezbollah",
    "nujaba": "Nujaba", "aah": "Asaib Ahl al-Haq", "kss": "Kataib Sayyid al-Shuhada", "badr": "Badr Organization", "iri": "Islamic Resistance in Iraq",
    "taliban": "Taliban", "hts": "Hayat Tahrir al-Sham", "ttp": "Pakistani Taliban", "hgb": "Hafiz Gul Bahadur group", "let": "Lashkar-e-Taiba",
    "jem": "Jaish-e-Mohammed", "trf": "The Resistance Front", "jmm": "Jaish al-Adl coalition", "jas": "Boko Haram", "ji": "Jemaah Islamiyah",
    "mit": "East Indonesia Mujahideen", "asg": "Abu Sayyaf",
    "iran": "Iran", "fla": "Azawad Liberation Front", "syria-gov": "Syrian government", "yemen-saudi": "Yemen government and Saudi coalition",
}
REGION = {  # for the Africa count and the incident storylines
    "aqim": "africa", "jnim": "africa", "al-shabaab": "africa", "ansaru": "africa", "iswap": "africa", "issp": "africa", "lakurawa": "africa",
    "iscap-adf": "africa", "is-mozambique": "africa", "is-somalia": "africa", "is-libya": "africa", "jas": "africa", "is-sinai": "africa",
}
THEATRE = {
    "jnim": "Sahel", "issp": "Sahel", "jas": "Lake Chad Basin and Nigeria", "iswap": "Lake Chad Basin and Nigeria", "lakurawa": "Lake Chad Basin and Nigeria",
    "al-shabaab": "Horn of Africa", "is-somalia": "Horn of Africa", "iscap-adf": "Central and southern Africa", "is-mozambique": "Central and southern Africa",
    "houthis": "Levant, Iraq and the Gulf", "hezbollah": "Levant, Iraq and the Gulf", "kataib-hezbollah": "Levant, Iraq and the Gulf", "is-syria": "Levant, Iraq and the Gulf",
    "iskp": "South and Central Asia", "ttp": "South and Central Asia", "jmm": "South and Central Asia", "dawlah-islamiyah": "Southeast Asia",
}
THEATRE_ORDER = ["Sahel", "Lake Chad Basin and Nigeria", "Horn of Africa", "Central and southern Africa", "Levant, Iraq and the Gulf", "South and Central Asia", "Southeast Asia"]

# Leadership changes in the last 24 months (to 30 Oct 2026): date, kind, whether the top leader changed
CHANGES = {
    "hezbollah": ("2024-10-29", "New top leader", True), "jmm": ("2024-11-05", "Founder-leader killed", True),
    "ansaru": ("2025-07-31", "Top leaders arrested", True), "di-maute": ("2026-04-17", "Top leader killed", True),
    "is-core": ("2026-05-16", "Deputy leader killed", False), "iswap": ("2026-05-16", "Senior figure killed", False),
    "biff": ("2026-07-05", "Top leader killed", True), "hamas": ("2026-07-20", "New top leader", True),
    "al-shabaab": ("2026-02-01", "Finance chiefs killed", False),
}
CHANGE_TEXT = {  # one clean sentence per change
    "hezbollah": "Naim Qassem became leader on 29 October 2024.",
    "jmm": "Founder-leader Salahuddin Farooqui was killed on 5 November 2024 in a joint Iran and Pakistan operation, and no successor is publicly named.",
    "ansaru": "The emir, Mahmud Usman, and his deputy were arrested between May and July 2025 and sentenced to life on 20 July 2026. No successor is publicly named.",
    "di-maute": "Leader Amerol Mangoranca and nine others were killed at Marantao, Lanao del Sur, on 17 April 2026.",
    "is-core": "Deputy leader Abu Bakr al-Mainuki, who also ran the group's provinces, was killed in Borno State, Nigeria, on 16 May 2026.",
    "iswap": "Abu Bakr al-Mainuki, the Islamic State figure tied to this province, was killed in Borno State on 16 May 2026.",
    "biff": "Leader Esmael Abubakar was killed in Sultan Kudarat, Maguindanao del Norte, on 5 July 2026.",
    "hamas": "Khalil al-Hayya was elected head of the political bureau on 20 July 2026, succeeding Yahya Sinwar.",
    "al-shabaab": "Its financial chief, Abdullahi Wadaad, was killed in January 2026 and his named replacement, Abu Usaama, in February 2026. Leader Ahmed Diriye is unchanged.",
}
NOTE_FIX = {
    "hamas": "A Sunni group that Iran backs. It sits in this family because Iran funds and arms it, not because of sect.",
    "pij": "A Sunni group that Iran backs, placed with Hamas.",
    "jad": "Islamic State-aligned. In May 2026 Indonesian counter-terrorism police (Densus 88) arrested eight suspected members. The UN says Islamic State-linked capacity in Southeast Asia declined.",
    "biff": "Islamic State-aligned faction of the Bangsamoro Islamic Freedom Fighters.",
    "di-maute": "Islamic State-aligned. Part of the Dawlah Islamiyah network in the southern Philippines.",
    "iri": "Shown as a link only. It is a label that Iraqi factions use for joint attacks and is not counted as a group.",
    "dawlah-islamiyah": "Umbrella label for Islamic State-aligned groups in the southern Philippines, shown as a link only. On 16 October 2026 a sub-leader was killed at Sultan Mastura, Maguindanao del Norte, and the report does not name the faction.",
}
LEADER_TEXT = {  # where the research file has no leader
    "ji": "None: the group announced its own dissolution", "mit": "None: the last fugitive was killed in 2022", "asg": "None: no structured group remains",
    "hurras-al-din": "None named", "is-sinai": "None named", "iri": "Not applicable: a label for joint attacks", "dawlah-islamiyah": "Not applicable: an umbrella label",
}

SUP = lambda n: f'<a href="#src-{n}" class="fnl" data-src="{n}">{n}</a>'

class Sources:
    def __init__(self):
        self.order = []; self.idx = {}
    def n(self, u):
        if u not in self.idx:
            self.order.append(u); self.idx[u] = len(self.order)
        return self.idx[u]
S = Sources()
DEAD = set()
titles = json.load(open(D / "source_titles.json")) if (D / "source_titles.json").exists() else {}
def alive(u):
    return u and titles.get(u, {}).get("status") not in ("404", "410")

def notes(urls):
    urls = [u for u in dict.fromkeys(urls or []) if alive(u)]
    if not urls: return ""
    return '<sup class="fn">' + ",".join(SUP(S.n(u)) for u in urls) + "</sup>"

def wn(text, urls=None):
    """Escape text; bind the last word and the notes together so a note never wraps alone."""
    t = html.escape(text.strip(), quote=False)
    nt = notes(urls)
    if not nt: return t
    m = re.search(r"(\S+)$", t)
    return t[:m.start()] + f'<span class="nw">{m.group(1)}{nt}</span>'

# ------------------------------------------------------------------------------------------
G = L("groups.json"); R = L("relations.json"); I = L("incidents.json"); M = {m["id"]: m for m in L("momentum.json")}
IM = {i["group"]: i for i in L("images.json")["images"]}
by = {g["id"]: g for g in G}
IMGDIR = ROOT.parent / "img"

def clean_leader(g):
    l = g["leader"]; name = l.get("name")
    if not name: name = LEADER_TEXT.get(g["id"], "None named")
    since = l.get("since"); sc = l.get("since_confidence")
    if since and ("not verified" in since or "not known" in since or "not formally" in since): since = None
    return {"name": name, "named": bool(l.get("name")), "since": since, "since_conf": sc if since else None, "conf": l.get("confidence"),
            "note": l.get("note"), "src": l.get("source")}

groups = []
for g in G:
    gid = g["id"]
    ch = CHANGES.get(gid)
    st = g.get("strength")
    strength = None
    if st:
        est = st.get("estimates") or [{"range": st["range"], "source_name": st.get("attribution"), "url": st.get("source")}]
        strength = {"estimates": [{"range": e["range"], "source": e["source_name"], "note": notes([e["url"]]) if e.get("url") else ""} for e in est],
                    "conf": st.get("confidence"), "contested": len(est) > 1}
    cl = clean_leader(g)
    facts = NOTE_FIX.get(gid, g.get("notes") or "")
    facts = re.sub(r"\bUN para [0-9–]+: ?", "", facts)
    img = None
    if gid in IM and list(IMGDIR.glob(gid + ".*")):
        im = IM[gid]; img = {"file": "img/" + list(IMGDIR.glob(gid + ".*"))[0].name, "kind": im["kind"], "title": im["title"].replace("File:", "")}
    mo = M.get(gid)
    state_label = {"active": "Active", "governing": "Now governing", "dormant": "Dissolved or dormant", "umbrella": "Label only"}[g["state"]]
    groups.append({
        "id": gid, "label": LABEL.get(gid, g["name"]), "name": g["name"], "aliases": g.get("aliases", []),
        "family": g["family_id"], "state": g["state"], "state_label": state_label, "counted": g["counted"], "kind": g["kind"],
        "status": g["status"], "region": REGION.get(gid, "other"),
        "countries": sorted({re.sub(r"\s*\(.*?\)", "", c).strip() for c in g.get("countries", [])}),
        "areas": g.get("areas"), "lat": g["base_lat"], "lon": g["base_lon"],
        "leader": cl,
        "leader_html": wn(cl["name"], [cl["src"]] if cl["src"] else []),
        "change": ({"date": ch[0], "kind": ch[1], "top": ch[2], "html": wn(CHANGE_TEXT[gid], [u for u in g["sources"][:2]])} if ch else None),
        "strength": strength,
        "contested": [{"field": c["field"], "conf": c["confidence"], "reason": c["reason"]} for c in g.get("contested_fields", [])],
        "facts_html": wn(facts, g["sources"][:3]) if facts else "",
        "sources": [S.n(u) for u in g["sources"] if alive(u)],
        "img": img,
        "momentum": ({"trend": mo["trend"], "html": wn(mo["reason"], mo["sources"]), "conf": mo["confidence"]} if mo else None),
    })
gidx = {g["id"]: g for g in groups}

# relations
EXT = R["external_nodes"]
rels = []
for r in R["relations"]:
    rels.append({"source": r["source"], "target": r["target"], "type": r["type"], "basis": r["basis"], "conf": r["confidence"],
                 "html": wn(r["description"] + (" " + r["note"] if r.get("note") else ""), [r["url"]])})
ext_nodes = [{"id": e["id"], "label": LABEL[e["id"]], "name": e["name"], "kind": e["kind"]} for e in EXT]

# incidents
incs = []
for k, x in enumerate(sorted(I["incidents"], key=lambda x: (x["date"], x["group"]))):
    g = gidx[x["group"]]
    desc = x["description"] + (" " + x["note"] if x.get("note") else "")
    incs.append({"id": f"i{k+1}", "group": x["group"], "family": g["family"], "date": x["date"], "date_precision": x["date_precision"],
                 "place": x["place"], "lat": x["lat"], "lon": x["lon"], "conf": x["confidence"],
                 "theatre": THEATRE.get(x["group"], "Other"), "html": wn(desc, [x["url"]] + x.get("urls_extra", []))})

# ---- numbers --------------------------------------------------------------------------------
counted = [g for g in groups if g["counted"]]
fam_counts = {f["id"]: sum(1 for g in counted if g["family"] == f["id"]) for f in FAMILIES}
countries = sorted({c for g in counted for c in g["countries"]})
momentum_counts = collections.Counter(g["momentum"]["trend"] for g in counted if g["momentum"])
africa_n = sum(1 for g in counted if g["region"] == "africa")
top_changes = sorted([g["id"] for g in groups if g["change"] and g["change"]["top"]])
kpis = [
    {"id": "groups", "value": len(counted), "label": "groups tracked in four families"},
    {"id": "countries", "value": len(countries), "label": "countries where they operate"},
    {"id": "africa", "value": africa_n, "label": "of those groups are based in Africa"},
    {"id": "changes", "value": len(top_changes), "label": "top leaders replaced or removed in 24 months"},
    {"id": "incidents", "value": len(incs), "label": "major incidents in the last 30 days"},
]

# ---- text blocks --------------------------------------------------------------------------------
AC = "https://africacenter.org/spotlight/en-2026b-mig-10yr/"
UN = "https://docs.un.org/en/S/2026/651"
SOUFAN = "https://thesoufancenter.org/intelbrief-2026-october-28/"
def inc_url(group, place_has):
    for x in I["incidents"]:
        if x["group"] == group and place_has in x["place"]: return x["url"]
    raise KeyError((group, place_has))

content = {}
content["intro"] = (f"This page profiles {len(counted)} jihadist groups in four families: who leads each one, where it operates, how the groups link to each other, "
    "and what happened in the last 30 days. Hover or tap any marker, node or card for the detail. Superscript numbers open the sources at the bottom. "
    "Contested facts carry a confidence level and a reason. Descriptive analysis only.")
content["finding"] = (
    f"Africa is now the centre of gravity of the movement. Militant Islamist groups caused 23,872 deaths in Africa in the 12 months to mid-2026, 42% of them in the Sahel, "
    f"and {africa_n} of the {len(counted)} groups tracked here are based on the continent.")
content["finding_html"] = wn(content["finding"], [AC])
content["bars_title"] = "Deaths linked to militant Islamist groups in Africa, 12 months to mid-2026"
content["bars"] = [
    {"name": "Sahel", "value": 9928, "text": "9,928 (42%)", "note": "Burkina Faso, Mali and Niger. JNIM accounts for 76% of the deaths and the Islamic State Sahel Province for 19% (1,842 deaths)."},
    {"name": "Lake Chad Basin", "value": 6643, "text": "6,643 (28%)", "note": "Mainly north-eastern Nigeria. Deaths rose 60% in a year."},
    {"name": "Somalia", "value": 6700, "text": "about 6,700 (28%)", "note": "Derived: 28% of the 23,872 total. 95% of Somalia's deaths are tied to al-Shabaab."},
    {"name": "Mozambique", "value": 539, "text": "539 (2%)", "note": "Up 58% in a year, from 341 to 539."},
    {"name": "North Africa", "value": 31, "text": "31 (under 1%)", "note": "The only region with a sustained fall, from more than 3,700 in 2016."},
]
content["bars_html"] = notes([AC])
content["takeaway_title"] = "Takeaway"
T = []
T.append(("Africa is the main arena for both al-Qaeda and the Islamic State.",
          "Africa Center counts 23,872 deaths in Africa in the 12 months to mid-2026, a record, and the UN Monitoring Team describes both movements gaining ground on the continent.", [AC, UN]))
T.append(("JNIM is the largest group in the movement, and it still concedes ground at times.",
          "It has 7,000 to 8,000 members and keeps Bamako short of fuel, yet Mali's army, backed by Russia's Africa Corps, retook Kidal on 6 October.",
          [UN, inc_url("jnim", "Bamako"), inc_url("jnim", "Kidal")]))
T.append(("The Islamic State's strength lies in its African provinces, not its core.",
          "Islamic State West Africa was linked to 3,520 deaths in the past year and the Sahel province to 1,842, while the core lost its deputy leader in May 2026 and keeps up to 3,000 fighters, mostly in Syria.",
          [AC, UN]))
T.append(("Al-Qaeda's centre is marginal and its energy sits in two affiliates.",
          "The UN says its senior leadership is marginalised and faces declining relevance. AQAP has about 2,000 fighters and is reported to work with the Houthis, and al-Shabaab trains with the Houthis, as reported.",
          [UN]))
T.append(("The Iran-backed axis is fighting on several fronts at once.",
          "The Houthis hit Riyadh's airport on 10 October, killing 12 people, struck Aden's airport on 28 October and are tightening their siege of Taiz. Israeli strikes continue in southern Lebanon despite the June ceasefire framework. Iraqi factions keep their weapons after US troops left on 1 October, and Hamas has a new leader, Khalil al-Hayya, since 20 July.",
          [inc_url("houthis", "Riyadh"), inc_url("houthis", "Aden"), inc_url("houthis", "Jabal Sabr"), inc_url("hezbollah", "Lebanon"), inc_url("kataib-hezbollah", "Baghdad"), "https://www.thenationalnews.com/news/mena/2026/07/23/new-hamas-leader-elected-by-narrowest-of-margins-with-gazas-backing/"]))
T.append(("In South Asia the Taliban shelter the Pakistani Taliban and fight the Islamic State.",
          "The UN reports that the Taliban give the Pakistani Taliban greater freedom of movement, while the Islamic State Khorasan Province is the Taliban's greatest threat, and border clashes with Pakistan continue.",
          [UN, inc_url("ttp", "Kurram")]))
T.append(("Southeast Asia's old groups are gone.",
          "Jemaah Islamiyah dissolved in June 2024, the East Indonesia Mujahideen is declared eradicated, Abu Sayyaf is under 100 remnants, and the leaders of the Maute group and the BIFF Bungos faction were killed in April and July 2026.",
          [by["ji"]["sources"][0], by["asg"]["sources"][0], by["di-maute"]["sources"][0], by["biff"]["sources"][0]]))
content["takeaway"] = [{"lead": a, "html": wn(b, c)} for a, b, c in T]

BOTTOM = {
    "Sahel": ("JNIM and the Islamic State Sahel Province fight each other as well as the army, and JNIM claims two Burkina Faso army posts in one day.", [SOUFAN, inc_url("jnim", "Kidal"), inc_url("jnim", "Bilanga")]),
    "Lake Chad Basin and Nigeria": ("Suspected Islamic State West Africa fighters overran an army base, Boko Haram killed farmers, Lakurawa attacked troops in Kebbi, and the army says air strikes killed two Islamic State West Africa commanders.", [inc_url("iswap", "Mairari"), inc_url("jas", "Marte"), inc_url("lakurawa", "Maiyama"), inc_url("iswap", "Kerenoa")]),
    "Horn of Africa": ("Al-Shabaab ambushed Somali troops while Puntland forces pushed Islamic State Somalia in the Cal Miskaad mountains.", [inc_url("al-shabaab", "Jameeca"), inc_url("is-somalia", "Cal Miskaad")]),
    "Central and southern Africa": ("Islamic State-linked fighters keep attacking civilians in Ituri and Cabo Delgado.", [inc_url("iscap-adf", "Mambasa"), inc_url("is-mozambique", "Nangade")]),
    "Levant, Iraq and the Gulf": ("Houthi missiles struck the airports of Riyadh and Aden, Houthi forces advanced on the mountain above Taiz, Israeli strikes continue in southern Lebanon, and Jordan struck alleged Islamic State hideouts in Syria.", [inc_url("houthis", "Riyadh"), inc_url("houthis", "Aden"), inc_url("houthis", "Jabal Sabr"), inc_url("hezbollah", "Lebanon"), inc_url("is-syria", "Daraa")]),
    "South and Central Asia": ("Cross-border and insurgent attacks continue from Pakistan to Iran.", [inc_url("ttp", "Kurram"), inc_url("jmm", "Rask")]),
    "Southeast Asia": ("Philippine forces keep killing Dawlah Islamiyah leaders.", [inc_url("dawlah-islamiyah", "Sultan Mastura")]),
}
content["storylines"] = [{"theatre": t, "bottom": wn(BOTTOM[t][0], BOTTOM[t][1]), "incidents": [x["id"] for x in incs if x["theatre"] == t]} for t in THEATRE_ORDER]
assert all(s["incidents"] for s in content["storylines"]), "empty storyline"
assert sum(len(s["incidents"]) for s in content["storylines"]) == len(incs), "incident without a storyline"

content["confidence_note"] = ("Confidence is high when two independent sources agree or the UN Monitoring Team states it, medium when one reliable source reports it, and low when it rests on a single "
    "government, group or analyst claim. A link is documented when an official or UN record states it and reported when a news or analyst source says so.")
content["gaps"] = ("Not yet covered: Ajnad Bayt al-Maqdis, Ansar al-Tawhid, Hizbul Mujahideen, Central Asian groups, Lebanese Sunni groups, other Palestinian factions and Iran's Afghan and Pakistani Shia brigades. "
    "No credible strength estimate exists for Hezbollah, al-Shabaab, the Islamic State Khorasan Province, the Pakistani Taliban, Lashkar-e-Taiba, Jaish-e-Mohammed or the Iraqi factions, so none is shown. "
    "Map positions are the approximate centre of each group's operating area, not a headquarters.")

# image credits
credits = []
for gid, im in IM.items():
    if gidx.get(gid, {}).get("img"):
        credits.append({"group": gid, "label": gidx[gid]["label"], "title": im["title"].replace("File:", ""), "author": im["author"], "license": im["license"],
                        "license_url": im["license_url"], "page": im["page_url"], "kind": im["kind"]})
credits.sort(key=lambda c: c["label"])

# source list
srcs = []
for i, u in enumerate(S.order, 1):
    t = titles.get(u, {}).get("title")
    dom = re.sub(r"^www\.", "", re.sub(r"^https?://", "", u).split("/")[0])
    srcs.append({"n": i, "url": u, "title": (t[:140] if t and len(t) > 6 else None), "domain": dom, "status": titles.get(u, {}).get("status")})

out = {"asof": ASOF, "window": list(WINDOW), "families": [{**f, "color": FAMILY_COLORS[f["id"]], "count": fam_counts[f["id"]]} for f in FAMILIES],
       "dissolved_color": DISSOLVED_COLOR, "groups": groups, "relations": rels, "external": ext_nodes, "incidents": incs, "kpis": kpis,
       "momentum_counts": dict(momentum_counts), "content": content, "sources": srcs, "image_credits": credits,
       "relation_types": ["rivalry/fighting", "cooperation", "funding or arms", "split from / affiliate of"]}
json.dump(out, open(OUT, "w"), ensure_ascii=False, separators=(",", ":"))
print("groups", len(groups), "counted", len(counted), fam_counts, "countries", len(countries), "africa", africa_n, "incidents", len(incs), "sources", len(srcs), "top changes", top_changes)
