// @ts-check
/**
 * Stage 11 background parts for live client wallets:
 * - a client company is activated → its wallet is opened (repeat-safe);
 * - a PayU top-up is paid (on time or late) → the wallet is credited once;
 * - every minute: wallets missing for active clients are opened (clients activated before Stage 11) and wallet ops left
 *   half-way (process stopped) are finished; holds past their time expire; holds stuck half-way are finished;
 *   approved bank transfers whose credit was cut short are credited; approved credit lines put on the wallet;
 *   approved wallet adjustments cut short are posted;
 * - the hourly check: live balances match the journal.
 */
import { systemScope } from '../core/db/tenant-plugin.js';
import { EVENTS as ORG_EVENTS, OrganizationRecord } from '../modules/organizations/index.js';
import { EVENTS as PAYMENT_EVENTS } from '../modules/payments/index.js';
import {
  AccountRecord,
  createCreditLines,
  createHolds,
  createLedger,
  createLiveWallets,
  createManualTopUps,
  createWalletAdjustments,
  liveInvariants,
} from '../modules/wallet/index.js';

const SCOPE = systemScope('wallet: open client wallets', { routine: true });
export const WALLET_OPS_EVERY_MS = 60_000;

/** Active clients without a wallet → opened. @param {ReturnType<typeof createLiveWallets>} wallets */
export async function openMissingWallets(wallets) {
  const clients = await OrganizationRecord.find({ type: 'CLIENT', status: 'ACTIVE' }, { _id: 1 }).setOptions(SCOPE).limit(2000).lean();
  const have = new Set(
    (await AccountRecord.find({ type: 'WALLET' }, { ownerOrgId: 1 }).setOptions(SCOPE).lean()).map((a) => String(a.ownerOrgId)),
  );
  let opened = 0;
  for (const c of clients)
    if (!have.has(String(c._id))) {
      await wallets.open(String(c._id));
      opened += 1;
    }
  return opened;
}

/** @param {import('../core/clock.js').Clock} clock */
export function walletParts(clock) {
  const deps = { clock, ledger: createLedger({ clock }) };
  const wallets = createLiveWallets(deps);
  const holds = createHolds(deps);
  const manualTopUps = createManualTopUps({ ...deps, wallets });
  const creditLines = createCreditLines(deps);
  const adjustments = createWalletAdjustments({ ...deps, wallets });
  return {
    wallets,
    holds,
    consumer: {
      consumer: 'wallet-client-open',
      types: [ORG_EVENTS.orgActivated],
      /** @param {any} event */
      handler: async (event) => {
        if (event.payload.type === 'CLIENT') await wallets.open(String(event.payload.orgId));
      },
    },
    topUps: {
      consumer: 'wallet-topup-paid',
      types: [PAYMENT_EVENTS.intentSucceeded, PAYMENT_EVENTS.intentPaidLate],
      /** @param {any} event */
      handler: async (event) => {
        const p = event.payload;
        if (p.purpose === 'TOPUP' && p.orgId && p.orgId !== 'platform')
          await wallets.topUpPaid({ clientOrgId: String(p.orgId), txnId: String(p.txnId), amountPaise: Number(p.amountPaise) });
      },
    },
    invariants: liveInvariants(),
    schedule: {
      name: 'wallet-live-ops',
      everyMs: WALLET_OPS_EVERY_MS,
      run: async () => ({
        opened: await openMissingWallets(wallets),
        ...(await wallets.reconcileOps()),
        ...(await holds.sweep()),
        ...(await holds.reconcile()),
        ...(await manualTopUps.creditDue()),
        ...(await creditLines.applyDue()),
        ...(await creditLines.alertOverdue()),
        ...(await adjustments.finishDue()),
      }),
    },
  };
}
