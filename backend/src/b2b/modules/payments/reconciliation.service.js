// @ts-check
/**
 * Reconciliation (S07-T09): PayU's settlement lines ↔ our payments and refunds ↔ the ledger.
 * - Only the new system's transactions (`B2B…`) are looked at; the existing website's lines are ignored.
 * - Each line is stored once (PayU id + action). A capture must match a confirmed payment with the same amount;
 *   a refund line a refund that succeeded. Matched lines get their ledger entries once:
 *     capture → PayU fees (fee + its tax) ← clearing, and bank ← clearing (the amount settled);
 *     refund  → clearing ← bank (PayU took the refund back from a payout).
 * - Anything that doesn't agree → an exception for finance (one per kind + key). Confirmed payments older than
 *   3 days with no settlement line → `NOT_SETTLED`.
 * Repeat-safe: importing the same day again changes nothing.
 */
import { raiseException } from './exceptions.js';
import { IntentRecord } from './models/intent.model.js';
import { RefundRecord } from './models/refund.model.js';
import { SettlementRecord } from './models/settlement.model.js';

const OURS = /^B2B[HWST][2-9A-Z]{12}$/;
export const NOT_SETTLED_AFTER_DAYS = 3;

/**
 * @typedef {import('./payments.service.js').PaymentsDeps} PaymentsDeps
 * @typedef {{ txnid: string, mihpayid: string, amountPaise: number, feePaise: number, taxPaise: number, settledPaise: number,
 *   utr: string | null, action: string, settledOn: string }} SettlementLine
 */

/**
 * Ledger entries for a matched line (repeat-safe by reference).
 * @param {PaymentsDeps} deps
 * @param {Record<string, any>} s
 */
async function postSettlement(deps, s) {
  const clearing = await deps.ledger.accountId('platform', 'GATEWAY_CLEARING');
  const bank = await deps.ledger.accountId('platform', 'BANK');
  const fees = await deps.ledger.accountId('platform', 'GATEWAY_FEES');
  const ref = { type: 'settlement', id: s.key };
  if (s.action === 'refund') {
    await deps.ledger.post(
      {
        reference: ref,
        purpose: 'refund-recovered',
        lines: [
          { accountId: clearing, debitPaise: s.amountPaise },
          { accountId: bank, creditPaise: s.amountPaise },
        ],
      },
      'system:recon',
    );
  } else {
    const fee = s.feePaise + s.taxPaise;
    if (fee > 0)
      await deps.ledger.post(
        {
          reference: ref,
          purpose: 'gateway-fee',
          lines: [
            { accountId: fees, debitPaise: fee },
            { accountId: clearing, creditPaise: fee },
          ],
        },
        'system:recon',
      );
    if (s.settledPaise > 0)
      await deps.ledger.post(
        {
          reference: ref,
          purpose: 'settled-to-bank',
          lines: [
            { accountId: bank, debitPaise: s.settledPaise },
            { accountId: clearing, creditPaise: s.settledPaise },
          ],
          memo: s.utr ? `UTR ${s.utr}` : null,
        },
        'system:recon',
      );
  }
  await SettlementRecord.updateOne({ key: s.key }, { $set: { journalPosted: true } });
}

/**
 * Does the line agree with our records? Returns the exception to raise, or null.
 * @param {Record<string, any>} s
 */
async function mismatchOf(s) {
  if (s.action === 'refund') {
    const ok = await RefundRecord.exists({ txnId: s.txnId, status: 'SUCCEEDED', amountPaise: s.amountPaise });
    return ok ? null : { kind: 'SETTLEMENT_UNMATCHED', detail: `PayU refund line of ${s.amountPaise} paise matches no completed refund` };
  }
  const intent = await IntentRecord.findOne({ txnId: s.txnId }, { amountPaise: 1, status: 1, gatewayPaymentId: 1 }).lean();
  if (!intent) return { kind: 'SETTLEMENT_UNMATCHED', detail: 'PayU settled a payment we have no record of' };
  if (intent.amountPaise !== s.amountPaise)
    return { kind: 'SETTLEMENT_AMOUNT', detail: `PayU settled ${s.amountPaise} paise, our payment is ${intent.amountPaise}` };
  if (!intent.gatewayPaymentId) return { kind: 'SETTLEMENT_UNMATCHED', detail: `PayU settled a payment we hold as ${intent.status}` };
  if (s.feePaise + s.taxPaise + s.settledPaise !== s.amountPaise)
    return {
      kind: 'SETTLEMENT_AMOUNT',
      detail: `fee ${s.feePaise} + tax ${s.taxPaise} + settled ${s.settledPaise} ≠ amount ${s.amountPaise}`,
    };
  return null;
}

/**
 * Import and reconcile settlement lines (from PayU's API or a file).
 * @param {PaymentsDeps} deps
 * @param {SettlementLine[]} lines
 * @param {'API' | 'FILE'} source
 */
export async function reconcileSettlements(deps, lines, source) {
  const ours = lines.filter((l) => OURS.test(l.txnid) && l.mihpayid && Number.isSafeInteger(l.amountPaise));
  let matched = 0;
  let exceptions = 0;
  for (const l of ours) {
    const key = `${l.mihpayid}:${l.action === 'refund' ? 'refund' : 'capture'}`;
    const doc = {
      key,
      txnId: l.txnid,
      mihpayid: l.mihpayid,
      action: l.action === 'refund' ? 'refund' : 'capture',
      amountPaise: l.amountPaise,
      feePaise: l.feePaise || 0,
      taxPaise: l.taxPaise || 0,
      settledPaise: l.settledPaise || 0,
      utr: l.utr,
      settledOn: l.settledOn,
      source,
      importedAt: deps.clock.now(),
    };
    await SettlementRecord.updateOne({ key }, { $setOnInsert: doc }, { upsert: true });
    const s = /** @type {Record<string, any>} */ (await SettlementRecord.findOne({ key }).lean());
    if (s.journalPosted) {
      matched += 1;
      continue;
    }
    const problem = await mismatchOf(s);
    if (problem) {
      exceptions += 1;
      await raiseException(deps, { ...problem, key, txnId: s.txnId, amountPaise: s.amountPaise });
      continue;
    }
    await SettlementRecord.updateOne({ key }, { $set: { matched: true } });
    await postSettlement(deps, s);
    matched += 1;
  }
  return { lines: lines.length, ours: ours.length, matched, exceptions };
}

/**
 * Confirmed payments with no settlement line after a few days → exception.
 * @param {PaymentsDeps} deps
 */
export async function flagUnsettled(deps) {
  const before = new Date(deps.clock.now().getTime() - NOT_SETTLED_AFTER_DAYS * 86_400_000);
  const old = await IntentRecord.find(
    { status: { $in: ['SUCCEEDED', 'REFUNDED'] }, gatewayPaymentId: { $ne: null }, lastVerifiedAt: { $lte: before } },
    { txnId: 1, gatewayPaymentId: 1, amountPaise: 1 },
  )
    .limit(200)
    .lean();
  let flagged = 0;
  for (const i of old) {
    if (await SettlementRecord.exists({ key: `${i.gatewayPaymentId}:capture` })) continue;
    flagged += 1;
    await raiseException(deps, {
      kind: 'NOT_SETTLED',
      key: i.txnId,
      txnId: i.txnId,
      detail: `No PayU settlement ${NOT_SETTLED_AFTER_DAYS} days after the payment`,
      amountPaise: i.amountPaise,
    });
  }
  return flagged;
}

/**
 * The daily job: yesterday's settlement from PayU's API, then the unsettled check.
 * @param {PaymentsDeps} deps
 */
export async function dailyReconciliation(deps) {
  if (!deps.payu) return null;
  const yesterday = new Date(deps.clock.now().getTime() - 86_400_000).toISOString().slice(0, 10);
  const lines = await deps.payu.settlements(yesterday);
  const result = await reconcileSettlements(deps, lines, 'API');
  const unsettled = await flagUnsettled(deps);
  deps.logger.info({ date: yesterday, ...result, unsettled }, 'payments: daily reconciliation');
  return { date: yesterday, ...result, unsettled };
}
