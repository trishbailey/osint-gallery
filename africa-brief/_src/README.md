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

## v1.3 (flags, gold routes, graphics instead of tables)
- `pipeline/apply_v13.py` adds gold routes (`goldroutes`: Africa to UAE, UAE to Switzerland, UAE to crypto, and the A7A5 rail marked "reported"), their sources and the gold paragraphs. Run after apply_v12.
- Belt and Road markers are an inline SVG Chinese flag symbol (`#cnflag` in index.html). Large tables were replaced with a backer dot matrix, a world-share bar chart, Russia cards, BRI cards and bars, and owner-grouped media tags. The full data is in the Google Sheet.

## v1.4 — A7 in Africa (public sources only)
- `pipeline/apply_v14.py` (idempotent) adds `a7` (country categories), `a7route` (gold → refinery → UAE → USDT/A7A5 → rubles, plus Hong Kong), `a7cog`, `a7fric`, a Sahel paragraph, and removes personal names from `goldroutes.a7`.
- Big picture only: no personal names, wallets, domains or staff details. Each claim cites a public source.
- Theme: CSS variables match cartel-dashboard (`--muted #9aa6b8` is text only). Data palettes are checked with CIEDE2000, minimum ΔE 20 per graphic.
