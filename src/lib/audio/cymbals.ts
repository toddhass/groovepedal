type CymId = "closed" | "open" | "chick" | "ride" | "crash" | "splash" | "china";

type CymSpec = {
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
};

const SPECS: Record<CymId, CymSpec> = {
  closed: { dur: 0.12, f0: 420, n: 16, exp: 1.18, fall: 0.72, decay: 0.07, dark: 0.72, bright: 0.45, noise: 0.1, nDecay: 0.22, stick: 0.0025, stickAmp: 0.7, hp: 1400, drive: 1.15, peak: 0.82, seed: 11, mid: 1.1 },
  open: { dur: 0.42, f0: 340, n: 18, exp: 1.2, fall: 0.68, decay: 0.2, dark: 0.7, bright: 0.5, noise: 0.08, nDecay: 0.38, stick: 0.003, stickAmp: 0.55, hp: 1100, drive: 1.12, peak: 0.8, seed: 17, mid: 1.15 },
  chick: { dur: 0.07, f0: 380, n: 12, exp: 1.14, fall: 0.7, decay: 0.03, dark: 0.78, bright: 0.4, noise: 0.07, nDecay: 0.18, stick: 0.002, stickAmp: 0.9, hp: 700, drive: 1.18, peak: 0.8, seed: 23, mid: 1.3 },
  ride: { dur: 0.9, f0: 240, n: 18, exp: 1.26, fall: 0.78, decay: 0.32, dark: 0.75, bright: 0.42, noise: 0.04, nDecay: 0.4, stick: 0.003, stickAmp: 0.45, hp: 450, drive: 1.08, peak: 0.8, seed: 31, mid: 0.9, bell: [[1680, 0.7, 0.28], [2480, 0.28, 0.16], [3320, 0.12, 0.1]] },
  crash: { dur: 1.6, f0: 190, n: 20, exp: 1.28, fall: 0.7, decay: 0.62, dark: 0.68, bright: 0.48, noise: 0.07, nDecay: 0.55, stick: 0.007, stickAmp: 0.5, hp: 280, drive: 1.1, peak: 0.84, seed: 41, mid: 1.05 },
  splash: { dur: 0.28, f0: 520, n: 14, exp: 1.22, fall: 0.65, decay: 0.1, dark: 0.62, bright: 0.55, noise: 0.08, nDecay: 0.28, stick: 0.0025, stickAmp: 0.65, hp: 1500, drive: 1.12, peak: 0.8, seed: 47, mid: 0.85 },
  china: { dur: 0.7, f0: 200, n: 16, exp: 1.18, fall: 0.62, decay: 0.24, dark: 0.7, bright: 0.4, noise: 0.1, nDecay: 0.42, stick: 0.005, stickAmp: 0.5, hp: 380, drive: 1.2, peak: 0.82, seed: 59, mid: 1.35, trash: 0.18 },
};

function bake(ctx: AudioContext, spec: CymSpec): AudioBuffer {
  const sr = 22050;
  const n = Math.max(256, Math.floor(sr * spec.dur));
  const buf = ctx.createBuffer(1, n, sr);
  const d = buf.getChannelData(0);
  let seed = spec.seed || 1;
  const rnd = () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) | 0;
    return (seed >>> 0) / 4294967296;
  };
  const am: number[] = [];
  const inc: number[] = [];
  const ph: number[] = [];
  const mul: number[] = [];
  for (let i = 1; i <= spec.n; i += 1) {
    const f = spec.f0 * Math.pow(i, spec.exp) * (1 + 0.016 * Math.sin(i * 2.63 + spec.seed));
    if (f > 14000) continue;
    let a = (1 / Math.pow(i, spec.fall)) * (f > 5500 ? spec.bright : 1);
    if (spec.mid && f > 900 && f < 2800) a *= spec.mid;
    const dec = spec.decay * (spec.dark + (1 - spec.dark) * Math.max(0.18, 1 - f / 11000));
    am.push(a);
    inc.push((Math.PI * 2 * f) / sr);
    ph.push(0);
    mul.push(Math.exp(-1 / (sr * dec)));
  }
  if (spec.bell) {
    for (const [f, a, dec] of spec.bell) {
      am.push(a);
      inc.push((Math.PI * 2 * f) / sr);
      ph.push(0);
      mul.push(Math.exp(-1 / (sr * dec)));
    }
  }
  const m = am.length;
  let b0 = 0;
  let b1 = 0;
  let b2 = 0;
  let nAmp = spec.noise;
  const nMul = Math.exp(-1 / (sr * (spec.dur * spec.nDecay)));
  const tStick = Math.floor(spec.stick * sr);
  for (let i = 0; i < n; i += 1) {
    let s = 0;
    for (let k = 0; k < m; k += 1) {
      ph[k] += inc[k]!;
      s += am[k]! * Math.sin(ph[k]!);
      am[k]! *= mul[k]!;
    }
    const white = rnd() * 2 - 1;
    b0 = 0.99765 * b0 + white * 0.099046;
    b1 = 0.963 * b1 + white * 0.2965164;
    b2 = 0.57 * b2 + white * 1.052691;
    let nse = (b0 + b1 + b2 + white * 0.1848) * nAmp * 0.35;
    nAmp *= nMul;
    if (spec.trash) nse += (rnd() * 2 - 1) * spec.trash * Math.exp(-i / (sr * 0.32));
    const stick = i < tStick ? (rnd() * 2 - 1) * spec.stickAmp * (1 - i / tStick) : 0;
    d[i] = Math.tanh((s + nse + stick) * spec.drive);
  }
  const rc = 1 / (2 * Math.PI * spec.hp);
  const hpA = rc / (rc + 1 / sr);
  let y = 0;
  let x1 = 0;
  let peak = 0;
  for (let i = 0; i < n; i += 1) {
    y = hpA * (y + d[i]! - x1);
    x1 = d[i]!;
    d[i] = y;
    const a = y < 0 ? -y : y;
    if (a > peak) peak = a;
  }
  const g = peak > 1e-6 ? spec.peak / peak : 1;
  for (let i = 0; i < n; i += 1) d[i]! *= g;
  return buf;
}

export class CymbalKit {
  private readonly buffers: Partial<Record<CymId, AudioBuffer>> = {};

  constructor(private readonly ctx: AudioContext, private readonly dest: AudioNode) {
    try {
      this.buffers.closed = bake(ctx, SPECS.closed);
    } catch {
      // keep playing without hats
    }
    const rest: CymId[] = ["open", "chick", "ride", "crash", "splash", "china"];
    const next = () => {
      const id = rest.shift();
      if (!id) return;
      try {
        this.buffers[id] = bake(ctx, SPECS[id]);
      } catch {
        // skip
      }
      window.setTimeout(next, 20);
    };
    window.setTimeout(next, 30);
  }

  hit(id: CymId, time: number, velocity: number, gain: number, jitter: number) {
    const buf = this.buffers[id];
    if (!buf) return;
    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    if (jitter) src.playbackRate.value = 1 + (Math.random() * 2 - 1) * jitter;
    const g = this.ctx.createGain();
    const when = Math.max(time, this.ctx.currentTime);
    g.gain.setValueAtTime(Math.max(0.05, Math.min(1.35, velocity)) * gain, when);
    src.connect(g);
    g.connect(this.dest);
    const dur = buf.duration / Math.max(0.5, src.playbackRate.value);
    src.start(time);
    src.stop(time + dur + 0.02);
    src.onended = () => {
      try {
        src.disconnect();
        g.disconnect();
      } catch {
        // already gone
      }
    };
  }

  closed(t: number, v: number) {
    this.hit("closed", t, v, 0.55, 0.004);
  }
  open(t: number, v: number) {
    this.hit("open", t, v, 0.7, 0.008);
  }
  chick(t: number, v: number) {
    this.hit("chick", t, v, 0.62, 0.003);
  }
  ride(t: number, v: number) {
    this.hit("ride", t, v, 0.72, 0.004);
  }
  crash(t: number, v: number) {
    this.hit("crash", t, v, 0.9, 0.006);
  }
  splash(t: number, v: number) {
    this.hit("splash", t, v, 0.7, 0.01);
  }
  china(t: number, v: number) {
    this.hit("china", t, v, 0.78, 0.01);
  }
}
