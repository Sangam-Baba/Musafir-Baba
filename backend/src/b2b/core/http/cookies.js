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

/**
 * @param {import('express').Response} res
 * @param {string} name
 * @param {string} value
 * @param {{ path: string, expires: Date, secure: boolean }} options HttpOnly + SameSite=Strict always
 */
export function setCookie(res, name, value, options) {
  res.append(
    'Set-Cookie',
    `${name}=${encodeURIComponent(value)}; Path=${options.path}; Expires=${options.expires.toUTCString()}; HttpOnly; SameSite=Strict${options.secure ? '; Secure' : ''}`,
  );
}

/**
 * @param {import('express').Response} res
 * @param {string} name
 * @param {{ path: string, secure: boolean }} options
 */
export function clearCookie(res, name, options) {
  res.append(
    'Set-Cookie',
    `${name}=; Path=${options.path}; Expires=Thu, 01 Jan 1970 00:00:00 GMT; HttpOnly; SameSite=Strict${options.secure ? '; Secure' : ''}`,
  );
}
