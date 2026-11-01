"""Build data/regions.json, stats.json, pools.json and data/russia_soldiers_regions.csv from data/raw/.
Pure function of the raw files: audit.py recomputes the same numbers independently."""
import csv, json, math, os
import numpy as np
from scipy import stats as st
from shapely.geometry import shape
from load_raw import *
from bonus_inputs import BX as B, EXCLUDED, FEDERAL
from pools_inputs import P

OUT = os.path.join(HERE, "..", "data")
FD_EN = {"Центральный":"Central","Северо-Западный":"North-West","Южный":"South","Северо-Кавказский":"North Caucasus",
         "Приволжский":"Volga","Уральский":"Urals","Сибирский":"Siberia","Дальневосточный":"Far East"}

def federal_districts():
    cur, out = None, {}
    with open(os.path.join(RAW, "rosstat_population_2024_nsedc.csv"), encoding="utf-8") as f:
        rd = csv.reader(f, delimiter=";"); next(rd)
        for r in rd:
            if r[4] != "Все население" or r[6] != "на_1_января" or r[7] != "2024":
                continue
            n = r[0]
            if n.endswith("федеральный округ"):
                cur = FD_EN[n.split()[0]]
            else:
                out.setdefault((n, r[1]), cur)
    return out

def hav(lon1, lat1, lon2, lat2):
    p1, p2 = math.radians(lat1), math.radians(lat2)
    a = math.sin((p2 - p1) / 2) ** 2 + math.cos(p1) * math.cos(p2) * math.sin(math.radians(lon2 - lon1) / 2) ** 2
    return 2 * 6371.0088 * math.asin(math.sqrt(a))

def centroids():
    gj = json.load(open(os.path.join(HERE, "..", "vendor", "ru_admin1.geojson"), encoding="utf-8"))
    out = {}
    for ft in gj["features"]:
        g = shape(ft["geometry"])
        parts = list(g.geoms) if g.geom_type == "MultiPolygon" else [g]
        big = max(parts, key=lambda p: p.area)
        out[ft["properties"]["name"]] = (big.centroid.x, big.centroid.y)
    return out

def pearson(x, y):
    r, p = st.pearsonr(x, y); return float(r), float(p)
def spear(x, y):
    r, p = st.spearmanr(x, y); return float(r), float(p)

def main():
    wages, pop, cens, mz = load_wages(), load_pop(), load_census(), load_mz()
    prates, pcounts = load_poverty(); dag_ru = load_dagestan_ru()
    fds = federal_districts(); cen = centroids()
    mzt = {v["title"]: v for v in mz.values()}
    bon = {b[0]: b for b in B}
    mos = cen["Moskva"]
    rows = []
    for r in REGIONS:
        p = pop_for(r, pop)
        m = mzt[r["mz"]]
        key = (r["pop"], r["pop_okato"]) if r["pop_okato"] else next(k for k in fds if k[0] == r["pop"])
        fd = fds.get(key) or next(v for k, v in fds.items() if k[0] == r["pop"])
        c20 = cens.get((r["census"], "2020"), {})
        ru = c20.get("Русские")
        if r["iso"] == "RU-DA": ru = dag_ru[0]
        pv, pv_kind = poverty_for(r, prates, pcounts, p["Все население"])
        w = wages[r["wage"]]["2025"]
        d = hav(mos[0], mos[1], *cen[r["ne"]])
        row = dict(iso=r["iso"], en=r["en"], ne=r["ne"], kind=r["kind"], fd=fd,
                   pop=p["Все население"], rural=p["Сельское население"],
                   deaths=m["total"], vol=m["branches"].get("добровольцы", 0), mob=m["branches"].get("мобилизованные", 0),
                   pri=m["branches"].get("заключенные", 0), wage=w, ru_share=ru, pov=pv, pov_kind=pv_kind,
                   top_peoples=c20, dist_km=round(d))
        row["rural_share"] = row["rural"] / row["pop"] * 100
        for k in ("deaths", "vol", "mob", "pri"):
            row[k + "_rate"] = row[k] / row["pop"] * 1e5
        if r["iso"] in bon:
            _, nm, base, status, frag = bon[r["iso"]]
            row["bonus"] = dict(regional=base, federal=FEDERAL, total=base + FEDERAL, months=(base + FEDERAL) / w, status=status)
        else:
            row["bonus"] = dict(excluded=EXCLUDED[r["iso"]][1])
        rows.append(row)
    assert len(rows) == 85 and all(x["fd"] for x in rows)
    for x in rows: x["fd"] = x["fd"]
    tot_all = sum(v["total"] for v in mz.values())
    named85 = sum(x["deaths"] for x in rows)
    pop85 = sum(x["pop"] for x in rows)
    S = {}
    S["probate"] = dict(total=352000, regular=261000, late=90000, named_at_date=217808, mult=352000 / 217808, date="9 May 2026")
    S["named_total"] = tot_all; S["named_85"] = named85; S["pop_85"] = pop85
    S["national_rate"] = named85 / pop85 * 1e5
    other = {k: v["total"] for k, v in mz.items() if v["title"] not in {r["mz"] for r in REGIONS}}
    S["outside_85"] = {v["title"]: v["total"] for k, v in mz.items() if v["title"] not in {r["mz"] for r in REGIONS}}
    S["branches_total"] = {}
    for v in mz.values():
        for b, n in v["branches"].items(): S["branches_total"][b] = S["branches_total"].get(b, 0) + n
    X = lambda k: np.array([x[k] for x in rows], float)
    rate, wage, dist, rural = X("deaths_rate"), X("wage"), X("dist_km"), X("rural_share")
    S["corr"] = {}
    for nm, v in (("wage", wage), ("dist", dist), ("rural", rural)):
        S["corr"][nm] = dict(n=85, pearson=pearson(v, rate), spearman=spear(v, rate))
    ru_rows = [x for x in rows if x["ru_share"] is not None]
    S["missing_ru"] = [x["en"] for x in rows if x["ru_share"] is None]
    rr = np.array([x["deaths_rate"] for x in ru_rows]); rs = np.array([x["ru_share"] for x in ru_rows])
    S["corr"]["ru"] = dict(n=len(ru_rows), pearson=pearson(rs, rr), spearman=spear(rs, rr))
    # poverty (published 2025 rates; two regions derived from headcount / population)
    S["corr"]["pov"] = dict(n=85, pearson=pearson(X("pov"), rate), spearman=spear(X("pov"), rate))
    pub = [x for x in rows if x["pov_kind"] == "published"]
    S["corr"]["pov_published"] = dict(n=len(pub), pearson=pearson([x["pov"] for x in pub], [x["deaths_rate"] for x in pub]),
                                      spearman=spear([x["pov"] for x in pub], [x["deaths_rate"] for x in pub]))
    S["corr"]["pov_dist"] = dict(n=85, pearson=pearson(X("pov"), dist), spearman=spear(X("pov"), dist))
    S["corr"]["pov_wage"] = dict(n=85, pearson=pearson(X("pov"), wage), spearman=spear(X("pov"), wage))
    S["pov_derived"] = [x["en"] for x in rows if x["pov_kind"] == "derived"]
    # excluding Moscow and St Petersburg
    nm_ = [x for x in rows if x["iso"] not in ("RU-MOW", "RU-SPE")]
    S["corr"]["wage_ex_cities"] = dict(n=len(nm_), spearman=spear([x["wage"] for x in nm_], [x["deaths_rate"] for x in nm_]),
                                      pearson=pearson([x["wage"] for x in nm_], [x["deaths_rate"] for x in nm_]))
    # pooled group rates
    def pooled(sel):
        d = sum(x["deaths"] for x in sel); p = sum(x["pop"] for x in sel)
        return dict(n=len(sel), deaths=d, pop=p, rate=d / p * 1e5, share_deaths=d / named85 * 100, share_pop=p / pop85 * 100)
    S["groups"] = dict(
        republics=pooled([x for x in rows if x["kind"] == "republic"]), non_republics=pooled([x for x in rows if x["kind"] != "republic"]),
        ru_lt50=pooled([x for x in ru_rows if x["ru_share"] < 50]), ru_ge50=pooled([x for x in ru_rows if x["ru_share"] >= 50]))
    S["fd"] = {}
    for f in FD_EN.values():
        S["fd"][f] = pooled([x for x in rows if x["fd"] == f])
        mem_ = [x for x in rows if x["fd"] == f]; S["fd"][f]["dist_km"] = sum(x["dist_km"] * x["pop"] for x in mem_) / sum(x["pop"] for x in mem_)
    # wage quartiles by region count (sorted by wage)
    srt = sorted(rows, key=lambda x: x["wage"])
    qs = [srt[0:21], srt[21:42], srt[42:63], srt[63:85]]
    S["wage_quartiles"] = [dict(pooled(q), wage_min=min(x["wage"] for x in q), wage_max=max(x["wage"] for x in q)) for q in qs]
    # OLS standardized
    def z(v): v = np.asarray(v, float); return (v - v.mean()) / v.std()
    A = np.column_stack([np.ones(len(ru_rows)), z([x["dist_km"] for x in ru_rows]), z([x["wage"] for x in ru_rows]), z([x["ru_share"] for x in ru_rows])])
    y = z(rr); beta = np.linalg.lstsq(A, y, rcond=None)[0]; res = y - A @ beta
    S["ols"] = dict(n=len(ru_rows), beta_dist=float(beta[1]), beta_wage=float(beta[2]), beta_ru=float(beta[3]), r2=float(1 - res.var() / y.var()))
    A2 = np.column_stack([np.ones(85), z(dist), z(X("pov")), z(X("ru_share"))])
    y2 = z(rate); b2 = np.linalg.lstsq(A2, y2, rcond=None)[0]; r2_ = y2 - A2 @ b2
    S["ols_pov"] = dict(n=85, beta_dist=float(b2[1]), beta_pov=float(b2[2]), beta_ru=float(b2[3]), r2=float(1 - r2_.var() / y2.var()))
    A3 = np.column_stack([np.ones(85), z(dist), z(X("pov"))])
    b3 = np.linalg.lstsq(A3, y2, rcond=None)[0]; r3_ = y2 - A3 @ b3
    S["ols_dist_pov"] = dict(n=85, beta_dist=float(b3[1]), beta_pov=float(b3[2]), r2=float(1 - r3_.var() / y2.var()))
    A4 = np.column_stack([np.ones(85), z(dist)]); b4 = np.linalg.lstsq(A4, y2, rcond=None)[0]; r4_ = y2 - A4 @ b4
    S["ols_dist_only"] = dict(n=85, r2=float(1 - r4_.var() / y2.var()))
    sp = sorted(rows, key=lambda x: x["pov"])
    S["pov_quartiles"] = [dict(pooled(q), pov_min=min(x["pov"] for x in q), pov_max=max(x["pov"] for x in q)) for q in (sp[0:21], sp[21:42], sp[42:63], sp[63:85])]
    S["pov_top"] = [(x["iso"], x["en"], x["pov"], x["deaths_rate"]) for x in sorted(rows, key=lambda x: -x["pov"])[:8]]
    # rankings
    rk = sorted(rows, key=lambda x: -x["deaths_rate"])
    S["top"] = [(x["iso"], x["en"], x["deaths_rate"], x["deaths"]) for x in rk[:10]]
    S["bottom"] = [(x["iso"], x["en"], x["deaths_rate"], x["deaths"]) for x in rk[-6:]]
    S["top10_pop_share"] = sum(x["pop"] for x in rk[:10]) / pop85 * 100
    S["top10_death_share"] = sum(x["deaths"] for x in rk[:10]) / named85 * 100
    # bonus
    bm = [x for x in rows if "months" in x["bonus"]]
    S["bonus_n"] = len(bm)
    firm = [x for x in bm if x["bonus"]["status"] == "ok"]
    S["bonus_n_firm"] = len(firm)
    S["bonus_corr_all"] = dict(spearman=spear([x["bonus"]["months"] for x in bm], [x["deaths_rate"] for x in bm]), n=len(bm))
    S["bonus_corr_firm"] = dict(spearman=spear([x["bonus"]["months"] for x in firm], [x["deaths_rate"] for x in firm]), n=len(firm))
    S["bonus_corr_total_rub"] = dict(spearman=spear([x["bonus"]["total"] for x in bm], [x["deaths_rate"] for x in bm]), n=len(bm))
    bs = sorted(bm, key=lambda x: -x["bonus"]["months"])
    S["bonus_top"] = [(x["iso"], x["en"], x["bonus"]["months"], x["bonus"]["total"], x["wage"]) for x in bs[:8]]
    S["bonus_bottom"] = [(x["iso"], x["en"], x["bonus"]["months"]) for x in bs[-5:]]
    S["bonus_median_months"] = float(np.median([x["bonus"]["months"] for x in bm]))
    S["wage_rf_2025"] = wages["Российская Федерация"]["2025"] if "Российская Федерация" in wages else None
    # recruitment-type shares among type-labeled dead
    S["type_totals"] = {k: sum(x[k] for x in rows) for k in ("vol", "mob", "pri")}
    S["sankey"] = {f: {k: sum(x[k] for x in rows if x["fd"] == f) for k in ("vol", "pri", "mob")} for f in FD_EN.values()}
    for f in S["sankey"]: S["sankey"][f]["other"] = S["fd"][f]["deaths"] - sum(S["sankey"][f].values())
    S["type_wage_spearman"] = {k: spear(wage, X(k + "_rate")) for k in ("vol", "mob", "pri")}
    S["type_dist_spearman"] = {k: spear(dist, X(k + "_rate")) for k in ("vol", "mob", "pri")}
    def sig2(v): return float(f"{v:.2g}")
    S["breaks"] = {k: [sig2(float(np.percentile(X(k + "_rate"), q))) for q in (25, 50, 75)] for k in ("deaths", "vol", "mob", "pri")}
    S["breaks"]["pov"] = [sig2(float(np.percentile(X("pov"), q))) for q in (25, 50, 75)]
    S["breaks"]["ru"] = [sig2(float(np.percentile(X("ru_share"), q))) for q in (25, 50, 75)]
    S["breaks"]["bonus"] = [sig2(float(np.percentile([x["bonus"]["months"] for x in bm], q))) for q in (25, 50, 75)]
    S["breaks"]["dist"] = [sig2(float(np.percentile(dist, q))) for q in (25, 50, 75)]
    json.dump(dict(meta=dict(accessed="28 Oct 2026", mz_updated="23 Oct 2026", pop_date="1 Jan 2024", wage_year=2025), regions=rows),
              open(os.path.join(OUT, "regions.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    json.dump(S, open(os.path.join(OUT, "stats.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    json.dump(dict(items=[{k: v for k, v in p.items()} for p in P]), open(os.path.join(OUT, "pools.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    cols = ["iso","en","kind","fd","pop","rural_share","deaths","deaths_rate","vol","vol_rate","mob","mob_rate","pri","pri_rate","wage","ru_share","dist_km","pov","pov_kind"]
    with open(os.path.join(OUT, "russia_soldiers_regions.csv"), "w", newline="", encoding="utf-8") as f:
        w = csv.writer(f)
        w.writerow(["ISO 3166-2 code","Region","Type (republic/other)","Federal district","Population 1 Jan 2024 (Rosstat)","Rural share of population %",
                    "Named dead (Mediazona+BBC, 23 Oct 2026)","Named dead per 100,000","Named dead volunteers","Volunteers per 100,000","Named dead mobilized","Mobilized per 100,000",
                    "Named dead prisoners","Prisoners per 100,000","Average monthly wage 2025 rubles (Rosstat)","Ethnic Russian share % (census 2020)","Distance from Moscow km (centroid to centroid)","Poverty rate 2025 % (Rosstat)","Poverty rate basis",
                    "Federal bonus rubles","Regional bonus rubles (standard contract)","Total bonus rubles","Total bonus in months of local wages","Bonus data status","Bonus note"])
        for x in rows:
            b = x["bonus"]
            w.writerow([x[c] if not isinstance(x[c], float) else round(x[c], 2) for c in cols] +
                       ([b["federal"], b["regional"], b["total"], round(b["months"], 2), b["status"], ""] if "months" in b else ["", "", "", "", "excluded", b["excluded"]]))
    return rows, S

if __name__ == "__main__":
    rows, S = main()
    print(json.dumps({k: S[k] for k in ("national_rate", "corr", "groups", "ols", "bonus_corr_all", "bonus_corr_firm", "bonus_top", "bonus_median_months", "top", "bottom", "type_totals", "type_wage_spearman", "type_dist_spearman")}, ensure_ascii=False, indent=1))
    print(S["fd"]); print(S["wage_quartiles"]); print(S["missing_ru"], S["outside_85"])
