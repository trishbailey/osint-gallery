# Ghost fleet dashboard (/ghost-fleet/)
Static page; data rebuilt daily by `.github/workflows/ghost-fleet-rebuild.yml` (cron 05:41 UTC).

Pipeline: `seed.py` (manual, occasional) -> `vessels_seed.json`; `fetch.py` (needs Actions secret `GFW_API_TOKEN`; never print it) -> `data/vessels.json`, `data/events.json` (gitignored); `build.py` -> `data/map.json`, `data/tracks.json`, `data/profiles.json`; `palette_check.py` gate.

## Vessel list sources (repo note only; the page shows no designation labels)
- UK FCDO Russia sanctions list, vessels (program GB-RUS), via OpenSanctions `gb_fcdo_sanctions`: https://data.opensanctions.org/datasets/latest/gb_fcdo_sanctions/targets.simple.csv
- US OFAC SDN, vessels under Russia programs, via OpenSanctions `us_ofac_sdn`: https://data.opensanctions.org/datasets/latest/us_ofac_sdn/targets.simple.csv
- EU: the EU Financial Sanctions File holds almost no Russia vessels; the EU port-access-ban list (Reg. 833/2014 Annex XLII) is not yet merged (gap for v2).

## Data: Global Fishing Watch API v3 (CC BY-NC 4.0, non-commercial; attribution "Powered by Global Fishing Watch." on the page)
Datasets: port visits, loitering, gaps, encounters (public encounters only cover fishing-related vessel pairs, so tanker-to-tanker meetings are not captured), SAR presence (unmatched detections in 7 chokepoint boxes). Vessel tracks are not exposed by the public v3 API, so animation interpolates between event positions.

## Drop-in AIS positions
Put CSVs in `ghost-fleet/data/positions/` with columns `imo` or `mmsi`, `timestamp` (ISO UTC; `BaseDateTime` also accepted), `lat`, `lon` (or `longitude`). `build.py` merges rows for listed ships within the 90-day window into `tracks.json`.

## Hotspots
Defined in `build.py` (HOT): transfer areas, Russian loading ports and Baltic chokepoints named consistently in public reporting.
