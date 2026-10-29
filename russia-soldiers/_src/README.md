# Russia's Soldiers: build notes

Where does Russia find soldiers for the war in Ukraine, and do poor, remote and ethnic-minority regions pay more of the cost?

Build: `python3 _src/build_data.py && python3 _src/build_site.py` (data from `data/raw/`, page from `index.src.html`).
Checks: `python3 _src/audit.py` (independent re-derivation, exit 1 on mismatch), `python3 _src/check_urls.py`, `python3 _src/screenshots.py` (Playwright at 1440 and 390 px, tooltips and buttons).
Fix map ring winding once: `python3 _src/fix_winding.py`.

Sources are listed in `_src/sources.py` and appear in the page's single "Data Sources" dropdown. Saved quote texts are in `data/raw/quotes/`.
Known limits are in the page's Method section: the named list undercounts, wages are a proxy for poverty (no regional poverty-rate table reachable), bonus data is a private aggregator's card text.

## Round 3 additions
- Poverty: `data/raw/poverty_rate_2025_roschart.txt` (published Rosstat rates, 83 regions) and `poverty_count_2025_statbase.txt` (headcounts; used to cross-check and to derive Nenets AO and Khanty-Mansi AO). Loader: `load_raw.load_poverty`.
- Dagestan Russian share from Rosstat Vol. 5 Table 1 (via genetik.pro): `quotes/census_dagestan.txt`.
- Bonus gaps: `bonus_inputs.B2` (GOGOV table, Jan 2026, status `stale`; Penza from Penzaobzor, `unpublished`). Six regions stay in `EXCLUDED` with reasons.
- Pools: probate estimate (`pool="estimate"`, shown only in the undercount notice), foreign named dead, NATO single-source claim, North Korea named dead and NIS estimate.
- Photos: `img/` (Wikimedia Commons, public domain, resized); credits live only in `sources.py` and the Data Sources list.
- `vendor/d3-sankey.min.js` 0.12.3 (BSD 3-Clause, licence beside it). The Sankey is built in `app.js` from `stats.json["sankey"]`, which `audit.py` re-derives.
- Run order: `build_data.py`, `build_site.py`, `audit.py`, `check_urls.py`, then `screenshots.py <url> <outdir>`.
