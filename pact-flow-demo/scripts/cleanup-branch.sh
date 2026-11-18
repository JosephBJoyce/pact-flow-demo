#!/usr/bin/env bash
# Usage: cleanup-branch.sh <pacticipant> <branch>
# Remove a merged/abandoned feature branch (and its pacts/verifications) so the Matrix stays clean.
source "$(dirname "$0")/env.sh"
pb delete-branch --pacticipant "${1:?pacticipant}" --branch "${2:?branch}"
