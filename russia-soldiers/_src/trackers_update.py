#!/usr/bin/env python3
"""Refresh the 'Latest from trackers' section of the Russia's Soldiers page.

X is reached only through the X connector (OAuth), never with a token in this script, so the script has two halves:
  1. `plan`   prints the exact X tool calls to make (accounts, since_id from the saved state, 30-calls-per-minute pacing).
              The scheduled agent runs those calls with write_to_file and drops the result files into one folder.
  2. `ingest` reads those saved result files (get_users_posts / search_posts_all JSON), dedupes, keeps only posts about the
              page's topics that link to an article, FETCHES each article, checks that the numbers quoted in the post appear on the
              article page, and writes data/trackers_auto.json (newest per topic; build_data.py merges it with the hand-checked lines in _src/trackers_inputs.py). `python3 _src/build_site.py` then renders the section.
Usage:
  python3 _src/trackers_update.py plan
  python3 _src/trackers_update.py ingest <folder-or-files...> [--since 2026-09-01] [--per-topic 4] [--no-verify] [--allow-no-figures]
Only the eight tracker accounts below are read. Nothing is posted anywhere."""
import sys, os, re, json, glob, subprocess, html, datetime, time, argparse, urllib.parse
HERE = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.join(HERE, "..")
OUT = os.path.join(ROOT, "data", "trackers_auto.json"); TCO = os.path.join(ROOT, "data", "raw", "trackers_tco.json"); STATE = os.path.join(ROOT, "data", "raw", "trackers_state.json")
ACCOUNTS = {  # numeric id -> (handle, outlet name as credited)
    "2749018640": ("mediazzzona", "Mediazona (Russian)"), "1534507013002121217": ("mediazona_en", "Mediazona (English)"),
    "18161336": ("bbcrussian", "BBC News Russian"), "3301321379": ("CITeam_en", "Conflict Intelligence Team"),
    "1252231184974671872": ("istories_media", "iStories"), "1529470618621599747": ("verstka_media", "Verstka"),
    "3004163369": ("meduza_en", "Meduza"), "1262845575147458560": ("KofmanMichael", "Michael Kofman")}
RATE_PER_MIN = 30
TOPICS = [  # (key, heading, regex over the post text and the link title, lower-cased). Narrow on purpose: a word like "killed" alone is not enough.
    ("losses", "Losses and the named list", r"casualt|named list|list of (the )?(dead|killed|names)|war dead|died in the war|killed in (the )?(war|ukraine)|russian (soldiers|servicemen) (killed|died)|probate|total (death|loss)|потер|погибш|павш|списк\w+ (погиб|имен)|наследствен|имен\w+ погибш"),
    ("northkorea", "North Korea", r"north korea|kndr|dprk|кндр|северокорей|северной коре"),
    ("foreign", "Foreign recruits", r"foreign (national|fighter|recruit|mercenar|citizen|volunteer|soldier)|mercenar|peruvian|nepal|cuban|colombian|kenyan|ghana|sri lanka|indian (men|citizen|national)|иностран|наёмник|наемник|перу|непал|кубин"),
    ("prisoners", "Prisoners", r"prisoner|convict|inmate|penal|storm[- ]?z|wagner|заключ[её]н|осужд|штурм\w* [zз]|зэк|вагнер"),
    ("coercion", "Roundups and coerced contracts", r"coerc|forced to sign|forced into (signing|a contract)|picked up (off|from) the street|taken off the street|rounded up|принужд|вылавлива|принудительн\w+ (контракт|задерж)|заставля\w+ подписать"),
    ("recruit", "Recruitment and bonuses", r"contract (soldier|servic|recruit)|sign-?up bonus|signing bonus|bonus(es)? for|recruit(ment|ing|er|s)|enlist|контрактник|вербов|подписани\w+ контракт|выплат\w+ за (контракт|заключение)|бонус"),
    ("mobil", "Mobilisation and reserve", r"mobili[sz]ation|reservist|call-?up|conscript|мобилизац|резервист|призыв")]
WARCTX = r"war\b|russia|росси|ukrain|army|armed forces|soldier|servicem|military|contract|recruit|mobili|войн|украин|арми|солдат|военн|контракт|мобилиз|сво\b|вс рф"
NOISE = r"lgbt|antilgbt|\bbook\b|podcast|newsletter|subscribe|donate|giveaway|taliban|takie dela|get lost|foreign agent|train|ozon|airport|football|eurovision"
def plan():
    st = json.load(open(STATE)) if os.path.exists(STATE) else {}
    print(f"X tool calls for the scheduled refresh (pace at most {RATE_PER_MIN} calls per minute; this plan is {len(ACCOUNTS) + 4} calls)\n")
    for uid, (h, n) in ACCOUNTS.items():
        extra = f', "since_id": "{st[uid]}"' if uid in st else ""
        print(f'get_users_posts  {{"id": "{uid}", "max_results": 100, "exclude": "retweets,replies", "post.fields": "created_at,entities,note_tweet,lang,referenced_tweets"{extra}}}   # @{h}')
    names = " OR ".join("from:" + h for h, _ in ACCOUNTS.values())
    for label, terms in (("north korea", '"North Korea" OR "North Korean" OR КНДР OR северокорейск'), ("losses", 'casualties OR losses OR named OR потери OR погибших OR наследственн'),
                         ("recruitment", 'contract OR bonus OR recruitment OR prisoners OR convicts OR mobilisation OR контракт OR выплат OR заключенных'), ("foreign", 'foreigners OR mercenaries OR иностранцев OR наёмник')):
        print(f'search_posts_all {{"query": "({names}) ({terms}) -is:retweet", "start_time": "<last run>", "max_results": 100, "sort_order": "recency", "post.fields": "created_at,entities,note_tweet,lang,author_id"}}   # {label}')
    print("\nSave each result with write_to_file=true into one folder, then: python3 _src/trackers_update.py ingest <that folder>")

def load_posts(paths):
    posts = {}
    files = []
    for p in paths: files += sorted(glob.glob(os.path.join(p, "*"))) if os.path.isdir(p) else [p]
    for f in files:
        try: t = open(f, encoding="utf-8").read(); d = json.loads(t[t.index("{"):t.rindex("}") + 1])
        except Exception: continue
        for p in d.get("data", []) or []:
            if p.get("author_id") in ACCOUNTS: posts[p["id"]] = p
    return posts

def curl(u, n=1):
    r = subprocess.run(["curl", "-s", "-L", "-m", "25", "--compressed", "-A", "Mozilla/5.0 (X11; Linux x86_64) Chrome/124 Safari/537.36", u], capture_output=True)
    return r.stdout.decode("utf-8", "ignore")

def nums(text):  # figures that can be checked: 1,234 / 12 345 / 3.5 million; ignore years and tiny numbers
    out = set()
    for m in re.finditer(r"\d{1,3}(?:[ ,.\u202f\u00a0]\d{3})+|\d+(?:[.,]\d+)?\s*(?:million|billion|trillion|thousand|тыс\w*|млн|млрд|k\b)|\b\d{3,6}\b", text):
        s = re.sub(r"[ ,.\u202f\u00a0]", "", m.group(0)) if re.fullmatch(r"\d{1,3}(?:[ ,.\u202f\u00a0]\d{3})+", m.group(0)) else m.group(0)
        if re.fullmatch(r"(19|20)\d\d", s): continue
        out.add(s)
    return out

def norm_page(t):
    t = re.sub(r"<script.*?</script>|<style.*?</style>", " ", t, flags=re.S); t = re.sub(r"<[^>]+>", " ", t); t = html.unescape(t)
    t = re.sub(r"(?<=\d)[,\u202f\u00a0 ](?=\d{3}\b)", "", t)  # 25,000 / 25 000 -> 25000
    return re.sub(r"[ \u202f\u00a0]", "", t)

def title_of(t):
    m = re.search(r"<meta[^>]+property=[\"']og:title[\"'][^>]+content=[\"']([^\"']+)", t) or re.search(r"<title[^>]*>([^<]+)", t)
    return html.unescape(m.group(1)).strip() if m else ""

SELF = re.compile(r"^https?://(www\.)?(x|twitter)\.com/", re.I)
def canon(u):
    u = re.sub(r"^https://storage\.googleapis\.com/istories/(.+?)/index\.html.*$", r"https://istories.media/\1/", u)  # iStories mirror -> article
    p = urllib.parse.urlsplit(u); q = [(k, v) for k, v in urllib.parse.parse_qsl(p.query) if not k.lower().startswith(("utm_", "fbclid", "ref"))]
    return urllib.parse.urlunsplit((p.scheme, p.netloc.lower(), p.path.rstrip("/"), urllib.parse.urlencode(q), ""))

def resolve(u, cache):  # t.co -> destination, one HEAD request, cached
    if u in cache: return cache[u]
    r = subprocess.run(["curl", "-sI", "-m", "15", u], capture_output=True).stdout.decode("utf-8", "ignore")
    m = re.search(r"^location:\s*(\S+)", r, re.I | re.M); cache[u] = m.group(1) if m else ""
    time.sleep(60 / RATE_PER_MIN / 2)
    return cache[u]

def post_text_links(p, cache):
    """Full text (long posts keep it in note_tweet) and external links (entities, note_tweet entities, else resolved t.co)."""
    nt = p.get("note_tweet") or {}
    text = html.unescape(nt.get("text") or p["text"])
    ents = list((p.get("entities") or {}).get("urls", [])) + list((nt.get("entities") or {}).get("urls", []))
    links, seen = [], set()
    for e in ents:
        u = e.get("unwound_url") or e.get("expanded_url") or ""
        if u and not SELF.match(u) and u not in seen: seen.add(u); links.append(dict(url=canon(u) if "storage.googleapis.com/istories" in u else u, title=(e.get("title") or "").strip()))
    if not links:
        for t in re.findall(r"https://t\.co/\w+", text):
            u = resolve(t, cache)
            if u and not SELF.match(u) and u not in seen: seen.add(u); links.append(dict(url=canon(u) if "storage.googleapis.com/istories" in u else u, title=""))
    text = re.sub(r"\s*https://t\.co/\w+", "", text).strip()
    return text, links

def one_line(text, n=170):
    text = re.sub(r"@\w+|[\U0001F000-\U0001FFFF\u2600-\u27BF\uFE0F]", "", text)
    t = re.sub(r"\s+", " ", text).strip(); m = re.match(r"(.{40,%d}?[.!?])(\s|$)" % n, t)
    return m.group(1) if m else (t if len(t) <= n else t[:n].rsplit(" ", 1)[0] + "\u2026")

def ingest(a):
    posts = load_posts(a.paths); since = a.since or "0000"
    cache = json.load(open(TCO)) if os.path.exists(TCO) else {}
    cands = []
    for p in sorted(posts.values(), key=lambda p: p["created_at"], reverse=True):
        if p["created_at"][:10] < since: continue
        if any(r.get("type") == "retweeted" for r in p.get("referenced_tweets", []) or []): continue
        low0 = html.unescape((p.get("note_tweet") or {}).get("text") or p["text"]).lower()
        if re.search(NOISE, low0) or not any(re.search(rx, low0) for _, _, rx in TOPICS): continue  # cheap filter before any network use
        text, links = post_text_links(p, cache)
        if not links: continue
        low = text.lower()
        if re.search(NOISE, low): continue
        topic = next((k for k, h, rx in TOPICS if re.search(rx, low)), None)
        if not topic or not re.search(WARCTX, low): continue
        if not nums(text) and not a.allow_no_figures: continue  # strategic updates carry a number
        h, outlet = ACCOUNTS[p["author_id"]]
        cands.append(dict(topic=topic, outlet=outlet, handle=h, date=p["created_at"][:10], post_id=p["id"], post_url=f"https://x.com/{h}/status/{p['id']}",
                          link=links[0]["url"], headline=links[0]["title"] or one_line(text, 110), line=one_line(text), figures=sorted(nums(text))))
    os.makedirs(os.path.dirname(TCO), exist_ok=True); json.dump(cache, open(TCO, "w"), indent=1)
    seen, uniq = set(), []
    for c in cands:  # newest first; one entry per article
        k = canon(c["link"])
        if k in seen: continue
        seen.add(k); uniq.append(c)
    kept, per = [], {}
    for c in uniq:
        if per.get(c["topic"], 0) >= a.per_topic + 3: continue  # a few spares for failed verification
        per[c["topic"]] = per.get(c["topic"], 0) + 1; kept.append(c)
    last = 0.0
    for c in kept:
        if a.no_verify: c["verified"] = "not checked"; continue
        wait = 60 / RATE_PER_MIN - (time.time() - last)
        if wait > 0: time.sleep(wait)  # polite pacing for article fetches too
        t = curl(c["link"]); last = time.time()
        if len(t) < 500 or re.search(r"Секундочку|Just a moment|Access denied|captcha|Enable JavaScript", t[:3000], re.I):
            c["verified"] = "article unreadable"; continue
        body = norm_page(t); c["page_title"] = title_of(t)
        chk = [f for f in c["figures"] if len(re.sub(r"\D", "", f)) >= 3]  # one or two digits match any page, so they prove nothing
        miss = [f for f in chk if re.sub(r"\D", "", f) not in body]
        c["verified"] = ("figures NOT on article: " + ", ".join(miss)) if miss else ("article read, figures found" if chk else "no checkable figure (too short)")
    final = {}
    for c in kept:
        if not a.no_verify and (c["verified"].startswith(("figures NOT", "no checkable")) or c["verified"] == "article unreadable"): print("   dropped:", c["verified"], "|", c["link"]); continue
        final.setdefault(c["topic"], [])
        if len(final[c["topic"]]) < a.per_topic: final[c["topic"]].append(c)
    out = dict(generated=datetime.datetime.now(datetime.timezone.utc).strftime("%Y-%m-%d %H:%M UTC"), topics=[dict(key=k, heading=h, items=final.get(k, [])) for k, h, _ in TOPICS if final.get(k)])
    json.dump(out, open(OUT, "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    st = json.load(open(STATE)) if os.path.exists(STATE) else {}
    for p in posts.values(): st[p["author_id"]] = max(st.get(p["author_id"], "0"), p["id"], key=int)
    os.makedirs(os.path.dirname(STATE), exist_ok=True); json.dump(st, open(STATE, "w"), indent=1)
    print(f"{len(posts)} posts read, {len(cands)} on-topic with an article link ({len(uniq)} distinct articles), {sum(len(t['items']) for t in out['topics'])} kept -> {OUT}")
    for t in out["topics"]:
        print("##", t["heading"])
        for i in t["items"]: print("  ", i["date"], i["outlet"], "|", i["line"][:100], "|", i["verified"], "|", i["link"])

if __name__ == "__main__":
    ap = argparse.ArgumentParser(); sp = ap.add_subparsers(dest="cmd", required=True)
    sp.add_parser("plan"); i = sp.add_parser("ingest"); i.add_argument("paths", nargs="+"); i.add_argument("--since"); i.add_argument("--per-topic", type=int, default=4, dest="per_topic"); i.add_argument("--no-verify", action="store_true"); i.add_argument("--allow-no-figures", action="store_true", dest="allow_no_figures")
    a = ap.parse_args()
    plan() if a.cmd == "plan" else ingest(a)
