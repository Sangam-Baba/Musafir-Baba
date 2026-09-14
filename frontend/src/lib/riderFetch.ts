import { useRiderAuthStore } from "@/store/useRiderAuthStore";

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL;

async function refreshRiderToken(): Promise<string> {
  const { riderRefreshToken, setRiderAuth, profile } = useRiderAuthStore.getState();

  const res = await fetch(`${BASE_URL}/rider/auth/refresh`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(riderRefreshToken ? { refreshToken: riderRefreshToken } : {}),
  });

  if (!res.ok) {
    throw new Error("Failed to refresh rider token");
  }

  const data = await res.json();
  setRiderAuth(data.accessToken, riderRefreshToken, profile);
  return data.accessToken;
}

// Fetch wrapper for the rider-authenticated ride/payment endpoints, kept
// separate from lib/secureFetch.ts because riders use an isolated JWT system
// (see riderAuth.middleware.js on the backend) rather than the site's
// generic user auth.
export async function riderFetch(path: string, init: RequestInit = {}): Promise<Response> {
  const { riderAccessToken, clearRiderAuth } = useRiderAuthStore.getState();

  const doFetch = (token: string | null) =>
    fetch(`${BASE_URL}${path}`, {
      ...init,
      headers: {
        "Content-Type": "application/json",
        ...init.headers,
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      credentials: "include",
    });

  let response = await doFetch(riderAccessToken);

  // Only attempt a silent refresh when there was actually a session to
  // refresh (a real refresh token on file). A guest who was never logged in
  // has neither token, so a 401 here (e.g. an endpoint that still requires
  // rider auth) is a normal, final failure for the caller to handle — not a
  // token-refresh problem.
  const { riderRefreshToken } = useRiderAuthStore.getState();
  if (response.status !== 401 || path.includes("/rider/auth/") || !riderRefreshToken) {
    return response;
  }

  try {
    const newToken = await refreshRiderToken();
    response = await doFetch(newToken);
    return response;
  } catch {
    clearRiderAuth();
    return response;
  }
}

export async function riderFetchJson<T>(path: string, init: RequestInit = {}): Promise<T> {
  const res = await riderFetch(path, init);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data?.message || "Request failed");
  }
  return data as T;
}
