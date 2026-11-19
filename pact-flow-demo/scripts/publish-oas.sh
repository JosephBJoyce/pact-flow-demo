#!/usr/bin/env bash
# OPTIONAL - Bi-directional contract testing (BDCT). The provider publishes its OpenAPI
# spec (+ self-verification results) with branch/version; PactFlow cross-compares it with
# consumer pacts and writes the result into the same Matrix, so can-i-deploy still works.
source "$(dirname "$0")/env.sh"
RESULTS="$(mktemp)"; echo "OAS self-verified (replace with real results, e.g. Schemathesis/Dredd)" > "$RESULTS"
(cd "$ROOT" && npx --no-install pactflow publish-provider-contract provider/openapi.yaml \
  --provider "$PROVIDER_NAME" --provider-app-version "$GIT_COMMIT" --branch "$GIT_BRANCH" \
  --content-type application/yaml \
  --verification-exit-code 0 --verification-results "$RESULTS" \
  --verification-results-content-type text/plain --verifier manual)
