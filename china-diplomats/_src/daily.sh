#!/usr/bin/env bash
# China Diplomats on X - daily refresh (run on the box AFTER the agent has made the x.search_posts_all calls).
# Step 1 (agent): CD_STATE=/workspace/china-diplomats/state python3 collector.py plan
# Step 2 (agent): CD_STATE=... python3 collector.py calls  -> for each slot, call x.search_posts_all with the printed
#                 inline arguments (write_to_file), then: python3 collector.py ingest <slot>=<file> ...; repeat
#                 `calls` until nothing is pending (a quiet day is about 9-30 calls; budget cap ~300).
# Step 3: this script - rebuild data/*.json, commit through a PR and merge.
set -euo pipefail
export CD_STATE=${CD_STATE:-/workspace/china-diplomats/state}
REPO=${REPO:-/workspace/cd-gallery}
START=${START:-2026-10-17T00:00:00Z}
TMP=$(mktemp -d)
cd "$REPO/china-diplomats/_src"
python3 -W ignore analyze.py --start "$START" --out "$TMP"
python3 -c "import json,glob,sys;[json.load(open(f)) for f in glob.glob(sys.argv[1]+'/*.json')]" "$TMP"
cd "$REPO"
git fetch -q origin main
BR="china-diplomats-data-$(date -u +%Y%m%d%H%M)"
git switch -q -c "$BR" origin/main          # fresh branch from the latest main, so no later rebase is needed
cp "$TMP"/*.json china-diplomats/data/
git add china-diplomats/data
if git diff --cached --quiet; then echo "no data change"; git switch -q -; exit 0; fi
git commit -qm "china-diplomats: daily data refresh $(date -u +%F)"
git push -q -u origin "$BR"                 # plain push only; never force
gh pr create --repo trishbailey/osint-gallery --head "$BR" --title "china-diplomats: daily data refresh $(date -u +%F)" --body "Automated data refresh (china-diplomats/data/*.json only)."
gh pr merge "$BR" --repo trishbailey/osint-gallery --squash --delete-branch
