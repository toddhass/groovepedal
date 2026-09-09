const SILENT_WAV =
  "data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQAAAAA=";

let htmlAudio: HTMLAudioElement | null = null;

export function isIOS() {
  if (typeof navigator === "undefined") return false;
  return /iPhone|iPad|iPod/i.test(navigator.userAgent) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
}

export function createAudioContext(): AudioContext {
  const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
  return new AC();
}

/** Must run inside a tap. Keeps iOS from suspending the graph after Start. */
export function unlockAudio(ctx: AudioContext) {
  if (ctx.state === "suspended") void ctx.resume();

  if (!htmlAudio) {
    htmlAudio = new Audio(SILENT_WAV);
    htmlAudio.loop = true;
    htmlAudio.setAttribute("playsinline", "");
    htmlAudio.volume = 0.01;
  }
  void htmlAudio.play().catch(() => { /* ignore autoplay race */ });

  try {
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    g.gain.value = 0.04;
    o.frequency.value = 72;
    o.connect(g);
    g.connect(ctx.destination);
    o.start();
    o.stop(ctx.currentTime + 0.06);
  } catch { /* noop */ }
}
