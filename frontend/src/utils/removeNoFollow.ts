// import { JSDOM } from "jsdom";
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

// export function optimizeTiptapHTML(html: string) {
//   const dom = new JSDOM(html);
//   const images = dom.window.document.querySelectorAll("img");

//   images.forEach((img: any) => {
//     img.setAttribute("loading", "lazy");
//     img.setAttribute("decoding", "async");
//   });

//   return dom.serialize();
// }
