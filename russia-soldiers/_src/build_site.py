"""index.src.html -> index.html. Fills {{values}} from data/*.json (so every number on the page comes from the audited data),
numbers [[source]] citations by first appearance and writes the Data Sources list."""
import json, os, re, html
from sources import SOURCES, ACC
from bonus_inputs import EXCLUDED
HERE = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.join(HERE, "..")
D = lambda n: json.load(open(os.path.join(ROOT, "data", n), encoding="utf-8"))

def n0(x): return f"{x:,.0f}"
def n1(x): return f"{x:,.1f}"
def n2(x): return f"{x:.2f}".replace("-", "\u2212")
def sg(x): return n2(x)

def values():
    R = D("regions.json")["regions"]; S = D("stats.json")
    by = {r["iso"]: r for r in R}
    rk = sorted(R, key=lambda r: -r["deaths_rate"])
    fd, g, q = S["fd"], S["groups"], S["wage_quartiles"]
    c = S["corr"]
    top10 = rk[:10]
    sibfe = sum(1 for r in top10 if r["fd"] in ("Siberia", "Far East"))
    assert not any(r["fd"] == "Central" for r in top10)
    bm = [r for r in R if "months" in r["bonus"]]
    bs = sorted(bm, key=lambda r: -r["bonus"]["months"])
    V = dict(
        named_total=n0(S["named_total"]), named_85=n0(S["named_85"]), outside_85=n0(S["named_total"] - S["named_85"]),
        nat_rate=n1(S["national_rate"]), tuva_rate=n1(by["RU-TY"]["deaths_rate"]), mow_rate=n1(by["RU-MOW"]["deaths_rate"]),
        chu_rate=n1(by["RU-CHU"]["deaths_rate"]), che_rate=n1(by["RU-CE"]["deaths_rate"]),
        fe_rate=n0(fd["Far East"]["rate"]), central_rate=n0(fd["Central"]["rate"]),
        q1_contracts="71,216", top10_pop=n1(S["top10_pop_share"]), top10_dead=n1(S["top10_death_share"]), top10_sibfe=["Zero","One","Two","Three","Four","Five","Six","Seven","Eight","Nine","Ten"][sibfe],
        foreigners="45,959", wagner="48,366",
        excluded_list="; ".join(f"{by[i]['en']} ({v[1]})" for i, v in EXCLUDED.items()).replace("; ", ", "),
        r_ru_dag=sg(c["ru_dag4"]["pearson"][0]),
    )
    ratio = fd["Far East"]["rate"] / fd["Central"]["rate"]
    V["f1"] = (f"The farther a region lies from Moscow, the more of its residents appear on the named list. Across 85 regions the correlation between distance and named dead per 100,000 is r = {sg(c['dist']['pearson'][0])} "
               f"(Spearman {sg(c['dist']['spearman'][0])}), and the Far East has {n0(fd['Far East']['rate'])} per 100,000 against {n0(fd['Central']['rate'])} in the Central district, {n1(ratio)} times as many.")
    V["f2"] = (f"Wages do not explain it. Regions with higher average wages have slightly higher rates (Spearman {sg(c['wage']['spearman'][0])}, rising to {sg(c['wage_ex_cities']['spearman'][0])} without Moscow and St Petersburg), "
               f"and the lowest-paid quarter of regions has {n0(q[0]['rate'])} per 100,000, below the two middle quarters ({n0(q[1]['rate'])} and {n0(q[2]['rate'])}).")
    tu = by["RU-TY"]
    V["f3"] = (f"Ethnic minorities are hit unevenly. Tuva, where ethnic Russians are {n1(tu['ru_share'])}% of residents, has the highest rate ({n0(tu['deaths_rate'])} per 100,000), and the republics of Buryatia and Altai rank fourth and fifth, "
               f"while Chechnya ({n0(by['RU-CE']['deaths_rate'])}) and Ingushetia ({n0(by['RU-IN']['deaths_rate'])}) are among the lowest. The {g['ru_lt50']['n']} regions with fewer than half Russian residents average {n0(g['ru_lt50']['rate'])} per 100,000 "
               f"against {n0(g['ru_ge50']['rate'])} elsewhere, but the link with Russian share is weak (r = {sg(c['ru']['pearson'][0])}, p = {c['ru']['pearson'][1]:.2f}).")
    V["cap1"] = (f"The farther a region lies from Moscow, the more of its residents appear on the named list: across 85 regions the correlation between distance and named dead per 100,000 is r = {sg(c['dist']['pearson'][0])} (Spearman {sg(c['dist']['spearman'][0])}). "
                 f"The Far East has {n0(fd['Far East']['rate'])} per 100,000 against {n0(fd['Central']['rate'])} in the Central district, {n1(ratio)} times as many, and Siberia has {n0(fd['Siberia']['rate'])}. "
                 f"The North Caucasus ({n0(fd['North Caucasus']['rate'])}) is as low as the Central district.")
    V["cap2"] = (f"Wages do not explain it. Regions with higher average wages have slightly higher rates (Spearman {sg(c['wage']['spearman'][0])}, rising to {sg(c['wage_ex_cities']['spearman'][0])} without Moscow and St Petersburg), "
                 f"and the lowest-paid quarter of regions has {n0(q[0]['rate'])} per 100,000, below the two middle quarters ({n0(q[1]['rate'])} and {n0(q[2]['rate'])}). "
                 f"The highest rates include well-paid remote regions such as Chukotka and Magadan, while the lowest include Moscow city and St Petersburg.")
    V["cap3"] = (f"Ethnic minority republics have {n0(g['republics']['rate'])} named dead per 100,000 against {n0(g['non_republics']['rate'])} elsewhere, and hold {n1(g['republics']['share_deaths'])}% of the named dead with {n1(g['republics']['share_pop'])}% of residents. "
                 f"The regions with fewer than half Russian residents average {n0(g['ru_lt50']['rate'])} against {n0(g['ru_ge50']['rate'])} elsewhere. "
                 f"But the pattern is uneven: Tuva ({n0(tu['deaths_rate'])}, {n1(tu['ru_share'])}% Russian) is highest, while Chechnya ({n0(by['RU-CE']['deaths_rate'])}) and Ingushetia ({n0(by['RU-IN']['deaths_rate'])}) are among the lowest, and the link with Russian share is weak (r = {sg(c['ru']['pearson'][0])}, p = {c['ru']['pearson'][1]:.2f}).")
    o = S["ols"]
    V["ols"] = (f"Fitting distance, wage and Russian share together on {o['n']} regions explains {n0(o['r2']*100)}% of the variation in rates, and almost all of that comes from distance "
                f"(standardised weights: distance {n2(o['beta_dist'])}, wage {n2(o['beta_wage'])}, Russian share {n2(o['beta_ru'])}).")
    top = bs[0]
    V["capb"] = (f"Finding: the bonus is worth a median of {n1(S['bonus_median_months'])} months of local wages across {S['bonus_n']} regions, and the most months are offered in regions with lower wages: "
                 f"{top['en']} ({n1(top['bonus']['months'])} months), then {bs[1]['en']} and {bs[2]['en']}. The regions with the biggest bonuses in months have lower death rates, not higher ones "
                 f"(Spearman {sg(S['bonus_corr_all']['spearman'][0])} across {S['bonus_corr_all']['n']} regions, {sg(S['bonus_corr_firm']['spearman'][0])} across the {S['bonus_corr_firm']['n']} firm ones, which is not significant). "
                 f"Bonuses are a sign of how hard a region is pushed to recruit, and the data here do not show them reaching the people who die.")
    tt = S["type_totals"]; tot = S["named_85"]
    V["captype"] = (f"Finding: among the {n0(tot)} names in the 85 regions, {n0(tt['vol'])} are labelled volunteers, {n0(tt['pri'])} prisoners and {n0(tt['mob'])} mobilised men. The rest are labelled by arm of service or have no data. "
                    f"Volunteer and prisoner rates both rise with distance from Moscow (Spearman {sg(S['type_dist_spearman']['vol'][0])} and {sg(S['type_dist_spearman']['pri'][0])}).")
    V["capb"] = V["capb"].replace("Bonuses are a sign of how hard a region is pushed to recruit, and the data here do not show them reaching the people who die.", "A bigger bonus relative to pay does not go with more deaths in a region.")
    return V

GROUPS = [("contracts", "Contract soldiers (volunteers)"), ("mobilised", "Mobilised men"), ("prisoners", "Prisoners"), ("foreigners", "Foreign recruits"), ("northkorea", "North Korean troops")]
def pool_rows():
    items = [p for p in D("pools.json")["items"] if p["low"] and p["unit"] != "roubles"]
    mx = max(p["high"] for p in items)
    out = []
    for gk, gl in GROUPS:
        out.append(f'<h4 class="grp">{gl}</h4>')
        for p in [p for p in items if p["pool"] == gk]:
            lo, hi = p["low"], p["high"]
            val = f"{lo:,}" if lo == hi else f"{lo:,} to {hi:,}"
            tip = html.escape(f"{p['label']}: {val} {p['unit']}. {p['note']}", quote=True)
            rng = f'<span class="bw" style="left:{lo/mx*100:.2f}%;width:{(hi-lo)/mx*100:.2f}%"></span>' if hi != lo else ""
            out.append(f'<div class="brow" tabindex="0" data-tip="{tip}"><span class="bl">{html.escape(p["label"], quote=False)}</span><span class="bt"><span class="bf" style="width:{lo/mx*100:.2f}%"></span>{rng}</span><span class="bv">{val}</span></div>'
                       f'<p class="rnote">{html.escape(p["text"][0].upper() + p["text"][1:], quote=False)}.[[{p["src"]}]]</p>')
    return "\n".join(out)

def build():
    V = values()
    src = open(os.path.join(ROOT, "index.src.html"), encoding="utf-8").read()
    for k, v in V.items(): src = src.replace("{{" + k + "}}", html.escape(str(v), quote=False))
    src = src.replace("{{pool_rows}}", pool_rows())
    order = []
    def cite(m):
        k = m.group(2)
        if k not in order: order.append(k)
        n = order.index(k) + 1
        return f'<span class="nw">{m.group(1)}<sup><a class="cite" href="#src-{n}">[{n}]</a></sup></span>'
    src = re.sub(r"(\S*?)\[\[(\w+)\]\]", lambda m: cite(m), src)
    for k in [p["src"] for p in D("pools.json")["items"]]:
        if k not in order: order.append(k)
    lis = []
    for i, k in enumerate(order, 1):
        s = SOURCES[k]
        lis.append(f'<li id="src-{i}"><span class="srcn">[{i}]</span> {html.escape(s["full"], quote=False)} <a href="{s["url"]}" rel="noopener">{html.escape(s["url"], quote=False)}</a> Accessed {ACC}.</li>')
    src = src.replace("{{sources_html}}", "\n".join(lis))
    assert "{{" not in src and "[[" not in src, re.findall(r"\{\{.*?\}\}|\[\[.*?\]\]", src)
    open(os.path.join(ROOT, "index.html"), "w", encoding="utf-8").write(src)
    cites = {k: i + 1 for i, k in enumerate(order)}
    json.dump(cites, open(os.path.join(ROOT, "data", "cites.json"), "w"), indent=1)
    return cites, order, V

if __name__ == "__main__":
    cites, order, V = build(); print(cites)
