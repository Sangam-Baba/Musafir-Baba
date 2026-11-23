// A short two-tone alert, made in the browser (no sound file to load). Browsers only play sound after the person has
// clicked on the page once; before that this stays silent and the on-screen notice is still shown.
let ctx: AudioContext | null = null;

export function playAlert() {
  try {
    const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return;
    ctx ??= new Ctor();
    const start = ctx.currentTime;
    [880, 1175, 880, 1175].forEach((freq, i) => {
      const osc = ctx!.createOscillator();
      const gain = ctx!.createGain();
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.0001, start + i * 0.22);
      gain.gain.exponentialRampToValueAtTime(0.25, start + i * 0.22 + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + i * 0.22 + 0.2);
      osc.connect(gain).connect(ctx!.destination);
      osc.start(start + i * 0.22);
      osc.stop(start + i * 0.22 + 0.21);
    });
  } catch {
    /* sound is a bonus — the notice is on screen anyway */
  }
}
