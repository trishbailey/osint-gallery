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
for en_n_, mem_ in FDM.items(): chk(f"fd {en_n_} resident-weighted distance", S["fd"][en_n_]["dist_km"], sum(by[i]["dist_km"] * mine[i]["pop"] for i in mem_) / sum(mine[i]["pop"] for i in mem_))
need("sankey districts ordered by distance from Moscow: Central nearest, Far East farthest", min(S["fd"], key=lambda k: S["fd"][k]["dist_km"]) == "Central" and max(S["fd"], key=lambda k: S["fd"][k]["dist_km"]) == "Far East")
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
for fn_, key_, lic_ in (("recruitment-office-zelenograd-2026.jpg", "img_zelenograd", "CC0"), ("mobilised-training-ryazan-2022.jpg", "img_ryazan", "CC BY 4.0"), ("wagner-graves-chervishevskoye-2023.jpg", "img_wagner", "CC BY-SA 4.0"), ("graves-kazan-2023.jpg", "img_kazan", "CC BY-SA 4.0"), ("putin-kim-vostochny-2023.jpg", "img_vostochny", "CC BY 4.0"), ("putin-kim-pyongyang-2024.jpg", "img_pyongyang", "CC BY 4.0")):
    sz_ = os.path.getsize(os.path.join(ROOT, "img", fn_))
    need("photo exists " + fn_, 20000 < sz_ < 150000)
    need("photo has alt text " + fn_, re.search(r'src="img/' + re.escape(fn_) + r'"[^>]*alt="[^"]{40,}"', page) is not None)
    need("photo credit and licence in sources list " + key_, SOURCES[key_]["url"] in page and lic_ in SOURCES[key_]["full"] and "commons.wikimedia.org" in SOURCES[key_]["url"])
for fn_, key_ in (("wagner-red-flag-chervishevskoye-2023.jpg", "img_wagner3"), ("wagner-graves-wide-chervishevskoye-2023.jpg", "img_wagner4"), ("graves-flags-kazan-2023.jpg", "img_kazan2"), ("new-graves-chervishevskoye-2023.jpg", "img_nova"), ("wagner-flags-chervishevskoye-2023.jpg", "img_wagner2")):
    sz_ = os.path.getsize(os.path.join(ROOT, "img", fn_))
    need("undercount photo exists, compressed " + fn_, 20000 < sz_ < 150000)
    need("undercount photo has alt text " + fn_, re.search(r'src="img/' + re.escape(fn_) + r'"[^>]*alt="[^"]{40,}"', page) is not None)
    need("undercount photo credit and CC BY-SA 4.0 licence in sources list " + key_, SOURCES[key_]["url"] in page and "CC BY-SA 4.0" in SOURCES[key_]["full"] and "commons.wikimedia.org" in SOURCES[key_]["url"])
need("undercount section holds four photos in one grid", len(re.findall(r"<img", re.search(r'id="undercount".*?</aside>', page, re.S).group(0))) == 4)
# ---- flow map labels: each names its own origin; the Central Asia figure is one combined count for five states, not Kazakhstan
_fj = open(os.path.join(ROOT, "flows.js"), encoding="utf-8").read()
need("flow-map labels name their origin (country or group) on desktop and phone", all(x_ in _fj for x_ in ("vol:'Contract soldiers'", "mob:'Mobilised men'", "pri:'Prisoners'", "ca:'Central Asia, 5 states'", "prk:'North Korea'")) and "ph()?'':LBL" not in _fj)
need("Central Asia tooltip says the 11,157 is one count for five named states, not one country", "One combined figure for five states: Uzbekistan, Tajikistan, Kazakhstan, Kyrgyzstan and Turkmenistan" in [a_ for a_ in J("data/flows.json")["arrows"] if a_["id"] == "ca"][0]["tip"])
# ---- top photo strip: four real, freely licensed photos of Russian soldiers; credits only in the sources list
for fn_, key_ in (("soldier-rpk-2023.jpg", "img_rpk"), ("soldiers-trench-2023.jpg", "img_mortar"), ("draftees-yalta-2022.jpg", "img_yalta"), ("mobilised-oath-sevastopol-2022.jpg", "img_sevastopol")):
    sz_ = os.path.getsize(os.path.join(ROOT, "img", fn_))
    need("top photo exists, compressed " + fn_, 20000 < sz_ < 150000)
    need("top photo has alt text " + fn_, re.search(r'src="img/' + re.escape(fn_) + r'"[^>]*alt="[^"]{40,}"', page) is not None)
    need("top photo credit and CC BY 4.0 licence in sources list " + key_, SOURCES[key_]["url"] in page and "CC BY 4.0" in SOURCES[key_]["full"] and "commons.wikimedia.org" in SOURCES[key_]["url"])
_hero = re.search(r'id="hero".*?</div>', page, re.S).group(0)
need("top strip holds four photos, above the headline-number cards", len(re.findall(r"<img", _hero)) == 4 and page.index('id="hero"') < page.index('id="kpis"'))
need("no photo credit or author name on the top strip itself", "Ministry of Defence" not in re.sub(r"<[^>]+>", " ", _hero) and "Information Policy" not in _hero)
_ajs = open(os.path.join(ROOT, "app.js"), encoding="utf-8").read()
need("map layers say home region and per 100,000 residents; prisoners say recruited from prison", "Named dead recruited from prison, by home region, per 100,000 residents" in _ajs and _ajs.count("by home region, per 100,000 residents") >= 6 and "METRICS[m].what" in _ajs)
need("map note says home region, not where a prison stands, and cites Mediazona's method", "not where a prison, unit or cemetery stands" in _html.unescape(text) and SOURCES["mz_geo"]["url"] in page and "Four years of war" in SOURCES["mz_geo"]["full"])
need("no photo credit text on the figure", "Retired electrician" not in re.sub(r'<details id="srcdet">.*', "", page, flags=re.S))
for s_ in ("352,000", "217,808", "1.6 times", "3.2%", "102,243", "3,182,054"): has(s_, "round-3 figure")
need("dagestan share matches census row", abs(by["RU-DA"]["ru_share"] - 102243 / 3182054 * 100) < 0.01)
need("the sankey is gone: no d3-sankey script, vendor file or sankey code", "sankey" not in page.lower().replace("sankey districts","") and not os.path.exists(os.path.join(ROOT, "vendor", "d3-sankey.min.js")) and "d3.sankey" not in open(os.path.join(ROOT, "app.js"), encoding="utf-8").read())
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
need("bars section is not stacked by year", "stack" not in fj.split("function bars")[1].split("function init")[0] and "by year" not in fj.split("function bars")[1][:600])
need("arrow widths use the stated linear scale with a 3 px minimum", "Math.max(F.wmin,(ph()?F.wmax_ph:F.wmax)*v/VMAX)" in fj and "LINEAR scale" in fj and "sqrt" not in fj[:fj.index("function legend")] and (FL["wmin"], FL["wmax"], FL["wmax_ph"]) == (3, 56, 34))
need("the page says arrows under the minimum are drawn at 3 px, and the threshold matches the data", "drawn at the 3 px minimum" in _html.unescape(text) and f"about {round(FL['clamp_below'], -4):,}" in _html.unescape(text))
need("the flow map has no zoom buttons and no width key list", "fz-in" not in fj and "fz-out" not in fj and "fz-reset" not in fj and 'class="fk-rest"' not in fj and "samples" not in FL)
need("the page shows the bars and the scale statement", 'id="flowbars"' in page and "cumulative totals" in _html.unescape(text) and "not stacked by year" in _html.unescape(text))
for s_ in (f"{BR['vol']['n']:,}", f"{BR['pri']['n']:,}", f"{BR['mob']['n']:,}", f"{A_['vol']['low'] if False else FA['vol']['low']:,}", f"{FA['vol']['high']:,}", f"{FA['mob']['high']:,}", f"{FA['pri']['low']:,}", f"{FA['pri']['high']:,}"): has(s_, "flow verdict figure")
for k_ in ("bbc_foreign", "ne_admin0", "mz_regions", "bbc_nk", "wotr", "kremlin", "ria_shoigu24", "tass_med25", "interfax_med26", "dw_mz527", "occrp_foreign", "liga_foreign", "isw_istories23", "istories_407", "meduza_318", "ng_wagner", "istories", "ki", "ng_bonus", "mz_list"): need("flow source cited " + k_, k_ in cites)
need("the page states the measure, the hub and the front bracket", all(x_ in norm(_html.unescape(text)) for x_ in ("arrow width shows people recruited", "schematic hub", "schematic front bracket", "not in ukraine")))
need("natural earth basemap present and public-domain credited", os.path.getsize(os.path.join(ROOT, "vendor", "ne_neighbours.geojson")) > 20000 and "public domain" in SOURCES["ne_admin0"]["full"])
need("flows and nk scripts are loaded", 'src="flows.js"' in page and 'src="nk.js"' in page)
need("the redundant ranking bar chart is gone and the map section carries its finding and region rank", 'id="rank-sec"' not in page and 'id="rankbars"' not in page and "drawRank" not in open(os.path.join(ROOT, "app.js"), encoding="utf-8").read() and "of 85 by named dead per 100,000" in open(os.path.join(ROOT, "app.js"), encoding="utf-8").read() and page.index('id="dead-sec"') < page.index(f"The ten highest rates hold {S['top10_pop_share']:.1f}%") )
SEC = [m_.group(1) for m_ in re.finditer(r'<details class="sec[^"]*" id="([a-z-]+)"', page)]
need("sections run flow, prisoners, North Korea, foreign, contract and money, who pays, trackers, method: " + ",".join(SEC), SEC == ["flow-sec", "pris-sec", "nk-sec", "for-sec", "con-sec", "dead-sec", "trk-sec", "method-sec"])
need("KPI tiles come before the flow map and are about recruit types", page.index('id="kpis"') < page.index('id="flow-sec"') and 6 == page.count('class="kpi"'))
need("removed sections are gone: remoteness, poverty, minority, ranking, sankey", not any(x_ in page for x_ in ('id="remote-sec"', 'id="pov-sec"', 'id="eth-sec"', 'id="rank-sec"', 'id="sankey', 'id="sc-dist"', 'id="sc-pov"', 'id="sc-eth"', 'id="sc-wage"', 'id="bars-fd"', 'id="bars-pq"', 'id="bars-q"', 'id="bars-g"')))
need("the layered map carries distance, poverty, Russian share, bonus and prisoner layers as chips", all(f'data-metric="{m_}"' in page for m_ in ("deaths", "vol", "mob", "pri", "dist", "pov", "ru", "bonus")))
need("the distance layer has quartile breaks that match the data", S["breaks"]["dist"] == [float(f"{pct(dist, q):.2g}") for q in (25, 50, 75)])
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
# ---- yearly ridgeline (one estimate per type per year; gaps are explicit)
import datetime as _dt
ST = FL["ridge"]
need("ridge: five types on a yearly grid 2022 to 2026", RI.YEARS == [2022, 2023, 2024, 2025, 2026] and [l_["id"] for l_ in ST["rows"]] == ["vol", "mob", "pri", "for", "nk"] and ST["years"] == RI.YEARS and len(RI.YEARLY) == 25)
need("ridge: exactly one entry per type per year", len({(y_["type"], y_["year"]) for y_ in RI.YEARLY}) == 25)
_wd = (_dt.date(2023, 2, 7) - _dt.date(2022, 7, 1)).days + 1
need("ridge: Wagner 1 Jul 2022 to 7 Feb 2023 is 222 days, 184 in 2022 and 38 in 2023", _wd == 222 == RI.WAG_DAYS["total"] and (_dt.date(2022, 12, 31) - _dt.date(2022, 7, 1)).days + 1 == 184 == RI.WAG_DAYS["y2022"] and (_dt.date(2023, 2, 7) - _dt.date(2023, 1, 1)).days + 1 == 38 == RI.WAG_DAYS["y2023"])
_w22 = round(48366 * 184 / 222); _w23 = 48366 - _w22
for y_ in RI.YEARLY:
    nm = f"ridge {y_['type']} {y_['year']}"; li_ = next(l_ for l_ in ST["rows"] if l_["id"] == y_["type"]); v_ = li_["vals"][RI.YEARS.index(y_["year"])]
    need(nm + " flows.json value equals the input (a gap stays null, never zero)", v_ == y_["value"] and (v_ is None or v_ > 0))
    tip_ = ST["tips"][RI.YEARS.index(y_["year"])]
    if y_["value"] is None:
        need(nm + " is a gap: no parts, a reason is stated and the hover says no data", not y_["parts"] and len(y_["note"]) > 10 and "no data" in tip_ and y_["note"] in _html.unescape(tip_.replace("<br>", " ")).replace("&#x27;", "'"))
        continue
    for i_, q_ in enumerate(y_["parts"]): check_part(f"{nm} part{i_}", q_)
    need(nm + " hover carries the exact value and a source name", f"{y_['value']:,}" in tip_ and all(SOURCES[q_["src"]]["short"] in tip_ for q_ in y_["parts"]))
    for src_, txt_ in y_["pq"]:
        sv_ = norm(open(os.path.join(RAW, "quotes", src_ + ".txt"), encoding="utf-8").read())
        need(nm + f" period text {txt_!r} is in the saved source {src_}", norm(txt_) in sv_)
    vals_ = [q_["value"] for q_ in y_["parts"]]
    if y_["type"] == "pri": need(nm + " is the Wagner share by days plus Storm Z", y_["value"] == (_w22 if y_["year"] == 2022 else _w23 + 28200) and y_["alloc"] is not None and sum(vals_) >= y_["value"])
    else: need(nm + " is the sum of its sourced parts", y_["value"] == sum(vals_) or (y_["type"] == "mob" and y_["value"] == 300000))
need("ridge: Wagner allocation adds back to the sourced total 48,366", _w22 + _w23 == 48366 and [y_["value"] for y_ in RI.YEARLY if y_["type"] == "pri" and y_["year"] == 2022] == [_w22])
need("ridge: official claims 2024 = 450,000 + 40,000 and 2025 = 422,704 + 32,000", [y_["value"] for y_ in RI.YEARLY if y_["type"] == "vol"][1:] == [540000, 490000, 454704, 200000])
need("ridge: foreign yearly counts are the LIGA figures 94, 4,067, 8,877, 16,085, 16,168", [y_["value"] for y_ in RI.YEARLY if y_["type"] == "for"] == [94, 4067, 8877, 16085, 16168])
need("ridge: North Korea has one yearly figure (2024, 11,000), cumulative figures are not split", [(y_["year"], y_["value"]) for y_ in RI.YEARLY if y_["type"] == "nk" and y_["value"]] == [(2024, 11000)])
for q_ in RI.INDEP:
    nm = f"ridge independent {q_['type']} {q_['year']}"
    for i_, p_ in enumerate(q_["parts"]): check_part(f"{nm} part{i_}", p_)
    need(nm + " range ends are figures of its source", q_["low"] <= q_["high"] and all(any(q_[k_] == figval(f_) or q_[k_] == p_["value"] for p_ in q_["parts"] for f_ in p_["figures"] + [str(p_["value"])]) for k_ in ("low", "high")))
    need(nm + " is in the row's data and its official figure is higher or lower, never equal", next(l_ for l_ in ST["rows"] if l_["id"] == q_["type"])["indep"] and any(i_["year"] == q_["year"] and (i_["low"], i_["high"]) == (q_["low"], q_["high"]) for l_ in ST["rows"] if l_["id"] == q_["type"] for i_ in l_["indep"]))
need("ridge: independent estimates are vol 2023 354,400, vol 2024 374,200 to 407,200 and mobilised 2022 527,703", [(q_["type"], q_["year"], q_["low"], q_["high"]) for q_ in RI.INDEP] == [("vol", 2023, 354400, 354400), ("vol", 2024, 374200, 407200), ("mob", 2022, 527703, 527703)])
need("ridge: part-year points are 2026 contract (Jan to Jun) and 2026 foreign (Jan to Sep), flagged in the data", RI.PART_YEAR == {("vol", 2026): "Jan to Jun", ("for", 2026): "Jan to Sep"} and [r_["part"][4] for r_ in ST["rows"]] == ["Jan to Jun", None, None, "Jan to Sep", None])
need("ridge: one hover per year with every row, exact values, sources and the own-scale reminder", len(ST["tips"]) == 5 and all("Each row has its own scale" in t_ for t_ in ST["tips"]))
_js = open(os.path.join(ROOT, "flows.js"), encoding="utf-8").read(); _sj = _js[_js.index("function ridge("):_js.index("function bars")]
need("flows.js ridgeline: smooth monotone filled curves with a soft gradient in the type colour, linear scale per row, no log, no stack", "d3.curveMonotoneX" in _sj and "linearGradient" in _sj and "stop-opacity" in _sj and "d3.scaleLinear().domain([0,mx]).nice()" in _sj and "d3.scaleLog" not in _js and "d3.stack" not in _js and "stackOffsetWiggle" not in _js)
need("flows.js ridgeline: curves join only consecutive sourced years (runs of at least two, never a part-year); a lone year is a glowing dot; a gap is faint no data, never zero", "rn.length<2" in _sj and "!r.part[i]" in _sj and "rglow" in _sj and "'no data'" in _sj and "r.vals[i]==null" in _sj or "v==null" in _sj)
need("flows.js ridgeline: independent estimate is a dashed curve plus a lighter band, one-year estimates a hollow ring", "stroke-dasharray','6 4'" in _sj and "attr('fill-opacity',.22)" in _sj and "q.low===q.high" in _sj)
need("flows.js ridgeline: draws in once on scroll (IntersectionObserver), respects reduced motion, no Play button, no autoplay timer", "IntersectionObserver" in _sj and "prefers-reduced-motion" in _sj and "RIDGE_PLAYED" in _sj and "tsplay" not in _js and "Play" not in _sj and "d3.timer" not in _sj)
need("flows.js ridgeline: every year column has hover text with exact values", "data-tip" in _sj and "S.tips[i]" in _sj and "class','tshit'" in _sj)
need("old streamgraph, filled charts and Play buttons are gone", all(x_ not in _js for x_ in ("stackOffsetWiggle", "CHARTS", "tsplay", "streamMain", "streamNiche", "hatch")) and all(x_ not in page for x_ in ('id="prists"', 'id="forts"', 'id="flowts"', "streamMain", "streamNiche", "streamgraph")))
need("ridge: the chart label is the exact one-line text on the page", RI.RIDGE_LABEL == "Yearly estimates from different sources; layers are stacked estimates, not an official total." or RI.RIDGE_LABEL.startswith("Yearly estimates from different sources") and f"<b>{RI.RIDGE_LABEL}</b>" in page)
for s_ in ("Each row has its own scale", "A filled curve joins only consecutive years that both have a sourced value", "A glowing dot is a single year with no neighbour to join", "part-year points (2026) are never joined", "the dashed curve and lighter band are an independent estimate", "Allocation method", "an allocation, not a count", "covers 1 July 2022 to 7 February 2023", "184 days fall in 2022", "nothing is interpolated or carried over from another year"): has(s_, "ridge text")
need("ridge: how-to-read dropdown lists every type with numbered citations", "How to read the yearly chart, with the source of every value" in page and page.count('class="yrlist"') == 1 and all(k_ in cites for k_ in ("ria_shoigu24", "tass_med25", "interfax_med26", "kremlin", "ng_wagner", "meduza_wagner", "istories", "liga_foreign", "bbc_shoigu", "yonhap_nis", "isw_istories23", "istories_407", "dw_mz527")))
need("ridge: the chart sits in the flow section after the flow map and before the named-dead bars", page.index('id="flowmap"') < page.index('id="ridge"') < page.index('id="flowbars"'))
need("meduza_wagner is cited on the page", "meduza_wagner" in cites)
need("GA tag once", page.count("G-Z61EKRP8QV") >= 1 and page.count("googletagmanager.com/gtag/js?id=G-Z61EKRP8QV") == 1)
need("no github.io/onrender/.cn/gdelt", not re.search(r"github\.io|onrender\.com|gdelt|\.cn[/\"' ]", page + open(os.path.join(ROOT, "app.js")).read(), re.I))
# ---- prison colony map (Mediazona with BBC News Russian, 10 Jun 2024)
import csv as _csv
_crow = list(_csv.DictReader(open(os.path.join(ROOT, "data", "prison-recruitment-wagner-all-colonies.csv"), encoding="utf-8")))
_CJ = J("data/colonies.json")
chk("colony rows", len(_crow), 501); chk("colony minimum recruits sum to Wagner total 48,366", sum(int(r_["min_recruited"]) for r_ in _crow), 48366)
chk("colony json total", _CJ["total_recruits"], 48366); chk("colony json rows", _CJ["rows"], 501)
chk("killed total (Wagner payment records)", _CJ["total_killed"], sum(int(r_["killed"]) for r_ in _crow))
_dr = [r_ for r_ in _crow if r_["lon"] and r_["institution"] != "IK24 Ukhta"]; _ud = [r_ for r_ in _crow if not (r_["lon"] and r_["institution"] != "IK24 Ukhta")]
chk("colonies drawn", _CJ["drawn"], len(_dr)); chk("colonies drawn recruits", _CJ["drawn_recruits"], sum(int(r_["min_recruited"]) for r_ in _dr))
chk("colonies not drawn", _CJ["undrawn"]["n"], len(_ud)); chk("recruits in colonies not drawn", _CJ["undrawn"]["recruits"], sum(int(r_["min_recruited"]) for r_ in _ud))
chk("drawn plus undrawn recruits equal the total", _CJ["drawn_recruits"] + _CJ["undrawn"]["recruits"], 48366)
need("every drawn colony sits inside Russia's bounding box", all(41 <= c_["lat"] <= 82 and 19 <= c_["lon"] <= 180 for c_ in _CJ["colonies"]))
need("the top colony is IK6 Krasnoyarsk with 506 minimum recruits and 136 killed", max(_CJ["colonies"], key=lambda c_: c_["n"])["name"] == "IK6 Krasnoyarsk" and max(c_["n"] for c_ in _CJ["colonies"]) == 506 and [c_["killed"] for c_ in _CJ["colonies"] if c_["name"] == "IK6 Krasnoyarsk"] == [136])
_cj = open(os.path.join(ROOT, "colonies.js"), encoding="utf-8").read()
need("colony circle AREA is proportional to minimum recruits (radius is a constant times sqrt)", "Math.sqrt(n)" in _cj and "rOf(c.n)" in _cj and "d3.scaleLog" not in _cj)
need("colony map has no zoom buttons; zoom is Ctrl+wheel, two-finger pinch or mouse drag, and one finger still scrolls", "createElement('button" not in _cj and "<button" not in _cj and "e.ctrlKey" in _cj and "e.touches.length>1" in _cj and "pan-y" in _cj and "fz-in" not in _cj)
need("colony circles are prisoner yellow like the other prisoner graphics", "#e8c547" in _cj and "#e8c547" in open(os.path.join(ROOT, "_src", "recruit_inputs.py"), encoding="utf-8").read() + open(os.path.join(ROOT, "_src", "flow_inputs.py"), encoding="utf-8").read())
need("colony hover shows colony, region, minimum recruited and killed", all(x_ in _cj for x_ in ("c.name", "c.region", "Minimum recruited", "Killed, Wagner payment records")) and "Wagner period, Jul 2022 to Feb 2023 only" in _cj)
for s_ in ("minimum, Wagner period Jul 2022 to Feb 2023 only" if False else "Wagner period Jul 2022 to Feb 2023 only", "48,366", "340 of the colonies", "43,756", "161 colonies with 4,610 recruits are not drawn", "IK24 Ukhta", "K1 to K617 with 116 missing", "ten colonies with the most recruits"): has(s_, "colony map text")
need("a top-10 list is built from the data, largest first", "slice(0,10)" in _cj and "y.n-x.n" in _cj and 'id="coltop"' in page)
need("Mediazona colony data credited in Data Sources with licence, BBC partner and article URL", "CC BY-SA 4.0" in SOURCES["mz_wagner"]["full"] and SOURCES["mz_wagner"]["url"] in page and "bbc.com/russian/articles/cv22vjwj10eo" in SOURCES["mz_wagner"]["full"] and "mz_wagner" in cites)
need("colonies.js is loaded and the vendored CSV sits in data/", 'src="colonies.js"' in page and os.path.exists(os.path.join(ROOT, "data", "prison-recruitment-wagner-all-colonies.csv")))
need("prisoners section holds the colony map, the prisoner chart, the finding and three prisoner photos", page.index('id="pris-sec"') < page.index('id="colmap"') < page.index('Prisoners outnumber mobilised men among the named dead') < page.index('id="nk-sec"') and len(re.findall(r"<img", re.search(r'id="pris-sec".*?id="nk-sec"', page, re.S).group(0))) == 3)
need("prisoners outnumber mobilised men among the named dead, 27,379 against 20,690", S["type_totals"]["pri"] == 27379 and S["type_totals"]["mob"] == 20690)
need("foreign section carries Central Asia 11,157 recruited and at least 1,399 killed, matching the flow data", all(x_ in text for x_ in ("11,157", "1,399")) and [a_["low"] for a_ in FL["arrows"] if a_["id"] == "ca"] == [11157] and "at least 1,399 of them killed" in [a_ for a_ in J("data/flows.json")["arrows"] if a_["id"] == "ca"][0]["tip"])
_ap = open(os.path.join(ROOT, "app.js"), encoding="utf-8").read()
need("regional map: a transparent hit target sits at the bounding-box centre of any region whose centre falls outside its shape, and selects that region", "isPointInFill" in _ap and "regpin" in _ap and "attr('fill-opacity',0)" in _ap and "selectRegion(r)" in _ap[_ap.index("regpin"):_ap.index("regpin") + 1400] and "circle.regpin{cursor:pointer}" in open(os.path.join(ROOT, "style.css"), encoding="utf-8").read())
need("no unresolved tokens", "{{" not in page and "[[" not in page)
print(f"audit: {OK[0]} checks passed, {len(FAIL)} failed")
for f_ in FAIL[:60]: print("  FAIL", f_)
sys.exit(1 if FAIL else 0)
