// @ts-check
/**
 * Destination autocomplete (plan Stage 06 §3.1). Pure. Cities, areas and live property names are matched on a
 * normalised prefix — of the whole name or of any word in it ("baga" finds "Baga Beach"; "marine" finds
 * "Sea View Marine Drive"). Ranking: exact name, then whole-name prefix, then word prefix; cities before areas before
 * hotels; then popularity (live properties in that city / area); then name. At most 10 results.
 */

export const MAX_SUGGESTIONS = 10;
const TYPE_RANK = /** @type {const} */ ({ CITY: 0, AREA: 1, PROPERTY: 2 });

/**
 * @typedef {{ type: 'CITY' | 'AREA' | 'PROPERTY', id: string, name: string, cityId: string, cityName: string,
 *   ref?: string, slug?: string, popularity: number }} Destination
 * @typedef {Destination & { key: string, words: string[] }} IndexedDestination
 */

/** Lowercase, accents removed, anything not a letter / digit becomes a space, spaces collapsed. @param {string} s */
export function normalise(s) {
  return s
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

/** @param {Destination[]} items @returns {IndexedDestination[]} */
export function buildIndex(items) {
  return items.map((d) => {
    const key = normalise(d.name);
    return { ...d, key, words: key.split(' ').filter(Boolean) };
  });
}

/** @param {IndexedDestination} d @param {string} q 0 exact, 1 name prefix, 2 word prefix, -1 no match */
function strength(d, q) {
  if (d.key === q) return 0;
  if (d.key.startsWith(q)) return 1;
  return d.words.some((w) => w.startsWith(q)) || (q.includes(' ') && d.key.includes(` ${q}`)) ? 2 : -1;
}

/**
 * @param {readonly IndexedDestination[]} index
 * @param {string} query
 * @returns {Destination[]}
 */
export function suggest(index, query) {
  const q = normalise(query);
  if (q.length < 2) return [];
  return index
    .map((d) => ({ d, s: strength(d, q) }))
    .filter((x) => x.s >= 0)
    .sort(
      (a, b) =>
        a.s - b.s || TYPE_RANK[a.d.type] - TYPE_RANK[b.d.type] || b.d.popularity - a.d.popularity || a.d.name.localeCompare(b.d.name),
    )
    .slice(0, MAX_SUGGESTIONS)
    .map(({ d }) => ({
      type: d.type,
      id: d.id,
      name: d.name,
      cityId: d.cityId,
      cityName: d.cityName,
      ref: d.ref,
      slug: d.slug,
      popularity: d.popularity,
    }));
}
