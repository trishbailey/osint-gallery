"""Inputs for the Foreign recruits maps (data/foreign.json). Two different measures, never mixed:
  cum   = cumulative people counted by Ukraine (filled red circle): Central Asia, identified contract signers to 1 Oct 2026; Belarus, citizens fighting
          for Russia as of 20 May 2026; Africa, people recruited from 37 countries to Aug 2026 (one combined figure, no split by country).
  y2026 = contracts signed from January to September 2026 ONLY (dashed gold ring). Not a total; each country's earlier years are not counted here.
Every value has a verbatim quote saved in data/raw/quotes/. Circle AREA is proportional to people (r = k * sqrt(n), linear in area), one k for every map."""
from recruit_inputs import part, CA_PARTS
_LP = "liga_pow"; _LD = "2026-10-19"
_LS = "Ukraine's Coordination Headquarters, via LIGA.net, 19 Oct 2026"
def y26(pid, name, value, quote, prev, lon_lat_map, src=_LP, figs=None, date=_LD, srcname=_LS):
    return dict(id=pid, name=name, kind="y2026", value=value, prev=prev, map=lon_lat_map,
                parts=[part(src, quote, figs or [f"{value:,}"] + ([f"{prev:,}"] if prev else []), value, f"{name} {value:,} ({srcname})", date)])
ITEMS = [
 dict(id="uzbekistan", name="Uzbekistan", kind="cum", value=8207, map="central", parts=[CA_PARTS[0]]),
 dict(id="tajikistan", name="Tajikistan", kind="cum", value=5308, map="central", parts=[CA_PARTS[1]]),
 dict(id="kazakhstan", name="Kazakhstan", kind="cum", value=3819, map="central", parts=[CA_PARTS[2]]),
 dict(id="kyrgyzstan", name="Kyrgyzstan", kind="cum", value=2219, map="central", parts=[CA_PARTS[3]]),
 dict(id="turkmenistan", name="Turkmenistan", kind="cum", value=884, map="central", parts=[CA_PARTS[4]]),
 dict(id="belarus", name="Belarus", kind="cum", value=2871, map="belarus",
      parts=[part("nashaniva_by", "as of May 20, 2026, 2871 citizens of Belarus were fighting on the side of Russia. It is reported that 440 of them have already been killed.", ["2871", "440"], 2871,
                  "Belarus 2,871 (the Ukrainian side, as of 20 May 2026, via Nasha Niva)", "2026-05-20")],
      extra=[part(_LP, "the highest number of contracts in 2026 were signed by citizens of Belarus (1,862), Colombia (1,449), and Yemen (772)", ["1,862"], 1862,
                  "Belarus alone signed 1,862 new contracts from January to September 2026 (LIGA.net, 19 Oct 2026), a newer and different count", _LD)]),
 dict(id="africa", name="Africa, 37 countries combined", kind="agg", value=2982, map="africa",
      parts=[part("pravda_africa", "at least 2,982 individuals from 37 African countries have been recruited into Russia's armed forces. Of them, 486 are known to have been killed.", ["2,982", "486"], 2982,
                  "Africa 2,982 from 37 countries (Ukraine's Foreign Ministry, via Ukrainska Pravda, 16 Aug 2026)", "2026-08-16")]),
 y26("yemen", "Yemen", 772, "Yemen \u2013 from 136 to 772", 136, "africa"),
 y26("burundi", "Burundi", 699, "Burundi \u2013 from 30 to 699", 30, "africa"),
 y26("zimbabwe", "Zimbabwe", 530, "In just the first nine months of 2026, 1,449 citizens of Colombia, 699 from Burundi, 530 from Zimbabwe, and 503 from Peru signed contracts with the Russian Armed Forces", None, "africa", src="liga_foreign", figs=["530"]),
 y26("sierraleone", "Sierra Leone", 225, "Sierra Leone \u2013 from 9 to 225", 9, "africa"),
 y26("sudan", "Sudan", 223, "Sudan \u2013 from 74 to 223", 74, "africa"),
 y26("colombia", "Colombia", 1449, "Colombia \u2013 from 427 to 1,449", 427, "latam"),
 y26("peru", "Peru", 503, "Peru \u2013 from 18 to 503", 18, "latam"),
 y26("indonesia", "Indonesia", 283, "Indonesia \u2013 from eight in 2025 to 283 in the first nine months of 2026", 8, "seasia", figs=["283"]),
]
# map position (lon, lat): the Natural Earth label point of the country (audited against data/world110.json); Africa's circle sits in the Atlantic with a leader to AFRICA_TARGET.
WORLD_NAME = {"uzbekistan": "Uzbekistan", "tajikistan": "Tajikistan", "kazakhstan": "Kazakhstan", "kyrgyzstan": "Kyrgyzstan", "turkmenistan": "Turkmenistan", "belarus": "Belarus", "yemen": "Yemen",
              "burundi": "Burundi", "zimbabwe": "Zimbabwe", "sierraleone": "Sierra Leone", "sudan": "Sudan", "colombia": "Colombia", "peru": "Peru", "indonesia": "Indonesia"}
AFRICA_LL = [-8.0, -9.0]; AFRICA_TARGET = [14.0, -8.0]
VMAX = max(i["value"] for i in ITEMS if i["kind"] == "cum")
RK, RK_PH = 0.5, 0.33      # radius in px = RK * sqrt(people): Uzbekistan 8,207 is 45 px wide on desktop (30 px on a phone)
MAPS = [("central", "Central Asia: contract signers identified, cumulative to 1 Oct 2026"), ("belarus", "Belarus: citizens fighting for Russia, to 20 May 2026"),
        ("africa", "Africa and Arabia: all of Africa combined, and January to September 2026 sign-ups"), ("latam", "Latin America: January to September 2026 sign-ups"),
        ("seasia", "Southeast Asia: January to September 2026 sign-ups")]
CAVEAT = "Ukrainian figures, not independently verified."
