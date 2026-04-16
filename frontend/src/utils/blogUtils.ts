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
 * Extracts headings (h2-h6) from an HTML string.
 */
export function extractHeadings(html: string): Heading[] {
  if (!html) return [];
  
  const headings: Heading[] = [];
  // Match h2 through h6 tags and their contents
  const headingRegex = /<h([2-6])([^>]*)>(.*?)<\/h\1>/gi;
  let match;

  while ((match = headingRegex.exec(html)) !== null) {
    const level = parseInt(match[1]);
    const content = match[3];
    // Strip HTML tags from the content to get raw text
    const text = content.replace(/<\/?[^>]+(>|$)/g, "").trim();
    
    if (text) {
      const id = slugify(text);
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

  return html.replace(/<h([2-6])([^>]*)>(.*?)<\/h\1>/gi, (match, level, attrs, content) => {
    // If it already has an ID, don't overwrite it
    if (attrs.includes('id=')) return match;
    
    const text = content.replace(/<\/?[^>]+(>|$)/g, "").trim();
    const id = slugify(text);
    
    // Inject the ID attribute
    return `<h${level}${attrs} id="${id}">${content}</h${level}>`;
  });
}
