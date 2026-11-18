#!/usr/bin/env bash
# ONE-TIME broker setup. Idempotent.
#  1. Environments  -> what `record-deployment` / `can-i-deploy --to-environment` refer to.
#  2. Webhook       -> "contract_requiring_verification_published" triggers provider verification
#                      whenever a consumer publishes a NEW or CHANGED pact (parallel-dev mechanism #4).
source "$(dirname "$0")/env.sh"

for e in test production; do
  pb create-environment --name "$e" --display-name "$e" $([ "$e" = production ] && echo --production) || true
done

: "${GITHUB_REPOSITORY:?e.g. my-org/pactflow-cdct-demo}"
: "${GITHUB_TOKEN:?PAT with repo scope, used by the webhook to call repository_dispatch}"
pb create-or-update-webhook \
  "https://api.github.com/repos/${GITHUB_REPOSITORY}/dispatches" \
  --uuid 7f2f2a58-6c3c-4d0a-9d3e-0c1d9f4b1a01 \
  --description "Verify ${PROVIDER_NAME} when a contract needs verification" \
  --request POST \
  --header 'Content-Type: application/json' \
  --header "Authorization: Bearer ${GITHUB_TOKEN}" \
  --header 'Accept: application/vnd.github.everest-preview+json' \
  --data '{"event_type":"contract_requiring_verification_published","client_payload":{"pact_url":"${pactbroker.pactUrl}","consumer_version":"${pactbroker.consumerVersionNumber}","consumer_branch":"${pactbroker.consumerVersionBranch}","provider_branch":"${pactbroker.providerVersionBranch}"}}' \
  --provider "${PROVIDER_NAME}" \
  --contract-requiring-verification-published
