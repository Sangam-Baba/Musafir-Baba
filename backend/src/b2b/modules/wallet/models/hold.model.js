// @ts-check
/**
 * Money holds (`wal_holds`, plan Stage 11 §3.3): money set aside in a client's wallet while a checkout finishes. One per
 * key (e.g. `order:<id>`). Statuses:
 *   PLACING → HELD (the wallet's `heldPaise` went up with op `hold:<id>`) | FAILED (not enough available)
 *   HELD → CAPTURING → CAPTURED (the amount taken, ≤ held, journal entry posted; any rest freed)
 *   HELD → RELEASING → RELEASED | EXPIRED (freed: by the owner, or by the sweeper after `expiresAt`)
 * Middle statuses (PLACING, CAPTURING, RELEASING) are finished by the reconciler after 60 seconds. Owned by the client.
 */
import { b2bMongoose } from '../../../core/db/connection.js';
import { defineTenantModel } from '../../../core/db/model.js';

export const HOLDS_COLLECTION = 'wal_holds';
export const HOLD_STATUSES = /** @type {const} */ ([
  'PLACING',
  'HELD',
  'FAILED',
  'CAPTURING',
  'CAPTURED',
  'RELEASING',
  'RELEASED',
  'EXPIRED',
]);

const schema = new b2bMongoose.Schema(
  {
    key: { type: String, required: true, maxlength: 120 },
    clientOrgId: { type: String, required: true },
    accountId: { type: String, required: true },
    amountPaise: { type: Number, required: true, min: 1 },
    status: { type: String, enum: HOLD_STATUSES, required: true },
    statusAt: { type: Date, required: true },
    expiresAt: { type: Date, required: true },
    // set when capture starts: what is taken and the journal entry it needs (counter lines; the wallet line is added)
    capture: { type: b2bMongoose.Schema.Types.Mixed, default: null },
    releaseAs: { type: String, enum: ['RELEASED', 'EXPIRED', null], default: null },
    createdBy: { type: String, required: true },
  },
  { timestamps: true, versionKey: false, strict: 'throw' },
);

export const WalletHoldRecord = defineTenantModel('WalletHold', schema, HOLDS_COLLECTION, ['clientOrgId']);
