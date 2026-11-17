// @ts-check
/**
 * Upload checks (D30 — no separate virus scanner). Pure.
 * - The type is decided from the CONTENT (magic bytes), never from the name or the browser's claim.
 * - Only PDF, PNG and JPEG; size limit; empty files refused.
 * - PDFs that can run code or carry other files are refused: JavaScript, launch actions, embedded
 *   files, rich media, XFA forms, form submission / data import.
 * Files are additionally stored encrypted and only ever opened by reviewers (D29).
 */
import { DomainError } from '../../../core/errors.js';

export const MAX_FILE_BYTES = 10 * 1024 * 1024;
export const DOCUMENT_TYPES = /** @type {const} */ (['application/pdf', 'image/png', 'image/jpeg']);

/** @typedef {typeof DOCUMENT_TYPES[number]} DocumentType */

const PDF_DANGER = /\/(JavaScript|JS|Launch|EmbeddedFiles?|RichMedia|XFA|SubmitForm|ImportData)\b/;

/**
 * @param {Buffer} bytes
 * @returns {DocumentType | null}
 */
export function detectType(bytes) {
  if (bytes.subarray(0, 5).toString('latin1') === '%PDF-') return 'application/pdf';
  if (bytes.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return 'image/png';
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return 'image/jpeg';
  return null;
}

/**
 * @param {Buffer} bytes
 * @param {{ allowed?: readonly DocumentType[], maxBytes?: number }} [rules]
 * @returns {{ contentType: DocumentType }}
 */
export function checkUpload(bytes, rules = {}) {
  const max = rules.maxBytes ?? MAX_FILE_BYTES;
  if (bytes.length === 0) throw new DomainError('FILE_EMPTY');
  if (bytes.length > max) throw new DomainError('FILE_TOO_LARGE', { maxBytes: max });
  const type = detectType(bytes);
  if (!type || !(rules.allowed ?? DOCUMENT_TYPES).includes(type))
    throw new DomainError('FILE_TYPE_NOT_ALLOWED', { allowed: [...(rules.allowed ?? DOCUMENT_TYPES)] });
  if (type === 'application/pdf' && PDF_DANGER.test(bytes.toString('latin1'))) throw new DomainError('PDF_NOT_SAFE');
  return { contentType: type };
}

/**
 * A safe display name: no folders, no control characters, ≤ 100 characters.
 * @param {string | undefined} name
 */
export function safeFileName(name) {
  const base = (name ?? '').split(/[\\/]/).pop() ?? '';
  const clean = base
    .replace(/[^\w .()-]/g, '_')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 100);
  return clean || 'document';
}
