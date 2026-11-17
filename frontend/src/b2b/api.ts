// Client for the B2B API (/api/v1 on the existing backend).
// - Sends `X-B2B-Auth: 1` (the auth endpoints require it) and the refresh cookie (credentials).
// - Business calls carry the in-memory access token; on 401 the token is renewed once and the call retried.
// - Errors come back as RFC 9457 problems → B2BError with the server's code.
import { useBusinessSession } from "./session-store";

export const B2B_API: string = process.env.NEXT_PUBLIC_B2B_API_URL ?? `${process.env.NEXT_PUBLIC_BASE_URL ?? ""}/v1`;

/**
 * Sign-in calls (they set or read the HttpOnly refresh cookie) go through the website's own login relay
 * (`app/api/v1/[...path]/route.ts`) when the API lives on another site than the website — so the cookie belongs to
 * the website and browsers keep sending it. Switched on in production with NEXT_PUBLIC_B2B_AUTH_RELAY=true; locally the
 * website and API are the same site, so calls go straight to the API.
 */
const AUTH_RELAY = process.env.NEXT_PUBLIC_B2B_AUTH_RELAY === "true";
export const RELAYED_PATH = /^\/(auth\/[a-z0-9-]+(\/[a-z0-9-]+)*|registrations\/hotel|invitations\/accept)$/;
const baseFor = (path: string) => (AUTH_RELAY && RELAYED_PATH.test(path.split("?")[0] ?? "") ? "/api/v1" : B2B_API);

export class B2BError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
    public details: Record<string, unknown> = {},
  ) {
    super(message);
  }
}

type Options = { method?: string; body?: unknown; token?: string | null; retry?: boolean; headers?: Record<string, string> };

async function send<T>(path: string, opts: Options): Promise<T> {
  const headers: Record<string, string> = { "X-B2B-Auth": "1", ...(opts.headers ?? {}) };
  if (opts.body !== undefined) headers["Content-Type"] = "application/json";
  if (opts.token) headers.Authorization = `Bearer ${opts.token}`;
  const res = await fetch(`${baseFor(path)}${path}`, {
    method: opts.method ?? "GET",
    headers,
    credentials: "include",
    body: opts.body === undefined ? undefined : JSON.stringify(opts.body),
  });
  if (res.status === 204) return undefined as T;
  const data = await res.json().catch(() => null);
  if (!res.ok) {
    const code = typeof data?.code === "string" ? data.code : `HTTP_${res.status}`;
    throw new B2BError(res.status, code, typeof data?.title === "string" ? data.title : "Request failed", data ?? {});
  }
  return data as T;
}

let refreshing: Promise<string | null> | null = null;

/** Renews the access token from the refresh cookie. Returns null when there is no valid session. */
export function refreshBusinessSession(): Promise<string | null> {
  refreshing ??= send<{ accessToken: string }>("/auth/refresh", { method: "POST" })
    .then((r) => {
      useBusinessSession.getState().setAccessToken(r.accessToken);
      return r.accessToken;
    })
    .catch(() => {
      useBusinessSession.getState().setAccessToken(null);
      return null;
    })
    .finally(() => {
      refreshing = null;
    });
  return refreshing;
}

/** A business-user call (renews the token once on 401). */
export async function b2b<T>(path: string, opts: Omit<Options, "token"> = {}): Promise<T> {
  const token = useBusinessSession.getState().accessToken;
  try {
    return await send<T>(path, { ...opts, token });
  } catch (error) {
    const viewing = useBusinessSession.getState().viewAs; // a view-as pass is never renewed from this browser's own cookie
    if (error instanceof B2BError && error.status === 401 && opts.retry !== false && !path.startsWith("/auth/") && !viewing) {
      const fresh = await refreshBusinessSession();
      if (fresh) return send<T>(path, { ...opts, token: fresh });
    }
    throw error;
  }
}

/** A call with an explicit token (MusafirBaba admin pages: the existing admin token or the B2B admin pass). */
export function b2bWithToken<T>(path: string, token: string | null, opts: Omit<Options, "token"> = {}): Promise<T> {
  return send<T>(path, { ...opts, token });
}

/** Header values must be plain ASCII: other characters become _ (the server cleans the name further). */
const asciiName = (name: string) => Array.from(name, (ch) => (ch >= " " && ch <= "~" ? ch : "_")).join("").slice(0, 200);

/** Uploads a file as the raw request body (KYC documents). Renews the token once on 401. */
export async function b2bUpload<T>(path: string, file: File): Promise<T> {
  const attempt = async (token: string | null) => {
    const headers: Record<string, string> = { "Content-Type": "application/octet-stream", "X-File-Name": asciiName(file.name) };
    if (token) headers.Authorization = `Bearer ${token}`;
    const res = await fetch(`${B2B_API}${path}`, { method: "POST", headers, credentials: "include", body: file });
    const data = await res.json().catch(() => null);
    if (!res.ok) throw new B2BError(res.status, typeof data?.code === "string" ? data.code : `HTTP_${res.status}`, data?.title ?? "Upload failed", data ?? {});
    return data as T;
  };
  try {
    return await attempt(useBusinessSession.getState().accessToken);
  } catch (error) {
    if (error instanceof B2BError && error.status === 401 && !useBusinessSession.getState().viewAs) {
      const fresh = await refreshBusinessSession();
      if (fresh) return attempt(fresh);
    }
    throw error;
  }
}

/** Sends a multipart form (hotel photos). Renews the token once on 401. */
export async function b2bForm<T>(path: string, form: FormData): Promise<T> {
  const attempt = async (token: string | null) => {
    const res = await fetch(`${B2B_API}${path}`, { method: "POST", headers: token ? { Authorization: `Bearer ${token}` } : {}, credentials: "include", body: form });
    const data = await res.json().catch(() => null);
    if (!res.ok) throw new B2BError(res.status, typeof data?.code === "string" ? data.code : `HTTP_${res.status}`, data?.title ?? "Upload failed", data ?? {});
    return data as T;
  };
  try {
    return await attempt(useBusinessSession.getState().accessToken);
  } catch (error) {
    if (error instanceof B2BError && error.status === 401 && !useBusinessSession.getState().viewAs) {
      const fresh = await refreshBusinessSession();
      if (fresh) return attempt(fresh);
    }
    throw error;
  }
}
