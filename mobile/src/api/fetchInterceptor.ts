import { refreshAccessToken, isRefreshEndpoint } from './tokenRefresh';

// Patches the global fetch ONCE so every existing `fetch(...)` call across
// the app's ~25 screens (each of which manually attaches its own
// `Authorization: Bearer <token>` header) transparently gets silent
// token-refresh-and-retry on a 401, instead of needing every call site
// rewritten individually. Import this module exactly once, as early as
// possible (App.tsx), for its side effect.
const originalFetch = global.fetch;

function withAuthHeader(init: RequestInit | undefined, token: string): RequestInit {
  const headers = new Headers(init?.headers as HeadersInit | undefined);
  headers.set('Authorization', `Bearer ${token}`);
  return { ...init, headers };
}

global.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
  const response = await originalFetch(input, init);

  const url = typeof input === 'string' ? input : (input as Request).url ?? String(input);

  // Only intercept authenticated partner-API calls; leave the refresh
  // endpoint itself alone to avoid a retry loop, and leave unrelated 401s
  // (e.g. wrong login password) untouched.
  if (response.status !== 401 || isRefreshEndpoint(url) || !url.includes('/partner/')) {
    return response;
  }

  const newToken = await refreshAccessToken();
  if (!newToken) {
    return response; // refresh failed -- store already logged out, surface the original 401
  }

  return originalFetch(input, withAuthHeader(init, newToken));
};
