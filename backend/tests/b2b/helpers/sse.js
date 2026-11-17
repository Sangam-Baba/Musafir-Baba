// @ts-check
/** Minimal Server-Sent Events client for tests (what the frontend hook does with fetch). */

/** @typedef {{ id: string, event: string, data: any }} SseEvent */

/**
 * Minimal SSE client on fetch (what the frontend hook does for signed-in users).
 * @param {string} url @param {Record<string, string>} [headers]
 */
export async function openStream(url, headers = {}) {
  const abort = new AbortController();
  const res = await fetch(url, { headers, signal: abort.signal });
  /** @type {SseEvent[]} */
  const events = [];
  /** @type {(() => void)[]} */
  let waiters = [];
  if (res.ok && res.body) {
    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    void (async () => {
      try {
        for (;;) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          let cut;
          while ((cut = buffer.indexOf('\n\n')) !== -1) {
            const block = buffer.slice(0, cut);
            buffer = buffer.slice(cut + 2);
            /** @type {SseEvent} */
            const ev = { id: '', event: 'message', data: null };
            let isEvent = false;
            for (const line of block.split('\n')) {
              const [field, ...rest] = line.split(': ');
              const value = rest.join(': ');
              if (field === 'id') ev.id = value;
              if (field === 'event') ev.event = value;
              if (field === 'data') {
                ev.data = JSON.parse(value);
                isEvent = true;
              }
            }
            if (isEvent) events.push(ev);
          }
          const w = waiters;
          waiters = [];
          w.forEach((f) => f());
        }
      } catch {
        // aborted
      }
    })();
  }
  /** @param {string} event @param {number} [ms] @returns {Promise<SseEvent>} */
  const next = (event, ms = 4000) =>
    new Promise((resolve, reject) => {
      const started = events.length;
      const t = setTimeout(() => reject(new Error(`no "${event}" within ${ms} ms`)), ms);
      const check = () => {
        const found = events.slice(0).find((e, i) => e.event === event && (event === 'ready' || i >= started));
        if (found) {
          clearTimeout(t);
          resolve(found);
        } else waiters.push(check);
      };
      check();
    });
  return {
    status: res.status,
    headers: res.headers,
    body: /** @type {any} */ (res.ok ? null : await problemBody(res)),
    events,
    next,
    close: () => abort.abort(),
  };
}

/**
 * The error body of a refused stream. Keeps the status and raw text when the body is not JSON (e.g. empty), so a
 * rare failure says what actually happened instead of "Unexpected end of JSON input".
 * @param {Response} res
 */
async function problemBody(res) {
  const text = await res.text();
  try {
    return JSON.parse(text);
  } catch {
    return { status: res.status, rawBody: text, contentType: res.headers.get('content-type') };
  }
}
