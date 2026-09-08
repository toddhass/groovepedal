// Additive/noise cymbal synthesis. Darker, quieter bake so 16th hats
// do not turn into ice-pick noise on phone speakers.

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
  closed: { dur: 0.07, f0: 480, n: 6, exp: 1.18, fall: 0.62, decay: 0.035, dark: 0.55, bright: 0.7, noise: 0.12, nDecay: 0.22, stick: 0.002, stickAmp: 0.7, hp: 3200, drive: 1.15, peak: 0.55, seed: 11, mid: 0.55 },
  open: { dur: 0.26, f0: 400, n: 8, exp: 1.22, fall: 0.58, decay: 0.11, dark: 0.52, bright: 0.75, noise: 0.1, nDecay: 0.34, stick: 0.003, stickAmp: 0.55, hp: 2400, drive: 1.1, peak: 0.58, seed: 17, mid: 0.65 },
  chick: { dur: 0.05, f0: 420, n: 5, exp: 1.14, fall: 0.6, decay: 0.02, dark: 0.62, bright: 0.55, noise: 0.1, nDecay: 0.18, stick: 0.002, stickAmp: 0.8, hp: 1400, drive: 1.2, peak: 0.5, seed: 23, mid: 0.9 },
  ride: { dur: 0.55, f0: 250, n: 8, exp: 1.28, fall: 0.7, decay: 0.18, dark: 0.62, bright: 0.65, noise: 0.05, nDecay: 0.28, stick: 0.003, stickAmp: 0.45, hp: 900, drive: 1.05, peak: 0.52, seed: 31, mid: 0.55, bell: [[1980, 0.45, 0.16], [2860, 0.22, 0.1]] },
  crash: { dur: 1.05, f0: 230, n: 8, exp: 1.3, fall: 0.55, decay: 0.4, dark: 0.5, bright: 0.85, noise: 0.09, nDecay: 0.42, stick: 0.005, stickAmp: 0.5, hp: 520, drive: 1.12, peak: 0.62, seed: 41, mid: 0.7 },
  splash: { dur: 0.18, f0: 560, n: 6, exp: 1.24, fall: 0.5, decay: 0.055, dark: 0.42, bright: 0.9, noise: 0.1, nDecay: 0.24, stick: 0.0025, stickAmp: 0.6, hp: 2600, drive: 1.15, peak: 0.55, seed: 47, mid: 0.5 },
  china: { dur: 0.42, f0: 210, n: 6, exp: 1.2, fall: 0.48, decay: 0.14, dark: 0.55, bright: 0.6, noise: 0.12, nDecay: 0.32, stick: 0.004, stickAmp: 0.5, hp: 700, drive: 1.2, peak: 0.58, seed: 59, mid: 1.05, trash: 0.18 },
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

  const am: number[] = [], inc: number[] = [], ph: number[] = [], mul: number[] = [];
  for (let n = 1; n <= spec.n; n++) {
    const f = spec.f0 * Math.pow(n, spec.exp) * (1 + 0.016 * Math.sin(n * 2.63 + spec.seed));
    if (f > 9000) continue;
    let a = (1 / Math.pow(n, spec.fall)) * (f > 4500 ? spec.bright : 1);
    if (spec.mid && f > 900 && f < 2800) a *= spec.mid;
    am.push(a);
    inc.push((Math.PI * 2 * f) / sr);
    ph.push(0);
    mul.push(Math.exp(-1 / (sr * (spec.decay * (spec.dark + (1 - spec.dark) * Math.max(0.18, 1 - f / 9000))))));
  }
  if (spec.bell) {
    for (const [f, a, decaySec] of spec.bell) {
      am.push(a);
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
