// @ts-check
/** A B2B client's own display markup (`prc_client_markups`, one document per client org — tenant `clientOrgId`). */
import { b2bMongoose } from '../../../core/db/connection.js';
import { defineTenantModel } from '../../../core/db/model.js';
import { MARKUP_TYPES } from '../domain/markup.js';

export const CLIENT_MARKUPS_COLLECTION = 'prc_client_markups';

const adjustment = {
  type: { type: String, enum: MARKUP_TYPES, required: true },
  value: { type: Number, required: true },
  minPaise: { type: Number, default: null },
  maxPaise: { type: Number, default: null },
};

const schema = new b2bMongoose.Schema(
  {
    clientOrgId: { type: String, required: true },
    enabled: { type: Boolean, required: true },
    adjustment: { type: new b2bMongoose.Schema(adjustment, { _id: false }), required: true },
    overrides: {
      type: [
        new b2bMongoose.Schema(
          {
            match: {
              type: new b2bMongoose.Schema({ cityId: String, propertyId: String, starRating: Number }, { _id: false }),
              required: true,
            },
            adjustment: { type: new b2bMongoose.Schema(adjustment, { _id: false }), required: true },
          },
          { _id: false },
        ),
      ],
      default: [],
    },
    version: { type: Number, default: 1 },
    updatedBy: { type: String, required: true },
  },
  { timestamps: true, versionKey: false },
);

export const ClientMarkupRecord = defineTenantModel('PricingClientMarkup', schema, CLIENT_MARKUPS_COLLECTION, ['clientOrgId']);
