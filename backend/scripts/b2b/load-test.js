// @ts-check
/**
 * Load test for hotel search (plan Stage 06 §3.9, budgets `docs/plan/07-testing-strategy.md` §5). No package needed.
 * Runs each scenario at a fixed rate for a while and reports p50 / p95 / p99 and errors; exits 1 if a p95 budget is
 * missed. Run it against **staging** (never production — it creates real load and rate-limit counters):
 *
 *   LOAD_BASE=https://staging-api.example/api/v1 LOAD_CITY_ID=<city id> LOAD_HOTEL_REF=MBHT-…  \
 *   LOAD_SECONDS=30 node scripts/b2b/load-test.js
 *
 * The per-IP search limits would stop a single machine early, so run it from several machines or raise the limits on
 * staging. Cache hit / miss: the search API has no cache today (plan §3.5) — every call is a "miss".
 */

import { performance } from 'node:perf_hooks';

const BASE = process.env.LOAD_BASE ?? 'http://127.0.0.1:8000/api/v1';
const SECONDS = Number(process.env.LOAD_SECONDS ?? 30);
const CITY = process.env.LOAD_CITY_ID ?? '';
const HOTEL = process.env.LOAD_HOTEL_REF ?? '';
const day = (/** @type {number} */ n) => new Date(Date.now() + n * 86_400_000).toISOString().slice(0, 10);
const stay = { checkIn: day(14), checkOut: day(16), rooms: [{ adults: 2, childrenAges: [] }] };

/** @type {{ name: string, rps: number, budgetMs: number, call: () => Promise<Response> }[]} */
const SCENARIOS = [
  { name: 'destination autocomplete', rps: 100, budgetMs: 150, call: () => fetch(`${BASE}/hotels/destinations?q=go`) },
  {
    name: 'city search (no cache)',
    rps: 30,
    budgetMs: 800,
    call: () =>
      fetch(`${BASE}/hotels/search`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ destination: { type: 'CITY', id: CITY }, ...stay }),
      }),
  },
  {
    name: 'offers for a hotel',
    rps: 50,
    budgetMs: 400,
    call: () =>
      fetch(`${BASE}/hotels/${HOTEL}/offers`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(stay),
      }),
  },
];

/** @param {number[]} sorted @param {number} p */
const pct = (sorted, p) => sorted[Math.min(sorted.length - 1, Math.floor((p / 100) * sorted.length))] ?? NaN;

/** @param {(typeof SCENARIOS)[number]} s */
async function run(s) {
  /** @type {number[]} */
  const times = [];
  let errors = 0;
  /** @type {Promise<void>[]} */
  const inflight = [];
  const total = s.rps * SECONDS;
  const start = performance.now();
  for (let i = 0; i < total; i += 1) {
    const due = start + (i * 1000) / s.rps;
    const wait = due - performance.now();
    if (wait > 0) await new Promise((r) => setTimeout(r, wait));
    const t0 = performance.now();
    inflight.push(
      s.call().then(
        async (res) => {
          await res.arrayBuffer();
          if (!res.ok) errors += 1;
          times.push(performance.now() - t0);
        },
        () => {
          errors += 1;
        },
      ),
    );
  }
  await Promise.all(inflight);
  times.sort((a, b) => a - b);
  const p95 = pct(times, 95);
  return {
    name: s.name,
    requests: total,
    errors,
    p50: pct(times, 50),
    p95,
    p99: pct(times, 99),
    budgetMs: s.budgetMs,
    ok: errors === 0 && p95 < s.budgetMs,
  };
}

async function main() {
  if (!CITY || !HOTEL) {
    console.error('Set LOAD_CITY_ID and LOAD_HOTEL_REF (a city with many live hotels, and one live hotel).');
    process.exit(2);
  }
  const results = [];
  for (const s of SCENARIOS) results.push(await run(s));
  console.table(results.map((r) => ({ ...r, p50: Math.round(r.p50), p95: Math.round(r.p95), p99: Math.round(r.p99) })));
  process.exit(results.every((r) => r.ok) ? 0 : 1);
}

main().catch((error) => {
  console.error(error);
  process.exit(2);
});
