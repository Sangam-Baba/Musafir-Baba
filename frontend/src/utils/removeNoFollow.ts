export function fixInternalLinkRel(html: string) {
  return html.replace(/<a\s+[^>]*href="([^"]+)"[^>]*>/gi, (anchor, href) => {
    const isInternal = href.startsWith("https://musafirbaba.com");

    if (!isInternal) return anchor;

    // remove only nofollow
    return anchor.replace(/\srel="([^"]*)"/i, (_, relValue) => {
      const cleaned = relValue
        .split(" ")
        .filter((r: string) => r !== "nofollow")
        .join(" ");

      return cleaned ? ` rel="${cleaned}"` : "";
    });
  });
}
