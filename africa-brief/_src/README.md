# Africa Brief – source and rebuild

Published at `/africa-brief/` (files one level up). This folder holds the key-free pipeline.

- `rebuild.sh` – daily news refresh, run by `.github/workflows/africa-brief-news.yml` at 09:30 UTC (5:30 AM EDT / 4:30 AM EST). Translation uses the open-source NLLB-200 model locally on the runner (cached); set `TRANSLATE=0` to skip machine translation (previous translations are reused).
- `pipeline/validate_brief.py` – must pass or the refresh is not committed.
- `check_labels.py` – Playwright legibility check (local).
- X posts (`news/x_posts.json`) are refreshed manually, not in CI.

Conflict shading (`../data/conflict_hex.geojson`) is derived from UCDP GED v26.1 and UCDP Candidate GED v26.01 (Uppsala Conflict Data Program), CC BY 4.0, https://ucdp.uu.se/. Basemap: Natural Earth (public domain).
