// @ts-check
/**
 * Client branding (plan Stage 15 §3.10): read and save a client company's voucher brand. Checked here as well as at
 * the route: colour `#rrggbb`, logo only an `https://` link to an image file (no scripts, no other schemes), an email
 * shape, a phone of digits / spaces / + - ( ). Saving needs the version last read (two people editing → 409).
 * `brandOf` is what documents print: the saved brand, or the company's display name when nothing is saved.
 */
import { ConflictError, DomainError } from '../../core/errors.js';
import { BrandingRecord } from './models/branding.model.js';

export const HEX_COLOUR = /^#[0-9a-fA-F]{6}$/;
export const LOGO_URL = /^https:\/\/[a-zA-Z0-9.-]+(?::\d{2,5})?\/[^\s"'<>()\\]*\.(png|jpe?g|webp|svg)(\?[^\s"'<>()\\]*)?$/i;
const EMAIL = /^[^\s@<>"']+@[^\s@<>"']+\.[a-zA-Z]{2,}$/;
const PHONE = /^[0-9+\-() ]{6,20}$/;

/**
 * @typedef {{ name: string, contactPhone: string | null, contactEmail: string | null, colour: string | null, logoUrl: string | null }} Brand
 */

/** @param {Brand} b */
export function checkBrand(b) {
  if (!b.name || b.name.trim().length < 2 || b.name.length > 80) throw new DomainError('BRAND_NAME_INVALID');
  if (b.colour !== null && !HEX_COLOUR.test(b.colour)) throw new DomainError('BRAND_COLOUR_INVALID');
  if (b.logoUrl !== null && (!LOGO_URL.test(b.logoUrl) || b.logoUrl.length > 500)) throw new DomainError('BRAND_LOGO_INVALID');
  if (b.contactEmail !== null && !EMAIL.test(b.contactEmail)) throw new DomainError('BRAND_EMAIL_INVALID');
  if (b.contactPhone !== null && !PHONE.test(b.contactPhone)) throw new DomainError('BRAND_PHONE_INVALID');
}

/** @param {Record<string, any>} r */
const dto = (r) => ({
  name: r.name,
  contactPhone: r.contactPhone,
  contactEmail: r.contactEmail,
  colour: r.colour,
  logoUrl: r.logoUrl,
  version: r.version,
  updatedAt: r.updatedAt,
});

/** @param {string} orgId */
export async function brandingOf(orgId) {
  const r = await BrandingRecord.findOne({ orgId }).lean();
  return r ? dto(r) : null;
}

/**
 * Save (first save: `expectedVersion` 0).
 * @param {string} orgId @param {string} by @param {Brand & { expectedVersion: number }} a
 */
export async function saveBranding(orgId, by, a) {
  const b = { name: a.name.trim(), contactPhone: a.contactPhone, contactEmail: a.contactEmail, colour: a.colour, logoUrl: a.logoUrl };
  checkBrand(b);
  if (a.expectedVersion === 0) {
    try {
      await BrandingRecord.create({ orgId, ...b, version: 1, updatedBy: by });
    } catch (e) {
      if (/** @type {any} */ (e)?.code === 11000) throw new ConflictError('BRANDING_CHANGED');
      throw e;
    }
  } else {
    const res = await BrandingRecord.updateOne(
      { orgId, version: a.expectedVersion },
      { $set: { ...b, updatedBy: by }, $inc: { version: 1 } },
    );
    if (res.modifiedCount !== 1) throw new ConflictError('BRANDING_CHANGED');
  }
  return /** @type {NonNullable<Awaited<ReturnType<typeof brandingOf>>>} */ (await brandingOf(orgId));
}

/** What a client voucher prints. @param {string} orgId @param {string | null} displayName @returns {Promise<Brand | null>} */
export async function brandOf(orgId, displayName) {
  const r = await BrandingRecord.findOne({ orgId }).lean();
  if (r)
    return {
      name: r.name,
      contactPhone: r.contactPhone ?? null,
      contactEmail: r.contactEmail ?? null,
      colour: r.colour ?? null,
      logoUrl: r.logoUrl ?? null,
    };
  return displayName ? { name: displayName, contactPhone: null, contactEmail: null, colour: null, logoUrl: null } : null;
}
