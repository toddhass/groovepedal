import { bakeCym, CYM_SPECS } from "./cymbals";

export type DrumVoice =
  | "kick" | "snare" | "clap" | "rim" | "hat" | "openHat" | "pedalHat"
  | "ride" | "crash" | "splash" | "china"
  | "highTom" | "tom" | "floor" | "cowbell";

export type MelodicVoice =
  | "bass" | "guitar" | "piano" | "organ"
  | "trumpet" | "trombone" | "horn" | "sax" | "clarinet" | "oboe" | "flute"
  | "violin" | "cello" | "timpani";

function reap(node: AudioScheduledSourceNode, extras?: AudioNode[]) {
  node.onended = () => {
    try { node.disconnect(); } catch { /* noop */ }
    extras?.forEach((n) => { try { n.disconnect(); } catch { /* noop */ } });
  };
}

function vibrato(ctx: BaseAudioContext, osc: OscillatorNode, f: number, t: number, dur: number, rate: number, depth: number) {
  try {
    const lfo = ctx.createOscillator();
    lfo.frequency.setValueAtTime(rate, t);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(f * depth, t + 0.12);
    lfo.connect(g);
    g.connect(osc.frequency);
    lfo.start(t);
    lfo.stop(t + dur);
    lfo.onended = () => { try { lfo.disconnect(); g.disconnect(); } catch { /* noop */ } };
  } catch { /* noop */ }
}

export class Synth {
  ctx: BaseAudioContext;
  dest: AudioNode;
  noise: AudioBuffer;
  cym: Partial<Record<string, AudioBuffer>> = {};

  constructor(ctx: BaseAudioContext, dest: AudioNode) {
    this.ctx = ctx;
    this.dest = dest;

    const nlen = Math.max(2048, Math.floor(Math.min(ctx.sampleRate, 48000) * 0.18));
    const n = ctx.createBuffer(1, nlen, ctx.sampleRate);
    const d = n.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    this.noise = n;

    try { this.cym.closed = bakeCym(ctx, CYM_SPECS.closed); } catch { /* noop */ }
    const rest = ["open", "chick", "ride", "crash", "splash", "china"];
    const bakeRest = () => {
      const id = rest.shift();
      if (!id) return;
      try { this.cym[id] = bakeCym(ctx, CYM_SPECS[id]); } catch { /* noop */ }
      setTimeout(bakeRest, 20);
    };
    setTimeout(bakeRest, 30);
  }

  private env(t: number, peak: number, a: number, dec: number): GainNode {
    const g = this.ctx.createGain();
    const s = Math.max(t, this.ctx.currentTime);
    a = Math.max(0.001, a || 0.004);
    g.gain.setValueAtTime(0.0001, s);
    try {
      g.gain.exponentialRampToValueAtTime(Math.max(0.0002, peak), s + a);
      g.gain.exponentialRampToValueAtTime(0.0001, s + a + dec);
    } catch {
      g.gain.linearRampToValueAtTime(peak, s + a);
      g.gain.linearRampToValueAtTime(0.0001, s + a + dec);
    }
    return g;
  }

  private ns(t: number, dur: number): AudioBufferSourceNode {
    const s = this.ctx.createBufferSource();
    s.buffer = this.noise;
    const len = this.noise.duration;
    s.loop = dur > len - 0.02;
    const off = Math.random() * Math.max(0.001, s.loop ? len * 0.85 : Math.max(0.001, len - dur));
    s.start(t, off);
    s.stop(t + dur);
    return s;
  }

  private hitBuf(buf: AudioBuffer | undefined, t: number, v: number, gain: number, jit?: number) {
    if (!buf) return;
    const s = this.ctx.createBufferSource();
    s.buffer = buf;
    if (jit) s.playbackRate.value = 1 + (Math.random() * 2 - 1) * jit;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(Math.max(0.05, Math.min(1.35, v)) * gain, Math.max(t, this.ctx.currentTime));
    s.connect(g);
    g.connect(this.dest);
    const dur = buf.duration / Math.max(0.5, s.playbackRate.value);
    s.start(t);
    s.stop(t + dur + 0.02);
    reap(s, [g]);
  }

  hat(t: number, v: number, dec: number) {
    if (dec > 0.12) this.hitBuf(this.cym.open, t, v, 0.7, 0.008);
    else this.hitBuf(this.cym.closed, t, v, 0.55, 0.004);
  }
  chick(t: number, v: number) { this.hitBuf(this.cym.chick, t, v, 0.62, 0.003); }
  ride(t: number, v: number) { this.hitBuf(this.cym.ride, t, v, 0.72, 0.004); }
  crash(t: number, v: number) { this.hitBuf(this.cym.crash, t, v, 0.9, 0.006); }
  splash(t: number, v: number) { this.hitBuf(this.cym.splash, t, v, 0.7, 0.01); }
  china(t: number, v: number) { this.hitBuf(this.cym.china, t, v, 0.78, 0.01); }

  kick(t: number, v: number) {
    const body = this.ctx.createOscillator(); body.type = "sine";
    body.frequency.setValueAtTime(58, t); body.frequency.exponentialRampToValueAtTime(47, t + 0.22);
    const beater = this.ctx.createOscillator(); beater.type = "sine";
    beater.frequency.setValueAtTime(148, t); beater.frequency.exponentialRampToValueAtTime(52, t + 0.06);
    const bg = this.env(t, 1.15 * v, 0.004, 0.42);
    const ag = this.env(t, 0.55 * v, 0.002, 0.09);
    body.connect(bg); beater.connect(ag); bg.connect(this.dest); ag.connect(this.dest);
    body.start(t); beater.start(t); body.stop(t + 0.5); beater.stop(t + 0.14);
    const click = this.ns(t, 0.012);
    const hp = this.ctx.createBiquadFilter(); hp.type = "highpass"; hp.frequency.value = 2500;
    const cg = this.env(t, 0.18 * v, 0.001, 0.02);
    click.connect(hp); hp.connect(cg); cg.connect(this.dest);
    reap(body, [beater, bg, ag, click, hp, cg]);
  }

  snare(t: number, v: number) {
    const shell = this.ctx.createOscillator(); shell.type = "sine";
    shell.frequency.setValueAtTime(205, t); shell.frequency.exponentialRampToValueAtTime(168, t + 0.07);
    const sg = this.env(t, 0.38 * v, 0.002, 0.11);
    shell.connect(sg); sg.connect(this.dest);
    shell.start(t); shell.stop(t + 0.18);
    const wires = this.ns(t, 0.2);
    const bp = this.ctx.createBiquadFilter(); bp.type = "bandpass"; bp.frequency.value = 3400; bp.Q.value = 0.85;
    const wg = this.env(t, 0.55 * v, 0.0015, 0.16);
    wires.connect(bp); bp.connect(wg); wg.connect(this.dest);
    const snap = this.ns(t, 0.045);
    const hp = this.ctx.createBiquadFilter(); hp.type = "highpass"; hp.frequency.value = 7000;
    const ng = this.env(t, 0.28 * v, 0.001, 0.04);
    snap.connect(hp); hp.connect(ng); ng.connect(this.dest);
    reap(shell, [sg, wires, bp, wg, snap, hp, ng]);
  }

  clap(t: number, v: number) {
    const times = [0, 0.012, 0.024, 0.04], amps = [0.55, 0.7, 0.45, 0.28];
    const nodes: AudioNode[] = [];
    let lead: AudioScheduledSourceNode | null = null;
    times.forEach((dt, i) => {
      const n = this.ns(t + dt, 0.05);
      const bp = this.ctx.createBiquadFilter(); bp.type = "bandpass"; bp.frequency.value = 1150; bp.Q.value = 1.1;
      const g = this.env(t + dt, amps[i] * v, 0.001, 0.05);
      n.connect(bp); bp.connect(g); g.connect(this.dest);
      if (!lead) lead = n; else nodes.push(n);
      nodes.push(bp, g);
    });
    if (lead) reap(lead, nodes);
  }

  rim(t: number, v: number) {
    const o = this.ctx.createOscillator(); o.type = "triangle"; o.frequency.setValueAtTime(780, t);
    const g = this.env(t, 0.42 * v, 0.001, 0.045);
    o.connect(g); g.connect(this.dest); o.start(t); o.stop(t + 0.08);
    const n = this.ns(t, 0.018);
    const bp = this.ctx.createBiquadFilter(); bp.type = "bandpass"; bp.frequency.value = 900; bp.Q.value = 2.2;
    const ng = this.env(t, 0.32 * v, 0.001, 0.02);
    n.connect(bp); bp.connect(ng); ng.connect(this.dest);
    reap(o, [g, n, bp, ng]);
  }

  tom(t: number, v: number, f: number, dec = 0.24) {
    const fund = this.ctx.createOscillator(); fund.type = "sine";
    fund.frequency.setValueAtTime(f, t); fund.frequency.exponentialRampToValueAtTime(f * 0.86, t + dec * 0.45);
    const over = this.ctx.createOscillator(); over.type = "sine";
    over.frequency.setValueAtTime(f * 1.57, t); over.frequency.exponentialRampToValueAtTime(f * 1.32, t + dec * 0.4);
    const fg = this.env(t, 0.72 * v, 0.003, dec);
    const og = this.env(t, 0.22 * v, 0.003, dec * 0.7);
    fund.connect(fg); over.connect(og); fg.connect(this.dest); og.connect(this.dest);
    fund.start(t); over.start(t); fund.stop(t + dec + 0.1); over.stop(t + dec + 0.08);
    const skin = this.ns(t, 0.04);
    const bp = this.ctx.createBiquadFilter(); bp.type = "bandpass"; bp.frequency.value = Math.max(120, f * 2.2); bp.Q.value = 1.1;
    const sg = this.env(t, 0.2 * v, 0.001, 0.05);
    skin.connect(bp); bp.connect(sg); sg.connect(this.dest);
    reap(fund, [over, fg, og, skin, bp, sg]);
  }

  cowbell(t: number, v: number) {
    const a = this.ctx.createOscillator(); a.type = "square"; a.frequency.setValueAtTime(587, t);
    const b = this.ctx.createOscillator(); b.type = "square"; b.frequency.setValueAtTime(845, t);
    const c = this.ctx.createOscillator(); c.type = "triangle"; c.frequency.setValueAtTime(1244, t);
    const bp = this.ctx.createBiquadFilter(); bp.type = "bandpass"; bp.frequency.value = 940; bp.Q.value = 4.5;
    const hp = this.ctx.createBiquadFilter(); hp.type = "highpass"; hp.frequency.value = 420;
    const ag = this.ctx.createGain(); ag.gain.value = 0.55;
    const bg = this.ctx.createGain(); bg.gain.value = 0.4;
    const cg = this.ctx.createGain(); cg.gain.value = 0.12;
    a.connect(ag); b.connect(bg); c.connect(cg); ag.connect(bp); bg.connect(bp); cg.connect(bp); bp.connect(hp);
    const g = this.env(t, 0.38 * v, 0.001, 0.28);
    hp.connect(g); g.connect(this.dest);
    a.start(t); b.start(t); c.start(t); a.stop(t + 0.32); b.stop(t + 0.32); c.stop(t + 0.22);
    reap(a, [b, c, bp, hp, ag, bg, cg, g]);
  }

  trig(voice: DrumVoice, t: number, v: number) {
    v = Math.max(0.05, Math.min(1.4, v));
    switch (voice) {
      case "kick": return this.kick(t, v);
      case "snare": return this.snare(t, v);
      case "clap": return this.clap(t, v);
      case "rim": return this.rim(t, v);
      case "hat": return this.hat(t, v, 0.05);
      case "openHat": return this.hat(t, v, 0.28);
      case "pedalHat": return this.chick(t, v);
      case "ride": return this.ride(t, v);
      case "crash": return this.crash(t, v);
      case "splash": return this.splash(t, v);
      case "china": return this.china(t, v);
      case "highTom": return this.tom(t, v, 220, 0.2);
      case "tom": return this.tom(t, v, 148, 0.26);
      case "floor": return this.tom(t, v, 82, 0.38);
      case "cowbell": return this.cowbell(t, v);
    }
  }

  // ---- Band / melodic instrument voices ----

  bass(t: number, v: number, f: number) {
    const dur = 0.7;
    const sub = this.ctx.createOscillator(); sub.type = "sine";
    sub.frequency.setValueAtTime(f * 1.03, t); sub.frequency.exponentialRampToValueAtTime(f, t + 0.04);
    const body = this.ctx.createOscillator(); body.type = "triangle"; body.frequency.setValueAtTime(f, t);
    const lp = this.ctx.createBiquadFilter(); lp.type = "lowpass";
    lp.frequency.setValueAtTime(Math.min(420, f * 4.2), t);
    try { lp.frequency.exponentialRampToValueAtTime(140, t + 0.32); } catch { /* noop */ }
    const sg = this.ctx.createGain(); sg.gain.value = 0.9;
    const bg = this.ctx.createGain(); bg.gain.value = 0.22;
    sub.connect(sg); body.connect(bg); sg.connect(lp); bg.connect(lp);
    const g = this.env(t, 0.82 * v, 0.008, dur);
    lp.connect(g); g.connect(this.dest);
    const pick = this.ns(t, 0.012);
    const php = this.ctx.createBiquadFilter(); php.type = "highpass"; php.frequency.value = 600;
    const pg = this.env(t, 0.08 * v, 0.001, 0.03);
    pick.connect(php); php.connect(pg); pg.connect(this.dest);
    sub.start(t); body.start(t); sub.stop(t + dur + 0.08); body.stop(t + dur + 0.08);
    reap(sub, [body, lp, sg, bg, g, pick, php, pg]);
  }

  guitar(t: number, v: number, f: number) {
    const dur = 0.85, period = 1 / Math.max(70, Math.min(880, f));
    const burst = this.ns(t, Math.min(0.014, period * 3));
    const delay = this.ctx.createDelay(0.05); delay.delayTime.value = period;
    const lp = this.ctx.createBiquadFilter(); lp.type = "lowpass";
    lp.frequency.setValueAtTime(Math.min(3800, f * 8), t);
    try { lp.frequency.exponentialRampToValueAtTime(Math.max(260, f * 1.5), t + dur * 0.7); } catch { /* noop */ }
    const fb = this.ctx.createGain();
    fb.gain.setValueAtTime(0.986, t);
    try { fb.gain.exponentialRampToValueAtTime(0.0001, t + dur); } catch { fb.gain.linearRampToValueAtTime(0, t + dur); }
    const body = this.ctx.createBiquadFilter(); body.type = "bandpass"; body.frequency.value = Math.min(280, f * 1.8); body.Q.value = 1.1;
    const hp = this.ctx.createBiquadFilter(); hp.type = "highpass"; hp.frequency.value = 80;
    const g = this.env(t, 0.42 * v, 0.002, dur);
    burst.connect(delay); delay.connect(lp); lp.connect(fb); fb.connect(delay);
    lp.connect(hp); hp.connect(g); g.connect(this.dest);
    lp.connect(body);
    const bg = this.env(t, 0.12 * v, 0.004, dur * 0.8);
    body.connect(bg); bg.connect(this.dest);
    const clock = this.ctx.createOscillator(); clock.start(t); clock.stop(t + dur + 0.08);
    reap(clock, [burst, delay, lp, fb, hp, g, body, bg]);
  }

  piano(t: number, v: number, f: number) {
    const dur = 0.55 + Math.max(0, (220 - f) / 280);
    const mix = this.ctx.createGain(); mix.gain.value = 0.24 * v;
    const B = 0.0004, amps = [1, 0.4, 0.16, 0.07];
    const nodes: AudioNode[] = [];
    let lead: OscillatorNode | null = null;
    for (let i = 0; i < 4; i++) {
      const n = i + 1;
      const pf = n * f * Math.sqrt(1 + B * n * n);
      const o = this.ctx.createOscillator(); o.type = "sine"; o.frequency.setValueAtTime(pf, t);
      const pg = this.ctx.createGain(); pg.gain.value = amps[i];
      o.connect(pg); pg.connect(mix); o.start(t); o.stop(t + dur * (1 - i * 0.12));
      if (!lead) lead = o; else nodes.push(o);
      nodes.push(pg);
    }
    const hammer = this.ns(t, 0.02);
    const hp = this.ctx.createBiquadFilter(); hp.type = "highpass"; hp.frequency.value = 2200;
    const hg = this.env(t, 0.06 * v, 0.001, 0.03);
    hammer.connect(hp); hp.connect(hg); hg.connect(this.dest);
    const g = this.env(t, 1, 0.003, dur * 0.92);
    mix.connect(g); g.connect(this.dest);
    reap(lead!, [...nodes, mix, g, hammer, hp, hg]);
  }

  organ(t: number, v: number, f: number) {
    const dur = 0.5;
    const mix = this.ctx.createGain(); mix.gain.value = 0.18 * v;
    const parts = [1, 2, 3, 4], amps = [0.75, 0.5, 0.28, 0.12];
    const nodes: AudioNode[] = [];
    let lead: OscillatorNode | null = null;
    parts.forEach((mult, i) => {
      const o = this.ctx.createOscillator(); o.type = "sine"; o.frequency.setValueAtTime(f * mult, t);
      const pg = this.ctx.createGain(); pg.gain.value = amps[i];
      o.connect(pg); pg.connect(mix); o.start(t); o.stop(t + dur);
      if (!lead) lead = o; else nodes.push(o);
      nodes.push(pg);
    });
    const click = this.ns(t, 0.008);
    const hp = this.ctx.createBiquadFilter(); hp.type = "highpass"; hp.frequency.value = 3000;
    const cg = this.env(t, 0.04 * v, 0.001, 0.015);
    click.connect(hp); hp.connect(cg); cg.connect(this.dest);
    const g = this.env(t, 1, 0.012, dur * 0.88);
    mix.connect(g); g.connect(this.dest);
    reap(lead!, [...nodes, mix, g, click, hp, cg]);
  }

  brass(t: number, v: number, f: number, formant: number, atk: number) {
    const dur = 0.5;
    const a = this.ctx.createOscillator(); a.type = "sawtooth";
    a.frequency.setValueAtTime(f * 0.97, t); a.frequency.exponentialRampToValueAtTime(f, t + atk + 0.02);
    const b = this.ctx.createOscillator(); b.type = "triangle"; b.frequency.setValueAtTime(f * 1.003, t);
    const bp = this.ctx.createBiquadFilter(); bp.type = "bandpass"; bp.frequency.value = formant; bp.Q.value = 1.7;
    const lp = this.ctx.createBiquadFilter(); lp.type = "lowpass";
    lp.frequency.setValueAtTime(formant * 2.1, t); lp.frequency.setTargetAtTime(formant * 1.1, t + atk, 0.1);
    const ag = this.ctx.createGain(); ag.gain.value = 0.62;
    const bg = this.ctx.createGain(); bg.gain.value = 0.4;
    a.connect(ag); b.connect(bg); ag.connect(bp); bg.connect(bp); bp.connect(lp);
    const breath = this.ns(t, dur);
    const hp = this.ctx.createBiquadFilter(); hp.type = "highpass"; hp.frequency.value = 1500;
    const ng = this.env(t, 0.035 * v, atk, dur);
    breath.connect(hp); hp.connect(ng); ng.connect(this.dest);
    const g = this.env(t, 0.26 * v, atk, dur);
    lp.connect(g); g.connect(this.dest);
    a.start(t); b.start(t); a.stop(t + dur + 0.06); b.stop(t + dur + 0.06);
    reap(a, [b, bp, lp, ag, bg, g, breath, hp, ng]);
  }

  reed(t: number, v: number, f: number, formant: number, atk: number) {
    const dur = 0.48;
    const o = this.ctx.createOscillator(); o.type = "sawtooth"; o.frequency.setValueAtTime(f, t);
    const odd = this.ctx.createOscillator(); odd.type = "sine"; odd.frequency.setValueAtTime(f * 3, t);
    const bp = this.ctx.createBiquadFilter(); bp.type = "bandpass"; bp.frequency.value = formant; bp.Q.value = 2;
    const og = this.ctx.createGain(); og.gain.value = 0.55;
    const dg = this.ctx.createGain(); dg.gain.value = 0.2;
    o.connect(og); odd.connect(dg); og.connect(bp); dg.connect(bp);
    const breath = this.ns(t, dur);
    const hp = this.ctx.createBiquadFilter(); hp.type = "highpass"; hp.frequency.value = 1800;
    const ng = this.env(t, 0.045 * v, atk, dur);
    breath.connect(hp); hp.connect(ng); ng.connect(this.dest);
    const g = this.env(t, 0.22 * v, atk, dur);
    bp.connect(g); g.connect(this.dest);
    vibrato(this.ctx, o, f, t, dur, 4.6, 0.003);
    o.start(t); odd.start(t); o.stop(t + dur + 0.06); odd.stop(t + dur + 0.06);
    reap(o, [odd, bp, og, dg, g, breath, hp, ng]);
  }

  clarinet(t: number, v: number, f: number) {
    const dur = 0.48;
    const mix = this.ctx.createGain(); mix.gain.value = 0.22 * v;
    const parts = [1, 3, 5], amps = [1, 0.28, 0.1];
    const nodes: AudioNode[] = [];
    let lead: OscillatorNode | null = null;
    parts.forEach((mult, i) => {
      const o = this.ctx.createOscillator(); o.type = "sine"; o.frequency.setValueAtTime(f * mult, t);
      const pg = this.ctx.createGain(); pg.gain.value = amps[i];
      o.connect(pg); pg.connect(mix); o.start(t); o.stop(t + dur);
      if (!lead) lead = o; else nodes.push(o);
      nodes.push(pg);
    });
    const bp = this.ctx.createBiquadFilter(); bp.type = "bandpass"; bp.frequency.value = Math.min(1600, f * 2.6); bp.Q.value = 1.4;
    mix.connect(bp);
    const g = this.env(t, 1, 0.04, dur);
    bp.connect(g); g.connect(this.dest);
    reap(lead!, [...nodes, mix, bp, g]);
  }

  flute(t: number, v: number, f: number) {
    const dur = 0.46;
    const o = this.ctx.createOscillator(); o.type = "sine"; o.frequency.setValueAtTime(f, t);
    const h = this.ctx.createOscillator(); h.type = "sine"; h.frequency.setValueAtTime(f * 2, t);
    const hg = this.ctx.createGain(); hg.gain.value = 0.09;
    const breath = this.ns(t, dur);
    const bp = this.ctx.createBiquadFilter(); bp.type = "bandpass"; bp.frequency.value = Math.min(2600, f * 3.2); bp.Q.value = 0.7;
    const ng = this.env(t, 0.05 * v, 0.05, dur);
    breath.connect(bp); bp.connect(ng); ng.connect(this.dest);
    const g = this.env(t, 0.2 * v, 0.05, dur);
    o.connect(g); h.connect(hg); hg.connect(g); g.connect(this.dest);
    vibrato(this.ctx, o, f, t, dur, 5.2, 0.0025);
    o.start(t); h.start(t); o.stop(t + dur + 0.05); h.stop(t + dur + 0.05);
    reap(o, [h, hg, g, breath, bp, ng]);
  }

  bow(t: number, v: number, f: number, bright: number) {
    const dur = 0.62;
    const a = this.ctx.createOscillator(); a.type = "sawtooth"; a.frequency.setValueAtTime(f, t);
    const b = this.ctx.createOscillator(); b.type = "triangle"; b.frequency.setValueAtTime(f * 1.0035, t);
    const lp = this.ctx.createBiquadFilter(); lp.type = "lowpass"; lp.frequency.value = bright; lp.Q.value = 0.65;
    const body = this.ctx.createBiquadFilter(); body.type = "bandpass"; body.frequency.value = Math.min(900, f * 2.4); body.Q.value = 1.2;
    const ag = this.ctx.createGain(); ag.gain.value = 0.42;
    const bg = this.ctx.createGain(); bg.gain.value = 0.58;
    a.connect(ag); b.connect(bg); ag.connect(lp); bg.connect(lp); lp.connect(body);
    const g = this.env(t, 0.2 * v, 0.09, dur);
    body.connect(g); g.connect(this.dest);
    vibrato(this.ctx, a, f, t, dur, 5.4, 0.002);
    a.start(t); b.start(t); a.stop(t + dur + 0.08); b.stop(t + dur + 0.08);
    reap(a, [b, lp, body, ag, bg, g]);
  }

  boom(t: number, v: number, f: number) {
    const o = this.ctx.createOscillator(); o.type = "sine";
    o.frequency.setValueAtTime(f * 1.18, t); o.frequency.exponentialRampToValueAtTime(Math.max(36, f * 0.92), t + 0.4);
    const over = this.ctx.createOscillator(); over.type = "sine"; over.frequency.setValueAtTime(f * 1.72, t);
    const g = this.env(t, 0.7 * v, 0.01, 0.95);
    const og = this.env(t, 0.16 * v, 0.01, 0.4);
    o.connect(g); over.connect(og); g.connect(this.dest); og.connect(this.dest);
    o.start(t); over.start(t); o.stop(t + 1.05); over.stop(t + 0.5);
    const skin = this.ns(t, 0.1);
    const bp = this.ctx.createBiquadFilter(); bp.type = "bandpass"; bp.frequency.value = Math.max(70, f * 1.8); bp.Q.value = 0.9;
    const sg = this.env(t, 0.16 * v, 0.003, 0.14);
    skin.connect(bp); bp.connect(sg); sg.connect(this.dest);
    reap(o, [over, g, og, skin, bp, sg]);
  }

  play(kind: MelodicVoice, t: number, v: number, f: number) {
    if (!f) return;
    f = Math.min(1800, Math.max(38, f));
    v = Math.max(0.05, Math.min(1.2, v));
    switch (kind) {
      case "bass": return this.bass(t, v, f);
      case "guitar": return this.guitar(t, v, f);
      case "piano": return this.piano(t, v, f);
      case "organ": return this.organ(t, v, f);
      case "trumpet": return this.brass(t, v, f, 1220, 0.04);
      case "trombone": return this.brass(t, v, f, 580, 0.06);
      case "horn": return this.brass(t, v, f, 820, 0.07);
      case "sax": return this.reed(t, v, f, 1050, 0.045);
      case "clarinet": return this.clarinet(t, v, f);
      case "oboe": return this.reed(t, v, f, 1680, 0.04);
      case "flute": return this.flute(t, v, f);
      case "violin": return this.bow(t, v, f, 2100);
      case "cello": return this.bow(t, v, f, 780);
      case "timpani": return this.boom(t, v, f);
    }
  }
}
