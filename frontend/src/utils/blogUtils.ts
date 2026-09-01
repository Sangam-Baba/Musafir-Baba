/**
 * Converts a string into a URL-friendly slug.
 */
export function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "") // Remove all non-word chars (except spaces and hyphens)
    .replace(/[\s_-]+/g, "-") // Replace spaces and underscores with a single hyphen
    .replace(/^-+|-+$/g, ""); // Remove leading and trailing hyphens
}

export interface Heading {
  text: string;
  id: string;
  level: number;
}

/**
 * Helper to build a unique ID for a heading, ensuring no duplicates on the page.
 */
function getUniqueId(
  rawId: string,
  index: number,
  seenIds: Map<string, number>
): string {
  const base = rawId || `section-${index + 1}`;
  const count = seenIds.get(base) || 0;
  seenIds.set(base, count + 1);
  return count === 0 ? base : `${base}-${count}`;
}

/**
 * Extracts headings (h2) from an HTML string.
 */
export function extractHeadings(html: string): Heading[] {
  if (!html) return [];
  
  const headings: Heading[] = [];
  // Match h2 through h6 tags and their contents (including multiline)
  const headingRegex = /<h([2-6])([^>]*)>([\s\S]*?)<\/h\1>/gi;
  let match;
  let index = 0;
  const seenIds = new Map<string, number>();

  while ((match = headingRegex.exec(html)) !== null) {
    const level = parseInt(match[1]);
    const attrs = match[2];
    const content = match[3];
    // Strip HTML tags from the content to get raw text
    const text = content.replace(/<\/?[^>]+(>|$)/g, "").trim();
    
    // Check if heading already has an ID attribute
    const existingIdMatch = attrs.match(/\bid=["']([^"']+)["']/i);
    const rawId = existingIdMatch ? existingIdMatch[1] : slugify(text);
    const id = getUniqueId(rawId, index, seenIds);
    index++;

    if (text && level === 2) {
      headings.push({ text, id, level });
    }
  }

  return headings;
}

/**
 * Injects ID attributes into heading tags in an HTML string based on their text content.
 */
export function addIdsToHeadings(html: string): string {
  if (!html) return "";

  let index = 0;
  const seenIds = new Map<string, number>();

  return html.replace(/<h([2-6])([^>]*)>([\s\S]*?)<\/h\1>/gi, (match, level, attrs, content) => {
    // If it already has an ID, don't overwrite it, but track it
    const existingIdMatch = attrs.match(/\bid=["']([^"']+)["']/i);
    if (existingIdMatch) {
      const existingId = existingIdMatch[1];
      seenIds.set(existingId, (seenIds.get(existingId) || 0) + 1);
      index++;
      return match;
    }
    
    const text = content.replace(/<\/?[^>]+(>|$)/g, "").trim();
    const rawId = slugify(text);
    const id = getUniqueId(rawId, index, seenIds);
    index++;
    
    // Inject the ID attribute
    return `<h${level}${attrs} id="${id}">${content}</h${level}>`;
  });
}
