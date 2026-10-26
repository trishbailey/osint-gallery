#!/usr/bin/env bash
# Africa Brief news refresh: RSS fetch -> select -> translate (local NLLB, cached) -> data/media.json -> validate.
set -euo pipefail
cd "$(dirname "$0")"
(cd news && python fetch.py && python select.py && python translate.py)
SITE_DIR=.. python pipeline/build_media.py
python pipeline/validate_brief.py ../data/brief.json
