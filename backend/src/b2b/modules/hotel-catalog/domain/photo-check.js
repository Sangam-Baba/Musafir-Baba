// @ts-check
/**
 * Photo checks (plan Stage 03 §3.4, §7, D32). The hotel's browser makes each size; the server never trusts it:
 * the type comes from the bytes (WebP, or JPEG where the browser can't make WebP), the real width and height
 * are read from the image header, and any camera / location data (EXIF, XMP, IPTC) or animation is refused.
 * Pure — reads bytes only, no image library.
 */
import { DomainError } from '../../../core/errors.js';

/** Expected width per size; the large `gallery` size must be at least 1200 px wide. `hero` is optional. */
export const VARIANTS = Object.freeze({
  thumb: { minWidth: 200, maxWidth: 480, maxBytes: 150 * 1024, required: true },
  card: { minWidth: 480, maxWidth: 960, maxBytes: 400 * 1024, required: true },
  gallery: { minWidth: 1200, maxWidth: 2000, maxBytes: 1536 * 1024, required: true },
  hero: { minWidth: 1600, maxWidth: 2560, maxBytes: 2560 * 1024, required: false },
});
/** @typedef {keyof typeof VARIANTS} VariantName */

/** @typedef {{ type: 'image/webp' | 'image/jpeg', width: number, height: number, metadata: boolean, animated: boolean }} ImageInfo */

/** What each WebP chunk tells us (chunk id → reader). @type {Record<string, (b: Buffer, info: ImageInfo, data: number, size: number) => void>} */
const WEBP_CHUNKS = {
  VP8X: (b, info, data, size) => {
    if (size < 10) return;
    const flags = b[data] ?? 0;
    info.metadata ||= (flags & 0x0c) !== 0; // EXIF or XMP present
    info.animated ||= (flags & 0x02) !== 0;
    info.width = 1 + b.readUIntLE(data + 4, 3);
    info.height = 1 + b.readUIntLE(data + 7, 3);
  },
  'VP8 ': (b, info, data, size) => {
    if (size < 10 || info.width) return;
    info.width = b.readUInt16LE(data + 6) & 0x3fff;
    info.height = b.readUInt16LE(data + 8) & 0x3fff;
  },
  VP8L: (b, info, data, size) => {
    if (size < 5 || info.width) return;
    const bits = b.readUInt32LE(data + 1);
    info.width = 1 + (bits & 0x3fff);
    info.height = 1 + ((bits >> 14) & 0x3fff);
  },
  EXIF: (_b, info) => void (info.metadata = true),
  'XMP ': (_b, info) => void (info.metadata = true),
  ANIM: (_b, info) => void (info.animated = true),
  ANMF: (_b, info) => void (info.animated = true),
};

/** @param {Buffer} b */
function webpInfo(b) {
  /** @type {ImageInfo} */
  const info = { type: 'image/webp', width: 0, height: 0, metadata: false, animated: false };
  let offset = 12;
  while (offset + 8 <= b.length) {
    const size = b.readUInt32LE(offset + 4);
    if (offset + 8 + size > b.length) break; // truncated chunk
    WEBP_CHUNKS[b.toString('latin1', offset, offset + 4)]?.(b, info, offset + 8, size);
    offset += 8 + size + (size % 2);
  }
  return info;
}

/** @param {Buffer} b */
function jpegInfo(b) {
  /** @type {ImageInfo} */
  const info = { type: 'image/jpeg', width: 0, height: 0, metadata: false, animated: false };
  let offset = 2;
  while (offset + 4 <= b.length && b[offset] === 0xff) {
    const marker = b[offset + 1] ?? 0;
    if (marker === 0xd8 || marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) {
      offset += 2;
      continue;
    }
    const length = b.readUInt16BE(offset + 2);
    const segment = b.toString('latin1', offset + 4, Math.min(offset + 4 + 32, b.length));
    if (marker === 0xe1 && (segment.startsWith('Exif') || segment.startsWith('http://ns.adobe.com/xap'))) info.metadata = true;
    if (marker === 0xed) info.metadata = true; // Photoshop / IPTC
    if ([0xc0, 0xc1, 0xc2].includes(marker)) {
      info.height = b.readUInt16BE(offset + 5);
      info.width = b.readUInt16BE(offset + 7);
    }
    if (marker === 0xda) break; // image data starts
    offset += 2 + length;
  }
  return info;
}

/** @param {Buffer} bytes @returns {ImageInfo | null} */
export function imageInfo(bytes) {
  if (bytes.length >= 16 && bytes.toString('latin1', 0, 4) === 'RIFF' && bytes.toString('latin1', 8, 12) === 'WEBP') return webpInfo(bytes);
  if (bytes.length >= 4 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return jpegInfo(bytes);
  return null;
}

/**
 * Checks one size of a photo.
 * @param {VariantName} name
 * @param {Buffer} bytes
 * @returns {ImageInfo}
 */
export function checkVariant(name, bytes) {
  const rule = VARIANTS[name];
  const info = imageInfo(bytes);
  if (!info || info.width === 0 || info.height === 0) throw new DomainError('PHOTO_TYPE_NOT_ALLOWED', { variant: name });
  if (info.metadata) throw new DomainError('PHOTO_HAS_METADATA', { variant: name });
  if (info.animated) throw new DomainError('PHOTO_ANIMATED', { variant: name });
  if (bytes.length > rule.maxBytes) throw new DomainError('PHOTO_FILE_TOO_LARGE', { variant: name });
  if (info.width < rule.minWidth) throw new DomainError('PHOTO_TOO_SMALL', { variant: name, width: info.width, minWidth: rule.minWidth });
  if (info.width > rule.maxWidth) throw new DomainError('PHOTO_TOO_WIDE', { variant: name, width: info.width, maxWidth: rule.maxWidth });
  const ratio = info.width / info.height;
  if (ratio < 0.5 || ratio > 2.5) throw new DomainError('PHOTO_SHAPE_UNUSUAL', { variant: name });
  return info;
}

/**
 * All sizes of one photo: the required ones present, the same shape (±3 %), the same type.
 * @param {Partial<Record<VariantName, Buffer>>} files
 * @returns {Partial<Record<VariantName, ImageInfo>>}
 */
export function checkPhoto(files) {
  /** @type {Partial<Record<VariantName, ImageInfo>>} */
  const out = {};
  for (const [name, rule] of /** @type {[VariantName, typeof VARIANTS[VariantName]][]} */ (Object.entries(VARIANTS))) {
    const bytes = files[name];
    if (!bytes) {
      if (rule.required) throw new DomainError('PHOTO_SIZE_MISSING', { variant: name });
      continue;
    }
    out[name] = checkVariant(name, bytes);
  }
  const infos = Object.values(out);
  const base = /** @type {ImageInfo} */ (out.gallery);
  for (const i of infos) {
    if (i.type !== base.type || Math.abs(i.width / i.height - base.width / base.height) > 0.03 * (base.width / base.height))
      throw new DomainError('PHOTO_SIZES_DO_NOT_MATCH');
  }
  return out;
}

/** A tiny blurred preview as a data URL (≤ 3 KB, WebP or JPEG, ≤ 64 px). @param {string} dataUrl */
export function checkPlaceholder(dataUrl) {
  const match = /^data:image\/(webp|jpeg);base64,([A-Za-z0-9+/=]+)$/.exec(dataUrl);
  const info = match && dataUrl.length <= 3000 ? imageInfo(Buffer.from(match[2] ?? '', 'base64')) : null;
  if (!info || info.metadata || info.width > 64 || info.height > 64) throw new DomainError('PHOTO_PLACEHOLDER_INVALID');
  return dataUrl;
}
