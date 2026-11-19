const express = require('express');

/**
 * product-service. Two env flags simulate provider feature branches (see scripts/demo.sh and provider.yml):
 *   PROVIDER_FEATURE_STOCK=true      -> adds GET /products/:id/stock (backwards-compatible addition)
 *   PROVIDER_BREAKING_RENAME=true    -> renames `price` to `amount` (BREAKING change the contract must catch)
 */
const seed = () => new Map([[10, { id: 10, name: 'Widget', price: 9.99, stock: 5 }]]);

function createApp(flags = process.env) {
  const products = seed();
  const app = express();

  const view = (p) => {
    const { stock, price, ...rest } = p;                 // `stock` is internal; never leaks via /products
    return flags.PROVIDER_BREAKING_RENAME === 'true' ? { ...rest, amount: price } : { ...rest, price };
  };

  app.get('/products', (_req, res) => res.json([...products.values()].map(view)));

  app.get('/products/:id', (req, res) => {
    const p = products.get(Number(req.params.id));
    return p ? res.json(view(p)) : res.status(404).json({ error: 'Not found' });
  });

  if (flags.PROVIDER_FEATURE_STOCK === 'true') {
    app.get('/products/:id/stock', (req, res) => {
      const p = products.get(Number(req.params.id));
      return p ? res.json({ productId: p.id, available: p.stock }) : res.status(404).json({ error: 'Not found' });
    });
  }

  // Used by Pact provider-state handlers to arrange data.
  app.locals.products = products;
  app.locals.reset = () => { products.clear(); seed().forEach((v, k) => products.set(k, v)); };
  return app;
}

module.exports = { createApp };
