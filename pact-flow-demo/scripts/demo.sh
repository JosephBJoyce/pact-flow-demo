#!/usr/bin/env bash
# End-to-end walkthrough of the parallel-development workflow against a REAL PactFlow account.
# Simulates several branches/versions locally by overriding GIT_COMMIT / GIT_BRANCH.
# Requires: PACT_BROKER_BASE_URL, PACT_BROKER_TOKEN and `bash scripts/broker-setup.sh` run once.
# Each STEP is labelled with the README section it demonstrates.
set -uo pipefail
cd "$(dirname "$0")/.."
RUN=$(date +%s)
step() { printf '\n\033[1;36m=== %s ===\033[0m\n' "$*"; }
as()   { local c="$1" b="$2"; shift 2; GIT_COMMIT="$c-$RUN" GIT_BRANCH="$b" "$@"; }   # run as version/branch
consumer_publish() { # $1 version label  $2 branch  $3 feature flag
  as "$1" "$2" env CONSUMER_FEATURE_STOCK="$3" npm run test:consumer --silent && as "$1" "$2" bash scripts/publish-pacts.sh; }
provider_verify()  { # $1 version label  $2 branch  extra env as remaining args
  local v="$1" b="$2"; shift 2
  as "$v" "$b" env PUBLISH_VERIFICATION_RESULTS=true "$@" npm run verify:provider --silent; }
cid() { as "$1" "$2" bash scripts/can-i-deploy.sh "$3" "$4"; }

step "A. BASELINE (README #1 Matrix creation): consumer main + provider main -> verified -> deployed to production"
consumer_publish c1 main false
provider_verify p1 main
cid c1 main order-web production      # nothing live yet, so this passes trivially
as c1 main bash scripts/record-deployment.sh order-web production
cid p1 main product-service production
as p1 main bash scripts/record-deployment.sh product-service production

step "B. CONSUMER FEATURE BRANCH feat/stock needs a NEW endpoint (README #2/#3 feature-branch contracts)"
consumer_publish c2 feat/stock true
echo ">> can-i-deploy for c2 must FAIL: pact is unverified (README #4 deployment gate)"
cid c2 feat/stock order-web production || echo "(expected failure)"

step "C. PROVIDER MAIN keeps building meanwhile (README #4 pending + WIP pacts)"
echo ">> c2's new pact is included as WIP/PENDING. It fails verification but does NOT fail the provider build."
provider_verify p1b main && echo "provider build PASSED despite unverifiable feature-branch pact (pending/WIP)"

step "D. PROVIDER FEATURE BRANCH feat/stock (same name) implements it (README #3 matchingBranch)"
provider_verify p2 feat/stock PROVIDER_FEATURE_STOCK=true && echo "verified c2's pact via matchingBranch selector"

step "E. PROVIDER BREAKING CHANGE on feat/rename (README #4 conflict detection)"
provider_verify p3 feat/rename PROVIDER_BREAKING_RENAME=true || echo "(expected failure: price renamed, breaks deployed consumer c1)"
cid p3 feat/rename product-service production || echo "(expected failure: can-i-deploy blocks the merge/deploy)"

step "F. PROVIDER MERGES feature to main FIRST, backwards compatible (README best practice #7)"
provider_verify p4 main PROVIDER_FEATURE_STOCK=true
cid p4 main product-service production && as p4 main bash scripts/record-deployment.sh product-service production

step "G. CONSUMER feat/stock can now be deployed; show the Matrix (README #1)"
cid c2 feat/stock order-web production && as c2 feat/stock bash scripts/record-deployment.sh order-web production
as c2 feat/stock bash scripts/matrix.sh order-web production

step "H. CLEAN UP merged/abandoned branches (README best practice #10)"
as c2 feat/stock bash scripts/cleanup-branch.sh order-web feat/stock || true
as p2 feat/stock bash scripts/cleanup-branch.sh product-service feat/stock || true
as p3 feat/rename bash scripts/cleanup-branch.sh product-service feat/rename || true
