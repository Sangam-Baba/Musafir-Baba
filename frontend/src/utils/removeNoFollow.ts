export function fixInternalLinkRel(html: string) {
  return html.replace(
    /<a([^>]+)href="([^"]+)"([^>]*)>/gi,
    (match, before, href, after) => {
      const isInternal = href.startsWith("https://musafirbaba.com");

      if (!isInternal) return match;

      // remove nofollow / ugc / sponsored from internal links
      const cleaned = after.replace(
        /\srel="([^"]*)"/i,
        (relMatch: any, relValue: any) => {
          const filtered = relValue
            .split(" ")
            .filter((r: any) => r !== "nofollow")
            .join(" ");

          return filtered ? ` rel="${filtered}"` : "";
        }
      );

      return `<a${before}href="${href}"${cleaned}>`;
    }
  );
}
