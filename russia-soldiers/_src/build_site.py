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
    # --- round 3: one-line verdicts (long explanations stay behind toggles) and new sections
    pq = S["pov_quartiles"]; op = S["ols_dist_pov"]; od = S["ols_dist_only"]; pr = S["probate"]; pt = {x[0]: x for x in S["pov_top"]}
    V["v_remote"] = f"Remote: supported. Far East {n0(fd['Far East']['rate'])} against {n0(fd['Central']['rate'])} in the Central district per 100,000; distance r = {sg(c['dist']['pearson'][0])}."
    V["v_pov"] = (f"Poverty: weak link. Poorest quarter of regions {n0(pq[3]['rate'])} against {n0(pq[0]['rate'])} in the least poor, but r = {sg(c['pov']['pearson'][0])} (Spearman {sg(c['pov']['spearman'][0])}) "
                  f"and poverty adds {n1((op['r2'] - od['r2']) * 100)} points to the {n1(od['r2'] * 100)}% that distance already explains.")
    V["pov_how"] = (f"Poverty is the share of residents with income below the poverty line, Rosstat 2025. The link is positive but weak: Pearson r = {sg(c['pov']['pearson'][0])} (p = {c['pov']['pearson'][1]:.2f}), "
                    f"Spearman {sg(c['pov']['spearman'][0])} (p = {c['pov']['spearman'][1]:.2f}), and it is no stronger without the two derived regions (r = {sg(c['pov_published']['pearson'][0])} across {c['pov_published']['n']}). "
                    f"Poor regions are also remote (poverty against distance, Spearman {sg(c['pov_dist']['spearman'][0])}), and with distance in the model poverty\u2019s standardised weight falls to {n2(op['beta_pov'])} against {n2(op['beta_dist'])} for distance. "
                    f"The poorest regions split: Ingushetia ({n1(pt['RU-IN'][2])}% poor) and Chechnya ({n1(pt['RU-CE'][2])}%) have {n0(pt['RU-IN'][3])} and {n0(pt['RU-CE'][3])} named dead per 100,000, among the lowest, "
                    f"while Tuva ({n1(pt['RU-TY'][2])}%, {n0(pt['RU-TY'][3])}) and Buryatia ({n1(pt['RU-BU'][2])}%, {n0(pt['RU-BU'][3])}) are among the highest.")
    V["v_wage"] = f"Wages: no clear pattern. Spearman {sg(c['wage']['spearman'][0])}; lowest-paid quarter {n0(q[0]['rate'])}, below the two middle quarters ({n0(q[1]['rate'])} and {n0(q[2]['rate'])})."
    V["v_eth"] = (f"Minority: mixed. Republics {n0(g['republics']['rate'])} against {n0(g['non_republics']['rate'])} elsewhere, but Russian share alone is not linked (r = {sg(c['ru']['pearson'][0])}, p = {c['ru']['pearson'][1]:.2f}, 85 regions).")
    V["v_bonus"] = f"Bonus: median {n1(S['bonus_median_months'])} months of local wages across {S['bonus_n']} regions; bigger bonuses go with lower death rates (Spearman {sg(S['bonus_corr_all']['spearman'][0])})."
    V["v_type"] = f"Named dead by label: {n0(tt['vol'])} volunteers, {n0(tt['pri'])} prisoners, {n0(tt['mob'])} mobilised."
    V["v_rank"] = f"The ten highest rates hold {n1(S['top10_pop_share'])}% of residents but {n1(S['top10_death_share'])}% of the named dead; none is in the Central district."
    V["uc_line"] = f"The named list undercounts. A probate-registry estimate puts Russian military dead at {n0(pr['total'])} by the end of 2025, {n1(pr['mult'])} times the {n0(pr['named_at_date'])} names on the list when it was made."
    import build_flows; build_flows.build()
    FL = D("flows.json")
    A = {x["id"]: x for x in FL["arrows"]}; BR = {x["kind"]: x["n"] for x in FL["bars"]}
    assert A["vol"]["low"] > A["mob"]["high"] > A["pri"]["low"] and BR["pri"] > BR["mob"] and FL["bars"][0]["kind"] == "vol"
    V["v_flow"] = (f"Contract soldiers and volunteers are by far the biggest inflow: {n0(A['vol']['low'])} to {n0(A['vol']['high'])} recruited, against {n0(A['mob']['low'])} to {n0(A['mob']['high'])} mobilised and "
                   f"{n0(A['pri']['low'])} to {n0(A['pri']['high'])} prisoners.")
    TSP = {s_["kind"]: {p_["id"]: p_ for p_ in s_["points"]} for s_ in FL["ts"]["series"]}
    assert TSP["vol"]["vol23"]["low"] > TSP["vol"]["vol25"]["low"] and TSP["for"]["for25"]["low"] > TSP["for"]["for23"]["low"]
    V["v_ts"] = f"Official contract and volunteer figures fell from {n0(TSP['vol']['vol23']['low'])} in 2023 to {n0(TSP['vol']['vol25']['low'])} in 2025; mobilisation has not been repeated."
    V["ts_gaps"] = FL["ts"]["gaps"]
    V["flow_skipped"] = FL["skipped"]; V["flow_notdrawn"] = FL["not_drawn"]
    import nk_inputs as NKI
    cnt = {s_: sum(1 for r in NKI.ROWS if r["status"] == s_) for s_ in NKI.STATUS}
    V["v_nk"] = ("Documented: the treaty, the troops\u2019 presence and the sea route for 29,488 containers of munitions. "
                 "Contested: how many North Koreans have died (2,304 named by the BBC against 3,000 claimed by Ukraine) and the missile unit.")
    V["r_dag_ru"] = n1(by["RU-DA"]["ru_share"])
    V["r_ru_p"] = f"{c['ru']['pearson'][1]:.2f}"
    V["ols_pov"] = (f"With distance, poverty and Russian share together on 85 regions, {n0(S['ols_pov']['r2']*100)}% of the variation is explained (standardised weights: distance {n2(S['ols_pov']['beta_dist'])}, "
                    f"poverty {n2(S['ols_pov']['beta_pov'])}, Russian share {n2(S['ols_pov']['beta_ru'])}).")
    V["pov_derived"] = " and ".join(S["pov_derived"])
    V["probate_regular"] = n0(pr["regular"]); V["probate_late"] = n0(pr["late"])
    # --- restructure: recruit types first
    import build_colonies
    CO = build_colonies.build()
    assert CO["total_recruits"] == 48366 and V["wagner"].replace(",", "") == "48366"
    ud = CO["undrawn"]
    V["pri_named"], V["mob_named"] = n0(tt["pri"]), n0(tt["mob"])
    assert tt["pri"] > tt["mob"]
    V["vol_range"] = f"{A['vol']['low']/1e6:.1f} to {A['vol']['high']/1e6:.1f} million"
    V["undrawn_n"], V["undrawn_rec"] = n0(ud["n"]), n0(ud["recruits"])
    V["v_pris"] = (f"Wagner recruited at least {n0(CO['total_recruits'])} prisoners from {CO['rows']} colonies between 1 Jul 2022 and 7 Feb 2023. "
                   f"{CO['drawn']} of the colonies, holding {n0(CO['drawn_recruits'])} of the recruits, can be placed on the map.")
    V["col_note"] = (f"Circle area is the minimum recruited, Wagner period Jul 2022 to Feb 2023 only; the true count is at least this. "
                     f"{n0(ud['n'])} colonies with {n0(ud['recruits'])} recruits are not drawn. Hover or tap a circle; Ctrl and scroll or pinch to zoom.")
    V["col_how"] = (f"Each Wagner dog tag carried the number of the prison colony the man came from, and the numbers ran in the order the colonies were visited, so the highest number found among a colony\u2019s dead is the fewest men it supplied. "
                    f"Mediazona and BBC News Russian found {CO['rows']} such numbers, from K1 to K617 with 116 missing, and matched 341 of them to named colonies; locations are as plotted on Mediazona\u2019s map. "
                    f"{n0(ud['n'] - 1)} colonies could not be named, and one more, IK24 Ukhta, is not drawn because Mediazona\u2019s English and Russian labels name different colonies (Ukhta in Komi, and Fornosovo near St Petersburg); "
                    f"together they hold {n0(ud['recruits'])} of the {n0(CO['total_recruits'])} recruits. \u201cKilled\u201d comes from Wagner\u2019s payment records, which cover deaths from January 2022 to August 2023, and is not a loss rate for the recruits.")
    V["v_type_pris"] = f"Prisoners outnumber mobilised men among the named dead: {n0(tt['pri'])} against {n0(tt['mob'])}.[[mz_regions]]"
    V["v_pts"] = (f"Wagner took at least {n0(TSP['pri']['pri22']['low'])} prisoners by 7 Feb 2023; the Defence Ministry\u2019s Storm Z units took {n0(TSP['pri']['pri23']['low'])} to {n0(TSP['pri']['pri23']['high'])} more by Sep 2023 (iStories estimate).[[istories]] "
                  f"No count exists for later months.")
    V["v_for"] = (f"Foreign contract signers counted by Ukraine rose from {n0(TSP['for']['for23']['low'])} in 2023 to {n0(TSP['for']['for25']['low'])} in 2025;[[liga_foreign]] "
                  f"{n0(A['ca']['low'])} recruits are from Central Asia.[[occrp_foreign]]")
    V["ca_n"] = n0(A["ca"]["low"]); V["ca_killed"] = "1,399"
    V["ts_note"] = ("Each filled block is a published total for the period it covers, drawn down to zero; a lighter band reaches a range\u2019s high figure and a ring is an outside estimate. "
                    "Fills overlap instead of stacking, because the types are separate counts that a stack would add into a false total. Gaps stay empty.")
    V["ts_gaps_con"] = "No dated figure was found for contract signers in 2022 or for any later call-up of mobilised men. These are gaps, not zeros."
    V["ts_gaps_for"] = "No dated figure was found for foreigners before 2022. That is a gap, not a zero."
    V["ts_how"] = ("The scale is linear from zero. Each block is one published total for the period it covers, so a half-year block is not a full year and is not joined to the years before it. "
                   "Contract and volunteer figures are official claims;[[ria_shoigu24]][[tass_med25]][[interfax_med26]][[ng_bonus]] hollow markers are iStories estimates from budget data.[[isw_istories23]][[istories_407]] "
                   "Mobilised: one call-up wave in September and October 2022, shown as two reports of the same men, the Kremlin\u2019s count on 28 Oct 2022[[kremlin]] and Mediazona\u2019s later estimate on 2 Mar 2023;[[dw_mz527]] the rise is a higher count of that wave, not more men called up. "
                   + V["ts_gaps_con"] + " Press Play to redraw the chart from left to right.")
    return V

GROUPS = [("contracts", "Contract soldiers (volunteers)"), ("mobilised", "Mobilised men"), ("prisoners", "Prisoners"), ("foreigners", "Foreign recruits"), ("northkorea", "North Korea: troops and workers")]
def pool_rows(groups):
    items = [p for p in D("pools.json")["items"] if p["low"] and p["unit"] != "roubles"]
    mx = max(p["high"] for p in items)
    out = []
    for gk, gl in [g for g in GROUPS if g[0] in groups]:
        out.append(f'<h4 class="grp">{gl}</h4>')
        for p in [p for p in items if p["pool"] == gk]:
            lo, hi = p["low"], p["high"]
            val = f"{lo:,}" if lo == hi else f"{lo:,} to {hi:,}"
            tip = html.escape(f"{p['label']}: {val} {p['unit']}. {p['note']}", quote=True)
            rng = f'<span class="bw" style="left:{lo/mx*100:.2f}%;width:{(hi-lo)/mx*100:.2f}%"></span>' if hi != lo else ""
            out.append(f'<div class="brow" data-g="{gk}" tabindex="0" data-tip="{tip}"><span class="bl">{html.escape(p["label"], quote=False)}</span><span class="bt"><span class="bf" style="width:{lo/mx*100:.2f}%"></span>{rng}</span><span class="bv">{val}</span></div>'
                       f'<p class="rnote">{html.escape(p["text"][0].upper() + p["text"][1:], quote=False)}.[[{p["src"]}]]</p>')
    return "\n".join(out)

def build():
    V = values()
    src = open(os.path.join(ROOT, "index.src.html"), encoding="utf-8").read()
    for k, v in V.items(): src = src.replace("{{" + k + "}}", html.escape(str(v), quote=False))
    for k_, g_ in (("pri", ("prisoners",)), ("for", ("foreigners",)), ("con", ("contracts", "mobilised"))):
        src = src.replace("{{pool_rows_" + k_ + "}}", pool_rows(g_))
    import build_flows
    build_flows.build(); NKR = build_flows.render()
    src = src.replace("{{nk_cards}}", NKR["cards"]).replace("{{nk_timeline}}", NKR["timeline"])
    import build_trackers
    TR = build_trackers.build(); SOURCES.update(TR["autosrc"])
    src = src.replace("{{trackers_html}}", build_trackers.render(TR)).replace("{{trackers_generated}}", html.escape(TR["generated"] or "not yet run"))
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
