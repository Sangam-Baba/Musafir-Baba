export function readingTime(text: string) {
  if (!text) return 1;

  const wpm = 200;
  const words = text.trim().split(/\s+/).length;
  const time = Math.ceil(words / wpm);
  return time;
}

export function calculateHours(startTime: string, endTime: string) {
  const start = new Date(`1970-01-01T${startTime}:00`);
  const end = new Date(`1970-01-01T${endTime}:00`);
  const diff = end.getTime() - start.getTime();
  const hours = Math.ceil(diff / (1000 * 60 * 60));
  return hours;
}
