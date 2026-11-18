// @ts-check
/**
 * Pricing settings (`prc_settings`, one document `_id: 'pricing'`) — platform-wide. Principal or agent (D4),
 * MusafirBaba's issuing GSTINs (D10), whether hotels without GST may be sold (D20). Seeded with the owner's
 * choices of 18 Nov 2026 (CA to review); changed only by `pricing.tax.manage` holders, with history (S05-T07).
 */
import { b2bMongoose } from '../../../core/db/connection.js';
import { defineModel } from '../../../core/db/model.js';
import { PRICING_MODELS } from '../domain/quote.js';

export const SETTINGS_COLLECTION = 'prc_settings';
export const SETTINGS_ID = 'pricing';

/** @type {import('../domain/quote.js').PricingSettings} */
export const DEFAULT_SETTINGS = Object.freeze({
  model: 'PRINCIPAL',
  issuers: [{ gstin: null, stateCode: '07', isDefault: true }],
  sellUnregisteredHotels: true,
});

const schema = new b2bMongoose.Schema(
  {
    _id: { type: String, required: true },
    model: { type: String, enum: PRICING_MODELS, required: true },
    issuers: {
      type: [
        {
          _id: false,
          gstin: { type: String, default: null },
          stateCode: { type: String, required: true },
          isDefault: { type: Boolean, default: false },
        },
      ],
      default: [],
    },
    sellUnregisteredHotels: { type: Boolean, required: true },
    version: { type: Number, default: 1 },
    history: { type: [b2bMongoose.Schema.Types.Mixed], default: [] },
  },
  { timestamps: true, versionKey: false },
);

export const PricingSettingsRecord = defineModel('PricingSettings', schema, SETTINGS_COLLECTION);
