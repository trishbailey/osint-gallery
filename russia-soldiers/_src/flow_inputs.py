"""Inputs for the 'Where the soldiers came from' flow map. Width measure: named dead (people on the Mediazona and BBC named list).
Russian districts: sums of regions.json (Mediazona regional pages, 23 Oct 2026) by how the man joined. Foreign countries: BBC News Russian with
Mediazona, 10 Jul 2026. Anything without a sourced count is not drawn (see SKIPPED)."""
TYPES = {"vol": ("Volunteers and contract soldiers", "#e43d3c"), "mob": ("Mobilised", "#2ec4b6"), "pri": ("Prisoners, incl. Wagner and Storm-Z", "#e8c547"),
         "for": ("Foreign nationals, incl. North Korea", "#4f9dff")}
# lon/lat of capitals (public geography); counts are verbatim in data/raw/quotes/bbc_foreign.txt
FOREIGN = [
 dict(id="PRK", name="North Korea", ll=[125.75, 39.02], n=2304, quote="North Korea 2,304", dest="kursk", note="Identified by BBC News Korean from a memorial in Pyongyang; they were killed in Russia's Kursk region, and the BBC reports none fought on Ukrainian soil"),
 dict(id="UZB", name="Uzbekistan", ll=[69.24, 41.30], n=229, quote="Uzbekistan 229", dest="front", note="More than half of the Uzbek and Tajik dead went to the front from Russian prisons"),
 dict(id="TJK", name="Tajikistan", ll=[68.78, 38.56], n=199, quote="Tajikistan 199", dest="front", note="More than half of the Uzbek and Tajik dead went to the front from Russian prisons"),
 dict(id="GEO", name="Georgia", ll=[44.80, 41.72], n=189, quote="Georgia 189", dest="front", note="Includes the breakaway regions of Abkhazia and South Ossetia"),
 dict(id="AZE", name="Azerbaijan", ll=[49.87, 40.41], n=108, quote="Azerbaijan 108", dest="front", note=""),
]
FRONT = dict(ll=[37.6, 48.4], name="Front in Ukraine (east and south)")
KURSK = dict(ll=[36.19, 51.73], name="Kursk region")
SKIPPED = ("Other foreign countries (Nepal, Cuba, India, Serbia and 30 more) are not drawn: the BBC article gives their combined total (1,285 verified by BBC News Russian, "
           "with the five countries above counted inside the 3,589) but no per-country counts in its text, and counts found elsewhere were not checked against the BBC data. "
           "Mobilised men and prisoners are drawn only where the Mediazona regional page gives a count. 'Other' labels (arm of service, no data) are not drawn.")
