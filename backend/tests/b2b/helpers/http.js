// @ts-check
/**
 * Starts an Express app on a free port and returns a small fetch helper.
 * (Uses Node's built-in fetch — no extra test dependency, so the existing
 * app's packages are not touched.)
 */

import http from 'node:http';

/**
 * @param {import('express').Express} app
 * @returns {Promise<{
 *   get: (path: string, headers?: Record<string, string>) => Promise<{ status: number, body: any, headers: Headers }>,
 *   post: (path: string, body: unknown, headers?: Record<string, string>) => Promise<{ status: number, body: any, headers: Headers }>,
 *   patch: (path: string, body: unknown, headers?: Record<string, string>) => Promise<{ status: number, body: any, headers: Headers }>,
 *   put: (path: string, body: unknown, headers?: Record<string, string>) => Promise<{ status: number, body: any, headers: Headers }>,
 *   del: (path: string, headers?: Record<string, string>) => Promise<{ status: number, body: any, headers: Headers }>,
 *   base: string,
 *   close: () => Promise<void> }>}
 */
export async function startServer(app) {
  // Every response says `Connection: close`, so fetch never keeps a connection to reuse later: a test file's
  // requests can't land on another file's old server that happened to use the same port.
  const server = await new Promise((resolve) => {
    const s = http.createServer((req, res) => {
      res.setHeader('Connection', 'close');
      app(req, res);
    });
    s.listen(0, '127.0.0.1', () => resolve(s));
  });
  const address = /** @type {import('node:net').AddressInfo} */ (server.address());
  const base = `http://127.0.0.1:${address.port}`;
  /** @param {string} method @param {string} path @param {unknown} body @param {Record<string, string>} headers */
  const send = async (method, path, body, headers) =>
    toResult(
      await fetch(base + path, {
        method,
        headers: { 'content-type': 'application/json', ...headers },
        body: typeof body === 'string' ? body : JSON.stringify(body),
      }),
    );
  return {
    base,
    get: async (path, headers = {}) => toResult(await fetch(base + path, { headers })),
    post: (path, body, headers = {}) => send('POST', path, body, headers),
    patch: (path, body, headers = {}) => send('PATCH', path, body, headers),
    put: (path, body, headers = {}) => send('PUT', path, body, headers),
    del: async (path, headers = {}) => toResult(await fetch(base + path, { method: 'DELETE', headers })),
    // Also end open keep-alive connections: otherwise fetch's connection pool can reuse one to this closed server
    // after another test file's server gets the same port — requests then reach the wrong app (rare 404s / empty bodies).
    close: () =>
      new Promise((resolve) => {
        server.close(() => resolve());
        server.closeAllConnections();
      }),
  };
}

/** @param {Response} res */
async function toResult(res) {
  const text = await res.text();
  return { status: res.status, body: text ? safeJson(text) : null, headers: res.headers };
}

/** @param {string} text */
function safeJson(text) {
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}
