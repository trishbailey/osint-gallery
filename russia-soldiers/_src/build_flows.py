"""Builds data/flows.json (flow map: arrow width = people recruited; bars = named dead by recruit type) and data/nk.json (North Korea section) and renders the North Korea relationship graphic and timeline.
District figures are sums of data/regions.json (Mediazona regional pages); foreign figures and North Korea rows come from the audited inputs."""
import json, os, html, re, math
from flow_inputs import TYPES, FRONT, KURSK, SKIPPED
from recruit_inputs import TS_NOJOIN, TS, TS_DOMAIN, TS_NOTE_GAPS, ARROWS, HUB, WMIN, WSPAN, VMAX, LEGEND_SAMPLES, NOT_DRAWN, BAR_FOREIGN, NAMED_DEAD_DATE
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
def wid(v): return WMIN + WSPAN * math.sqrt(v / VMAX)
def eh(s): return html.escape(s, quote=False)

def day(d): return fmt_date(d)
def span(p):
    a, z = p["t0"], p["t1"]
    return day(a[:7]) + " to " + day(z[:7]) if a[:4] != z[:4] or a[5:7] != z[5:7] else day(a[:7])
def ts_build():
    out = []
    for k, (nm, col) in TYPES.items():
        pts = [p for p in TS if p["type"] == k and not p["est"]]; est = [p for p in TS if p["type"] == k and p["est"]]
        def one(p):
            t = [f"<b>{eh(nm)}{' (outside estimate)' if p['est'] else ''}</b>", f"{eh(span(p))}: {rng(p['low'], p['high'])} recruits"]
            t.append(eh(p["what"][0].upper() + p["what"][1:]))
            for q in p["parts"]: t.append(f"{eh(q['label'])} [{eh(SOURCES[q['src']]['short'])}]")
            if len(p["parts"]) > 1 and p["low"] == p["high"]: t.append(f"Sum: {p['low']:,}")
            if p["note"]: t.append(eh(p["note"]))
            if not p["est"]: t.append("Height is the total for the period, not a rate; the width of the bar under the dot is the period covered.")
            return dict(id=p["id"], t0=p["t0"], t1=p["t1"], low=p["low"], high=p["high"], tip="<br>".join(t))
        out.append(dict(kind=k, name=nm, color=col, nojoin=k in TS_NOJOIN, points=[one(p) for p in pts], est=[one(p) for p in est]))
    return dict(series=out, domain=list(TS_DOMAIN), gaps=TS_NOTE_GAPS)

def build():
    R = json.load(open(os.path.join(ROOT, "data", "regions.json"), encoding="utf-8"))["regions"]
    dead = {k: sum(r[k] for r in R) for k in ("vol", "mob", "pri")}
    dead_txt = {"vol": "volunteers and contract soldiers", "mob": "mobilised men", "pri": "prisoners"}
    arrows = []
    for a in ARROWS:
        t = [f"<b>{eh(a['name'])}</b>", f"{rng(a['low'], a['high'])} people recruited, {eh(a['period'])}"]
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
               wmin=WMIN, wspan=WSPAN, vmax=VMAX, samples=[dict(v=v, w=round(wid(v), 2)) for v in LEGEND_SAMPLES], bars=bars, ts=ts_build(), not_drawn=nd, skipped=SKIPPED, named_dead_date=NAMED_DEAD_DATE)
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
