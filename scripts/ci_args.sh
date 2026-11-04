# Source from the ci-check workflow. Sets the CI_ARGS array for scripts/ci_check.py
# and, on a push to main, marks shared-file edits as already reviewed (SHARED_OK=1).
# A pull request still needs the trish-approved label for that, via the job env.
CI_ARGS=()
if [ "${EVENT:-}" = "pull_request" ]; then
  git fetch --quiet origin "$BASE_REF"
  CI_ARGS+=(--changed-from "origin/$BASE_REF" --changed-head "$HEAD_SHA")
elif [ "${EVENT:-}" = "push" ] && [ -n "${BEFORE_SHA:-}" ] && [ "$BEFORE_SHA" != "0000000000000000000000000000000000000000" ]; then
  export SHARED_OK=1
  CI_ARGS+=(--changed-from "$BEFORE_SHA")
elif [ "${ALL:-}" = "true" ]; then
  :
else
  CI_ARGS+=(--static-only)
fi
