import { Image, PixelRatio } from 'react-native';

// Smaller images for lists/cards via Cloudflare image resizing on our CDN.
// It is used only after a one-time check that resizing is switched on for
// cdn.musafirbaba.com; until then (or if the check fails) the original URL
// is returned unchanged, so images always load exactly as before.
const CDN = 'https://cdn.musafirbaba.com/';
let resizing: 'unknown' | 'checking' | 'on' | 'off' = 'unknown';

const resizedUrl = (url: string, widthPx: number) =>
  `${CDN}cdn-cgi/image/width=${widthPx},quality=75,format=auto/${url.slice(CDN.length)}`;

function checkResizing(sampleUrl: string) {
  resizing = 'checking';
  Image.prefetch(resizedUrl(sampleUrl, 16))
    .then((ok) => {
      resizing = ok ? 'on' : 'off';
    })
    .catch(() => {
      resizing = 'off';
    });
}

/** `width` is the on-screen width in dp; returns a URL sized for it when possible. */
export function sizedImage(url: string | undefined | null, width: number): string {
  if (!url) return '';
  if (!url.startsWith(CDN) || url.startsWith(`${CDN}cdn-cgi/`)) return url;
  if (resizing === 'unknown') checkResizing(url);
  if (resizing !== 'on') return url;
  const px = Math.min(1600, Math.max(64, Math.round(PixelRatio.getPixelSizeForLayoutSize(width) / 50) * 50));
  return resizedUrl(url, px);
}
