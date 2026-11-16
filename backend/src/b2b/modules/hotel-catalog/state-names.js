// @ts-check
/** State names by GST state code, for the public address (same list as kyc's GST_STATES). Pure data. */
import { GST_STATES } from '../kyc/index.js';

/** @type {Readonly<Record<string, string>>} */
export const GST_STATE_NAMES = Object.freeze({ ...GST_STATES });
