#!/bin/bash
# Weekly Axis rebuild in a SCRATCH copy of this folder; it never touches the live page. Usage:
#   rebuild_axis.sh <crawl_dir> [<crawl_dir> ...]   # new weekly export dirs (each holds posts/<handle>.csv)
# Output: $AXIS_SCRATCH/axis-network/{data.json,index.html}; review them, then copy them into axis-network/ in a PR.
# Env (defaults in brackets):
#   AXIS_INPUTS  [/workspace/axis_inputs]  persistent inputs outside the repo: W/ (v3/infra.json; the other W files are regenerated),
#                codebook/tabs.pkl, payment_rails/ history. See README.md in this folder.
#   AXIS_POSTS_MASTER [/workspace/threats/posts.pkl]  history; the new CSVs are merged INTO a copy of it and deduped on post url.
#   AXIS_SCRATCH [$AXIS_INPUTS/scratch/weekly]  AXIS_VENV [/workspace/axis_venv]
set -e
HERE=$(cd "$(dirname "$0")" && pwd); SRC=$(dirname "$HERE"); REPO=$(dirname "$SRC")   # HERE=_src/rebuild, SRC=_src, REPO=axis-network
I=${AXIS_INPUTS:-/workspace/axis_inputs}; PY=${AXIS_VENV:-/workspace/axis_venv}/bin/python
export AXIS_WORK=$I/W AXIS_TABS=$I/codebook/tabs.pkl
S=${AXIS_SCRATCH:-$I/scratch/weekly}; MASTER=${AXIS_POSTS_MASTER:-/workspace/threats/posts.pkl}
bash $HERE/setup_env.sh
rm -rf $S && mkdir -p $S && cp -r $REPO $S/axis-network
export AXIS_POSTS=$S/posts.pkl
# 1. merge the new CSVs into the master post table (build_posts.py --merge keeps history; the master is not modified)
$PY $S/axis-network/_src/build_posts.py --work $AXIS_WORK --merge $MASTER --out $AXIS_POSTS "$@"
# 2. nodes.csv + coordination_copies_v4.csv + coord_stats.json from the merged table
$PY $HERE/regen_inputs.py --posts $AXIS_POSTS --work $AXIS_WORK
# 3. payment rails (re-scans the raw CSV history: PAY_POSTS_DIRS must list every crawl dir, including the new ones)
export PAY_OUT=$I/payment_rails_out PAY_POSTS_DIRS=${PAY_POSTS_DIRS:-/workspace/pz:/workspace/uploads/axis_collection_2026-10-26:/workspace/uploads/axis_collection_2026-10-27:$(echo "$@" | tr ' ' ':')}
mkdir -p $PAY_OUT $AXIS_WORK/payment_rails
$PY $HERE/payment_rails_src/ex.py | tail -1 && $PY $HERE/payment_rails_src/build.py > /dev/null
cp $PAY_OUT/nodes.csv $PAY_OUT/edges.csv $AXIS_WORK/payment_rails/
# 4. data.json + page (scratch), figures test, and a section-by-section diff against the current page
cd $S/axis-network/_src && $PY build_data.py > ../build_data.log 2>&1 && $PY gen_page.py && $PY test_figures.py
$PY $HERE/compare_data.py $REPO/data.json $S/axis-network/data.json
echo "scratch output: $S/axis-network/{data.json,index.html}; merged posts: $AXIS_POSTS"
