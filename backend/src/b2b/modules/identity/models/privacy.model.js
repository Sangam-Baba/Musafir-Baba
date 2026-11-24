// @ts-check
/**
 * Data protection (DPDP — plan Stage 16 §2.8). Platform-wide on purpose (people who ask may have no organisation):
 * - `id_consents`: who agreed to which notice version, for what (business registration, website hotel checkout), when;
 * - `id_data_requests`: a person asks for a copy of their data, a correction or deletion — handled by MusafirBaba
 *   staff within 30 days (the due date is kept with the request).
 */
import { b2bMongoose } from '../../../core/db/connection.js';
import { defineModel } from '../../../core/db/model.js';

export const CONSENTS_COLLECTION = 'id_consents';
export const DATA_REQUESTS_COLLECTION = 'id_data_requests';
export const CONSENT_PURPOSES = /** @type {const} */ (['business-registration', 'hotel-checkout']);
export const DATA_REQUEST_TYPES = /** @type {const} */ (['ACCESS', 'CORRECTION', 'ERASURE', 'WITHDRAW_CONSENT', 'GRIEVANCE']);

const consent = new b2bMongoose.Schema(
  {
    purpose: { type: String, enum: CONSENT_PURPOSES, required: true },
    noticeVersion: { type: String, required: true, maxlength: 20 },
    subjectRef: { type: String, default: null, maxlength: 60 }, // an order ref or `user:<id>`
    ip: { type: String, default: null, maxlength: 60 },
    at: { type: Date, required: true },
  },
  { versionKey: false, strict: 'throw' },
);

const request = new b2bMongoose.Schema(
  {
    ref: { type: String, required: true },
    type: { type: String, enum: DATA_REQUEST_TYPES, required: true },
    name: { type: String, required: true, maxlength: 80 },
    email: { type: String, required: true, maxlength: 254 },
    phone: { type: String, default: null, maxlength: 20 },
    details: { type: String, default: null, maxlength: 2000 },
    status: { type: String, enum: ['OPEN', 'DONE', 'REJECTED'], default: 'OPEN' },
    dueAt: { type: Date, required: true },
    resolvedBy: { type: String, default: null },
    resolvedAt: { type: Date, default: null },
    resolution: { type: String, default: null, maxlength: 2000 },
  },
  { timestamps: true, versionKey: false, strict: 'throw' },
);

export const ConsentRecord = defineModel('Consent', consent, CONSENTS_COLLECTION);
export const DataRequestRecord = defineModel('DataRequest', request, DATA_REQUESTS_COLLECTION);
