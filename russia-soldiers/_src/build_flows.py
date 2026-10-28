"""Builds data/flows.json (flow map) and data/nk.json (North Korea section) and renders the North Korea relationship graphic and timeline.
District figures are sums of data/regions.json (Mediazona regional pages); foreign figures and North Korea rows come from the audited inputs."""
import json, os, html, re
from flow_inputs import TYPES, FOREIGN, FRONT, KURSK, SKIPPED
import nk_inputs as NK
from sources import SOURCES
ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..")
FDS = ["Central", "North-West", "South", "North Caucasus", "Volga", "Urals", "Siberia", "Far East"]

def build():
    R = json.load(open(os.path.join(ROOT, "data", "regions.json"), encoding="utf-8"))["regions"]
    dist = []
    for fd in FDS:
        mem = [r for r in R if r["fd"] == fd]
        a = max(mem, key=lambda r: r["deaths"])
        dist.append(dict(fd=fd, anchor=a["ne"], anchor_en=a["en"], regions=len(mem), vol=sum(r["vol"] for r in mem), mob=sum(r["mob"] for r in mem), pri=sum(r["pri"] for r in mem),
                         isos=[r["iso"] for r in mem], anchor_deaths=a["deaths"]))
    out = dict(measure="named dead", date="23 Oct 2026", types={k: dict(name=v[0], color=v[1]) for k, v in TYPES.items()}, districts=dist,
               foreign=FOREIGN, front=FRONT, kursk=KURSK, skipped=SKIPPED, foreign_date="10 Jul 2026")
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
    o, n = build(); print(len(o["districts"]), "districts", len(n["rows"]), "rows")
