import { useAuthStore } from '../store/useAuthStore';
import { API_BASE_URL } from '../utils/config';

// Single shared entry point for silently refreshing the partner's access
// token, used by both the global fetch patch (fetchInterceptor.ts) and the
// axios client (axios.ts) so a burst of concurrent 401s only triggers one
// network call instead of a refresh-per-request race.
let refreshPromise: Promise<string | null> | null = null;

async function doRefresh(): Promise<string | null> {
  const { refreshToken, logout, updateAccessToken } = useAuthStore.getState();

  if (!refreshToken) {
    await logout();
    return null;
  }

  try {
    const res = await fetch(`${API_BASE_URL}/partner/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    });
    const data = await res.json();

    if (res.ok && data.accessToken) {
      await updateAccessToken(data.accessToken);
      return data.accessToken;
    }
  } catch (error) {
    console.error('Token refresh error:', error);
  }

  // Refresh token itself is invalid/expired -- nothing left to do but sign out.
  await logout();
  return null;
}

export function refreshAccessToken(): Promise<string | null> {
  if (!refreshPromise) {
    refreshPromise = doRefresh().finally(() => {
      refreshPromise = null;
    });
  }
  return refreshPromise;
}

export function isRefreshEndpoint(url: string): boolean {
  return url.includes('/partner/auth/refresh');
}
