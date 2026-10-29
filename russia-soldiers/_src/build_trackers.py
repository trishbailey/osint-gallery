"""Merge the hand-checked lines (trackers_inputs.py) with the script-checked candidates (data/trackers_auto.json) into data/trackers.json.
Auto items that point at an article already used by a hand-checked line are dropped. Run by build_site.py."""
import json, os, re, html
from trackers_inputs import T, ORDER
from sources import SOURCES
from trackers_update import canon
ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..")
PER_TOPIC_AUTO = 3

def build():
    used = {canon(SOURCES[t["src"]]["url"]) for t in T}
    auto_path = os.path.join(ROOT, "data", "trackers_auto.json")
    auto = json.load(open(auto_path, encoding="utf-8")) if os.path.exists(auto_path) else dict(generated="", topics=[])
    groups, autosrc = [], {}
    for key, heading in ORDER:
        items = [dict(t, auto=False) for t in T if t["topic"] == key]
        for at in auto["topics"]:
            if at["key"] != key and not (at["key"] == "mobil" and key == "recruit"): continue
            for i in at["items"][:PER_TOPIC_AUTO]:
                if canon(i["link"]) in used: continue
                sk = "auto_" + i["post_id"]
                autosrc[sk] = dict(short=f"{i['outlet']}, {i['date']}", url=i["link"],
                    full=f"{i['outlet']}, \u201c{html.unescape(i.get('page_title') or i['headline'])}\u201d, {i['date']}, found through the outlet's X post {i['post_url']} by trackers_update.py on {auto.get('generated','')}. The figures in the post were found on the article page; nothing else on the page was checked.")
                items.append(dict(topic=key, date=i["date"], outlet=i["outlet"], src=sk, via=i["post_url"], line=i["line"], figures=i["figures"], quote="", more="Added by the refresh script; the figures in the post were found on the article page.", auto=True))
        items.sort(key=lambda x: x["date"], reverse=True)
        if items: groups.append(dict(key=key, heading=heading, items=items))
    out = dict(generated=auto.get("generated", ""), checked="28 Oct 2026", groups=groups, autosrc=autosrc)
    json.dump(out, open(os.path.join(ROOT, "data", "trackers.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    return out

def render(out):
    months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
    h = []
    for gi, g in enumerate(out["groups"]):
        lis = []
        for it in g["items"]:
            y, m, d = it["date"].split("-"); ds = f"{int(d)} {months[int(m)-1]}"
            more = html.escape(it["more"], quote=False)
            via = f' <a href="{it["via"]}" rel="noopener">Tracker post on X</a>.' if it.get("via", "").startswith("https://x.com/") and it["via"].count("/") > 3 else ""
            if it.get("via_src"): more += f" Relayed in the Conflict Intelligence Team's weekly note.[[{it['via_src']}]]"
            lis.append(f'<li><span class="td">{ds}</span><span class="tl">{html.escape(it["line"], quote=False)}[[{it["src"]}]] <span class="by">{html.escape(it["outlet"], quote=False)}</span></span>'
                       f'<details class="how"><summary>Detail</summary><p>{more}{via}</p></details></li>')
        h.append(f'<details class="trk"{" open" if gi == 0 else ""}><summary><h3>{html.escape(g["heading"])} <span class="cnt">{len(g["items"])}</span></h3></summary><ul class="trklist">' + "".join(lis) + "</ul></details>")
    return "\n".join(h)

if __name__ == "__main__":
    o = build(); print(sum(len(g["items"]) for g in o["groups"]), "items")
