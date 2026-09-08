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
  closed: { dur: 0.09, f0: 620, n: 8, exp: 1.22, fall: 0.48, decay: 0.05, dark: 0.35, bright: 1.7, noise: 0.22, nDecay: 0.28, stick: 0.003, stickAmp: 1.1, hp: 2400, drive: 1.6, peak: 0.9, seed: 11, mid: 0.7 },
  open: { dur: 0.32, f0: 480, n: 10, exp: 1.28, fall: 0.5, decay: 0.14, dark: 0.4, bright: 1.45, noise: 0.18, nDecay: 0.4, stick: 0.004, stickAmp: 0.9, hp: 1800, drive: 1.45, peak: 0.88, seed: 17, mid: 0.85 },
  chick: { dur: 0.06, f0: 540, n: 7, exp: 1.18, fall: 0.55, decay: 0.025, dark: 0.5, bright: 1.1, noise: 0.16, nDecay: 0.22, stick: 0.0025, stickAmp: 1.3, hp: 900, drive: 1.7, peak: 0.85, seed: 23, mid: 1.2 },
  ride: { dur: 0.7, f0: 290, n: 10, exp: 1.33, fall: 0.62, decay: 0.22, dark: 0.55, bright: 1.15, noise: 0.08, nDecay: 0.35, stick: 0.0035, stickAmp: 0.7, hp: 600, drive: 1.25, peak: 0.86, seed: 31, mid: 0.7, bell: [[2280, 0.9, 0.22], [3410, 0.45, 0.14], [4860, 0.22, 0.1]] },
  crash: { dur: 1.35, f0: 265, n: 10, exp: 1.36, fall: 0.46, decay: 0.48, dark: 0.42, bright: 1.55, noise: 0.14, nDecay: 0.5, stick: 0.006, stickAmp: 0.85, hp: 380, drive: 1.35, peak: 0.92, seed: 41, mid: 0.9 },
  splash: { dur: 0.22, f0: 720, n: 8, exp: 1.3, fall: 0.42, decay: 0.07, dark: 0.3, bright: 1.8, noise: 0.16, nDecay: 0.3, stick: 0.003, stickAmp: 1, hp: 2200, drive: 1.5, peak: 0.88, seed: 47, mid: 0.6 },
  china: { dur: 0.55, f0: 240, n: 8, exp: 1.24, fall: 0.4, decay: 0.18, dark: 0.48, bright: 1.05, noise: 0.2, nDecay: 0.4, stick: 0.005, stickAmp: 0.8, hp: 500, drive: 1.7, peak: 0.9, seed: 59, mid: 1.45, trash: 0.35 },
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
    let nse = (rnd() * 2 - 1) * nAmp;
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
