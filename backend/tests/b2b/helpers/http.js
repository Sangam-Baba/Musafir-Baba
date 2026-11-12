// @ts-check
/**
 * Starts an Express app on a free port and returns a small fetch helper.
 * (Uses Node's built-in fetch — no extra test dependency, so the existing
 * app's packages are not touched.)
 */

/**
 * @param {import('express').Express} app
 * @returns {Promise<{
 *   get: (path: string) => Promise<{ status: number, body: any, headers: Headers }>,
 *   post: (path: string, body: unknown, headers?: Record<string, string>) => Promise<{ status: number, body: any, headers: Headers }>,
 *   close: () => Promise<void> }>}
 */
export async function startServer(app) {
  const server = await new Promise((resolve) => {
    const s = app.listen(0, () => resolve(s));
  });
  const address = /** @type {import('node:net').AddressInfo} */ (server.address());
  const base = `http://127.0.0.1:${address.port}`;
  return {
    get: async (path) => toResult(await fetch(base + path)),
    post: async (path, body, headers = {}) =>
      toResult(
        await fetch(base + path, {
          method: 'POST',
          headers: { 'content-type': 'application/json', ...headers },
          body: typeof body === 'string' ? body : JSON.stringify(body),
        }),
      ),
    close: () => new Promise((resolve) => server.close(() => resolve())),
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
