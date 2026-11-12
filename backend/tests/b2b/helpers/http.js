// @ts-check
/**
 * Starts an Express app on a free port and returns a small fetch helper.
 * (Uses Node's built-in fetch — no extra test dependency, so the existing
 * app's packages are not touched.)
 */

/**
 * @param {import('express').Express} app
 * @returns {Promise<{ get: (path: string) => Promise<{ status: number, body: any }>, close: () => Promise<void> }>}
 */
export async function startServer(app) {
  const server = await new Promise((resolve) => {
    const s = app.listen(0, () => resolve(s));
  });
  const address = /** @type {import('node:net').AddressInfo} */ (server.address());
  const base = `http://127.0.0.1:${address.port}`;
  return {
    get: async (path) => {
      const res = await fetch(base + path);
      const text = await res.text();
      return { status: res.status, body: text ? safeJson(text) : null };
    },
    close: () => new Promise((resolve) => server.close(() => resolve())),
  };
}

/** @param {string} text */
function safeJson(text) {
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}
