import type { InstrumentId } from "./instruments";
import { CymbalKit } from "./cymbals";

export type Voice =
  | "kick"
  | "snare"
  | "hat"
  | "openHat"
  | "pedalHat"
  | "ride"
  | "highTom"
  | "tom"
  | "floor"
  | "crash"
  | "splash"
  | "china"
  | "rim"
  | "clap"
  | "cowbell";

function disconnectLater(ctx: AudioContext, nodes: AudioNode[], when: number) {
  const wait = Math.max(50, (when - ctx.currentTime) * 1000 + 40);
  window.setTimeout(() => {
    for (const node of nodes) {
      try {
        node.disconnect();
      } catch {
        // already gone
      }
    }
  }, wait);
}

function safeTime(ctx: AudioContext, time: number) {
  return Math.max(time, ctx.currentTime);
}

function envGain(ctx: AudioContext, time: number, peak: number, attack: number, decay: number) {
  const gain = ctx.createGain();
  const start = safeTime(ctx, time);
  const level = Math.max(0.0002, peak);
  const g = gain.gain;
  g.cancelScheduledValues(start);
  g.setValueAtTime(0.0001, start);
  try {
    g.exponentialRampToValueAtTime(level, start + Math.max(0.001, attack));
    g.exponentialRampToValueAtTime(0.0001, start + Math.max(0.001, attack) + decay);
  } catch {
    g.linearRampToValueAtTime(level, start + Math.max(0.001, attack));
    g.linearRampToValueAtTime(0.0001, start + Math.max(0.001, attack) + decay);
  }
  return gain;
}

export class DrumSynth {
  private readonly ctx: AudioContext;
  private readonly dest: AudioNode;
  private readonly noise: AudioBuffer;
  private readonly cymbals: CymbalKit;

  constructor(ctx: AudioContext, dest: AudioNode) {
    this.ctx = ctx;
    const shelf = ctx.createBiquadFilter();
    shelf.type = "lowshelf";
    shelf.frequency.value = 180;
    shelf.gain.value = 3.2;
    const air = ctx.createBiquadFilter();
    air.type = "highshelf";
    air.frequency.value = 5200;
    air.gain.value = -9;
    const lp = ctx.createBiquadFilter();
    lp.type = "lowpass";
    lp.frequency.value = 7200;
    lp.Q.value = 0.5;
    shelf.connect(air);
    air.connect(lp);
    lp.connect(dest);
    this.dest = shelf;
    const length = Math.max(2048, Math.floor(Math.min(ctx.sampleRate, 48000) * 0.22));
    const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    let b0 = 0;
    let b1 = 0;
    let b2 = 0;
    for (let i = 0; i < length; i += 1) {
      const white = Math.random() * 2 - 1;
      b0 = 0.99765 * b0 + white * 0.099046;
      b1 = 0.963 * b1 + white * 0.2965164;
      b2 = 0.57 * b2 + white * 1.052691;
      data[i] = b0 + b1 + b2 + white * 0.1848;
    }
    this.noise = buffer;
    this.cymbals = new CymbalKit(ctx, this.dest);
  }

  trigger(voice: Voice, time: number, velocity: number) {
    const vel = Math.min(1.4, Math.max(0.05, velocity));
    const when = safeTime(this.ctx, time);
    switch (voice) {
      case "kick":
        this.kick(when, vel);
        break;
      case "snare":
        this.snare(when, vel);
        break;
      case "hat":
        this.cymbals.closed(when, vel);
        break;
      case "openHat":
        this.cymbals.open(when, vel);
        break;
      case "pedalHat":
        this.cymbals.chick(when, vel);
        break;
      case "ride":
        this.cymbals.ride(when, vel);
        break;
      case "highTom":
        this.tom(when, vel, 220, 0.2);
        break;
      case "tom":
        this.tom(when, vel, 148, 0.26);
        break;
      case "floor":
        this.tom(when, vel, 82, 0.38);
        break;
      case "crash":
        this.cymbals.crash(when, vel);
        break;
      case "splash":
        this.cymbals.splash(when, vel);
        break;
      case "china":
        this.cymbals.china(when, vel);
        break;
      case "rim":
        this.rim(when, vel);
        break;
      case "clap":
        this.clap(when, vel);
        break;
      case "cowbell":
        this.cowbell(when, vel);
        break;
      default:
        break;
    }
  }

  private noiseSource(time: number, duration: number, rate = 1) {
    const src = this.ctx.createBufferSource();
    src.buffer = this.noise;
    src.loop = true;
    src.playbackRate.value = rate;
    const when = safeTime(this.ctx, time);
    src.start(when);
    src.stop(when + duration);
    return src;
  }

  private kick(time: number, vel: number) {
    const body = this.ctx.createOscillator();
    body.type = "sine";
    body.frequency.setValueAtTime(62, time);
    body.frequency.exponentialRampToValueAtTime(42, time + 0.28);
    const beater = this.ctx.createOscillator();
    beater.type = "sine";
    beater.frequency.setValueAtTime(118, time);
    beater.frequency.exponentialRampToValueAtTime(48, time + 0.07);
    const bg = envGain(this.ctx, time, 1.2 * vel, 0.005, 0.48);
    const ag = envGain(this.ctx, time, 0.48 * vel, 0.002, 0.1);
    body.connect(bg);
    beater.connect(ag);
    bg.connect(this.dest);
    ag.connect(this.dest);
    body.start(time);
    beater.start(time);
    body.stop(time + 0.55);
    beater.stop(time + 0.16);
    const click = this.noiseSource(time, 0.012);
    const hp = this.ctx.createBiquadFilter();
    hp.type = "bandpass";
    hp.frequency.value = 900;
    hp.Q.value = 0.8;
    const cg = envGain(this.ctx, time, 0.12 * vel, 0.001, 0.018);
    click.connect(hp);
    hp.connect(cg);
    cg.connect(this.dest);
    disconnectLater(this.ctx, [body, beater, bg, ag, click, hp, cg], time + 0.6);
  }

  private snare(time: number, vel: number) {
    const shell = this.ctx.createOscillator();
    shell.type = "sine";
    shell.frequency.setValueAtTime(198, time);
    shell.frequency.exponentialRampToValueAtTime(160, time + 0.08);
    const over = this.ctx.createOscillator();
    over.type = "sine";
    over.frequency.setValueAtTime(330, time);
    const sg = envGain(this.ctx, time, 0.42 * vel, 0.002, 0.14);
    const og = envGain(this.ctx, time, 0.14 * vel, 0.002, 0.08);
    shell.connect(sg);
    over.connect(og);
    sg.connect(this.dest);
    og.connect(this.dest);
    shell.start(time);
    over.start(time);
    shell.stop(time + 0.2);
    over.stop(time + 0.12);
    const wires = this.noiseSource(time, 0.18);
    const bp = this.ctx.createBiquadFilter();
    bp.type = "bandpass";
    bp.frequency.value = 2100;
    bp.Q.value = 0.75;
    const lp = this.ctx.createBiquadFilter();
    lp.type = "lowpass";
    lp.frequency.value = 4800;
    const wg = envGain(this.ctx, time, 0.48 * vel, 0.0015, 0.14);
    wires.connect(bp);
    bp.connect(lp);
    lp.connect(wg);
    wg.connect(this.dest);
    disconnectLater(this.ctx, [shell, over, sg, og, wires, bp, lp, wg], time + 0.28);
  }

  private tom(time: number, vel: number, freq: number, decay: number) {
    const fund = this.ctx.createOscillator();
    fund.type = "sine";
    fund.frequency.setValueAtTime(freq, time);
    fund.frequency.exponentialRampToValueAtTime(freq * 0.86, time + decay * 0.45);
    const over = this.ctx.createOscillator();
    over.type = "sine";
    over.frequency.setValueAtTime(freq * 1.5, time);
    over.frequency.exponentialRampToValueAtTime(freq * 1.28, time + decay * 0.4);
    const fg = envGain(this.ctx, time, 0.78 * vel, 0.004, decay);
    const og = envGain(this.ctx, time, 0.18 * vel, 0.004, decay * 0.65);
    fund.connect(fg);
    over.connect(og);
    fg.connect(this.dest);
    og.connect(this.dest);
    fund.start(time);
    over.start(time);
    fund.stop(time + decay + 0.1);
    over.stop(time + decay + 0.08);
    const skin = this.noiseSource(time, 0.04);
    const bp = this.ctx.createBiquadFilter();
    bp.type = "bandpass";
    bp.frequency.value = Math.max(120, freq * 2.1);
    bp.Q.value = 1.1;
    const sg = envGain(this.ctx, time, 0.14 * vel, 0.001, 0.045);
    skin.connect(bp);
    bp.connect(sg);
    sg.connect(this.dest);
    disconnectLater(this.ctx, [fund, over, fg, og, skin, bp, sg], time + decay + 0.14);
  }

  private rim(time: number, vel: number) {
    const osc = this.ctx.createOscillator();
    osc.type = "triangle";
    osc.frequency.setValueAtTime(640, time);
    const gain = envGain(this.ctx, time, 0.36 * vel, 0.001, 0.04);
    osc.connect(gain);
    gain.connect(this.dest);
    osc.start(time);
    osc.stop(time + 0.07);
    const click = this.noiseSource(time, 0.02);
    const bp = this.ctx.createBiquadFilter();
    bp.type = "bandpass";
    bp.frequency.value = 1100;
    bp.Q.value = 1.8;
    const cg = envGain(this.ctx, time, 0.22 * vel, 0.001, 0.02);
    click.connect(bp);
    bp.connect(cg);
    cg.connect(this.dest);
    disconnectLater(this.ctx, [osc, gain, click, bp, cg], time + 0.1);
  }

  private clap(time: number, vel: number) {
    const bursts = [0, 0.012, 0.024, 0.038];
    const amps = [0.5, 0.62, 0.38, 0.22];
    const nodes: AudioNode[] = [];
    bursts.forEach((offset, i) => {
      const src = this.noiseSource(time + offset, 0.07);
      const bp = this.ctx.createBiquadFilter();
      bp.type = "bandpass";
      bp.frequency.value = 1250;
      bp.Q.value = 1;
      const gain = envGain(this.ctx, time + offset, (amps[i] ?? 0.3) * vel, 0.001, 0.055);
      src.connect(bp);
      bp.connect(gain);
      gain.connect(this.dest);
      nodes.push(src, bp, gain);
    });
    disconnectLater(this.ctx, nodes, time + 0.22);
  }

  private cowbell(time: number, vel: number) {
    const a = this.ctx.createOscillator();
    a.type = "triangle";
    a.frequency.setValueAtTime(587, time);
    const b = this.ctx.createOscillator();
    b.type = "triangle";
    b.frequency.setValueAtTime(845, time);
    const bp = this.ctx.createBiquadFilter();
    bp.type = "bandpass";
    bp.frequency.value = 780;
    bp.Q.value = 3.4;
    const ag = this.ctx.createGain();
    ag.gain.value = 0.62;
    const bg = this.ctx.createGain();
    bg.gain.value = 0.38;
    a.connect(ag);
    b.connect(bg);
    ag.connect(bp);
    bg.connect(bp);
    const gain = envGain(this.ctx, time, 0.34 * vel, 0.001, 0.26);
    bp.connect(gain);
    gain.connect(this.dest);
    a.start(time);
    b.start(time);
    a.stop(time + 0.3);
    b.stop(time + 0.3);
    disconnectLater(this.ctx, [a, b, bp, ag, bg, gain], time + 0.34);
  }

  bass(time: number, vel: number, freq: number) {
    if (!freq) return;
    const when = safeTime(this.ctx, time);
    const dur = 0.72;
    const sub = this.ctx.createOscillator();
    sub.type = "sine";
    sub.frequency.setValueAtTime(freq * 1.02, when);
    sub.frequency.exponentialRampToValueAtTime(freq, when + 0.04);
    const body = this.ctx.createOscillator();
    body.type = "triangle";
    body.frequency.setValueAtTime(freq, when);
    const lp = this.ctx.createBiquadFilter();
    lp.type = "lowpass";
    lp.frequency.setValueAtTime(Math.min(380, freq * 3.6), when);
    try {
      lp.frequency.exponentialRampToValueAtTime(130, when + 0.34);
    } catch {
      lp.frequency.setValueAtTime(130, when + 0.34);
    }
    const sg = this.ctx.createGain();
    sg.gain.value = 0.92;
    const bg = this.ctx.createGain();
    bg.gain.value = 0.16;
    sub.connect(sg);
    body.connect(bg);
    sg.connect(lp);
    bg.connect(lp);
    const gain = envGain(this.ctx, when, 0.78 * vel, 0.01, dur);
    lp.connect(gain);
    gain.connect(this.dest);
    sub.start(when);
    body.start(when);
    sub.stop(when + dur + 0.08);
    body.stop(when + dur + 0.08);
    disconnectLater(this.ctx, [sub, body, lp, sg, bg, gain], when + dur + 0.12);
  }

  play(kind: InstrumentId, time: number, vel: number, freq: number) {
    if (!freq) return;
    const f = Math.min(1800, Math.max(38, freq));
    const v = Math.min(1.2, Math.max(0.05, vel));
    const when = safeTime(this.ctx, time);
    switch (kind) {
      case "bass":
        this.bass(when, v, f);
        break;
      case "guitar":
        this.guitar(when, v, f);
        break;
      case "piano":
        this.piano(when, v, f);
        break;
      case "organ":
        this.partials(when, v * 0.2, f, [1, 2, 3, 4], [0.8, 0.42, 0.18, 0.08], 0.016, 0.5, 900);
        break;
      case "trumpet":
        this.brass(when, v, f, 980, 0.045);
        break;
      case "trombone":
        this.brass(when, v, f, 520, 0.07);
        break;
      case "horn":
        this.brass(when, v, f, 740, 0.08);
        break;
      case "sax":
        this.reed(when, v, f, 920, 0.05);
        break;
      case "clarinet":
        this.partials(when, v * 0.22, f, [1, 3, 5], [1, 0.22, 0.08], 0.045, 0.5, Math.min(1400, f * 2.4));
        break;
      case "oboe":
        this.reed(when, v, f, 1420, 0.045);
        break;
      case "flute":
        this.flute(when, v, f);
        break;
      case "violin":
        this.bow(when, v, f, 1600);
        break;
      case "cello":
        this.bow(when, v, f, 680);
        break;
      case "timpani":
        this.boom(when, v, f);
        break;
      default:
        break;
    }
  }

  private guitar(time: number, vel: number, freq: number) {
    const dur = 0.85;
    const period = 1 / Math.max(70, Math.min(880, freq));
    const burst = this.noiseSource(time, Math.min(0.012, period * 3));
    const delay = this.ctx.createDelay(0.05);
    delay.delayTime.value = period;
    const lp = this.ctx.createBiquadFilter();
    lp.type = "lowpass";
    lp.frequency.setValueAtTime(Math.min(2100, freq * 5.2), time);
    try {
      lp.frequency.exponentialRampToValueAtTime(Math.max(240, freq * 1.4), time + dur * 0.7);
    } catch {
      // ignore
    }
    const fb = this.ctx.createGain();
    fb.gain.setValueAtTime(0.984, time);
    try {
      fb.gain.exponentialRampToValueAtTime(0.0001, time + dur);
    } catch {
      fb.gain.linearRampToValueAtTime(0, time + dur);
    }
    const body = this.ctx.createBiquadFilter();
    body.type = "bandpass";
    body.frequency.value = Math.min(260, freq * 1.7);
    body.Q.value = 1.05;
    const hp = this.ctx.createBiquadFilter();
    hp.type = "highpass";
    hp.frequency.value = 70;
    const gain = envGain(this.ctx, time, 0.4 * vel, 0.002, dur);
    burst.connect(delay);
    delay.connect(lp);
    lp.connect(fb);
    fb.connect(delay);
    lp.connect(hp);
    hp.connect(gain);
    gain.connect(this.dest);
    lp.connect(body);
    const bg = envGain(this.ctx, time, 0.12 * vel, 0.004, dur * 0.8);
    body.connect(bg);
    bg.connect(this.dest);
    const clock = this.ctx.createOscillator();
    clock.start(time);
    clock.stop(time + dur + 0.08);
    disconnectLater(this.ctx, [clock, burst, delay, lp, fb, hp, gain, body, bg], time + dur + 0.12);
  }

  private piano(time: number, vel: number, freq: number) {
    const dur = 0.58 + Math.max(0, (220 - freq) / 280);
    const mix = this.ctx.createGain();
    mix.gain.value = 0.26 * vel;
    const amps = [1, 0.32, 0.12, 0.05, 0.02];
    const nodes: AudioNode[] = [mix];
    for (let i = 0; i < amps.length; i += 1) {
      const n = i + 1;
      const pf = n * freq * Math.sqrt(1 + 0.00035 * n * n);
      const osc = this.ctx.createOscillator();
      osc.type = "sine";
      osc.frequency.setValueAtTime(pf, time);
      const pg = this.ctx.createGain();
      pg.gain.value = amps[i]!;
      osc.connect(pg);
      pg.connect(mix);
      osc.start(time);
      osc.stop(time + dur * (1 - i * 0.12));
      nodes.push(osc, pg);
    }
    const lp = this.ctx.createBiquadFilter();
    lp.type = "lowpass";
    lp.frequency.value = 2400;
    const gain = envGain(this.ctx, time, 1, 0.003, dur * 0.9);
    mix.connect(lp);
    lp.connect(gain);
    gain.connect(this.dest);
    nodes.push(lp, gain);
    disconnectLater(this.ctx, nodes, time + dur + 0.08);
  }

  private brass(time: number, vel: number, freq: number, formant: number, atk: number) {
    const dur = 0.52;
    const a = this.ctx.createOscillator();
    a.type = "triangle";
    a.frequency.setValueAtTime(freq * 0.985, time);
    a.frequency.exponentialRampToValueAtTime(freq, time + atk + 0.02);
    const b = this.ctx.createOscillator();
    b.type = "sine";
    b.frequency.setValueAtTime(freq * 1.002, time);
    const bp = this.ctx.createBiquadFilter();
    bp.type = "bandpass";
    bp.frequency.value = formant;
    bp.Q.value = 1.35;
    const lp = this.ctx.createBiquadFilter();
    lp.type = "lowpass";
    lp.frequency.setValueAtTime(formant * 1.7, time);
    lp.frequency.setTargetAtTime(formant * 1.05, time + atk, 0.12);
    const ag = this.ctx.createGain();
    ag.gain.value = 0.7;
    const bg = this.ctx.createGain();
    bg.gain.value = 0.48;
    a.connect(ag);
    b.connect(bg);
    ag.connect(bp);
    bg.connect(bp);
    bp.connect(lp);
    const gain = envGain(this.ctx, time, 0.24 * vel, atk, dur);
    lp.connect(gain);
    gain.connect(this.dest);
    a.start(time);
    b.start(time);
    a.stop(time + dur + 0.06);
    b.stop(time + dur + 0.06);
    disconnectLater(this.ctx, [a, b, bp, lp, ag, bg, gain], time + dur + 0.1);
  }

  private reed(time: number, vel: number, freq: number, formant: number, atk: number) {
    const dur = 0.5;
    const o = this.ctx.createOscillator();
    o.type = "triangle";
    o.frequency.setValueAtTime(freq, time);
    const odd = this.ctx.createOscillator();
    odd.type = "sine";
    odd.frequency.setValueAtTime(freq * 3, time);
    const bp = this.ctx.createBiquadFilter();
    bp.type = "bandpass";
    bp.frequency.value = formant;
    bp.Q.value = 1.6;
    const og = this.ctx.createGain();
    og.gain.value = 0.62;
    const dg = this.ctx.createGain();
    dg.gain.value = 0.16;
    o.connect(og);
    odd.connect(dg);
    og.connect(bp);
    dg.connect(bp);
    const gain = envGain(this.ctx, time, 0.2 * vel, atk, dur);
    bp.connect(gain);
    gain.connect(this.dest);
    vib(this.ctx, o, freq, time, dur, 4.4, 0.0025);
    o.start(time);
    odd.start(time);
    o.stop(time + dur + 0.06);
    odd.stop(time + dur + 0.06);
    disconnectLater(this.ctx, [o, odd, bp, og, dg, gain], time + dur + 0.1);
  }

  private flute(time: number, vel: number, freq: number) {
    const dur = 0.48;
    const o = this.ctx.createOscillator();
    o.type = "sine";
    o.frequency.setValueAtTime(freq, time);
    const h = this.ctx.createOscillator();
    h.type = "sine";
    h.frequency.setValueAtTime(freq * 2, time);
    const hg = this.ctx.createGain();
    hg.gain.value = 0.07;
    const gain = envGain(this.ctx, time, 0.18 * vel, 0.055, dur);
    o.connect(gain);
    h.connect(hg);
    hg.connect(gain);
    gain.connect(this.dest);
    vib(this.ctx, o, freq, time, dur, 5, 0.002);
    o.start(time);
    h.start(time);
    o.stop(time + dur + 0.05);
    h.stop(time + dur + 0.05);
    disconnectLater(this.ctx, [o, h, hg, gain], time + dur + 0.08);
  }

  private bow(time: number, vel: number, freq: number, bright: number) {
    const dur = 0.64;
    const a = this.ctx.createOscillator();
    a.type = "triangle";
    a.frequency.setValueAtTime(freq, time);
    const b = this.ctx.createOscillator();
    b.type = "sine";
    b.frequency.setValueAtTime(freq * 1.0025, time);
    const lp = this.ctx.createBiquadFilter();
    lp.type = "lowpass";
    lp.frequency.value = bright;
    lp.Q.value = 0.6;
    const body = this.ctx.createBiquadFilter();
    body.type = "bandpass";
    body.frequency.value = Math.min(780, freq * 2.2);
    body.Q.value = 1.1;
    const ag = this.ctx.createGain();
    ag.gain.value = 0.38;
    const bg = this.ctx.createGain();
    bg.gain.value = 0.62;
    a.connect(ag);
    b.connect(bg);
    ag.connect(lp);
    bg.connect(lp);
    lp.connect(body);
    const gain = envGain(this.ctx, time, 0.2 * vel, 0.1, dur);
    body.connect(gain);
    gain.connect(this.dest);
    vib(this.ctx, a, freq, time, dur, 5.2, 0.0018);
    a.start(time);
    b.start(time);
    a.stop(time + dur + 0.08);
    b.stop(time + dur + 0.08);
    disconnectLater(this.ctx, [a, b, lp, body, ag, bg, gain], time + dur + 0.12);
  }

  private partials(
    time: number,
    peak: number,
    freq: number,
    parts: number[],
    amps: number[],
    attack: number,
    dur: number,
    cutoff: number,
  ) {
    const mix = this.ctx.createGain();
    mix.gain.value = peak;
    const nodes: AudioNode[] = [mix];
    for (let i = 0; i < parts.length; i += 1) {
      const osc = this.ctx.createOscillator();
      osc.type = "sine";
      osc.frequency.setValueAtTime(freq * parts[i]!, time);
      const g = this.ctx.createGain();
      g.gain.value = amps[i] ?? 0.1;
      osc.connect(g);
      g.connect(mix);
      osc.start(time);
      osc.stop(time + dur);
      nodes.push(osc, g);
    }
    const lp = this.ctx.createBiquadFilter();
    lp.type = "lowpass";
    lp.frequency.value = cutoff;
    const gain = envGain(this.ctx, time, 1, attack, dur * 0.88);
    mix.connect(lp);
    lp.connect(gain);
    gain.connect(this.dest);
    nodes.push(lp, gain);
    disconnectLater(this.ctx, nodes, time + dur + 0.06);
  }

  private boom(time: number, vel: number, freq: number) {
    const osc = this.ctx.createOscillator();
    osc.type = "sine";
    osc.frequency.setValueAtTime(freq * 1.18, time);
    osc.frequency.exponentialRampToValueAtTime(Math.max(36, freq * 0.92), time + 0.4);
    const over = this.ctx.createOscillator();
    over.type = "sine";
    over.frequency.setValueAtTime(freq * 1.65, time);
    const gain = envGain(this.ctx, time, 0.68 * vel, 0.01, 0.95);
    const og = envGain(this.ctx, time, 0.14 * vel, 0.01, 0.4);
    osc.connect(gain);
    over.connect(og);
    gain.connect(this.dest);
    og.connect(this.dest);
    osc.start(time);
    over.start(time);
    osc.stop(time + 1.05);
    over.stop(time + 0.5);
    disconnectLater(this.ctx, [osc, over, gain, og], time + 1.1);
  }
}

function vib(ctx: AudioContext, osc: OscillatorNode, freq: number, time: number, dur: number, rate: number, depth: number) {
  try {
    const lfo = ctx.createOscillator();
    lfo.frequency.setValueAtTime(rate, time);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, time);
    g.gain.linearRampToValueAtTime(freq * depth, time + 0.12);
    lfo.connect(g);
    g.connect(osc.frequency);
    lfo.start(time);
    lfo.stop(time + dur);
    lfo.onended = () => {
      try {
        lfo.disconnect();
        g.disconnect();
      } catch {
        // ignore
      }
    };
  } catch {
    // ignore
  }
}

export const VOICE_KEYS = [
  "kick",
  "snare",
  "rim",
  "hat",
  "openHat",
  "pedalHat",
  "highTom",
  "tom",
  "floor",
  "crash",
  "splash",
  "china",
  "ride",
  "clap",
] as const satisfies readonly Voice[];
