export function readingTime(text: string) {
  if (!text) return 1;

  const wpm = 200;
  const words = text.trim().split(/\s+/).length;
  const time = Math.ceil(words / wpm);
  return time;
}
