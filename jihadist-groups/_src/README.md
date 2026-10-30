# Jihadist Groups: Who's Who (source and refresh notes)

Live page: https://beacon-tools.onrender.com/jihadist-groups/

The page is static. `index.html` is a shell, `app.js` draws everything from `../data.json`, and D3 and the Natural Earth basemap are vendored (`../vendor/`, `../data/world.json`). No build step runs on Render.

## Files

| File | What it does |
|---|---|
| `data_in/groups.json` | One record per group: family, state, leader, change, strength, contested items, sources. |
| `data_in/relations.json` | Links between groups and four outside actors (Iran, Azawad Liberation Front, Syrian government, Yemen government and Saudi coalition). |
| `data_in/incidents.json` | Major incidents in the 30-day window, with coordinates and confidence. |
| `data_in/momentum.json` | Rising, steady, declining or not-enough-evidence, with the reason. |
| `data_in/images.json`, `source_titles.json`, `url_check.json`, `extra_sources.json` | Image credits, cached source titles, URL status. |
| `migrate_phase2.py` | One-time migration that applied the owner's decisions (Taliban and HTS now governing, Iran-backed axis, JAD, Maute and BIFF in the Islamic State network). Idempotent. |
| `source_titles.py` | Collects every URL, records its status and title. Only 404 and 410 count as dead. |
| `fetch_images.py` | Downloads Wikimedia thumbnails to `../img/` (360px wide). |
| `build_data.py` | Builds `../data.json` and holds `FAMILY_COLORS` and `DISSOLVED_COLOR`. |
| `gen_page.py` | Writes `../index.html`. |
| `test_figures.py` | Figures, palette, notes and wording checks. Run by `scripts/ci_check.py`. |
| `qa_shots.py` | Desktop and 390px screenshots into `ci-screens/jihadist-groups/`. |

## Colours

Family colours and the dissolved or dormant colour are set once in `build_data.py` and read by the page from `data.json`.
`DISSOLVED_COLOR` is grey (`#a4a4a7`) so dissolved markers read as inactive. The shared colour check (`scripts/ci_check.py`) allows grey only on elements marked `data-status="defunct"`, so `app.js` sets that attribute on every map marker, graph node, legend row, status chip and recent-change card for a dormant group (JI, East Indonesia Mujahideen, Abu Sayyaf, Hurras al-Din, IS Sinai). Every other colour must stay non-grey; `test_figures.py` asserts both.

## Daily refresh (run by hand or by a scheduled agent, always through a PR)

1. Move the incident window: set `ASOF` and `WINDOW` in `build_data.py` to today and the 30 days before it, drop incidents older than 30 days, and search for new major incidents in each theatre (Sahel, Lake Chad Basin, Horn of Africa, Central and southern Africa, Levant and Iraq, South and Central Asia, Southeast Asia). Add each to `data_in/incidents.json` with a source URL, coordinates and a confidence level.
2. Re-check leaders, strength estimates and momentum for any group named in the news since the last run. Edit `data_in/groups.json` and `data_in/momentum.json`. Never invent a number: use a range, or write "no credible estimate".
3. Run `python3 jihadist-groups/_src/source_titles.py`, then drop any URL it marks 404 or 410 and re-source the claim. Keep 401 and 403.
4. Run `python3 jihadist-groups/_src/fetch_images.py` if a group gained an image.
5. Run `python3 jihadist-groups/_src/build_data.py` and `python3 jihadist-groups/_src/gen_page.py`.
6. Run `python3 jihadist-groups/_src/test_figures.py` and `python3 scripts/ci_check.py --slugs jihadist-groups`.
7. Look at the screenshots from `qa_shots.py` at 1440px and 390px.
8. Open a PR that touches only `jihadist-groups/`. Never force-push and never merge without review.
