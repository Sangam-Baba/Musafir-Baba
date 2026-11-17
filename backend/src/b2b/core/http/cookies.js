// @ts-check
/**
 * Minimal cookie reading/writing for /api/v1. The B2B router runs before the existing app's
 * cookie parser (by design), so it reads the Cookie header itself. No package.
 */

/**
 * @param {import('express').Request} req
 * @param {string} name
 * @returns {string | undefined}
 */
export function readCookie(req, name) {
  const header = req.headers.cookie;
  if (typeof header !== 'string' || header.length > 8192) return undefined;
  for (const part of header.split(';')) {
    const eq = part.indexOf('=');
    if (eq === -1) continue;
    if (part.slice(0, eq).trim() !== name) continue;
    try {
      return decodeURIComponent(part.slice(eq + 1).trim());
    } catch {
      return undefined;
    }
  }
  return undefined;
}

/** @param {boolean} secure */
const sameSite = (secure) => (secure ? 'SameSite=None; Secure' : 'SameSite=Lax');

/**
 * Always HttpOnly. In production (secure) SameSite=None; Secure — the website and the API are on
 * different domains, same as the existing app's refresh cookies; locally SameSite=Lax. Other sites
 * still can't use it: the auth endpoints require the `X-B2B-Auth` header, which a browser only sends
 * cross-site after CORS approval (the existing origin allow-list).
 * @param {import('express').Response} res
 * @param {string} name
 * @param {string} value
 * @param {{ path: string, expires: Date, secure: boolean }} options
 */
export function setCookie(res, name, value, options) {
  res.append(
    'Set-Cookie',
    `${name}=${encodeURIComponent(value)}; Path=${options.path}; Expires=${options.expires.toUTCString()}; HttpOnly; ${sameSite(options.secure)}`,
  );
}

/**
 * @param {import('express').Response} res
 * @param {string} name
 * @param {{ path: string, secure: boolean }} options
 */
export function clearCookie(res, name, options) {
  res.append('Set-Cookie', `${name}=; Path=${options.path}; Expires=Thu, 01 Jan 1970 00:00:00 GMT; HttpOnly; ${sameSite(options.secure)}`);
}
