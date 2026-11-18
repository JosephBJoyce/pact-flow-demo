# PactFlow CDCT demo: contracts in parallel development

A small monorepo showing consumer-driven contract testing with PactFlow when several developers work on feature branches at once.

| Package | Role | Key files |
|---|---|---|
| `consumer/` (`order-web`) | Consumer. Generates the pact. | `test/productClient.pact.spec.js`, `src/productClient.js` |
| `provider/` (`product-service`) | Provider. Verifies pacts. | `test/provider.pact.spec.js`, `src/app.js`, `openapi.yaml` |
| `scripts/` | Broker CLI wrappers | `publish-pacts.sh`, `can-i-deploy.sh`, `record-deployment.sh`, `broker-setup.sh`, `demo.sh` |
| `.github/workflows/` | CI | `consumer.yml`, `provider.yml` |

> **Status:** the code passed syntax checks only. It has **not been run end to end**, because the authoring sandbox couldn't reach the npm registry. Package versions in the `package.json` files are unverified. Expect to adjust them on first `npm install`.

## Quick start

```bash
npm install

# 1. No broker needed: generate the pact, then verify it from disk
npm run test:consumer
npm run verify:provider

# 2. With PactFlow: guided scenario covering everything below
export PACT_BROKER_BASE_URL=https://<org>.pactflow.io
export PACT_BROKER_TOKEN=<read/write token>
export GITHUB_REPOSITORY=<org>/<repo> GITHUB_TOKEN=<PAT>   # only for the webhook
bash scripts/broker-setup.sh   # once: environments + webhook
npm run demo
```

## Concept to repo mapping

### 1. How the Producer-Consumer Matrix is created and maintained

| Concept | Where in this repo |
|---|---|
| Consumer half of a Matrix row: pact + consumer version + branch | `scripts/publish-pacts.sh` publishes `consumer/pacts/*.json` with `--consumer-app-version $GIT_COMMIT --branch $GIT_BRANCH`. The pact comes from `consumer/test/productClient.pact.spec.js`. |
| Provider half: verification result + provider version + branch | `provider/test/provider.pact.spec.js` sets `providerVersion`, `providerVersionBranch` and `publishVerificationResult` (CI only). |
| Version and branch come from one place | `scripts/git-info.js` (commit SHA and branch name). |
| Matrix reflects what is live | `scripts/record-deployment.sh`, called after deploy in both workflows. Environments are created by `broker-setup.sh`. |
| Unchanged contracts aren't re-verified | The broker de-duplicates pacts by content hash. No code is needed. |
| Querying the Matrix | `scripts/matrix.sh` and `can-i-deploy.sh` (table output). The full view is in the PactFlow UI under Integrations → Matrix. |

### 2. Multiple developers on feature branches

- Every build is identified by commit SHA and branch, so concurrent branches get separate pact versions and verification rows and never overwrite each other.
- `consumer/test/productClient.pact.spec.js`: the `stock` interaction exists only when `CONSUMER_FEATURE_STOCK=true`. It simulates a consumer branch (`feat/stock`) that needs a new provider endpoint.
- `provider/src/app.js`: `PROVIDER_FEATURE_STOCK` (backwards-compatible addition) and `PROVIDER_BREAKING_RENAME` (breaking change) simulate two provider branches.

### 3. Feature-branch contracts vs main-branch contracts

`consumerVersionSelectors` in `provider/test/provider.pact.spec.js`:

| Selector | Effect |
|---|---|
| `mainBranch: true` | Always verify the latest main-branch pact from each consumer. |
| `matchingBranch: true` | A provider branch automatically verifies the consumer branch with the same name (`feat/stock` ↔ `feat/stock`). |
| `deployedOrReleased: true` | Always verify pacts from consumer versions live in any environment. |

Feature-branch pacts sit beside main's pacts and don't affect main until merged.

### 4. Preventing conflicts before merging to main

| Mechanism | Where |
|---|---|
| **Pending pacts** (`enablePending: true`): a new, never-verified pact can't fail the provider's build | `provider.pact.spec.js` |
| **WIP pacts** (`includeWipPactsSince`): recent unverified feature-branch pacts are included automatically, with no tags | `provider.pact.spec.js` |
| **Webhook** `contract_requiring_verification_published`: a new or changed pact triggers provider verification right away | `scripts/broker-setup.sh` → `provider.yml` (`repository_dispatch`). `PACT_URL` verifies exactly that pact. |
| **`can-i-deploy` gate**: blocks if the version isn't verified against what's live. `--retry-while-unknown` waits for in-flight verifications. | `scripts/can-i-deploy.sh`, used in both workflows. Make it a required status check. |
| **Provider-side check**: a provider change is verified against consumers in production | `deployedOrReleased` selector, plus `can-i-deploy product-service` |
| **Record deployments**: keeps the gate accurate | `scripts/record-deployment.sh` |
| **Bi-directional option**: provider publishes an OpenAPI spec instead of (or as well as) verifying pacts | `provider/openapi.yaml`, `scripts/publish-oas.sh` |

## Example workflow (`npm run demo`)

| Step | What happens | Demonstrates |
|---|---|---|
| A | Consumer and provider `main` publish and verify, then are deployed to production. | Matrix creation, `record-deployment` |
| B | Consumer `feat/stock` publishes a pact needing `/stock`. `can-i-deploy` **fails**. | Feature-branch contract, gate |
| C | Provider `main` builds. The new pact is WIP/pending, so the build **still passes**. | Pending and WIP |
| D | Provider `feat/stock` implements `/stock` and verifies the consumer branch of the same name. | `matchingBranch` |
| E | Provider `feat/rename` renames `price`. Verification **fails** against deployed consumer c1, and `can-i-deploy` blocks it. | Conflict detection |
| F | Provider merges the feature to `main` first (backwards compatible) and deploys. | Best practice 7 |
| G | Consumer `feat/stock` now passes `can-i-deploy` and deploys. The Matrix is printed. | Matrix, gate |
| H | Merged and abandoned branches are deleted. | Best practice 10 |

## Best practices mapping

| # | Practice | Where |
|---|---|---|
| 1 | Publish with `--branch` and commit SHA as version | `git-info.js`, `publish-pacts.sh` |
| 2 | Same branch names across repos for cross-cutting changes | `matchingBranch` selector |
| 3 | `can-i-deploy` as a required CI check | both workflows |
| 4 | Always record deployments and releases | `record-deployment.sh` |
| 5 | Enable pending and WIP, use webhooks | provider test, `broker-setup.sh` |
| 6 | Publish verification results from CI only | `PUBLISH_VERIFICATION_RESULTS` (set only in `provider.yml`) |
| 7 | Provider merges backwards-compatible changes first (expand/contract) | demo step F |
| 8 | Minimal pacts with matchers | consumer test and `ProductClient` |
| 9 | `--retry-while-unknown` | `can-i-deploy.sh` |
| 10 | Clean up stale branches | `cleanup-branch.sh` |

## Notes

- `repository_dispatch` workflows run from the default branch. `provider.yml` checks out `client_payload.provider_branch`, so adapt it if your provider lives in a separate repo.
- Set the `PACT_BROKER_BASE_URL` and `PACT_BROKER_TOKEN` repo secrets for CI.
