# Russia's Soldiers: build notes

Where does Russia find soldiers for the war in Ukraine, and do poor, remote and ethnic-minority regions pay more of the cost?

Build: `python3 _src/build_data.py && python3 _src/build_site.py` (data from `data/raw/`, page from `index.src.html`).
Checks: `python3 _src/audit.py` (independent re-derivation, exit 1 on mismatch), `python3 _src/check_urls.py`, `python3 _src/screenshots.py` (Playwright at 1440 and 390 px, tooltips and buttons).
Fix map ring winding once: `python3 _src/fix_winding.py`.

Sources are listed in `_src/sources.py` and appear in the page's single "Data Sources" dropdown. Saved quote texts are in `data/raw/quotes/`.
Known limits are in the page's Method section: the named list undercounts, wages are a proxy for poverty (no regional poverty-rate table reachable), bonus data is a private aggregator's card text.
