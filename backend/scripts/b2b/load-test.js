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
 *
 * Stage 16 adds two client scenarios (need a staging client key with hotel:search, hotel:book, orders:read and a funded
 * staging wallet): LOAD_API_KEY=mb_test_… → "create order + wallet pay" (20 / s, < 2 s — every call books a real room
 * on staging, so use a hotel with plenty of rooms and cancel afterwards) and "My Bookings list" (50 / s, < 300 ms).
 * LOAD_ONLY=autocomplete,search,offers,order,mybookings picks scenarios; LOAD_REPORT=report.json writes the results.
 */

import { randomUUID } from 'node:crypto';
import { writeFileSync } from 'node:fs';
import { performance } from 'node:perf_hooks';

const BASE = process.env.LOAD_BASE ?? 'http://127.0.0.1:8000/api/v1';
const SECONDS = Number(process.env.LOAD_SECONDS ?? 30);
const CITY = process.env.LOAD_CITY_ID ?? '';
const HOTEL = process.env.LOAD_HOTEL_REF ?? '';
const KEY = process.env.LOAD_API_KEY ?? '';
const ONLY = (process.env.LOAD_ONLY ?? '')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);
const keyed = (/** @type {Record<string, string>} */ h = {}) => ({
  'content-type': 'application/json',
  authorization: `Bearer ${KEY}`,
  ...h,
});
const day = (/** @type {number} */ n) => new Date(Date.now() + n * 86_400_000).toISOString().slice(0, 10);
const stay = { checkIn: day(14), checkOut: day(16), rooms: [{ adults: 2, childrenAges: [] }] };

/** @type {{ id: string, name: string, rps: number, budgetMs: number, needsKey?: boolean, call: () => Promise<Response> }[]} */
const SCENARIOS = [
  { id: 'autocomplete', name: 'destination autocomplete', rps: 100, budgetMs: 150, call: () => fetch(`${BASE}/hotels/destinations?q=go`) },
  {
    id: 'search',
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
    id: 'offers',
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
  { id: 'order', name: 'create order + wallet pay (API key)', rps: 20, budgetMs: 2000, needsKey: true, call: orderAndPay },
  {
    id: 'mybookings',
    name: 'My Bookings list (API key)',
    rps: 50,
    budgetMs: 300,
    needsKey: true,
    call: () => fetch(`${BASE}/client/bookings`, { headers: keyed() }),
  },
];

/** One booking end to end: offers → order → pay from the wallet; the response of the pay call is what is timed. */
async function orderAndPay() {
  const offers = await fetch(`${BASE}/hotels/${HOTEL}/offers`, { method: 'POST', headers: keyed(), body: JSON.stringify(stay) });
  const token = /** @type {any} */ (await offers.json()).offers?.[0]?.priceToken;
  if (!token) return offers;
  const order = await fetch(`${BASE}/client/orders`, {
    method: 'POST',
    headers: keyed({ 'idempotency-key': `load-${randomUUID()}` }),
    body: JSON.stringify({
      priceToken: token,
      rooms: [{ leadGuest: 'Load Test' }],
      contact: { name: 'Load Test', email: 'load@example.com', phone: '9800000000' },
      customerReference: 'LOAD-TEST',
    }),
  });
  const ref = /** @type {any} */ (await order.json()).order?.ref;
  if (!ref) return order;
  return fetch(`${BASE}/client/orders/${ref}/pay`, {
    method: 'POST',
    headers: keyed({ 'idempotency-key': `load-pay-${randomUUID()}` }),
    body: JSON.stringify({ method: 'WALLET' }),
  });
}

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
  for (const s of SCENARIOS) {
    if (ONLY.length && !ONLY.includes(s.id)) continue;
    if (s.needsKey && !KEY) {
      console.log(`skipped: ${s.name} (set LOAD_API_KEY)`);
      continue;
    }
    results.push(await run(s));
  }
  if (process.env.LOAD_REPORT)
    writeFileSync(
      process.env.LOAD_REPORT,
      JSON.stringify({ base: BASE, seconds: SECONDS, at: new Date().toISOString(), results }, null, 2),
    );
  console.table(results.map((r) => ({ ...r, p50: Math.round(r.p50), p95: Math.round(r.p95), p99: Math.round(r.p99) })));
  process.exit(results.every((r) => r.ok) ? 0 : 1);
}

main().catch((error) => {
  console.error(error);
  process.exit(2);
});
