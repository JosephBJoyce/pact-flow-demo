const axios = require('axios');

/**
 * Consumer-side HTTP client for product-service.
 *
 * BEST PRACTICE (README #8): the consumer only reads the fields it actually uses
 * (id, name, price). The pact therefore asserts ONLY those fields, so the provider
 * stays free to add/change everything else without causing false contract conflicts.
 */
class ProductClient {
  constructor(baseUrl) {
    this.http = axios.create({ baseURL: baseUrl, headers: { Accept: 'application/json' } });
  }

  async getProduct(id) {
    try {
      return (await this.http.get(`/products/${id}`)).data;
    } catch (e) {
      if (e.response && e.response.status === 404) return null;
      throw e;
    }
  }

  async listProducts() {
    return (await this.http.get('/products')).data;
  }

  /** FEATURE-BRANCH CODE: only used on branch feat/stock; provider must add /stock first. */
  async getStock(id) {
    return (await this.http.get(`/products/${id}/stock`)).data;
  }

  /** Tiny bit of business logic so the contract is about behaviour the consumer depends on. */
  async priceOrder(id, quantity) {
    const p = await this.getProduct(id);
    if (!p) throw new Error(`Unknown product ${id}`);
    return { name: p.name, total: Math.round(p.price * quantity * 100) / 100 };
  }
}

module.exports = { ProductClient };
