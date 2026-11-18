#!/usr/bin/env bash
# Sourced by every script. Resolves repo root, version, branch, and checks broker creds.
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
export ROOT
export GIT_COMMIT="${GIT_COMMIT:-$(node "$ROOT/scripts/git-info.js" version)}"
export GIT_BRANCH="${GIT_BRANCH:-$(node "$ROOT/scripts/git-info.js" branch)}"
export CONSUMER_NAME="order-web"
export PROVIDER_NAME="product-service"
: "${PACT_BROKER_BASE_URL:?Set PACT_BROKER_BASE_URL (e.g. https://yourorg.pactflow.io)}"
: "${PACT_BROKER_TOKEN:?Set PACT_BROKER_TOKEN (PactFlow read/write API token)}"
pb() { (cd "$ROOT" && npx --no-install pact-broker "$@"); }
