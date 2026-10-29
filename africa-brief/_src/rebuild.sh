#!/usr/bin/env bash
# Africa Brief news refresh: RSS fetch -> pick_stories -> translate (local NLLB, cached) -> storyline clustering (data/stories.json) -> data/media.json -> validate.
set -euo pipefail
cd "$(dirname "$0")"
(cd news && python fetch.py && python pick_stories.py && python translate.py && SITE_DIR=../.. python cluster.py)
SITE_DIR=.. python pipeline/build_media.py
python pipeline/validate_brief.py ../data/brief.json
