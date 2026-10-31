# Refreshing "Latest from trackers"

X is reached only through the X connector (OAuth); the script holds no token and never calls api.x.com.

1. `python3 _src/trackers_update.py plan` prints the 12 X tool calls (8 `get_users_posts`, 4 `search_posts_all`; `since_id` comes from `data/raw/trackers_state.json`). Run them with `write_to_file: true`, at most 30 per minute, and put the result files in one folder, e.g. `/workspace/rs-work/x`.
2. `python3 _src/trackers_update.py ingest /workspace/rs-work/x --since 2026-10-01` filters on-topic posts, resolves links, fetches each article (30 per minute at most) and keeps an item only if its figures (3 or more digits) appear on the article page. Result: `data/trackers_auto.json`.
3. `python3 _src/build_site.py && python3 _src/audit.py && python3 _src/check_urls.py` merges the hand-checked lines in `_src/trackers_inputs.py` with the new auto items, rebuilds `index.html` and re-audits.

Hand-checked lines need a verbatim quote saved under `data/raw/quotes/<source key>.txt` and a source entry in `_src/sources.py`; audit.py checks that every figure is inside its quote and every quote is in the saved page.
