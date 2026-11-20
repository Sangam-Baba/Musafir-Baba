// @ts-check
/**
 * PayU server API for the new system (S07-T05), on **the existing merchant account** (`PAYU_KEY`, `PAYU_SALT`,
 * `PAYU_ENV` — read only). Verify a payment, refund one, follow a refund, read a day's settlement. Every call has a
 * timeout; answers are reduced to the few fields we use. Field names follow PayU's postservice API — to be confirmed in
 * PayU test mode (the admin test payment, S07-T10); they live only in this file.
 */
import { URLSearchParams } from 'node:url';

import { apiHash, statusOf, toPaise } from './domain/payu.js';

const PAYMENT_URL = { prod: 'https://secure.payu.in/_payment', test: 'https://test.payu.in/_payment' };
const API_URL = { prod: 'https://info.payu.in/merchant/postservice?form=2', test: 'https://test.payu.in/merchant/postservice?form=2' };
const TIMEOUT_MS = 15_000;

/**
 * @typedef {{ key: string, salt: string, env: 'prod' | 'test' }} PayuMerchant
 * @typedef {{ status: 'SUCCESS' | 'PENDING' | 'FAILURE' | 'NOT_FOUND' | 'UNKNOWN', txnid: string, mihpayid: string | null, amountPaise: number, mode: string | null }} Verified
 */

/** The merchant from the existing settings, or null when they're not set (payments then stay switched off). @param {NodeJS.ProcessEnv} env @returns {PayuMerchant | null} */
export function merchantFromEnv(env) {
  if (!env.PAYU_KEY || !env.PAYU_SALT) return null;
  return { key: env.PAYU_KEY, salt: env.PAYU_SALT, env: env.PAYU_ENV === 'prod' ? 'prod' : 'test' };
}

/** @param {PayuMerchant} m */
export const paymentUrl = (m) => PAYMENT_URL[m.env];

/**
 * @param {{ merchant: PayuMerchant, fetch?: typeof fetch }} deps
 */
export function createPayuClient(deps) {
  const m = deps.merchant;
  const doFetch = deps.fetch ?? fetch;

  /** @param {string} command @param {Record<string, string>} vars */
  async function call(command, vars) {
    const body = new URLSearchParams({ key: m.key, command, hash: apiHash(command, vars.var1 ?? '', m), ...vars });
    const res = await doFetch(API_URL[m.env], {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded', accept: 'application/json' },
      body,
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    if (!res.ok) throw new Error(`[b2b] PayU ${command} answered ${res.status}`);
    return /** @type {Record<string, any>} */ (await res.json());
  }

  return {
    /** Ask PayU what happened to our transaction. @param {string} txnid @returns {Promise<Verified>} */
    async verify(txnid) {
      const r = await call('verify_payment', { var1: txnid });
      const d = r?.transaction_details?.[txnid];
      if (!d || String(d.status).toLowerCase() === 'not found')
        return { status: 'NOT_FOUND', txnid, mihpayid: null, amountPaise: 0, mode: null };
      return {
        status: statusOf(d.status),
        txnid,
        mihpayid: d.mihpayid ? String(d.mihpayid) : null,
        amountPaise: toPaise(d.amt ?? d.transaction_amount ?? d.amount),
        mode: d.mode ? String(d.mode) : null,
      };
    },

    /** Refund to the source. `refundId` is ours and makes it repeat-safe at PayU. @param {{ mihpayid: string, refundId: string, amountPaise: number }} a */
    async refund(a) {
      const r = await call('cancel_refund_transaction', { var1: a.mihpayid, var2: a.refundId, var3: (a.amountPaise / 100).toFixed(2) });
      const accepted = Number(r?.status) === 1;
      return { accepted, requestId: r?.request_id ? String(r.request_id) : null, message: String(r?.msg ?? '') };
    },

    /** Where a refund stands. @param {string} requestId */
    async refundStatus(requestId) {
      const r = await call('check_action_status', { var1: requestId });
      const d = r?.transaction_details?.[requestId];
      const first = d && typeof d === 'object' ? Object.values(d)[0] : null;
      return { status: statusOf(/** @type {any} */ (first)?.status ?? r?.status_text ?? ''), raw: String(r?.msg ?? '') };
    },

    /** A day's settlement lines (YYYY-MM-DD). @param {string} date */
    async settlements(date) {
      const r = await call('get_settlement_details', { var1: date });
      const rows = /** @type {any[]} */ (r?.Txn_details ?? r?.txn_details ?? []);
      return rows.map((x) => ({
        txnid: String(x.txnid ?? ''),
        mihpayid: String(x.payuid ?? x.mihpayid ?? ''),
        amountPaise: toPaise(x.transaction_amount ?? x.amount),
        feePaise: toPaise(x.merchant_service_fee ?? x.service_fee ?? 0),
        taxPaise: toPaise(x.merchant_service_tax ?? x.service_tax ?? 0),
        settledPaise: toPaise(x.merchant_net_amount ?? x.settled_amount ?? 0),
        utr: x.utr_number ? String(x.utr_number) : null,
        action: String(x.action ?? 'capture').toLowerCase(),
        settledOn: String(x.settlement_date ?? date).slice(0, 10),
      }));
    },
  };
}
