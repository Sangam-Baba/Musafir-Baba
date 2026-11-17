// Makes the photo sizes in the browser (decision D32): the server never resizes — it checks what we send.
// The photo is decoded upright, drawn onto a canvas (which drops all camera / GPS data) and encoded as WebP —
// or JPEG on browsers that can't make WebP. Sizes: thumb 320, card 640, gallery up to 1600 (needs ≥ 1200 px),
// hero up to 1920 (only when the photo is at least 1600 px wide), plus a tiny blurred placeholder.

export class PhotoTooSmallError extends Error {}

const WIDTHS = { thumb: 320, card: 640 } as const;

function encode(canvas: HTMLCanvasElement, type: string, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) => canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("Could not encode the photo"))), type, quality));
}

function draw(bitmap: ImageBitmap, width: number): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = Math.round((bitmap.height * width) / bitmap.width);
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas not available");
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  return canvas;
}

export interface PreparedPhoto {
  files: Record<string, Blob>;
  placeholder: string;
  type: "image/webp" | "image/jpeg";
}

export async function preparePhoto(file: File): Promise<PreparedPhoto> {
  const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  try {
    if (bitmap.width < 1200) throw new PhotoTooSmallError(`This photo is ${bitmap.width} px wide — photos need to be at least 1200 px wide.`);
    const ratio = bitmap.width / bitmap.height;
    if (ratio < 0.5 || ratio > 2.5) throw new PhotoTooSmallError("This photo is too tall or too wide — use a normal photo shape.");
    const probe = await encode(draw(bitmap, 16), "image/webp", 0.8);
    const type = probe.type === "image/webp" ? "image/webp" : "image/jpeg";
    const widths: Record<string, number> = { ...WIDTHS, gallery: Math.min(1600, bitmap.width) };
    if (bitmap.width >= 1600) widths.hero = Math.min(1920, bitmap.width);
    const files: Record<string, Blob> = {};
    for (const [name, width] of Object.entries(widths)) files[name] = await encode(draw(bitmap, width), type, name === "thumb" ? 0.75 : 0.82);
    const placeholder = draw(bitmap, 16).toDataURL(type, 0.5);
    return { files, placeholder, type };
  } finally {
    bitmap.close();
  }
}
