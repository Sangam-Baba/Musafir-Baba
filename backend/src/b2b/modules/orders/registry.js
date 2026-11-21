// @ts-check
/**
 * The engine's two plug-in points (plan Stage 08 §1): **item handlers** (what is bought — hotel rooms now) and
 * **payment modes** (how it is paid — PayU now, wallet / credit at Stage 12). The orders code calls only these
 * interfaces, so a new item type or payment mode is registered without changing it.
 */
import { DomainError } from '../../core/errors.js';

/**
 * @typedef {import('../../core/context.js').RequestContext} Ctx
 * @typedef {{ type: string, bookingId: string, bookingRef: string, hotelOrgId: string, holdId: string | null,
 *   totalPaise: number, gstPaise: number }} OrderItem
 * @typedef {{ id: string, ref: string, channel: string,
 *   buyer: { clientOrgId: string | null, customerId: string | null, guestKey: string | null },
 *   contact: { name: string, email: string, phone: string } }} OrderInfo
 * @typedef {{ totalPaise: number, gstPaise: number, hotelOrgId: string, tokenHash: string, data: unknown }} Priced
 * @typedef {{ item: OrderItem, holdExpiresAt: Date }} Prepared
 * @typedef {{ accountId: string, debitPaise?: number, creditPaise?: number }} LedgerLine
 * @typedef {{
 *   price: (ctx: Ctx, input: unknown) => Promise<Priced>,
 *   prepare: (ctx: Ctx, order: OrderInfo, priced: Priced) => Promise<Prepared>,
 *   confirm: (ctx: Ctx, order: OrderInfo, item: OrderItem) => Promise<{ confirmed: true } | { confirmed: false, reason: string }>,
 *   rehold: (ctx: Ctx, order: OrderInfo, item: OrderItem) => Promise<{ held: boolean, holdId: string | null, holdExpiresAt: Date | null }>,
 *   release: (ctx: Ctx, order: OrderInfo, item: OrderItem, reason: 'EXPIRED' | 'FAILED') => Promise<void>,
 *   extend: (ctx: Ctx, item: OrderItem) => Promise<Date>,
 *   ledgerLines: (order: OrderInfo, item: OrderItem) => Promise<LedgerLine[]>,
 *   abandon: (ctx: Ctx, order: OrderInfo) => Promise<void>,
 *   view: (item: OrderItem, audience: 'BUYER' | 'ADMIN') => Promise<Record<string, unknown>>,
 *   timeline: (item: OrderItem) => Promise<{ at: Date, what: string, by: string, note: string | null }[]>,
 *   cancelStart: (ctx: Ctx, item: OrderItem, q: { chargePaise: number, refundPaise: number, by: string, reason?: string | null }) => Promise<{ started: boolean, status: string }>,
 *   cancelRooms: (ctx: Ctx, item: OrderItem) => Promise<void>,
 *   cancelLedgerLines: (item: OrderItem, amounts?: { chargePaise: number, refundPaise: number }) => Promise<{ refundPaise: number, lines: LedgerLine[] }>,
 *   cancelDone: (ctx: Ctx, item: OrderItem) => Promise<void>,
 * }} ItemHandler
 * @typedef {{
 *   start: (ctx: Ctx, order: Record<string, any>, opts: { windowMinutes: number, returnUrl: string }) =>
 *     Promise<{ intentId: string, txnId: string, action: string, fields: Record<string, string> }>,
 *   debitAccount: (order: Record<string, any>) => Promise<string>,
 *   refund: (ctx: Ctx, order: Record<string, any>, a: { intentId: string, key: string, reason: string, amountPaise?: number }) => Promise<void>,
 *   instant?: boolean,
 *   settle?: (ctx: Ctx, order: Record<string, any>) => Promise<void>,
 * }} PaymentMode
 *   `instant`: paid as soon as `start` returns (wallet) — no gateway answer to wait for; `settle`: called just before the
 *   order's journal entry (the wallet takes the money it held)
 */

/**
 * @template T
 * @param {string} what
 */
function registry(what) {
  /** @type {Map<string, T>} */
  const map = new Map();
  return {
    /** @param {string} key @param {T} impl */
    register(key, impl) {
      if (map.has(key)) throw new Error(`[b2b] ${what} "${key}" registered twice`);
      map.set(key, impl);
    },
    /** @param {string} key @returns {T} */
    get(key) {
      const impl = map.get(key);
      if (!impl) throw new DomainError(`${what.toUpperCase().replace(/ /g, '_')}_NOT_AVAILABLE`, { key });
      return impl;
    },
    /** @param {string} key */
    has: (key) => map.has(key),
    keys: () => [...map.keys()],
  };
}

/** @returns {ReturnType<typeof registry<ItemHandler>>} */
export const createItemHandlers = () => registry('item handler');
/** @returns {ReturnType<typeof registry<PaymentMode>>} */
export const createPaymentModes = () => registry('payment mode');
