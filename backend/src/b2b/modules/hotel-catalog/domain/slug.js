// @ts-check
/** URL-safe names: "Port Blair" → "port-blair". Pure. */

/** @param {string} text @returns {string} */
export function slugify(text) {
  return text
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}

/** India's rough bounding box — catches swapped latitude / longitude. @param {number} lat @param {number} lng */
export const isInIndia = (lat, lng) => lat >= 6 && lat <= 37.5 && lng >= 68 && lng <= 98;
