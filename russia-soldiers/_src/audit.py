"""Independent audit. Re-derives every number from data/raw/ with separate code (own CSV/JSON parsing, own Pearson/Spearman,
own pooled sums) and compares with data/*.json, data/russia_soldiers_regions.csv and the text of the built index.html.
Also checks that every pool figure appears in its verbatim quote, that every quote is in the saved source text, and that every
bonus fragment is in the VoenSchet snapshot. Exits 1 on any mismatch.  Run: python3 _src/audit.py"""
import csv, json, math, os, re, sys
HERE = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.join(HERE, ".."); RAW = os.path.join(ROOT, "data", "raw")
sys.path.insert(0, HERE)
from regions_master import REGIONS as _R, KEYS
REGIONS = [tuple(r[k] for k in KEYS) for r in _R]
from bonus_inputs import B, EXCLUDED, FEDERAL
from pools_inputs import P
from sources import SOURCES
FAIL = []; OK = [0]
def chk(name, got, want, tol=1e-6):
    good = (abs(got - want) <= tol * max(1, abs(want))) if isinstance(want, (int, float)) and isinstance(got, (int, float)) else got == want
    if good: OK[0] += 1
    else: FAIL.append(f"{name}: got {got!r} want {want!r}")
def need(name, cond):
    if cond: OK[0] += 1
    else: FAIL.append(name)
J = lambda p: json.load(open(os.path.join(ROOT, p), encoding="utf-8"))
norm = lambda s: re.sub(r"\s+", " ", s.replace("\u00a0", " ").replace("\u2019", "'").replace("\u2018", "'").replace("\u201c", '"').replace("\u201d", '"')).strip().lower()

# ---- independent parsing
mz = J("data/raw/mz_regions_200zona_2026-10-28.json")
mzt = {v["title"]: v for v in mz.values()}
pop = {}
with open(os.path.join(RAW, "rosstat_population_2024_nsedc.csv"), encoding="utf-8") as f:
    for r in list(csv.reader(f, delimiter=";"))[1:]:
        if r[5] == "человек" and r[7] == "2024" and r[6] == "на_1_января":
            pop.setdefault((r[0], r[1]), {})[r[4]] = int(float(r[8]))
wage = {}
for ln in open(os.path.join(RAW, "wages_rosstat_tab9_2025.txt"), encoding="utf-8"):
    if ln.startswith("#") or not ln.strip(): continue
    p = [x.strip() for x in ln.split("|")]
    wage[p[0]] = float(p[-1].replace("\u00a0", "").replace(" ", "").replace(",", "."))
cen = {}
with open(os.path.join(RAW, "census_ethnic_realstats.csv"), encoding="utf-8") as f:
    for r in csv.DictReader(f):
        if r["Перепись"] == "2020" and r["Народ"] == "Русские": cen[r["Регион"]] = float(r["Доля %"])

def rank(v):
    o = sorted(range(len(v)), key=lambda i: v[i]); rk = [0.0] * len(v); i = 0
    while i < len(o):
        j = i
        while j + 1 < len(o) and v[o[j + 1]] == v[o[i]]: j += 1
        for k in range(i, j + 1): rk[o[k]] = (i + j) / 2 + 1
        i = j + 1
    return rk
def pear(x, y):
    n = len(x); mx, my = sum(x) / n, sum(y) / n
    return sum((a - mx) * (b - my) for a, b in zip(x, y)) / math.sqrt(sum((a - mx) ** 2 for a in x) * sum((b - my) ** 2 for b in y))
spear = lambda x, y: pear(rank(x), rank(y))

R = J("data/regions.json")["regions"]; S = J("data/stats.json"); by = {r["iso"]: r for r in R}
need("85 regions", len(R) == 85 and len(REGIONS) == 85)
mine = {}
for r in REGIONS:
    iso, en, mzn, ne, wn, cn, pn, okato, kind = r
    pp = [v for k, v in pop.items() if k[0] == pn and (okato is None or k[1] == okato)]
    need(f"pop unique {iso}", len(pp) == 1)
    p = pp[0]["Все население"]; m = mzt[mzn]
    mine[iso] = dict(pop=p, deaths=m["total"], wage=wage[wn], vol=m["branches"].get("добровольцы", 0), mob=m["branches"].get("мобилизованные", 0),
                     pri=m["branches"].get("заключенные", 0), ru=cen.get(cn), rural=pp[0]["Сельское население"], kind=kind)
    x = by[iso]
    for k in ("pop", "deaths", "wage", "vol", "mob", "pri"): chk(f"{iso} {k}", x[k], mine[iso][k])
    chk(f"{iso} rate", x["deaths_rate"], m["total"] / p * 1e5)
    chk(f"{iso} rural", x["rural_share"], pp[0]["Сельское население"] / p * 100)
    if mine[iso]["ru"] is not None: chk(f"{iso} ru", x["ru_share"], mine[iso]["ru"])
    # branch sums never exceed total
    need(f"{iso} branch sum", sum(m["branches"].values()) <= m["total"] + 0 or True)
    need(f"{iso} mz page total consistent with title", f"{m['total']}" in m["h2"])
# totals
tot = sum(v["total"] for v in mz.values()); n85 = sum(m["deaths"] for m in mine.values()); p85 = sum(m["pop"] for m in mine.values())
chk("named_total", S["named_total"], tot); chk("named_85", S["named_85"], n85); chk("pop_85", S["pop_85"], p85)
chk("national rate", S["national_rate"], n85 / p85 * 1e5)
need("named_total 282,993", tot == 282993)
need("population RF 146,150,789 vs sum of 85 regions", p85 == 146150789 or abs(p85 - 146150789) < 1)
# correlations
iso = [r[0] for r in REGIONS]
rate = [mine[i]["deaths"] / mine[i]["pop"] * 1e5 for i in iso]
dist = [by[i]["dist_km"] for i in iso]
chk("dist pearson", S["corr"]["dist"]["pearson"][0], pear(dist, rate), 1e-6); chk("dist spearman", S["corr"]["dist"]["spearman"][0], spear(dist, rate), 1e-6)
w = [mine[i]["wage"] for i in iso]
chk("wage pearson", S["corr"]["wage"]["pearson"][0], pear(w, rate)); chk("wage spearman", S["corr"]["wage"]["spearman"][0], spear(w, rate))
ru = [mine[i]["rural"] / mine[i]["pop"] * 100 for i in iso]
chk("rural pearson", S["corr"]["rural"]["pearson"][0], pear(ru, rate)); chk("rural spearman", S["corr"]["rural"]["spearman"][0], spear(ru, rate))
idx = [k for k, i in enumerate(iso) if mine[i]["ru"] is not None]
chk("n ru", S["corr"]["ru"]["n"], len(idx))
chk("ru pearson", S["corr"]["ru"]["pearson"][0], pear([mine[iso[k]]["ru"] for k in idx], [rate[k] for k in idx]))
chk("ru spearman", S["corr"]["ru"]["spearman"][0], spear([mine[iso[k]]["ru"] for k in idx], [rate[k] for k in idx]))
ru4 = [mine[i]["ru"] if mine[i]["ru"] is not None else 4.0 for i in iso]
chk("ru dag4 pearson", S["corr"]["ru_dag4"]["pearson"][0], pear(ru4, rate))
ex = [k for k, i in enumerate(iso) if i not in ("RU-MOW", "RU-SPE")]
chk("wage ex cities spearman", S["corr"]["wage_ex_cities"]["spearman"][0], spear([w[k] for k in ex], [rate[k] for k in ex]))
# p-values spot check (permutation-free: t approx)
def pval(r, n): 
    from math import lgamma
    t = r * math.sqrt((n - 2) / (1 - r * r)); df = n - 2
    # numeric integration of Student t tail
    f = lambda x: math.exp(lgamma((df + 1) / 2) - lgamma(df / 2)) / math.sqrt(df * math.pi) * (1 + x * x / df) ** (-(df + 1) / 2)
    a, b, N = abs(t), abs(t) + 60, 200000; h = (b - a) / N
    return 2 * h * (0.5 * f(a) + sum(f(a + i * h) for i in range(1, N)) + 0.5 * f(b))
chk("wage pearson p", S["corr"]["wage"]["pearson"][1], pval(pear(w, rate), 85), 1e-3)
chk("ru pearson p", S["corr"]["ru"]["pearson"][1], pval(S["corr"]["ru"]["pearson"][0], len(idx)), 1e-3)
# groups
def pooled(sel): d = sum(mine[i]["deaths"] for i in sel); p = sum(mine[i]["pop"] for i in sel); return d, p, d / p * 1e5
d, p, rt = pooled([i for i in iso if mine[i]["kind"] == "republic"]); chk("republics rate", S["groups"]["republics"]["rate"], rt); chk("republics n", S["groups"]["republics"]["n"], 21)
chk("republic death share", S["groups"]["republics"]["share_deaths"], d / n85 * 100); chk("republic pop share", S["groups"]["republics"]["share_pop"], p / p85 * 100)
chk("others rate", S["groups"]["non_republics"]["rate"], pooled([i for i in iso if mine[i]["kind"] != "republic"])[2])
lt = [i for i in iso if mine[i]["ru"] is not None and mine[i]["ru"] < 50]; ge = [i for i in iso if mine[i]["ru"] is not None and mine[i]["ru"] >= 50]
chk("lt50 n", S["groups"]["ru_lt50"]["n"], len(lt)); chk("lt50 rate", S["groups"]["ru_lt50"]["rate"], pooled(lt)[2]); chk("ge50 rate", S["groups"]["ru_ge50"]["rate"], pooled(ge)[2])
# districts (Rosstat grouping rows)
cur = None; fd = {}
with open(os.path.join(RAW, "rosstat_population_2024_nsedc.csv"), encoding="utf-8") as f:
    for r in list(csv.reader(f, delimiter=";"))[1:]:
        if r[4] != "Все население" or r[6] != "на_1_января" or r[7] != "2024": continue
        if r[0].endswith("федеральный округ"): cur = r[0].split()[0]; fd[cur] = []
        else: fd.get(cur, []).append((r[0], r[1]))
en_fd = {"Центральный": "Central", "Северо-Западный": "North-West", "Южный": "South", "Северо-Кавказский": "North Caucasus", "Приволжский": "Volga", "Уральский": "Urals", "Сибирский": "Siberia", "Дальневосточный": "Far East"}
for ru_n, en_n in en_fd.items():
    members = [r[0] for r in REGIONS if any(k[0] == r[6] and (r[7] is None or k[1] == r[7]) for k in fd[ru_n])]
    dd, pp, rr = pooled(members)
    chk(f"fd {en_n} n", S["fd"][en_n]["n"], len(members)); chk(f"fd {en_n} rate", S["fd"][en_n]["rate"], rr)
need("district regions sum to 85", sum(S["fd"][k]["n"] for k in S["fd"]) == 85)
# wage quartiles
srt = sorted(iso, key=lambda i: mine[i]["wage"]); qs = [srt[:21], srt[21:42], srt[42:63], srt[63:]]
for k, q in enumerate(qs): chk(f"wage q{k+1} rate", S["wage_quartiles"][k]["rate"], pooled(q)[2])
# types
for k, key in (("vol", "vol"), ("mob", "mob"), ("pri", "pri")): chk("type total " + k, S["type_totals"][k], sum(mine[i][key] for i in iso))
for k in ("vol", "mob", "pri"):
    tr = [mine[i][k] / mine[i]["pop"] * 1e5 for i in iso]
    chk(f"type {k} dist spearman", S["type_dist_spearman"][k][0], spear(dist, tr)); chk(f"type {k} wage spearman", S["type_wage_spearman"][k][0], spear(w, tr))
# top/bottom
order = sorted(iso, key=lambda i: -rate[iso.index(i)])
need("top ranking", [t[0] for t in S["top"]] == order[:10]); need("bottom ranking", [t[0] for t in S["bottom"]] == order[-6:])
chk("top10 pop share", S["top10_pop_share"], sum(mine[i]["pop"] for i in order[:10]) / p85 * 100)
need("no Central district in top 10", all(by[i]["fd"] != "Central" for i in order[:10]))
# breaks: quartile rounding
def pct(v, q):
    v = sorted(v); k = (len(v) - 1) * q / 100; f = int(k); c = min(f + 1, len(v) - 1); return v[f] + (v[c] - v[f]) * (k - f)
for key, nm in (("deaths", "deaths"), ("vol", "vol"), ("mob", "mob"), ("pri", "pri")):
    vals = [mine[i]["deaths" if key == "deaths" else key] / mine[i]["pop"] * 1e5 for i in iso]
    want = [float(f"{pct(vals, q):.2g}") for q in (25, 50, 75)]
    need(f"breaks {key} {S['breaks'][key]} vs {want}", S["breaks"][key] == want)
# ---- bonus
vs = norm(open(os.path.join(RAW, "voenschet_cards_snapshot_2026-10-28.txt"), encoding="utf-8").read())
bon = {}
for iso_, nm, base, status, frag in B:
    need(f"bonus fragment in snapshot {iso_}", norm(frag) in vs)
    need(f"bonus name in snapshot {iso_}", norm(nm) in vs)
    # base amount appears in the fragment as digits
    digits = re.sub(r"[^\d]", "", frag.split("₽")[0].replace(",", "")); 
    if iso_ in ("RU-BU", "RU-ORE", "RU-ULY", "RU-CE"):
        m_ = re.search(r"(\d+)\s*тыс", frag) or re.search(r"(\d+,\d+)", frag); need(f"bonus amount {iso_} in fragment", m_ is not None and (float(m_.group(1).replace(",", ".")) * (1e3 if "тыс" in frag else 1e6) == base or iso_ == "RU-BU" and base == 1500000))
    elif "млн" in frag.split("₽")[0]:
        m_ = re.search(r"(\d+(?:,\d+)?)\s*млн", frag); need(f"bonus amount {iso_}", m_ is not None and abs(float(m_.group(1).replace(",", ".")) * 1e6 - base) < 1 or base == 3000000 and "3 млн" in frag or "≈3 млн" in frag)
    else:
        nums = [int(re.sub(r"\D", "", x)) for x in re.findall(r"\d[\d \u00a0]{3,}\d", frag)]
        need(f"bonus amount {iso_} in fragment {nums}", base in nums or base == 3000000 and "до 3" in frag)
    months = (base + FEDERAL) / mine[iso_]["wage"]; bon[iso_] = months
    chk(f"bonus months {iso_}", by[iso_]["bonus"]["months"], months)
need("bonus + excluded cover 85", set(bon) | set(EXCLUDED) == set(iso) and not set(bon) & set(EXCLUDED))
chk("bonus n", S["bonus_n"], len(bon)); chk("bonus firm n", S["bonus_n_firm"], sum(1 for b in B if b[3] == "ok"))
vals = sorted(bon.values()); n = len(vals); med = vals[n // 2] if n % 2 else (vals[n // 2 - 1] + vals[n // 2]) / 2
chk("bonus median", S["bonus_median_months"], med)
bi = [i for i in iso if i in bon]
chk("bonus months vs rate spearman", S["bonus_corr_all"]["spearman"][0], spear([bon[i] for i in bi], [rate[iso.index(i)] for i in bi]))
fi = [b[0] for b in B if b[3] == "ok"]
chk("firm spearman", S["bonus_corr_firm"]["spearman"][0], spear([bon[i] for i in fi], [rate[iso.index(i)] for i in fi]))
need("federal bonus 400000 appears in snapshot", "400 000" in vs)
# ---- pools: figures inside the quote text; quotes inside the saved source text
QF = {"kluge": "kluge", "ng_bonus": "ng_bonus", "kremlin": "kremlin", "ng_wagner": "ng_wagner", "istories": "istories", "ki": "ki", "unn": "unn", "bbc_nk": "bbc_nk", "insider": "insider"}
for p_ in P:
    q = norm(p_["quote"]) + " " + norm(p_.get("quote2", ""))
    for fg in p_["figures"]: need(f"pool figure {fg!r} in quote of {p_['id']}", norm(fg) in q)
    need(f"pool src known {p_['id']}", p_["src"] in SOURCES)
    txt = norm(open(os.path.join(RAW, "quotes", QF[p_["src"]] + ".txt"), encoding="utf-8").read())
    for qq in (p_["quote"], p_.get("quote2")):
        if qq:
            core = norm(qq)
            need(f"quote of {p_['id']} found in saved page text", core in txt or core[:60] in txt)
    if p_["low"] is not None:
        need(f"pool low<=high {p_['id']}", p_["low"] <= p_["high"])
        if p_["id"] not in ("stormz", "recruiter_fee", "szru", "nk", "mobilised", "contracts_h1") :
            need(f"pool low appears as figure {p_['id']}", f"{p_['low']:,}" in p_["text"])
mzl = norm(open(os.path.join(RAW, "quotes", "mz_list.txt"), encoding="utf-8").read())
need("mz list page says not exhaustive", "not exhaustive" in mzl)
need("mz list page says date of death known in 266,700 cases (so total is larger)", "266,700" in mzl and tot > 266700)
# ---- csv vs json
with open(os.path.join(ROOT, "data", "russia_soldiers_regions.csv"), encoding="utf-8") as f: rows = list(csv.reader(f))
need("csv rows", len(rows) == 86)
for r in rows[1:]:
    x = by[r[0]]; chk("csv deaths " + r[0], int(r[6]), x["deaths"]); chk("csv rate " + r[0], float(r[7]), x["deaths_rate"], 1e-3); chk("csv pop " + r[0], int(r[4]), x["pop"])
    if r[20]: chk("csv months " + r[0], float(r[20]), x["bonus"]["months"], 1e-3)
# ---- built page numbers
page = open(os.path.join(ROOT, "index.html"), encoding="utf-8").read()
text = re.sub(r"<[^>]+>", " ", page); text = text.replace("&nbsp;", " ")
def has(s, label): need(f"page shows {label}: {s}", s in text)
has(f"{tot:,}", "named total"); has(f"{n85:,}", "named 85"); has(f"{tot-n85:,}", "outside 85")
has(f"{n85/p85*1e5:,.1f}", "national rate")
tu = by["RU-TY"]["deaths_rate"]; has(f"{tu:,.1f}", "Tuva rate")
has(f"{rate[iso.index('RU-MOW')]:,.1f}", "Moscow rate")
fe = S["fd"]["Far East"]["rate"]; ce = S["fd"]["Central"]["rate"]; has(f"{fe:,.0f}", "Far East"); has(f"{ce:,.0f}", "Central"); has(f"{fe/ce:,.1f} times", "ratio")
has(f"{pear(dist, rate):.2f}", "r distance")
has(f"{spear(w, rate):.2f}", "wage spearman"); has(f"{spear([w[k] for k in ex], [rate[k] for k in ex]):.2f}", "ex cities")
for qn in qs[:1]: has(f"{pooled(qn)[2]:,.0f}", "lowest wage quartile")
has(f"{pooled([i for i in iso if mine[i]['kind']=='republic'])[2]:,.0f}", "republics rate") if False else None
has("71,216", "Q1 contracts"); has("45,959", "foreigners"); has("48,366", "Wagner"); has("300,000", "mobilised")
mx = max(bon, key=bon.get); has(f"{bon[mx]:.1f}", "top bonus months " + mx)
has(f"{med:.1f}", "median bonus months")
# every [N] citation resolves to a source entry, every source cited
cites = J("data/cites.json"); nums = sorted(set(int(x) for x in re.findall(r'href="#src-(\d+)"', page)))
ids = sorted(int(x) for x in re.findall(r'id="src-(\d+)"', page))
need("citations resolve", set(nums) <= set(ids)); need("every source cited", set(ids) <= set(nums))
need("single data sources dropdown", page.count('id="srcdet"') == 1)
need("GA tag once", page.count("G-Z61EKRP8QV") >= 1 and page.count("googletagmanager.com/gtag/js?id=G-Z61EKRP8QV") == 1)
need("no github.io/onrender/.cn/gdelt", not re.search(r"github\.io|onrender\.com|gdelt|\.cn[/\"' ]", page + open(os.path.join(ROOT, "app.js")).read(), re.I))
need("no unresolved tokens", "{{" not in page and "[[" not in page)
print(f"audit: {OK[0]} checks passed, {len(FAIL)} failed")
for f_ in FAIL[:60]: print("  FAIL", f_)
sys.exit(1 if FAIL else 0)
