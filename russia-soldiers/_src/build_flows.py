"""Builds data/flows.json (flow map: arrow width = people recruited; bars = named dead by recruit type) and data/nk.json (North Korea section) and renders the North Korea relationship graphic and timeline.
District figures are sums of data/regions.json (Mediazona regional pages); foreign figures and North Korea rows come from the audited inputs."""
import json, os, html, re, math
from flow_inputs import TYPES, FRONT, KURSK, SKIPPED
from recruit_inputs import YEARS, YEARLY, RIDGE_ROWS, RIDGE_LABEL, PART_YEAR, INDEP, RIDGE_TITLES, ARROWS, HUB, WMIN, WMAX, WMAX_PH, VMAX, NOT_DRAWN, BAR_FOREIGN, NAMED_DEAD_DATE
import nk_inputs as NK
from sources import SOURCES
ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..")
FDS = ["Central", "North-West", "South", "North Caucasus", "Volga", "Urals", "Siberia", "Far East"]

def short(n):
    if n >= 1e6: return (f"{n/1e6:.2f}").rstrip("0").rstrip(".") + "M"
    if n >= 1e4: return f"{round(n/1000)}k"
    return f"{n:,}"
def rng(a, b, short_=False):
    f = short if short_ else (lambda x: f"{x:,}")
    return f"{a:,}" if a == b else f"{f(a)} to {f(b)}"
def wid(v): return max(WMIN, WMAX * v / VMAX)
def eh(s): return html.escape(s, quote=False)

def day(d): return fmt_date(d)
def span(p):
    a, z = p["t0"], p["t1"]
    if a == z: return day(a)
    return day(a[:7]) + " to " + day(z[:7]) if a[:4] != z[:4] or a[5:7] != z[5:7] else day(a[:7])
def ridge_build():
    """Ridgeline data: one row per type; per year a value (None = gap), whether it is an allocation or a part year, any independent estimate, and the hover for each year."""
    Y = {(y["type"], y["year"]): y for y in YEARLY}
    rows = []
    for k, nm, col, sh in RIDGE_ROWS:
        ind = [dict(year=i["year"], low=i["low"], high=i["high"]) for i in INDEP if i["type"] == k]
        rows.append(dict(id=k, name=nm, title=RIDGE_TITLES[k], short=sh, color=col, vals=[Y[(k, yr)]["value"] for yr in YEARS], alloc=[bool(Y[(k, yr)]["alloc"]) for yr in YEARS],
                         part=[PART_YEAR.get((k, yr)) for yr in YEARS], indep=ind))
    def line(k, yr):
        y = Y[(k, yr)]; nm = next(l[1] for l in RIDGE_ROWS if l[0] == k)
        if y["value"] is None: return f"<b>{eh(nm)}: no data</b><br>{eh(y['note'])} Nothing is drawn."
        t = [f"<b>{eh(nm)}: {y['value']:,}</b> ({eh(y['period'])})", eh(y["what"][0].upper() + y["what"][1:])]
        t += ["Also: " + eh(c) for c in y["ctx"]]
        srcs = list(dict.fromkeys(eh(SOURCES[q["src"]]["short"]) for q in y["parts"]))
        srcs += [eh(SOURCES[a]["short"]) + " (dates)" for a in dict.fromkeys(a for a, _ in y["pq"])]
        t.append("Source: " + "; ".join(srcs))
        if y["alloc"]: t.append("Allocated by days: " + f"{y['alloc']['share']} of {y['alloc']['of']} days")
        if y["note"]: t.append(eh(y["note"]))
        return "<br>".join(t)
    tips = []
    for yr in YEARS:
        lab = f"<b>{yr}{' (part year, see each row)' if yr == 2026 else ''}</b>"
        tips.append(lab + "<br>" + "<br>".join(line(k, yr) for k, *_ in RIDGE_ROWS) + "<br><i>Estimates from different sources, not an official total. Each row has its own scale.</i>")
    # compact hover: per year one short entry per type (value, part-year flag, citation keys; build_site turns the keys into the page's citation numbers)
    ctips = []
    for yr in YEARS:
        e = []
        for k, nm, col, sh in RIDGE_ROWS:
            y = Y[(k, yr)]
            if y["value"] is None: e.append(dict(id=k, v=None, c=[])); continue
            ck = list(dict.fromkeys([q["src"] for q in y["parts"]] + [a for a, _ in y["pq"]]))
            e.append(dict(id=k, v=y["value"], alloc=bool(y["alloc"]), part=PART_YEAR.get((k, yr)), c=ck))
        ctips.append(e)
    return dict(years=YEARS, rows=rows, tips=tips, ctips=ctips, label=RIDGE_LABEL)

def build():
    R = json.load(open(os.path.join(ROOT, "data", "regions.json"), encoding="utf-8"))["regions"]
    dead = {k: sum(r[k] for r in R) for k in ("vol", "mob", "pri")}
    dead_txt = {"vol": "volunteers and contract soldiers", "mob": "mobilised men", "pri": "prisoners"}
    arrows = []
    for a in ARROWS:
        t = [f"<b>{eh(a['name'])}</b>", f"{rng(a['low'], a['high'])} people recruited, {eh(a['period'])}"]
        if a["id"] == "ca": t.insert(1, "One combined figure for five states: Uzbekistan, Tajikistan, Kazakhstan, Kyrgyzstan and Turkmenistan. It is not a count for any single country. These five are only some of the 151 countries and territories that foreign contract signers come from (45,959 identified by Ukraine, to 1 Oct 2026); recruits from every other country are not on this map and are in the Foreign recruits section.")
        if a["low"] != a["high"]:
            t.append(f"Solid width shows the low value, {a['low']:,}; the pale band reaches {a['high']:,}")
        else:
            t.append(f"Width shows {a['low']:,}")
        t.append("Low: " + eh("; ".join(p["label"] for p in a["low_parts"])))
        if a["low"] != a["high"]:
            n = len(a["high_parts"])
            t.append("High: " + ("sum of " if n > 1 else "") + eh("; ".join(p["label"] for p in a["high_parts"])) + (f" = {a['high']:,}" if n > 1 else ""))
        for p in a["context"]: t.append("Also: " + eh(p["label"]))
        t.append(eh(a["status"]))
        if a["dead_key"]: t.append(f"Named dead, secondary measure: {dead[a['dead_key']]:,} {dead_txt[a['dead_key']]} (Mediazona regional pages, {NAMED_DEAD_DATE})")
        if a["id"] == "prk": t.append("Named dead, secondary measure: 2,304 (BBC News Russian with Mediazona, 10 Jul 2026)")
        if not a["hub"] is False: t.append("Drawn from a schematic hub: no regional recruitment counts are published")
        arrows.append(dict(id=a["id"], kind=a["type"], name=a["name"], ll=a["ll"] or HUB["ll"], hub=a["hub"], low=a["low"], high=a["high"], label=rng(a["low"], a["high"], True), tip="<br>".join(t)))
    bars = []
    for k, nm in (("vol", TYPES["vol"][0]), ("mob", TYPES["mob"][0]), ("pri", TYPES["pri"][0])):
        bars.append(dict(kind=k, name=nm, n=dead[k], tip=f"<b>{eh(nm)}</b><br>{dead[k]:,} named dead, cumulative<br>Home regions in Russia (85 regions), Mediazona regional pages, {NAMED_DEAD_DATE}"))
    bars.append(dict(kind="for", name=TYPES["for"][0], n=BAR_FOREIGN["n"], tip="<b>Foreign nationals, incl. North Korea</b><br>3,589 named dead, cumulative: 2,304 North Korean + 1,285 verified from other countries<br>BBC News Russian with Mediazona, 10 Jul 2026"))
    bars.sort(key=lambda b: -b["n"])
    nd = " ".join(f"{p['label']}." for p in NOT_DRAWN)
    out = dict(measure="people recruited", types={k: dict(name=v[0], color=v[1]) for k, v in TYPES.items()}, arrows=arrows, hub=HUB, front=FRONT, kursk=KURSK,
               wmin=WMIN, wmax=WMAX, wmax_ph=WMAX_PH, vmax=VMAX, clamp_below=round(WMIN / WMAX * VMAX), bars=bars, ridge=ridge_build(), not_drawn=nd, skipped=SKIPPED, named_dead_date=NAMED_DEAD_DATE)
    json.dump(out, open(os.path.join(ROOT, "data", "flows.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    nk = dict(rows=NK.ROWS, timeline=NK.TL, places=NK.PLACES, lines=NK.LINES, kinds={k: dict(name=v[0], color=v[1]) for k, v in NK.KINDS.items()}, status=NK.STATUS)
    json.dump(nk, open(os.path.join(ROOT, "data", "nk.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    return out, nk

MON = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
def fmt_date(d):
    p = d.split("-"); y = p[0]
    if len(p) == 1: return y
    if len(p) == 2: return f"{MON[int(p[1])-1]} {y}"
    return f"{int(p[2])} {MON[int(p[1])-1]} {y}"
def esc(s): return html.escape(s, quote=False)
def tag(st): return f'<span class="st st-{st}" data-tip="{html.escape(NK.STATUS[st], quote=True)}">{st}</span>'

def render_cards(rows):
    h = []
    for r in rows:
        cites = "".join(f"[[{e['src']}]]" for e in dict((e["src"], e) for e in r["ev"]).values())
        h.append(f'<li class="nkc nk-{r["kind"]}"><span class="nkf">{esc(r["fig"])}</span><span class="nkl">{esc(r["line"])}{cites}</span>{tag(r["status"])}'
                 f'<details class="how"><summary>Detail</summary><p>{esc(r["more"])}</p></details></li>')
    return "\n".join(h)

def render():
    nk = NK
    to_ru = [r for r in nk.ROWS if r["dir"] == "to_ru"]; to_nk = [r for r in nk.ROWS if r["dir"] == "to_nk"]
    groups = [("troops", "Troops and their losses"), ("labour", "Workers and builders"), ("arms", "Munitions"), ("missile", "Missiles")]
    left = []
    for k, t in groups:
        rows = [r for r in to_ru if r["kind"] == k]
        if rows: left.append(f'<h4 class="grp">{t}</h4><ul class="nkl-list">{render_cards(rows)}</ul>')
    right = f'<h4 class="grp">What North Korea gets</h4><ul class="nkl-list">{render_cards(to_nk)}</ul>'
    tl = []
    for t in nk.TL:
        tl.append(f'<li class="tli" data-tip="{html.escape(t["text"], quote=True)}"><span class="tld">{fmt_date(t["date"])}</span><span class="tlt">{esc(t["text"])}[[{t["src"]}]]</span>{tag(t["status"])}</li>')
    return dict(cards=f'<div class="nkgrid"><div class="nkcol"><div class="nkhead nkhead-ru">North Korea <span class="arr">&rarr;</span> Russia</div>{"".join(left)}</div>'
                      f'<div class="nkcol"><div class="nkhead nkhead-nk">Russia <span class="arr">&rarr;</span> North Korea</div>{right}</div></div>',
                timeline=f'<ol class="tline">{"".join(tl)}</ol>')

if __name__ == "__main__":
    o, n = build(); print(len(o["arrows"]), "arrows", len(n["rows"]), "rows")
