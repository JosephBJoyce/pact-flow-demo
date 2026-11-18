#!/usr/bin/env bash
# Usage: can-i-deploy.sh <pacticipant> <environment>
# The deployment GATE. Queries the Matrix: "is THIS version verified-compatible with
# every version currently in <environment>?" Non-zero exit blocks the pipeline.
# --retry-while-unknown waits for in-flight verifications triggered by the webhook.
source "$(dirname "$0")/env.sh"
pb can-i-deploy --pacticipant "${1:?pacticipant}" --version "$GIT_COMMIT" \
  --to-environment "${2:?environment}" \
  --retry-while-unknown 12 --retry-interval 10 --output table
