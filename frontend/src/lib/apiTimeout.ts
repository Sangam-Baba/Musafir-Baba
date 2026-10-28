// Server-side fetches to our API must never hang: Vercel fails the whole
// build when a page takes more than 60s to prerender, and a connection the
// API/Cloudflare stalls mid-response otherwise waits minutes before erroring.
// Pass `signal: apiTimeoutSignal()` so a stalled request aborts and the
// caller's catch falls back to empty data. A new signal is needed per call.
export const API_FETCH_TIMEOUT_MS = 15000;

export const apiTimeoutSignal = () => AbortSignal.timeout(API_FETCH_TIMEOUT_MS);
