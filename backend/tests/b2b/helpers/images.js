// @ts-check
/** Tiny, header-valid test images (no real photos needed): WebP and JPEG, with or without camera data. */

/** @param {string} id @param {Buffer} data */
const chunk = (id, data) => {
  const head = Buffer.alloc(8);
  head.write(id, 0, 'latin1');
  head.writeUInt32LE(data.length, 4);
  return Buffer.concat([head, data, data.length % 2 ? Buffer.alloc(1) : Buffer.alloc(0)]);
};
/** @param {Buffer[]} chunks */
const riff = (chunks) => {
  const body = Buffer.concat([Buffer.from('WEBP', 'latin1'), ...chunks]);
  const head = Buffer.alloc(8);
  head.write('RIFF', 0, 'latin1');
  head.writeUInt32LE(body.length, 4);
  return Buffer.concat([head, body]);
};
/** A lossy WebP of the given size (as a browser's canvas makes). @param {number} w @param {number} h */
export const webp = (w, h) => {
  const vp8 = Buffer.alloc(30);
  Buffer.from([0x9d, 0x01, 0x2a]).copy(vp8, 3);
  vp8.writeUInt16LE(w, 6);
  vp8.writeUInt16LE(h, 8);
  return riff([chunk('VP8 ', vp8)]);
};
/** A WebP whose extended header says it carries EXIF (e.g. a camera file renamed). @param {number} w @param {number} h */
export const webpWithExif = (w, h) => {
  const x = Buffer.alloc(10);
  x[0] = 0x08;
  x.writeUIntLE(w - 1, 4, 3);
  x.writeUIntLE(h - 1, 7, 3);
  return riff([chunk('VP8X', x), chunk('EXIF', Buffer.from('Exif\0\0GPS...', 'latin1'))]);
};
/** A JPEG header with the given size, optionally with an EXIF block. @param {number} w @param {number} h @param {boolean} [exif] */
export const jpeg = (w, h, exif = false) => {
  const app0 = Buffer.from([0xff, 0xe0, 0x00, 0x10, ...Buffer.from('JFIF\0', 'latin1'), 1, 1, 0, 0, 1, 0, 1, 0, 0]);
  const exifData = Buffer.from('Exif\0\0GPSDATA..', 'latin1');
  const app1 = Buffer.concat([Buffer.from([0xff, 0xe1, 0x00, exifData.length + 2]), exifData]); // the length counts its own 2 bytes
  const sof = Buffer.from([0xff, 0xc0, 0x00, 0x11, 8, h >> 8, h & 0xff, w >> 8, w & 0xff, 3, 1, 0x22, 0, 2, 0x11, 1, 3, 0x11, 1]);
  return Buffer.concat([Buffer.from([0xff, 0xd8]), app0, ...(exif ? [app1] : []), sof, Buffer.from([0xff, 0xda, 0x00, 0x02, 0xff, 0xd9])]);
};
export const PLACEHOLDER = `data:image/webp;base64,${webp(16, 10).toString('base64')}`;
/** The three required sizes of one photo. */
export const sizes = () => ({ thumb: webp(320, 200), card: webp(640, 400), gallery: webp(1600, 1000) });

/**
 * Uploads one photo through the API.
 * @param {string} base server base URL
 * @param {Record<string, string>} headers
 * @param {string} propertyId
 * @param {{ files?: Record<string, Buffer>, fields?: Record<string, string> }} [o]
 */
export async function uploadPhoto(base, headers, propertyId, o = {}) {
  const form = new globalThis.FormData();
  for (const [name, bytes] of Object.entries(o.files ?? sizes()))
    form.append(name, new globalThis.Blob([new Uint8Array(bytes)], { type: 'image/webp' }), `${name}.webp`);
  for (const [name, value] of Object.entries({ placeholder: PLACEHOLDER, category: 'EXTERIOR', ...(o.fields ?? {}) }))
    form.append(name, value);
  const res = await fetch(`${base}/api/v1/hotel/properties/${propertyId}/photos`, { method: 'POST', headers, body: form });
  return { status: res.status, body: /** @type {any} */ (await res.json().catch(() => null)) };
}
