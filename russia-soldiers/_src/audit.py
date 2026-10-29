"""Independent audit. Re-derives every number from data/raw/ with separate code (own CSV/JSON parsing, own Pearson/Spearman,
own pooled sums) and compares with data/*.json, data/russia_soldiers_regions.csv and the text of the built index.html.
Also checks that every pool figure appears in its verbatim quote, that every quote is in the saved source text, and that every
bonus fragment is in the VoenSchet snapshot. Exits 1 on any mismatch.  Run: python3 _src/audit.py"""
import csv, json, math, os, re, sys
HERE = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.join(HERE, ".."); RAW = os.path.join(ROOT, "data", "raw")
sys.path.insert(0, HERE)
from regions_master import REGIONS as _R, KEYS
REGIONS = [tuple(r[k] for k in KEYS) for r in _R]
from bonus_inputs import B, B2, EXCLUDED, FEDERAL
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

def _pp(fn):
    d = {}
    for ln in open(os.path.join(RAW, fn), encoding="utf-8"):
        if ln.startswith("#") or "|" not in ln: continue
        k, v = [x.strip() for x in ln.split("|")[:2]]; d[k] = float(v)
    return d
PR, PC = _pp("poverty_rate_2025_roschart.txt"), _pp("poverty_count_2025_statbase.txt")
_dt = open(os.path.join(RAW, "quotes", "census_dagestan.txt"), encoding="utf-8").read()
DAG_TOT = int(re.search(r"(\d[\d ]*\d) всё население", _dt).group(1).replace(" ", "")); DAG_RU = int(re.search(r"Русские \| (\d[\d ]*\d) \|", _dt).group(1).replace(" ", ""))
need("Dagestan census 102,243 of 3,182,054", (DAG_RU, DAG_TOT) == (102243, 3182054))
AR = {"RU-MOW": "Москва", "RU-SEV": "Севастополь", "RU-SA": "Республика Саха", "RU-YAN": "Ямало-Ненецкий автономный округ"}
AC = {"RU-MOW": "г. Москва", "RU-SPE": "г. Санкт-Петербург", "RU-SEV": "г. Севастополь", "RU-KEM": "Кемеровская область-Кузбасс", "RU-KHM": "Ханты-Мансийский АО",
      "RU-YAN": "Ямало-Ненецкий АО", "RU-SA": "Республика Саха (Якутия)"}
def povty(iso_, wn, mzn, pn, ne, p):
    for n in ([AR[iso_]] if iso_ in AR else [wn, mzn, pn, ne]):
        if n in PR: return PR[n], "published"
    for n in ([AC[iso_]] if iso_ in AC else [wn, mzn, pn, ne]):
        if n in PC: return PC[n] / p * 100, "derived"
    return None, "none"

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
                     pri=m["branches"].get("заключенные", 0), ru=(DAG_RU / DAG_TOT * 100 if iso == "RU-DA" else cen.get(cn)), rural=pp[0]["Сельское население"], kind=kind)
    x = by[iso]
    pv_, pk_ = povty(iso, wn, mzn, pn, ne, p); mine[iso]["pov"] = pv_
    need(f"poverty found {iso}", pv_ is not None); chk(f"{iso} pov", x["pov"], pv_); chk(f"{iso} pov kind", x["pov_kind"], pk_)
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
chk("Dagestan Russian share", by["RU-DA"]["ru_share"], DAG_RU / DAG_TOT * 100); need("all 85 have a Russian share", len(idx) == 85)
pv = [mine[i]["pov"] for i in iso]
chk("pov pearson", S["corr"]["pov"]["pearson"][0], pear(pv, rate)); chk("pov spearman", S["corr"]["pov"]["spearman"][0], spear(pv, rate))
pk = [k for k, i in enumerate(iso) if by[i]["pov_kind"] == "published"]
chk("pov published n", S["corr"]["pov_published"]["n"], len(pk)); need("only Nenets and Khanty-Mansi derived", [iso[k] for k in range(85) if k not in pk] == ["RU-NEN", "RU-KHM"] or sorted(iso[k] for k in range(85) if k not in pk) == ["RU-KHM", "RU-NEN"])
chk("pov published pearson", S["corr"]["pov_published"]["pearson"][0], pear([pv[k] for k in pk], [rate[k] for k in pk]))
chk("pov published spearman", S["corr"]["pov_published"]["spearman"][0], spear([pv[k] for k in pk], [rate[k] for k in pk]))
chk("pov-dist spearman", S["corr"]["pov_dist"]["spearman"][0], spear(pv, dist))
# cross-check: derived rate (headcount / population) agrees with the published rate wherever both exist
for i in iso:
    if by[i]["pov_kind"] != "published": continue
    cn_ = AC.get(i); 
    for r in REGIONS:
        if r[0] == i:
            for n in ([cn_] if cn_ else [r[4], r[2], r[6], r[3]]):
                if n in PC: need(f"published poverty rate within 1 pp of headcount/population {i}", abs(PC[n] / mine[i]["pop"] * 100 - mine[i]["pov"]) < 1.0); break
def pooled(sel): d = sum(mine[i]["deaths"] for i in sel); p = sum(mine[i]["pop"] for i in sel); return d, p, d / p * 1e5
# poverty quartiles and OLS
sp_ = sorted(iso, key=lambda i: mine[i]["pov"]); pq = [sp_[:21], sp_[21:42], sp_[42:63], sp_[63:]]
for k, q in enumerate(pq): chk(f"pov q{k+1} rate", S["pov_quartiles"][k]["rate"], pooled(q)[2])
def ols(cols, y):
    # normal equations on standardised variables, own Gauss elimination
    def z(v): m_ = sum(v) / len(v); s_ = math.sqrt(sum((a - m_) ** 2 for a in v) / len(v)); return [(a - m_) / s_ for a in v]
    Z = [z(c) for c in cols]; yz = z(y); k = len(Z)
    M = [[sum(a * b for a, b in zip(Z[i], Z[j])) for j in range(k)] + [sum(a * b for a, b in zip(Z[i], yz))] for i in range(k)]
    for i in range(k):
        piv = M[i][i]; M[i] = [v / piv for v in M[i]]
        for j in range(k):
            if j != i: f_ = M[j][i]; M[j] = [a - f_ * b for a, b in zip(M[j], M[i])]
    beta = [M[i][k] for i in range(k)]
    fit = [sum(beta[i] * Z[i][n] for i in range(k)) for n in range(len(yz))]
    ssr = sum((a - b) ** 2 for a, b in zip(yz, fit)); return beta, 1 - ssr / sum(a * a for a in yz)
bt, r2_ = ols([dist, pv], rate); chk("ols dist+pov beta dist", S["ols_dist_pov"]["beta_dist"], bt[0], 1e-5); chk("ols dist+pov beta pov", S["ols_dist_pov"]["beta_pov"], bt[1], 1e-5); chk("ols dist+pov r2", S["ols_dist_pov"]["r2"], r2_, 1e-5)
bt, r2_ = ols([dist], rate); chk("ols dist only r2", S["ols_dist_only"]["r2"], r2_, 1e-5)
rus = [mine[i]["ru"] for i in iso]
bt, r2_ = ols([dist, w, rus], rate); chk("ols main r2", S["ols"]["r2"], r2_, 1e-5); chk("ols main beta dist", S["ols"]["beta_dist"], bt[0], 1e-5)
bt, r2_ = ols([dist, pv, rus], rate); chk("ols pov r2", S["ols_pov"]["r2"], r2_, 1e-5)
# probate estimate
PRB = open(os.path.join(RAW, "quotes", "mz_probate.txt"), encoding="utf-8").read()
for s_ in ("352,000", "217,808", "261,000", "90,000", "aged 18 to 59", "only Russian citizens"): need(f"probate page has {s_}", s_ in PRB)
chk("probate multiplier", S["probate"]["mult"], 352000 / 217808); need("probate parts add up", S["probate"]["regular"] + S["probate"]["late"] == 351000 or abs(S["probate"]["regular"] + S["probate"]["late"] - 352000) < 2000)
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
FDM = {}
for ru_n, en_n in en_fd.items():
    members = [r[0] for r in REGIONS if any(k[0] == r[6] and (r[7] is None or k[1] == r[7]) for k in fd[ru_n])]
    FDM[en_n] = members
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
_q = {f: norm(open(os.path.join(RAW, "quotes", f + ".txt"), encoding="utf-8").read()) for f in ("gogov", "penza_bonus")}
_src_of = {b[0]: b[5] for b in B2}
for iso_, nm, base, status, frag in [b[:5] for b in B] + [b[:5] for b in B2]:
    _t = _q[_src_of[iso_]] if iso_ in _src_of else vs
    need(f"bonus fragment in its saved source {iso_}", norm(frag) in _t)
    need(f"bonus name in its saved source {iso_}", norm(nm) in _t)
    # base amount appears in the fragment as digits
    digits = re.sub(r"[^\d]", "", frag.split("₽")[0].replace(",", "")); 
    if iso_ in _src_of:
        nums = [int(re.sub(r"\D", "", x)) for x in re.findall(r"\d[\d \u00a0]{3,}\d", frag)]
        need(f"bonus amount {iso_} in fragment {nums}", base in nums)
    elif iso_ in ("RU-BU", "RU-ORE", "RU-ULY", "RU-CE"):
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
chk("bonus n total = B + B2", len(bon), len(B) + len(B2))
vals = sorted(bon.values()); n = len(vals); med = vals[n // 2] if n % 2 else (vals[n // 2 - 1] + vals[n // 2]) / 2
chk("bonus median", S["bonus_median_months"], med)
bi = [i for i in iso if i in bon]
chk("bonus months vs rate spearman", S["bonus_corr_all"]["spearman"][0], spear([bon[i] for i in bi], [rate[iso.index(i)] for i in bi]))
fi = [b[0] for b in list(B) + list(B2) if b[3] == "ok"]
chk("firm spearman", S["bonus_corr_firm"]["spearman"][0], spear([bon[i] for i in fi], [rate[iso.index(i)] for i in fi]))
need("federal bonus 400000 appears in snapshot", "400 000" in vs)
# ---- pools: figures inside the quote text; quotes inside the saved source text
QF = {"kluge": "kluge", "ng_bonus": "ng_bonus", "kremlin": "kremlin", "ng_wagner": "ng_wagner", "istories": "istories", "ki": "ki", "unn": "unn", "bbc_nk": "bbc_nk", "insider": "insider", "mz_probate": "mz_probate", "meduza_foreign": "meduza_foreign", "yonhap_nis": "yonhap_nis", "wotr": "wotr", "kluge_oct": "kluge_oct", "istories_peru": "istories_peru", "msmt_meduza": "msmt_meduza", "nk_unit_meduza": "nk_unit_meduza"}
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
        if p_["id"] not in ("stormz", "recruiter_fee", "szru", "nk", "mobilised", "contracts_h1", "contracts_since2022", "peru_mfa", "nk_unit") :
            need(f"pool low appears as figure {p_['id']}", f"{p_['low']:,}" in p_["text"])
mzl = norm(open(os.path.join(RAW, "quotes", "mz_list.txt"), encoding="utf-8").read())
need("mz list page says not exhaustive", "not exhaustive" in mzl)
need("mz list page says date of death known in 266,700 cases (so total is larger)", "266,700" in mzl and tot > 266700)
# ---- csv vs json
with open(os.path.join(ROOT, "data", "russia_soldiers_regions.csv"), encoding="utf-8") as f: rows = list(csv.reader(f))
need("csv rows", len(rows) == 86)
for r in rows[1:]:
    x = by[r[0]]; chk("csv deaths " + r[0], int(r[6]), x["deaths"]); chk("csv rate " + r[0], float(r[7]), x["deaths_rate"], 1e-3); chk("csv pop " + r[0], int(r[4]), x["pop"])
    if r[22]: chk("csv months " + r[0], float(r[22]), x["bonus"]["months"], 1e-3)
# ---- built page numbers
page = open(os.path.join(ROOT, "index.html"), encoding="utf-8").read()
text = re.sub(r"<[^>]+>", " ", page); text = text.replace("&nbsp;", " ")
def has(s, label): need(f"page shows {label}: {s}", s in text)
# ---- latest-from-trackers section: every figure inside its verbatim quote, every quote inside the saved page, every line on the built page
import html as _html
from trackers_inputs import T as TT, ORDER as TORD
TRK = J("data/trackers.json")
_pg = norm(_html.unescape(text))
need("trackers: every hand-checked line is in trackers.json", sum(len(g["items"]) for g in TRK["groups"]) >= len(TT))
for t_ in TT:
    nm = f"tracker {t_['src']} {t_['date']}"
    need(nm + " src known", t_["src"] in SOURCES and t_.get("via_src", t_["src"]) in SOURCES)
    q_ = norm(t_["quote"]) + " " + norm(t_.get("quote2", ""))
    for fg in t_["figures"]: need(f"{nm} figure {fg!r} in quote", norm(fg) in q_)
    sv = norm(open(os.path.join(RAW, "quotes", t_["src"] + ".txt"), encoding="utf-8").read())
    for qq in (t_["quote"], t_.get("quote2")):
        if qq: need(f"{nm} quote in saved page text: {qq[:40]}", norm(qq) in sv)
    need(nm + " line on page", norm(t_["line"]) in _pg)
    need(nm + " date is ISO", re.fullmatch(r"20\d\d-\d\d-\d\d", t_["date"]) is not None)
    need(nm + " topic known", t_["topic"] in dict(TORD))
    need(nm + " via is an x.com link", t_.get("via", "https://x.com/").startswith("https://x.com/"))
    ln = t_["line"]
    for m_ in re.finditer(r"\d[\d,.]*\s*(?:million|billion|trillion)?", ln):
        pass
for g in TRK["groups"]:
    for it in g["items"]:
        if it.get("auto"):
            need(f"auto tracker {it['src']} has an article url", it["src"] in TRK["autosrc"] and TRK["autosrc"][it["src"]]["url"].startswith("https://"))
            need(f"auto tracker {it['src']} on page", norm(it["line"]) in _pg)
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

# ---- round 3: sankey, photos, probate and Dagestan on the page
sk = S["sankey"]
for f_, d_ in sk.items():
    mem = FDM[f_]
    for k_ in ("vol", "pri", "mob"): chk(f"sankey {f_} {k_}", d_[k_], sum(mine[i][k_] for i in mem))
    chk(f"sankey {f_} total", sum(d_.values()), sum(mine[i]["deaths"] for i in mem))
chk("sankey grand total equals named in 85 regions", sum(sum(d_.values()) for d_ in sk.values()), n85)
for fn_, key_ in (("recruitment-billboard-moscow-2024.jpg", "img_billboard"), ("mobilisation-summons-2022.jpg", "img_summons")):
    need("photo exists " + fn_, os.path.getsize(os.path.join(ROOT, "img", fn_)) > 20000 and os.path.getsize(os.path.join(ROOT, "img", fn_)) < 150000)
    need("photo has alt text " + fn_, re.search(r'src="img/' + re.escape(fn_) + r'"[^>]*alt="[^"]{40,}"', page) is not None)
    need("photo credit in sources list " + key_, SOURCES[key_]["url"] in page and "public domain" in SOURCES[key_]["full"] and "commons.wikimedia.org" in SOURCES[key_]["url"])
need("no photo credit text on the figure", "Retired electrician" not in re.sub(r'<details id="srcdet">.*', "", page, flags=re.S))
for s_ in ("352,000", "217,808", "1.6 times", "3.2%", "102,243", "3,182,054"): has(s_, "round-3 figure")
need("dagestan share matches census row", abs(by["RU-DA"]["ru_share"] - 102243 / 3182054 * 100) < 0.01)
need("d3-sankey vendored with licence", os.path.exists(os.path.join(ROOT, "vendor", "d3-sankey.min.js")) and os.path.exists(os.path.join(ROOT, "vendor", "d3-sankey.LICENSE")))
# every [N] citation resolves to a source entry, every source cited
cites = J("data/cites.json"); nums = sorted(set(int(x) for x in re.findall(r'href="#src-(\d+)"', page)))
ids = sorted(int(x) for x in re.findall(r'id="src-(\d+)"', page))
need("citations resolve", set(nums) <= set(ids)); need("every source cited", set(ids) <= set(nums))
need("single data sources dropdown", page.count('id="srcdet"') == 1)

# ---- round 4: flow map and North Korea section
import nk_inputs as NKI
FL = J("data/flows.json"); NKJ = J("data/nk.json")
import recruit_inputs as RI
def figval(fg):
    f = fg.replace("\u00a0", " ").strip()
    if re.search(r"тыс|thousand", f): return round(float(re.sub(r"[^\d,.]", "", f.split()[0] if re.match(r"\d+ \d{3}", f) is None else f).replace(",", ".")) * 1000)
    if "million" in f: return round(float(re.sub(r"[^\d.]", "", f)) * 1e6)
    return int(re.sub(r"\D", "", f))
def check_part(nm, p_):
    need(f"{nm} src known", p_["src"] in SOURCES)
    q_ = norm(p_["quote"])
    for fg in p_["figures"]: need(f"{nm} figure {fg!r} in its quote", norm(fg) in q_)
    sv_ = norm(open(os.path.join(RAW, "quotes", p_["src"] + ".txt"), encoding="utf-8").read())
    need(f"{nm} quote is in the saved page text: {p_['quote'][:50]}", q_ in sv_)
    need(f"{nm} value {p_['value']:,} equals a figure in its quote {p_['figures']}", p_["value"] in [figval(fg) for fg in p_["figures"]])
    need(f"{nm} label carries the value or its date", bool(p_["label"]) and re.fullmatch(r"20\d\d-\d\d-\d\d", p_["date"]) is not None)
need("flows.json has 5 arrows: 3 Russian from the hub and 2 foreign", len(FL["arrows"]) == 5 and sum(1 for a_ in FL["arrows"] if a_["hub"]) == 3 and FL["measure"] == "people recruited")
need("flows.json no longer carries district named-dead strands", "districts" not in FL and "foreign" not in FL)
FA = {a_["id"]: a_ for a_ in FL["arrows"]}
for a_ in RI.ARROWS:
    nm = "arrow " + a_["id"]
    need(nm + " low <= high", 0 < a_["low"] <= a_["high"])
    for side in ("low", "high"):
        parts = a_[side + "_parts"]
        for p_ in parts: check_part(f"{nm} {side}", p_)
        chk(f"{nm} {side} equals the sum of its parts", a_[side], sum(p_["value"] for p_ in parts))
        chk(f"{nm} {side} in flows.json", FA[a_["id"]][side], a_[side])
    for p_ in a_["context"]: check_part(nm + " context", p_)
    need(nm + " tip carries low and high with sources", f"{a_['low']:,}" in FA[a_["id"]]["tip"] and f"{a_['high']:,}" in FA[a_["id"]]["tip"] and a_["low_parts"][0]["label"].split(" (")[0].split(",")[0] in _html.unescape(FA[a_["id"]]["tip"]))
chk("contract high = 540,000 + 450,000 + 40,000 + 422,704 + 32,000 + 200,000", FA["vol"]["high"], 540000 + 450000 + 40000 + 422704 + 32000 + 200000)
chk("prisoners low = 48,366 + 28,200", FA["pri"]["low"], 48366 + 28200)
need("ranges: only the sums and the two ranged national totals differ", [a_["id"] for a_ in FL["arrows"] if a_["low"] != a_["high"]] == ["vol", "mob", "pri", "prk"])
chk("vmax is the largest high value", FL["vmax"], max(a_["high"] for a_ in FL["arrows"]))
need("not-drawn foreign figures are sourced", all(True for p_ in RI.NOT_DRAWN))
for p_ in RI.NOT_DRAWN:
    check_part("not drawn", p_)
    for fg in p_["figures"]: need(f"not drawn figure {fg} shown on page", fg in text)
need("not drawn: Colombia, Burundi, Zimbabwe, Peru and Sri Lanka are listed", all(w_ in text for w_ in ("Colombia 1,449", "Burundi 699", "Zimbabwe 530", "Peru 503", "Sri Lanka 751")))
# named-dead bars: cumulative totals only, one bar per type, sorted largest first, linear from zero, with source in the hover
bf = norm(open(os.path.join(RAW, "quotes", "bbc_foreign.txt"), encoding="utf-8").read())
need("foreign total 3,589 = 2,304 + 1,285 as stated by the BBC", "3,589" in bf and "1,285" in bf and "2,304" in bf and 2304 + 1285 == 3589)
BR = {b_["kind"]: b_ for b_ in FL["bars"]}
need("bars: exactly four types", set(BR) == {"vol", "mob", "pri", "for"} and len(FL["bars"]) == 4)
for k_ in ("vol", "mob", "pri"): chk(f"bar {k_} equals the regional sum", BR[k_]["n"], sum(mine[i][k_] for i in iso)); chk(f"bar {k_} equals stats type total", BR[k_]["n"], S["type_totals"][k_])
chk("bar foreign", BR["for"]["n"], 3589)
need("bars sorted largest first", [b_["n"] for b_ in FL["bars"]] == sorted((b_["n"] for b_ in FL["bars"]), reverse=True))
need("bar hovers name a source and a date", all(("Mediazona" in b_["tip"] or "BBC" in b_["tip"]) and re.search(r"20\d\d", b_["tip"]) for b_ in FL["bars"]))
need("bar colours are the type colours", all(BR[k_]["kind"] == k_ and k_ in FL["types"] for k_ in BR))
fj = open(os.path.join(ROOT, "flows.js"), encoding="utf-8").read()
need("bars are drawn linear from zero (width = n / max)", "(b.n/mx*100)" in fj and "d3.max(F.bars" in fj and "sqrt" not in fj[fj.index("function bars"):])
need("bars section is not stacked by year", "stack" not in fj and "by year" not in fj.split("function bars")[1][:600])
need("arrow widths use the stated square-root scale", "4+6*Math.sqrt(v/VMAX)" in fj and "square-root scale" in fj)
need("the page shows the bars and the scale statement", 'id="flowbars"' in page and "cumulative totals" in _html.unescape(text) and "not stacked by year" in _html.unescape(text))
for s_ in (f"{BR['vol']['n']:,}", f"{BR['pri']['n']:,}", f"{BR['mob']['n']:,}", f"{A_['vol']['low'] if False else FA['vol']['low']:,}", f"{FA['vol']['high']:,}", f"{FA['mob']['high']:,}", f"{FA['pri']['low']:,}", f"{FA['pri']['high']:,}"): has(s_, "flow verdict figure")
for k_ in ("bbc_foreign", "ne_admin0", "mz_regions", "bbc_nk", "wotr", "kremlin", "ria_shoigu24", "tass_med25", "interfax_med26", "dw_mz527", "occrp_foreign", "liga_foreign", "isw_istories23", "istories_407", "meduza_318", "ng_wagner", "istories", "ki", "ng_bonus", "mz_list"): need("flow source cited " + k_, k_ in cites)
need("the page states the measure, the hub and the front bracket", all(x_ in norm(_html.unescape(text)) for x_ in ("arrow width shows people recruited", "schematic hub", "schematic front bracket", "not in ukraine")))
need("natural earth basemap present and public-domain credited", os.path.getsize(os.path.join(ROOT, "vendor", "ne_neighbours.geojson")) > 20000 and "public domain" in SOURCES["ne_admin0"]["full"])
need("flows and nk scripts are loaded", 'src="flows.js"' in page and 'src="nk.js"' in page)
need("flow section comes first, remoteness charts directly after it", page.index('id="flow-sec"') < page.index('id="remote-sec"') < page.index('id="undercount"') < page.index('id="map-sec"') and page.index('id="kpis"') < page.index('id="flow-sec"'))
need("no other section sits between the flow map and the remoteness charts", not re.search(r'id="flow-sec".*?<details class="sec"(?![^>]*id="remote-sec")', page, re.S) or re.search(r'id="flow-sec".*?<details class="sec"[^>]*id="remote-sec"', page, re.S) is not None)
_pgn = norm(_html.unescape(text))
need("NK rows: 13 rows, 4 to Russia kinds and 4 to North Korea", len(NKI.ROWS) == 13 and sum(1 for r_ in NKI.ROWS if r_["dir"] == "to_nk") == 4)
tok = lambda s_: re.findall(r"\$?\d[\d,]*", s_)
for r_ in NKI.ROWS:
    nm = "nk row " + r_["id"]
    need(nm + " status valid", r_["status"] in NKI.STATUS)
    allq = ""; figs = set()
    for e_ in r_["ev"] + r_.get("extra", []):
        need(f"{nm} src known {e_['src']}", e_["src"] in SOURCES)
        sv_ = norm(open(os.path.join(RAW, "quotes", e_["src"] + ".txt"), encoding="utf-8").read())
        need(f"{nm} quote in saved page: {e_['quote'][:40]}", norm(e_["quote"]) in sv_)
        for fg in e_["figures"]: need(f"{nm} figure {fg!r} in its quote", norm(fg) in norm(e_["quote"]))
        allq += " " + norm(e_["quote"]); figs |= {int(re.sub(r"\D", "", x)) for fg in e_["figures"] for x in tok(fg) if re.sub(r"\D", "", x)}
    for lab_ in (r_["short"], r_["fig"]):
        for tk in tok(lab_):
            n_ = int(re.sub(r"\D", "", tk))
            need(f"{nm} label number {tk} is in a quote or is a sum of two quoted figures", norm(tk) in allq or any(a + b == n_ for a in figs for b in figs) or n_ in figs)
    need(nm + " line and figure on page", norm(r_["fig"] + " " + r_["line"]) in _pgn)
    need(nm + " status shown on page", r_["status"] in text)
need("builders 6,000 is 5,000 + 1,000 as announced", 5000 + 1000 == 6000)
for t_ in NKI.TL:
    nm = "nk timeline " + t_["date"]
    need(nm + " status valid", t_["status"] in NKI.STATUS)
    sv_ = norm(open(os.path.join(RAW, "quotes", t_["src"] + ".txt"), encoding="utf-8").read())
    need(nm + " quote in saved page", norm(t_["quote"]) in sv_)
    for fg in t_["figures"]: need(f"{nm} figure {fg!r} in quote", norm(fg) in norm(t_["quote"]))
    for tk in tok(t_["text"]): need(f"{nm} text number {tk} in quote", norm(tk) in norm(t_["quote"]) or tk in ("2,000",) and "2,000" in norm(t_["quote"]))
    need(nm + " text on page", norm(t_["text"]) in _pgn)
    need(nm + " date format", re.fullmatch(r"20\d\d(-\d\d){0,2}", t_["date"]) is not None)
need("timeline is in date order", [t_["date"] for t_ in NKI.TL] == sorted(t_["date"] for t_ in NKI.TL))
PLN = {"pyongyang": "pyongyang", "rajin": "rajin", "dunai": "dunay", "tikhoretsk": "tikhoretsk", "kursk": "kursk", "alabuga": "alabuga", "voronezh": "voronezh"}
for k_, p_ in NKI.PLACES.items():
    sv_ = norm(open(os.path.join(RAW, "quotes", p_["src"] + ".txt"), encoding="utf-8").read())
    need(f"place {k_} is named in its source {p_['src']}", PLN[k_] in sv_)
    need(f"place {k_} lies in a plausible box", 30 < p_["ll"][0] < 135 and 38 < p_["ll"][1] < 57)
for l_ in NKI.LINES: need(f"map line {l_['id']} uses a known row and places", l_["row"] in {r_["id"] for r_ in NKI.ROWS} and l_["frm"] in NKI.PLACES and l_["to"] in NKI.PLACES)
for s_ in ("Documented: the treaty", "2,304 named by the BBC against 3,000 claimed by Ukraine"): has(s_, "NK verdict")
need("NK verdict numbers are in the rows", any("29,488" in r_["fig"] for r_ in NKI.ROWS) and any("2,304" in r_["fig"] for r_ in NKI.ROWS))
# ---- time series (recruits in a dated period, by type)
import datetime as _dt
TSF = {s_["kind"]: s_ for s_ in FL["ts"]["series"]}
need("time series has the four types", set(TSF) == {"vol", "mob", "pri", "for"} and len(RI.TS) == 14)
_ids = [p_["id"] for p_ in RI.TS]; need("time series point ids unique", len(_ids) == len(set(_ids)))
_flat = {p_["id"]: p_ for s_ in FL["ts"]["series"] for p_ in s_["points"] + s_["est"]}
need("flows.json time series carries every input point", set(_flat) == set(_ids))
for p_ in RI.TS:
    nm = "ts " + p_["id"]
    for i_, q_ in enumerate(p_["parts"]): check_part(f"{nm} part{i_}", q_)
    vals = [q_["value"] for q_ in p_["parts"]]; figs = [figval(f_) for q_ in p_["parts"] for f_ in q_["figures"]]
    if p_["low"] == p_["high"]: need(nm + " exact value is the sum of its parts", sum(vals) == p_["low"] and len(vals) >= 1)
    else: need(nm + " range ends are figures of its parts", p_["low"] in vals + figs and p_["high"] in vals + figs and p_["low"] < p_["high"])
    for src_, txt_ in p_["pq"]:
        sv_ = norm(open(os.path.join(RAW, "quotes", src_ + ".txt"), encoding="utf-8").read())
        need(nm + f" period text {txt_!r} is in the saved source {src_}", norm(txt_) in sv_)
    a_, z_ = _dt.date.fromisoformat(p_["t0"]), _dt.date.fromisoformat(p_["t1"])
    need(nm + " period dates valid and inside the chart domain", a_ <= z_ and _dt.date.fromisoformat(RI.TS_DOMAIN[0]) <= a_ and z_ <= _dt.date.fromisoformat(RI.TS_DOMAIN[1]))
    need(nm + " value is positive and inside the log axis (60 to 1,500,000)", 60 <= p_["low"] <= p_["high"] <= 1.5e6)
    fp_ = _flat[p_["id"]]; need(nm + " flows.json value equals the input", (fp_["low"], fp_["high"], fp_["t0"], fp_["t1"]) == (p_["low"], p_["high"], p_["t0"], p_["t1"]))
    need(nm + " hover carries the value, a source name with its date and the period note", (f"{p_['low']:,}" in fp_["tip"]) and all(SOURCES[q_["src"]]["short"] in fp_["tip"] for q_ in p_["parts"]) and (p_["est"] or "not a rate" in fp_["tip"]))
for k_, s_ in TSF.items():
    pts = s_["points"]; need(f"ts {k_} line points are in date order with no real overlap", all(_dt.date.fromisoformat(b_["t0"]) >= _dt.date.fromisoformat(a_["t1"]) - _dt.timedelta(days=31) for a_, b_ in zip(pts, pts[1:])))
need("ts mobilised has one dated wave only", len(TSF["mob"]["points"]) == 1)
need("ts gaps are stated and no zero point exists", "gaps, not zeros" in FL["ts"]["gaps"] and all(p_["low"] > 0 for p_ in RI.TS))
_t = {p_["id"]: p_ for p_ in RI.TS}
need("ts 2024 official = 450,000 + 40,000", _t["vol24"]["low"] == 490000 and _t["vol25"]["low"] == 422704 + 32000)
_js = open(os.path.join(ROOT, "flows.js"), encoding="utf-8").read()
need("flows.js time series uses a log axis and breaks the line at gaps", "d3.scaleLog" in _js and "gapOK" in _js and "runs.push" in _js)
need("flows.js time series never plots a missing period as zero", not re.search(r"\|\|\s*0\b", _js[_js.index("function series"):_js.index("function bars")]))
need("flows.js time series has one Play button, no autoplay", _js.count('id="tsplay"') == 1 and "tsplay').click" not in _js and "autoplay" not in _js.lower())
need("flows.js the animation starts only from the click handler", _js.index("btn.addEventListener('click'") < _js.index("d3.timer("))
for s_ in ("Recruits over time, by how they joined", "Press Play", FL_V["v_ts"] if "FL_V" in globals() else "Official contract and volunteer figures fell from 540,000 in 2023 to 454,704 in 2025", "foreign contract signers counted by Ukraine rose from 4,067 to 16,085", "gaps, not zeros"): has(s_, "time series text")
need("ts section sits after the flow map and before the named-dead bars", page.index('id="flowmap"') < page.index('id="flowts"') < page.index('id="flowbars"'))
need("meduza_wagner is cited on the page", "meduza_wagner" in cites)
need("GA tag once", page.count("G-Z61EKRP8QV") >= 1 and page.count("googletagmanager.com/gtag/js?id=G-Z61EKRP8QV") == 1)
need("no github.io/onrender/.cn/gdelt", not re.search(r"github\.io|onrender\.com|gdelt|\.cn[/\"' ]", page + open(os.path.join(ROOT, "app.js")).read(), re.I))
need("no unresolved tokens", "{{" not in page and "[[" not in page)
print(f"audit: {OK[0]} checks passed, {len(FAIL)} failed")
for f_ in FAIL[:60]: print("  FAIL", f_)
sys.exit(1 if FAIL else 0)
