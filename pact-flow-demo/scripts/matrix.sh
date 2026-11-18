#!/usr/bin/env bash
# Usage: matrix.sh <pacticipant> [environment]
# Print the relevant slice of the Producer-Consumer Matrix for a version in a table.
# (The full interactive Matrix is in the PactFlow UI under Integrations -> Matrix.)
source "$(dirname "$0")/env.sh"
pb can-i-deploy --pacticipant "${1:?pacticipant}" --version "$GIT_COMMIT" \
  --to-environment "${2:-production}" --output table || true
