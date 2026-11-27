// @ts-check
/**
 * Bus seat layouts (plan Stage 18 B2) — pure. A layout has one or two decks (LOWER, UPPER); each deck is a grid
 * (rows × columns) with seats placed on cells: a seat number (1–6 letters / digits, unique across the bus), a type
 * (SEATER, SEMI_SLEEPER, SLEEPER) and an optional ladies-only flag. Empty cells are the aisle / gaps. A sleeper berth
 * may span two cells (`span: 2`, along the row). `checkLayout` returns every problem at once; templates give common
 * layouts to start from.
 */

export const DECKS = /** @type {const} */ (['LOWER', 'UPPER']);
export const SEAT_TYPES = /** @type {const} */ (['SEATER', 'SEMI_SLEEPER', 'SLEEPER']);
export const MAX_ROWS = 20;
export const MAX_COLS = 8;
export const MAX_SEATS = 80;

/**
 * @typedef {{ no: string, row: number, col: number, type: typeof SEAT_TYPES[number], ladies?: boolean, span?: 1 | 2 }} Seat
 * @typedef {{ deck: typeof DECKS[number], rows: number, cols: number, seats: Seat[] }} Deck
 * @typedef {{ decks: Deck[] }} Layout
 * @typedef {{ path: string, code: string }} Problem
 */

/**
 * One seat's problems (number, type, span, grid, overlap).
 * @param {Seat} s @param {Deck} d @param {string} p @param {{ numbers: Set<string>, used: Set<string>, problems: Problem[] }} acc
 */
function checkSeat(s, d, p, acc) {
  const { numbers, used, problems } = acc;
  if (!/^[A-Z0-9]{1,6}$/.test(String(s.no))) problems.push({ path: `${p}.no`, code: 'SEAT_NUMBER_INVALID' });
  else if (numbers.has(s.no)) problems.push({ path: `${p}.no`, code: 'SEAT_NUMBER_REPEATED' });
  numbers.add(s.no);
  if (!SEAT_TYPES.includes(s.type)) problems.push({ path: `${p}.type`, code: 'SEAT_TYPE_INVALID' });
  const span = s.span ?? 1;
  if (span !== 1 && span !== 2) problems.push({ path: `${p}.span`, code: 'SPAN_INVALID' });
  if (span === 2 && s.type !== 'SLEEPER') problems.push({ path: `${p}.span`, code: 'ONLY_SLEEPERS_SPAN' });
  checkPlacement(s, d, p, { used, problems });
}

/** Inside the grid and not on another seat. @param {Seat} s @param {Deck} d @param {string} p @param {{ used: Set<string>, problems: Problem[] }} acc */
function checkPlacement(s, d, p, { used, problems }) {
  const span = s.span ?? 1;
  const inGrid = Number.isInteger(s.row) && Number.isInteger(s.col) && s.row >= 0 && s.col >= 0 && s.row < d.rows && s.col + span <= d.cols;
  if (!inGrid) problems.push({ path: p, code: 'SEAT_OUTSIDE_GRID' });
  for (let c = 0; c < span; c += 1) {
    const cell = `${s.row}:${s.col + c}`;
    if (inGrid && used.has(cell)) problems.push({ path: p, code: 'SEATS_OVERLAP' });
    used.add(cell);
  }
}

/** @param {Layout} layout @returns {Problem[]} */
export function checkLayout(layout) {
  /** @type {Problem[]} */
  const problems = [];
  const decks = Array.isArray(layout?.decks) ? layout.decks : [];
  if (decks.length < 1 || decks.length > 2) problems.push({ path: 'decks', code: 'DECKS_ONE_OR_TWO' });
  if (new Set(decks.map((d) => d.deck)).size !== decks.length) problems.push({ path: 'decks', code: 'DECK_REPEATED' });
  const numbers = new Set();
  let total = 0;
  decks.forEach((d, di) => {
    const at = `decks.${di}`;
    if (!DECKS.includes(d.deck)) problems.push({ path: `${at}.deck`, code: 'DECK_INVALID' });
    if (!Number.isInteger(d.rows) || d.rows < 1 || d.rows > MAX_ROWS) problems.push({ path: `${at}.rows`, code: 'ROWS_INVALID' });
    if (!Number.isInteger(d.cols) || d.cols < 1 || d.cols > MAX_COLS) problems.push({ path: `${at}.cols`, code: 'COLS_INVALID' });
    const used = new Set();
    (d.seats ?? []).forEach((s, si) => {
      total += 1;
      checkSeat(s, d, `${at}.seats.${si}`, { numbers, used, problems });
    });
  });
  if (total < 1 || total > MAX_SEATS) problems.push({ path: 'decks', code: 'SEAT_COUNT_INVALID' });
  return problems;
}

/** Seat count and what kinds of seats a layout has. @param {Layout} layout */
export function layoutSummary(layout) {
  const seats = layout.decks.flatMap((d) => d.seats.map((s) => ({ ...s, deck: d.deck })));
  const types = [...new Set(seats.map((s) => s.type))];
  return { seatCount: seats.length, deckCount: layout.decks.length, types, ladiesSeats: seats.filter((s) => s.ladies).map((s) => s.no) };
}

/**
 * A grid of seats: `pattern` per row like "SS_S" (S = seat, _ = aisle).
 * @param {{ deck: typeof DECKS[number], rows: number, pattern: string, type: typeof SEAT_TYPES[number], name: (i: number) => string }} g
 */
function grid({ deck, rows, pattern, type, name }) {
  /** @type {Seat[]} */
  const seats = [];
  for (let r = 0; r < rows; r += 1)
    [...pattern].forEach((ch, c) => {
      if (ch === 'S') seats.push({ no: name(seats.length), row: r, col: c, type });
    });
  return { deck, rows, cols: pattern.length, seats };
}

/** Common layouts to start from (operators edit seat numbers, ladies seats and gaps afterwards). */
export const LAYOUT_TEMPLATES = /** @type {const} */ ({
  'seater-2x2-40': {
    name: '2+2 seater (40)',
    build: () => ({ decks: [grid({ deck: 'LOWER', rows: 10, pattern: 'SS_SS', type: 'SEATER', name: (i) => String(i + 1) })] }),
  },
  'seater-2x2-49': {
    name: '2+2 seater with last row of 5 (49)',
    build: () => {
      const d = grid({ deck: 'LOWER', rows: 11, pattern: 'SS_SS', type: 'SEATER', name: (i) => String(i + 1) });
      d.rows = 12;
      d.seats.push(...[0, 1, 2, 3, 4].map((c) => /** @type {Seat} */ ({ no: String(45 + c), row: 11, col: c, type: 'SEATER' })));
      return { decks: [d] };
    },
  },
  'sleeper-2x1-30': {
    name: '2+1 sleeper, lower + upper (30)',
    build: () => ({
      decks: [
        grid({ deck: 'LOWER', rows: 5, pattern: 'S_SS', type: 'SLEEPER', name: (i) => `L${i + 1}` }),
        grid({ deck: 'UPPER', rows: 5, pattern: 'S_SS', type: 'SLEEPER', name: (i) => `U${i + 1}` }),
      ],
    }),
  },
  'seater-sleeper-2x1': {
    name: 'Seater lower + sleeper upper (2+1)',
    build: () => ({
      decks: [
        grid({ deck: 'LOWER', rows: 10, pattern: 'S_SS', type: 'SEATER', name: (i) => String(i + 1) }),
        grid({ deck: 'UPPER', rows: 5, pattern: 'S_SS', type: 'SLEEPER', name: (i) => `U${i + 1}` }),
      ],
    }),
  },
});
/** @typedef {keyof typeof LAYOUT_TEMPLATES} LayoutTemplate */
