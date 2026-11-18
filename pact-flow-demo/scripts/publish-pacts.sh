#!/usr/bin/env bash
# Consumer CI: publish pacts tagged with VERSION (commit SHA) and BRANCH.
# This is what creates the consumer-side rows of the Matrix. Identical pact content
# is de-duplicated by the broker, so unchanged contracts are NOT re-verified.
source "$(dirname "$0")/env.sh"
pb publish "$ROOT/consumer/pacts" \
  --consumer-app-version "$GIT_COMMIT" \
  --branch "$GIT_BRANCH"
