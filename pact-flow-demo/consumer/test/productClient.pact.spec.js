/**
 * CONSUMER CONTRACT TEST (order-web -> product-service)
 *
 * Running this test spins up a Pact mock server, exercises the real ProductClient
 * against it, and writes consumer/pacts/order-web-product-service.json.
 *
 * Maps to README:
 *  - Matrix creation (#1):   the generated pact is what scripts/publish-pacts.sh publishes,
 *                            creating the consumer half of each Matrix row.
 *  - Feature branches (#2):  the "stock" interaction below only exists when
 *                            CONSUMER_FEATURE_STOCK=true, simulating a consumer feature
 *                            branch that needs a NEW provider capability.
 *  - Minimal pacts (BP #8):  matchers assert shape/type, and only fields the consumer uses.
 */
const path = require('path');
const { PactV3, MatchersV3 } = require('@pact-foundation/pact');
const { ProductClient } = require('../src/productClient');

const { integer, decimal, string, eachLike, regex } = MatchersV3;

const provider = new PactV3({
  consumer: 'order-web',
  provider: 'product-service',
  dir: path.resolve(__dirname, '../pacts'),
  logLevel: 'warn',
});

// Express adds "; charset=utf-8", so match loosely rather than on an exact string.
const JSON_HEADERS = { 'Content-Type': regex(/application\/json.*/, 'application/json') };
const ACCEPT = { Accept: 'application/json' };

describe('order-web -> product-service contract', () => {
  it('gets an existing product', () => {
    provider
      .given('product 10 exists')                       // provider state: see provider test stateHandlers
      .uponReceiving('a request for product 10')
      .withRequest({ method: 'GET', path: '/products/10', headers: ACCEPT })
      .willRespondWith({
        status: 200,
        headers: JSON_HEADERS,
        body: { id: integer(10), name: string('Widget'), price: decimal(9.99) },
      });

    return provider.executeTest(async (mock) => {
      const client = new ProductClient(mock.url);
      expect(await client.priceOrder(10, 3)).toEqual({ name: 'Widget', total: 29.97 });
    });
  });

  it('handles a missing product', () => {
    provider
      .given('product 999 does not exist')
      .uponReceiving('a request for a non-existent product')
      .withRequest({ method: 'GET', path: '/products/999', headers: ACCEPT })
      .willRespondWith({ status: 404, headers: JSON_HEADERS, body: { error: string('Not found') } });

    return provider.executeTest(async (mock) => {
      expect(await new ProductClient(mock.url).getProduct(999)).toBeNull();
    });
  });

  it('lists products', () => {
    provider
      .given('products exist')
      .uponReceiving('a request for all products')
      .withRequest({ method: 'GET', path: '/products', headers: ACCEPT })
      .willRespondWith({
        status: 200,
        headers: JSON_HEADERS,
        body: eachLike({ id: integer(10), name: string('Widget'), price: decimal(9.99) }),
      });

    return provider.executeTest(async (mock) => {
      const products = await new ProductClient(mock.url).listProducts();
      expect(products.length).toBeGreaterThan(0);
    });
  });

  // ---- FEATURE-BRANCH INTERACTION ------------------------------------------------------
  // Published from branch feat/stock. Until the provider implements GET /products/:id/stock:
  //   * provider main builds treat this pact as PENDING/WIP  -> provider build does NOT fail
  //   * `can-i-deploy` for this consumer version              -> FAILS (unverified)
  // That combination is exactly the safety net that lets both teams work in parallel.
  const featureIt = process.env.CONSUMER_FEATURE_STOCK === 'true' ? it : it.skip;
  featureIt('gets stock for a product (feature: feat/stock)', () => {
    provider
      .given('product 10 has stock')
      .uponReceiving('a request for stock of product 10')
      .withRequest({ method: 'GET', path: '/products/10/stock', headers: ACCEPT })
      .willRespondWith({
        status: 200,
        headers: JSON_HEADERS,
        body: { productId: integer(10), available: integer(5) },
      });

    return provider.executeTest(async (mock) => {
      const stock = await new ProductClient(mock.url).getStock(10);
      expect(stock.available).toBeGreaterThanOrEqual(0);
    });
  });
});
