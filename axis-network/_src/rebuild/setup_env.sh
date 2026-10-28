#!/bin/bash
# Recreate the Axis build venv (system pandas/pyarrow/scikit-learn are broken on the box). Idempotent.
set -e
V=${AXIS_VENV:-/workspace/axis_venv}
[ -x $V/bin/python ] || python3 -m venv $V
$V/bin/pip install -q -r "$(dirname "$0")/requirements.txt"
$V/bin/python -c "import pandas,numpy,pyarrow;print('axis venv ok: pandas',pandas.__version__)"
