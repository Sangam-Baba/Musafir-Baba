// Short-lived in-memory cache for read-only list requests (tours, visas), so
// moving between screens doesn't download the same lists again. In-flight
// requests are shared; a failed request is never cached.
const entries = new Map<string, { at: number; promise: Promise<any> }>();

export const LIST_CACHE_MS = 5 * 60 * 1000;

export function cachedRequest<T>(key: string, load: () => Promise<T>, ttlMs = LIST_CACHE_MS): Promise<T> {
  const hit = entries.get(key);
  if (hit && Date.now() - hit.at < ttlMs) return hit.promise;
  const promise = load().catch((e) => {
    entries.delete(key);
    throw e;
  });
  entries.set(key, { at: Date.now(), promise });
  return promise;
}
