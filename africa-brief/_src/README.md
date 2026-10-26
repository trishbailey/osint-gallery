# Africa Brief – source and rebuild

Published at `/africa-brief/` (files one level up). This folder holds the key-free pipeline.

- `rebuild.sh` – daily news refresh, run by `.github/workflows/africa-brief-news.yml` at 09:30 UTC (5:30 AM EDT / 4:30 AM EST). Translation uses the open-source NLLB-200 model locally on the runner (cached); set `TRANSLATE=0` to skip machine translation (previous translations are reused).
- `pipeline/validate_brief.py` – must pass or the refresh is not committed.
- `check_labels.py` – Playwright legibility check (local).
- X posts (`news/x_posts.json`) are refreshed manually, not in CI.

Conflict shading (`../data/conflict_hex.geojson`) is derived from UCDP GED v26.1 and UCDP Candidate GED v26.01 (Uppsala Conflict Data Program), CC BY 4.0, https://ucdp.uu.se/. Basemap: Natural Earth (public domain).

## v1.2 (dark restyle, storylines, endnotes)
- `pipeline/v12_content.py` holds the analytic explainers (`{{place|text}}` map links, `[[source-ids]]` endnotes), region summaries, map places, armed-group profiles and the Russia alignment matrix. `python pipeline/apply_v12.py ../data/brief.json` merges it into `data/brief.json` (idempotent).
- `pipeline/storylines.py` defines the standing storylines per region (context header fields, `kw` match regex, optional `req`/`not` guards, map places, sources). `news/cluster.py` runs after `translate.py`, groups same-event items and hangs them on a storyline only on a specific keyword match, otherwise under "Other developments". Output: `data/stories.json`.
- `data/ucdp_monthly.json`: UCDP GED best-estimate deaths per region per month (24 months).
- `validate_brief.py` also rejects semicolon-joined text, "actions vs statements" text, unknown places, groups or cites, and storylines with missing context or watch-for lines. `check_labels.py [port]` checks every visible map label is at least 13px and 4.5:1 contrast.
