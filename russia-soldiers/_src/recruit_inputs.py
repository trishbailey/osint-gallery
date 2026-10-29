"""Inputs for the flow map, where arrow width = people recruited (not named dead). Every part has a source, a verbatim quote saved in
data/raw/quotes/, the figure(s) inside the quote, and the value used. A range is drawn as a solid width for the low value and a pale band to the
high value. No split of a national total by region or district is made: none is published for any recruit type."""
from pools_inputs import P
_P = {p["id"]: p for p in P}
def pool(pid, value, label, date, fig):
    p = _P[pid]; q = p["quote"]
    assert fig in p["figures"] and fig in q, (pid, fig)
    return dict(src=p["src"], quote=q, figures=[fig], value=value, label=label, date=date)
def part(src, quote, figures, value, label, date): return dict(src=src, quote=quote, figures=figures, value=value, label=label, date=date)

# --- contract soldiers and volunteers: low = one outside estimate; high = sum of the latest official claim for each period
VOL_HIGH = [
 part("ria_shoigu24", "Почти 540 тысяч человек поступили на военную службу по контракту в ВС РФ в 2023 году", ["540 тысяч"], 540000, "2023 contracts, almost 540,000 (Shoigu, 20 Feb 2024)", "2024-02-20"),
 part("tass_med25", "About 450,000 individuals signed contracts for military service", ["450,000"], 450000, "2024 contracts, about 450,000 (Medvedev, 24 Jan 2025)", "2025-01-24"),
 part("tass_med25", "another over 40,000 of our citizens joined volunteer formations", ["40,000"], 40000, "2024 volunteer formations, over 40,000 (Medvedev, 24 Jan 2025)", "2025-01-24"),
 part("interfax_med26", "Контракт о прохождении военной службы заключили 422 704 человека", ["422 704"], 422704, "2025 contracts, 422,704 (Medvedev, 16 Jan 2026)", "2026-01-16"),
 part("interfax_med26", "32 тысячи человек заключили контакт о прохождении службы на добровольных началах", ["32 тысячи"], 32000, "2025 volunteers, 32,000 (Medvedev, 16 Jan 2026)", "2026-01-16"),
 pool("contracts_h1", 200000, "first half of 2026, around 200,000 (Medvedev, reported 30 Jul 2026)", "2026-07-30", "200,000"),
]
VOL_CONTEXT = [
 part("isw_istories23", "354,400 people signed military contracts in 2023, as opposed to 540,000 claimed by the Russian MoD", ["354,400", "540,000"], 354400, "iStories budget-based estimate for 2023: 354,400", "2025-06-05"),
 part("istories_407", "407,200 people is the maximum estimate of those recruited into the army in 2024, while the minimum number of new recruits is 374,200", ["407,200", "374,200"], 407200, "iStories budget-based estimate for 2024: 374,200 to 407,200", "2025-05-30"),
]
# --- mobilised
MOB_CONTEXT = [part("meduza_318", "Putin said Friday that 318,000 people were drafted as part of Russia’s mobilization campaign", ["318,000"], 318000, "Putin, 4 Nov 2022: 318,000 drafted, volunteers included", "2022-11-04")]
# --- prisoners
PRI_LOW = [pool("wagner", 48366, "Wagner, 2022 to 2023: at least 48,366 (BBC News Russian and Mediazona, Jun 2024)", "2024-06-10", "48,366"),
           pool("stormz", 28200, "Storm Z, to Feb 2025: about 28,200 to 29,000 (iStories estimate)", "2025-02-06", "28,2 тыс")]
# --- foreign
CA = part("occrp_foreign", "Uzbekistan, Tajikistan, Kazakhstan, Kyrgyzstan and Turkmenistan together sent 11,157 recruits.", ["11,157"], 11157, "Central Asia, five states: 11,157 recruits (Ukraine's Coordination Headquarters, via OCCRP)", "2025-12-31")
CA_DEAD = part("occrp_foreign", "At least 1,399 of them have been killed", ["1,399"], 1399, "at least 1,399 of them killed (same source)", "2025-12-31")
NKP = pool("nk", 14000, "North Korea: 11,000 to 14,000 in the Kursk campaign (BBC, 14 Sep 2026)", "2026-09-14", "14,000")

NAMED_DEAD_DATE = "23 Oct 2026"
ARROWS = [
 dict(id="vol", type="vol", name="Volunteers and contract soldiers", ll=None, hub=True,
      low=1300000, high=sum(p["value"] for p in VOL_HIGH),
      low_parts=[pool("contracts_since2022", 1300000, "roughly 1.3 million contract soldiers since 2022 (War on the Rocks, 14 Jul 2026; an estimate with no method given)", "2026-07-14", "1.3 million")],
      high_parts=VOL_HIGH, context=VOL_CONTEXT, period="2023 to first half of 2026 (no 2022 figure is counted in the high value)",
      status="Official claims add to the high end; independent budget-based estimates are 10 to 34% lower than the official figure for the same year (2023: 354,400 against 540,000; 2024: 374,200 to 407,200 against about 450,000).", dead_key="vol"),
 dict(id="mob", type="mob", name="Mobilised men", ll=None, hub=True, low=300000, high=527703,
      low_parts=[pool("mobilised", 300000, "300,000 called up in the partial mobilisation (Defence Minister to the President, 28 Oct 2022)", "2022-10-28", "300,000")],
      high_parts=[part("dw_mz527", "оценила число призванных в сентябре-октябре 2022 года россиян в 527 703 человека", ["527 703"], 527703, "at least 527,703 (Mediazona estimate from accelerated marriages, 2 Mar 2023)", "2023-03-02")],
      context=MOB_CONTEXT, period="September to October 2022 (one wave; no later call-up is counted)",
      status="Mediazona calls its figure a minimum; the Kremlin has not accepted it.", dead_key="mob"),
 dict(id="pri", type="pri", name="Prisoners, incl. Wagner and Storm Z", ll=None, hub=True, low=76566, high=180000,
      low_parts=PRI_LOW,
      high_parts=[pool("szru", 180000, "up to 180,000 by Nov 2024 (Ukraine's Foreign Intelligence Service; unverified)", "2025-01-03", "180,000")],
      context=[], period="2022 to 2025",
      status="The low value adds two separate counts; the high value is a claim by one side and could not be checked.", dead_key="pri"),
 dict(id="ca", type="for", name="Central Asia (five states)", ll=[66.9, 41.3], hub=False, low=11157, high=11157,
      low_parts=[CA], high_parts=[CA], context=[CA_DEAD], period="to late 2025 (OCCRP report)",
      status="Ukrainian figures that OCCRP could not check independently.", dead_key=None),
 dict(id="prk", type="for", name="North Korea", ll=[125.75, 39.02], hub=False, low=11000, high=14000,
      low_parts=[pool("nk", 11000, "between 11,000 and 14,000 fought in the Kursk campaign (BBC, 14 Sep 2026)", "2026-09-14", "11,000")],
      high_parts=[NKP], context=[], period="Kursk campaign, 2024 to 2025 (soldiers, not contract signers)",
      status="Estimate of the troops committed; the South Korean agency NIS and the BBC give a range.", dead_key=None),
]
HUB = dict(ll=[55.0, 56.2], name="Russia, all regions (schematic)")
# the width scale: w = WMIN + WSPAN * sqrt(v / VMAX); VMAX is the largest high value
WMIN, WSPAN = 4, 6
VMAX = max(a["high"] for a in ARROWS)
LEGEND_SAMPLES = [11157, 76566, 300000, 1300000]
# foreign counts that are not drawn (no single origin on the map or out of its frame), with their sources
NOT_DRAWN = [
 part("liga_foreign", "45,959 foreigners from 151 countries and unrecognized territories have fought or are currently fighting as contract soldiers in the Russian army", ["45,959", "151"], 45959, "All foreign contract signers named by Ukraine, to 1 Oct 2026: 45,959 from 151 countries", "2026-10-19"),
 part("liga_foreign", "1,449 citizens of Colombia, 699 from Burundi, 530 from Zimbabwe, and 503 from Peru signed contracts with the Russian Armed Forces", ["1,449", "699", "530", "503"], 1449, "January to September 2026: Colombia 1,449, Burundi 699, Zimbabwe 530, Peru 503", "2026-10-19"),
 part("occrp_foreign", "Of the 751 Sri Lankans recruited into the Russian military, at least 275 were killed in action", ["751"], 751, "Sri Lanka 751 (to late 2025)", "2025-12-31"),
]
# named dead (secondary measure): sums of data/regions.json by recruit type, and BBC News Russian for foreign
BAR_FOREIGN = dict(n=3589, parts=(2304, 1285), quote="3,589")

# ---------------------------------------------------------------------------------------------------------------------------------------------
# Time series: recruits in a dated period, by type. Only periods that a source states are drawn. A period with no source is a gap (never zero).
# Each point: t0..t1 = the period the source covers; low/high = the sum of its parts (equal when the figure is exact); pq = (source, text) proving
# the period inside the saved source; est = True marks an independent estimate drawn as hollow markers instead of the line.
def tp(pid, typ, t0, t1, parts, pq, low=None, high=None, what="", est=False, note=""):
    lo = sum(p["value"] for p in parts) if low is None else low
    hi = lo if high is None else high
    return dict(id=pid, type=typ, t0=t0, t1=t1, low=lo, high=hi, parts=parts, pq=pq, what=what, est=est, note=note)

_LIGA_Q = "2022 – 94 contracts; → 2023 – 4,067; → 2024 – 8,877; → 2025 – 16,085; → for the first nine months of 2026 – 16,168"
def _liga(fig, val, lab):
    return part("liga_foreign", _LIGA_Q, [fig], val, lab, "2026-10-19")
_ar = {a["id"]: a for a in ARROWS}
TS = [
 tp("vol23", "vol", "2023-01-01", "2023-12-31", [VOL_HIGH[0]], [("ria_shoigu24", "в 2023 году")], what="contracts signed in 2023, official claim"),
 tp("vol24", "vol", "2024-01-01", "2024-12-31", [VOL_HIGH[1], VOL_HIGH[2]], [("tass_med25", "in 2024")], what="contracts plus volunteer formations in 2024, official claim"),
 tp("vol25", "vol", "2025-01-01", "2025-12-31", [VOL_HIGH[3], VOL_HIGH[4]], [("interfax_med26", "В 2025 году")], what="contracts plus volunteers in 2025, official claim"),
 tp("vol26", "vol", "2026-01-01", "2026-06-30", [VOL_HIGH[5]], [("ng_bonus", "first half of 2026")], what="contracts in the first half of 2026 only, official claim", note="Half a year only: not comparable with a full year."),
 tp("est23", "vol", "2023-01-01", "2023-12-31", [VOL_CONTEXT[0]], [("isw_istories23", "in 2023")], what="contracts signed in 2023, iStories estimate from federal budget data", est=True),
 tp("est24", "vol", "2024-01-01", "2024-12-31", [VOL_CONTEXT[1]], [("istories_407", "in 2024")], low=374200, high=407200, what="contracts signed in 2024, iStories estimate from federal budget data (a range)", est=True),
 tp("mob_k", "mob", "2022-10-28", "2022-10-28", [pool("mobilised", 300000, "300,000 called up in the partial mobilisation, counted to the day it was declared complete (Defence Minister to the President, 28 Oct 2022)", "2022-10-28", "300,000")], [("kremlin", "October 28, 2022")],
    what="men called up in the Sep to Oct 2022 mobilisation, the Kremlin's count on the day the call-up was declared complete",
    note="One call-up wave, Sep to Oct 2022. This dot and the next count the same men."),
 tp("mob_m", "mob", "2023-03-02", "2023-03-02", [_ar["mob"]["high_parts"][0]], [("dw_mz527", "в четверг, 2 марта")],
    what="men called up in the same Sep to Oct 2022 mobilisation, Mediazona's later estimate from accelerated marriages (a minimum)",
    note="A later, independent estimate of the same call-up. The rise from the dot before is a higher count of the same wave, not more men called up."),
 tp("pri22", "pri", "2022-07-01", "2023-02-07", [pool("wagner", 48366, "Wagner recruited at least 48,366 prisoners, from 1 Jul 2022 to 7 Feb 2023 (Mediazona and BBC News Russian, via Meduza, 10 Jun 2024)", "2024-06-10", "48,366")],
    [("meduza_wagner", "Первая вербовка состоялась 1 июля 2022 года"), ("meduza_wagner", "7 февраля 2023 года")], what="prisoners recruited by Wagner (at least)"),
 tp("pri23", "pri", "2023-02-01", "2023-09-30", [pool("stormz", 28200, "Storm Z: lower bound about 28,2 thousand (iStories, 6 Feb 2025)", "2025-02-06", "28,2 тыс"), pool("stormz", 29000, "Storm Z: upper bound 29 thousand (iStories, 6 Feb 2025)", "2025-02-06", "29 тыс")], [("istories", "в феврале 2023 года"), ("istories", "Уже к сентябрю набор в «Шторм Z» закончился")], low=28200, high=29000, what="prisoners recruited into Storm Z by the Defence Ministry (iStories token analysis)",
    note="Leaves out the first wave, from late February to April 2023, so it may be higher."),
 tp("for22", "for", "2022-01-01", "2022-12-31", [_liga("94", 94, "foreign contract signers in 2022: 94")], [("liga_foreign", "2022 – 94 contracts")], what="foreigners who signed contracts, as counted by Ukraine"),
 tp("for23", "for", "2023-01-01", "2023-12-31", [_liga("4,067", 4067, "foreign contract signers in 2023: 4,067")], [("liga_foreign", "→ 2023 – 4,067")], what="foreigners who signed contracts, as counted by Ukraine"),
 tp("for24", "for", "2024-01-01", "2024-12-31", [_liga("8,877", 8877, "foreign contract signers in 2024: 8,877")], [("liga_foreign", "→ 2024 – 8,877")], what="foreigners who signed contracts, as counted by Ukraine"),
 tp("for25", "for", "2025-01-01", "2025-12-31", [_liga("16,085", 16085, "foreign contract signers in 2025: 16,085")], [("liga_foreign", "→ 2025 – 16,085")], what="foreigners who signed contracts, as counted by Ukraine"),
 tp("for26", "for", "2026-01-01", "2026-09-30", [_liga("16,168", 16168, "foreign contract signers, January to September 2026: 16,168")], [("liga_foreign", "first nine months of 2026")], what="foreigners who signed contracts in the first nine months of 2026, as counted by Ukraine",
    note="Nine months only."),
]
# Series whose points come from different recruiters and different periods: drawn as separate dots, never joined by a line.
TS_NOJOIN = {"pri": "Wagner (Jul 2022 to Feb 2023) and Storm Z (Feb to Sep 2023) are separate counts by different recruiters"}
TS_DOMAIN = ("2022-01-01", "2026-10-28")
TS_NOTE_GAPS = ("No dated figure was found for: contract signers in 2022; any later call-up of mobilised men; prisoners after September 2023; foreigners before 2022. These are gaps, not zeros.")
