// @ts-check
/**
 * Last-room race against a **staging** server (plan Stage 16 §2.2) — never production. N buyers (default 500) ask
 * for the same hotel's rooms at the same moment through the real API with a staging client key; the script counts
 * the orders that got rooms and fails (exit 1) if that is more than the rooms that were free. Orders are never paid,
 * so their rooms are given back automatically when the hold ends (no clean-up needed).
 *
 *   RACE_BASE=https://staging-api.example/api/v1 RACE_API_KEY=mb_test_… RACE_HOTEL_REF=MBHT-… RACE_ROOMS=3 \
 *   RACE_BUYERS=500 node scripts/b2b/race-at-scale.js
 *
 * RACE_ROOMS = rooms free on that night for the first offer's room type (look in the hotel's calendar first). The
 * key needs hotel:search + hotel:book; its rate limit (600 / minute) allows 500 offers + 500 orders within a minute.
 */
import { randomUUID } from 'node:crypto';

const BASE = process.env.RACE_BASE ?? '';
const KEY = process.env.RACE_API_KEY ?? '';
const HOTEL = process.env.RACE_HOTEL_REF ?? '';
const ROOMS = Number(process.env.RACE_ROOMS ?? NaN);
const BUYERS = Number(process.env.RACE_BUYERS ?? 500);
const day = (/** @type {number} */ n) => new Date(Date.now() + n * 86_400_000).toISOString().slice(0, 10);
const stay = {
  checkIn: process.env.RACE_CHECK_IN ?? day(30),
  checkOut: process.env.RACE_CHECK_OUT ?? day(31),
  rooms: [{ adults: 2, childrenAges: [] }],
};
const headers = (/** @type {Record<string, string>} */ h = {}) => ({
  'content-type': 'application/json',
  authorization: `Bearer ${KEY}`,
  ...h,
});

async function main() {
  if (!BASE || !KEY || !HOTEL || !Number.isFinite(ROOMS)) {
    console.error('Set RACE_BASE (staging), RACE_API_KEY (mb_test_…), RACE_HOTEL_REF and RACE_ROOMS.');
    process.exit(2);
  }
  if (!KEY.startsWith('mb_test_')) {
    console.error('Refusing to run with a live key — this script is for staging only.');
    process.exit(2);
  }
  const tokens = [];
  for (let i = 0; i < BUYERS; i += 50) {
    const batch = await Promise.all(
      Array.from({ length: Math.min(50, BUYERS - i) }, () =>
        fetch(`${BASE}/hotels/${HOTEL}/offers`, { method: 'POST', headers: headers(), body: JSON.stringify(stay) }).then((r) => r.json()),
      ),
    );
    for (const b of batch) tokens.push(/** @type {any} */ (b).offers?.[0]?.priceToken);
  }
  if (tokens.some((t) => !t)) throw new Error('Some offers came back empty — is the hotel live with rooms on those dates?');
  const started = Date.now();
  const results = await Promise.all(
    tokens.map((priceToken, i) =>
      fetch(`${BASE}/client/orders`, {
        method: 'POST',
        headers: headers({ 'idempotency-key': `race-${randomUUID()}` }),
        body: JSON.stringify({
          priceToken,
          rooms: [{ leadGuest: `Race Buyer ${i}` }],
          contact: { name: 'Race Test', email: 'race@example.com', phone: '9800000000' },
          customerReference: 'RACE-TEST',
          confirmDuplicate: true,
        }),
      }).then(async (r) => ({ status: r.status, body: /** @type {any} */ (await r.json().catch(() => ({}))) })),
    ),
  );
  const won = results.filter((r) => r.status === 201);
  const codes = results.reduce(
    (m, r) => ({ ...m, [r.body?.code ?? r.status]: (m[r.body?.code ?? r.status] ?? 0) + 1 }),
    /** @type {Record<string, number>} */ ({}),
  );
  console.table({ buyers: BUYERS, roomsFree: ROOMS, gotRooms: won.length, ms: Date.now() - started });
  console.log('answers:', codes);
  if (won.length > ROOMS) {
    console.error(`OVERSOLD: ${won.length} orders got rooms but only ${ROOMS} were free.`);
    process.exit(1);
  }
  console.log(
    won.length === ROOMS
      ? 'OK — every free room went to exactly one buyer.'
      : `OK — not oversold (${won.length} of ${ROOMS} rooms taken; others may have been lost to rate limits or price changes).`,
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(2);
});
