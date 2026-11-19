/**
 * PROVIDER VERIFICATION (product-service verifies the pacts consumers published)
 *
 * Maps to README:
 *  - Matrix creation (#1):    with PUBLISH_VERIFICATION_RESULTS=true (CI only) the result is posted
 *                             against providerVersion + branch = the provider half of a Matrix row.
 *  - Feature branches (#2/#3): consumerVersionSelectors decide WHICH consumer pacts this build verifies.
 *  - Conflict prevention (#4): enablePending + includeWipPactsSince; webhook-driven PACT_URL mode.
 *  - Best practice #6:        results are only published from CI, never from a laptop.
 *
 * Modes:
 *   1. LOCAL (no PACT_BROKER_BASE_URL): verifies consumer/pacts/*.json straight from disk. No broker needed.
 *   2. BROKER, normal build:    selectors below (provider.yml).
 *   3. BROKER, webhook build:   PACT_URL set -> verify exactly the pact that triggered the build (provider-webhook.yml).
 */
const path = require('path');
const { Verifier } = require('@pact-foundation/pact');
const { createApp } = require('../src/app');
const { version, branch } = require('../../scripts/git-info');

describe('product-service provider verification', () => {
  let server, app;

  beforeAll((done) => {
    app = createApp();
    server = app.listen(0, done);                       // random free port
  });
  afterAll((done) => server.close(done));

  it('honours all selected consumer contracts', async () => {
    const baseUrl = process.env.PACT_BROKER_BASE_URL;
    const publish = process.env.PUBLISH_VERIFICATION_RESULTS === 'true';

    const source = !baseUrl
      ? { pactUrls: [path.resolve(__dirname, '../../consumer/pacts/order-web-product-service.json')] }
      : {
          pactBrokerUrl: baseUrl,
          pactBrokerToken: process.env.PACT_BROKER_TOKEN,
          providerVersion: version,                     // commit SHA
          providerVersionBranch: branch,                // enables branch-aware pending/WIP logic
          publishVerificationResult: publish,
          ...(process.env.PACT_URL
            ? { pactUrls: [process.env.PACT_URL] }      // webhook-triggered: verify just this pact
            : {
                consumerVersionSelectors: [
                  { mainBranch: true },                 // latest pact from each consumer's main branch
                  { matchingBranch: true },             // consumer branch with SAME NAME as this provider branch
                  { deployedOrReleased: true },         // pacts of consumer versions live in any environment
                ],
                // PENDING: a never-before-verified pact cannot fail this build (consumer can't break provider).
                enablePending: true,
                // WIP: auto-include recent unverified feature-branch pacts (no tagging) for early feedback.
                includeWipPactsSince: '2024-01-01',
              }),
        };

    await new Verifier({
      provider: 'product-service',
      providerBaseUrl: `http://localhost:${server.address().port}`,
      logLevel: 'warn',
      ...source,
      // Provider STATES: arrange data named by the consumer's .given(...)
      stateHandlers: {
        'product 10 exists': async () => app.locals.reset(),
        'products exist': async () => app.locals.reset(),
        'product 10 has stock': async () => app.locals.reset(),
        'product 999 does not exist': async () => { app.locals.reset(); app.locals.products.delete(999); },
      },
    }).verifyProvider();
  });
});
