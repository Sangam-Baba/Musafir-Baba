// @ts-check
/**
 * A small CSV reader / writer (RFC 4180: commas, double-quoted fields with "" for a quote, CRLF or LF), so the
 * calendar import needs no new package. Pure. Leading BOM ignored. Cells written by `toCsv` that start with
 * = + - @ are prefixed with ' (spreadsheets must not run them as formulas).
 */
import { DomainError } from '../../../core/errors.js';

/**
 * One character of the reader. Returns true when the character ended a row.
 * @param {{ cell: string, row: string[], quoted: boolean, skip: boolean }} st @param {string} c @param {string | undefined} next
 */
function step(st, c, next) {
  if (st.quoted) {
    if (c === '"' && next === '"') {
      st.cell += '"';
      st.skip = true;
    } else if (c === '"') st.quoted = false;
    else st.cell += c;
    return false;
  }
  if (c === '"' && st.cell === '') st.quoted = true;
  else if (c === ',') {
    st.row.push(st.cell);
    st.cell = '';
  } else if (c === '\n') return true;
  else if (c !== '\r') st.cell += c;
  return false;
}

/** @param {string} text @param {number} maxRows @returns {string[][]} */
export function parseCsv(text, maxRows) {
  /** @type {string[][]} */
  const rows = [];
  const st = { cell: '', row: /** @type {string[]} */ ([]), quoted: false, skip: false };
  const src = text.charCodeAt(0) === 0xfeff ? text.slice(1) : text;
  const endRow = () => {
    st.row.push(st.cell);
    if (!(st.row.length === 1 && st.row[0] === '')) rows.push(st.row);
    if (rows.length > maxRows + 1) throw new DomainError('IMPORT_TOO_MANY_ROWS', { maxRows });
    st.row = [];
    st.cell = '';
  };
  for (let i = 0; i < src.length; i += 1) {
    if (st.skip) {
      st.skip = false;
      continue;
    }
    if (step(st, /** @type {string} */ (src[i]), src[i + 1])) endRow();
  }
  if (st.quoted) throw new DomainError('IMPORT_CSV_UNCLOSED_QUOTE');
  if (st.cell !== '' || st.row.length > 0) endRow();
  return rows;
}

/** @param {unknown} v */
const safeCell = (v) => {
  const s = v === null || v === undefined ? '' : String(v);
  const guarded = /^[=+\-@]/.test(s) ? `'${s}` : s;
  return /[",\n\r]/.test(guarded) ? `"${guarded.replace(/"/g, '""')}"` : guarded;
};

/** @param {unknown[][]} rows */
export const toCsv = (rows) => `${rows.map((r) => r.map(safeCell).join(',')).join('\r\n')}\r\n`;
