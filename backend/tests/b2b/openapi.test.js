// @ts-check
/**
 * The client API description (S14-T09): valid OpenAPI 3.1 shape; every operation names one of the key scopes and
 * the problem responses; money-moving calls require Idempotency-Key; the server comes from B2B_API_PUBLIC_URL.
 */
import { describe, expect, it } from 'vitest';

import { SCOPES } from '../../src/b2b/modules/api-access/index.js';
import { openApiDocument } from '../../src/b2b/routes/openapi.js';

describe('openapi.json', () => {
  it('describes the client endpoints with scopes, errors and idempotency', () => {
    const doc = /** @type {any} */ (openApiDocument({ B2B_API_PUBLIC_URL: 'https://api.example.test/api/v1/' }));
    expect(doc.openapi).toBe('3.1.0');
    expect(doc.servers).toEqual([{ url: 'https://api.example.test/api/v1' }]);
    const ops = Object.entries(doc.paths).flatMap(([path, methods]) =>
      Object.entries(/** @type {any} */ (methods)).map(([m, o]) => ({ path, m, o: /** @type {any} */ (o) })),
    );
    expect(ops.length).toBeGreaterThanOrEqual(12);
    for (const { path, o } of ops) {
      const scope = /Scope: `([^`]+)`/.exec(o.description)?.[1];
      expect(SCOPES, path).toContain(scope);
      expect(o.responses['401'], path).toBeDefined();
      expect(o.security, path).toEqual([{ apiKey: [] }]);
    }
    for (const path of ['/client/orders', '/client/orders/{ref}/pay', '/bookings/hotels/{ref}/cancel'])
      expect(doc.paths[path].post.parameters.some((/** @type {any} */ p) => p.name === 'Idempotency-Key' && p.required)).toBe(true);
    expect(doc.webhooks.bookingUpdate.post.description).toContain('MB-Signature');
    expect(openApiDocument({}).servers[0]?.url).toBe('https://musafirbabaserver.3mongoose.online/api/v1');
  });
});
