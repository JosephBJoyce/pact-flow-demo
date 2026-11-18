#!/usr/bin/env bash
# Usage: record-deployment.sh <pacticipant> <environment>
# Tells the broker what is actually live so the Matrix (and `deployedOrReleased`
# selectors / can-i-deploy) reflect reality. Run AFTER a successful deploy.
source "$(dirname "$0")/env.sh"
pb record-deployment --pacticipant "${1:?pacticipant}" --version "$GIT_COMMIT" --environment "${2:?environment}"
