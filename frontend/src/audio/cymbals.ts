// Additive/noise cymbal synthesis, ported from the original bakeCym().
// Renders each cymbal once to an AudioBuffer at load time; playback is just
// a buffer source, so runtime cost is negligible.

export interface CymSpec {
  dur: number;
  f0: number;
  n: number;
  exp: number;
  fall: number;
  decay: number;
  dark: number;
  bright: number;
  noise: number;
  nDecay: number;
  stick: number;
  stickAmp: number;
  hp: number;
  drive: number;
  peak: number;
  seed: number;
  mid?: number;
  trash?: number;
  bell?: [number, number, number][];
}

export const CYM_SPECS: Record<string, CymSpec> = {
  closed: { dur: 0.09, f0: 620, n: 8, exp: 1.22, fall: 0.48, decay: 0.05, dark: 0.35, bright: 1.7, noise: 0.22, nDecay: 0.28, stick: 0.003, stickAmp: 1.1, hp: 2400, drive: 1.6, peak: 0.9, seed: 11, mid: 0.7 },
  open: { dur: 0.32, f0: 480, n: 10, exp: 1.28, fall: 0.5, decay: 0.14, dark: 0.4, bright: 1.45, noise: 0.18, nDecay: 0.4, stick: 0.004, stickAmp: 0.9, hp: 1800, drive: 1.45, peak: 0.88, seed: 17, mid: 0.85 },
  chick: { dur: 0.06, f0: 540, n: 7, exp: 1.18, fall: 0.55, decay: 0.025, dark: 0.5, bright: 1.1, noise: 0.16, nDecay: 0.22, stick: 0.0025, stickAmp: 1.3, hp: 900, drive: 1.7, peak: 0.85, seed: 23, mid: 1.2 },
  ride: { dur: 0.7, f0: 290, n: 10, exp: 1.33, fall: 0.62, decay: 0.22, dark: 0.55, bright: 1.15, noise: 0.08, nDecay: 0.35, stick: 0.0035, stickAmp: 0.7, hp: 600, drive: 1.25, peak: 0.86, seed: 31, mid: 0.7, bell: [[2280, 0.9, 0.22], [3410, 0.45, 0.14], [4860, 0.22, 0.1]] },
  crash: { dur: 1.35, f0: 265, n: 10, exp: 1.36, fall: 0.46, decay: 0.48, dark: 0.42, bright: 1.55, noise: 0.14, nDecay: 0.5, stick: 0.006, stickAmp: 0.85, hp: 380, drive: 1.35, peak: 0.92, seed: 41, mid: 0.9 },
  splash: { dur: 0.22, f0: 720, n: 8, exp: 1.3, fall: 0.42, decay: 0.07, dark: 0.3, bright: 1.8, noise: 0.16, nDecay: 0.3, stick: 0.003, stickAmp: 1, hp: 2200, drive: 1.5, peak: 0.88, seed: 47, mid: 0.6 },
  china: { dur: 0.55, f0: 240, n: 8, exp: 1.24, fall: 0.4, decay: 0.18, dark: 0.48, bright: 1.05, noise: 0.2, nDecay: 0.4, stick: 0.005, stickAmp: 0.8, hp: 500, drive: 1.7, peak: 0.9, seed: 59, mid: 1.45, trash: 0.35 },
};

export function bakeCym(ctx: BaseAudioContext, spec: CymSpec): AudioBuffer {
  const sr = 22050;
  const N = Math.max(256, Math.floor(sr * spec.dur));
  const buf = ctx.createBuffer(1, N, sr);
  const d = buf.getChannelData(0);

  let seed = spec.seed || 1;
  const rnd = () => {
    seed = (seed * 1664525 + 1013904223) | 0;
    return (seed >>> 0) / 4294967296;
  };

  const fr: number[] = [], am: number[] = [], inc: number[] = [], ph: number[] = [], mul: number[] = [];
  for (let n = 1; n <= spec.n; n++) {
    const f = spec.f0 * Math.pow(n, spec.exp) * (1 + 0.016 * Math.sin(n * 2.63 + spec.seed));
    if (f > 14000) continue;
    let a = (1 / Math.pow(n, spec.fall)) * (f > 5500 ? spec.bright : 1);
    if (spec.mid && f > 900 && f < 2800) a *= spec.mid;
    fr.push(f); am.push(a);
    inc.push((Math.PI * 2 * f) / sr);
    ph.push(0);
    mul.push(Math.exp(-1 / (sr * (spec.decay * (spec.dark + (1 - spec.dark) * Math.max(0.18, 1 - f / 11000))))));
  }
  if (spec.bell) {
    for (const [f, a, decaySec] of spec.bell) {
      fr.push(f); am.push(a);
      inc.push((Math.PI * 2 * f) / sr);
      ph.push(0);
      mul.push(Math.exp(-1 / (sr * decaySec)));
    }
  }

  const M = am.length;
  const nMul = Math.exp(-1 / (sr * (spec.dur * spec.nDecay)));
  let nAmp = spec.noise;
  const tStick = Math.floor(spec.stick * sr);

  for (let i = 0; i < N; i++) {
    let s = 0;
    for (let m = 0; m < M; m++) {
      ph[m] += inc[m];
      s += am[m] * Math.sin(ph[m]);
      am[m] *= mul[m];
    }
    let nse = (rnd() * 2 - 1) * nAmp;
    nAmp *= nMul;
    if (spec.trash) nse += (rnd() * 2 - 1) * spec.trash * Math.exp(-i / (sr * 0.32));
    const stick = i < tStick ? (rnd() * 2 - 1) * spec.stickAmp * (1 - i / tStick) : 0;
    d[i] = Math.tanh((s + nse + stick) * spec.drive);
  }

  const rc = 1 / (2 * Math.PI * spec.hp);
  const hpA = rc / (rc + 1 / sr);
  let y = 0, x1 = 0, peak = 0;
  for (let i = 0; i < N; i++) {
    y = hpA * (y + d[i] - x1);
    x1 = d[i];
    d[i] = y;
    const a = y < 0 ? -y : y;
    if (a > peak) peak = a;
  }
  const g = peak > 1e-6 ? spec.peak / peak : 1;
  for (let i = 0; i < N; i++) d[i] *= g;

  return buf;
}
