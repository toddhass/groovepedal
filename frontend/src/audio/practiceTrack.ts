import { analyzeTrack, TempoResult } from "./tempoDetect";

// Quick, zero-latency, client-side vocal/guitar isolation using a mid-side
// trick: vocals usually sit panned-center (mid), lead guitar is often
// spread wide (sides). It's a real DSP technique, not source separation -
// good enough to duck one or the other while you wait for (or instead of)
// a real ML stem split from the backend.
export class PracticeTrack {
  ctx: AudioContext;
  name: string | null = null;
  vocalsOn = true;
  guitarOn = true;
  buffer: AudioBuffer | null = null;
  src: AudioBufferSourceNode | null = null;
  nativeBpm = 0;
  cue = 0;
  nudge = 0;
  rate = 1;
  wantPlay = false;

  // Real server-separated stems (from POST /api/stems), once available.
  remoteVocals: AudioBuffer | null = null;
  remoteInstrumental: AudioBuffer | null = null;
  usingRemoteStems = false;

  private split: ChannelSplitterNode;
  private guitarGain: GainNode;
  private vocalsGain: GainNode;
  private body: BiquadFilterNode;
  private air: BiquadFilterNode;
  private cutA: BiquadFilterNode;
  private cutB: BiquadFilterNode;
  private cutC: BiquadFilterNode;
  private out: GainNode;
  private gate: GainNode;
  private align: DelayNode;

  constructor(ctx: AudioContext, dest: AudioNode) {
    this.ctx = ctx;
    this.split = ctx.createChannelSplitter(2);

    const midL = ctx.createGain(); midL.gain.value = 0.5;
    const midR = ctx.createGain(); midR.gain.value = 0.5;
    const mid = ctx.createGain();
    const sideL = ctx.createGain(); sideL.gain.value = 0.5;
    const sideR = ctx.createGain(); sideR.gain.value = -0.5;
    this.guitarGain = ctx.createGain();

    const midLow = ctx.createBiquadFilter(); midLow.type = "lowpass"; midLow.frequency.value = 180;
    const midHigh = ctx.createBiquadFilter(); midHigh.type = "highpass"; midHigh.frequency.value = 180;
    this.vocalsGain = ctx.createGain();

    this.body = ctx.createBiquadFilter(); this.body.type = "peaking"; this.body.frequency.value = 720; this.body.Q.value = 0.85; this.body.gain.value = 0;
    this.air = ctx.createBiquadFilter(); this.air.type = "peaking"; this.air.frequency.value = 2650; this.air.Q.value = 0.8; this.air.gain.value = 0;
    this.cutA = ctx.createBiquadFilter(); this.cutA.type = "peaking"; this.cutA.frequency.value = 900; this.cutA.Q.value = 0.9; this.cutA.gain.value = 0;
    this.cutB = ctx.createBiquadFilter(); this.cutB.type = "peaking"; this.cutB.frequency.value = 2200; this.cutB.Q.value = 0.85; this.cutB.gain.value = 0;
    this.cutC = ctx.createBiquadFilter(); this.cutC.type = "peaking"; this.cutC.frequency.value = 3800; this.cutC.Q.value = 0.7; this.cutC.gain.value = 0;

    const ls = ctx.createGain(); ls.gain.value = 1;
    const rs = ctx.createGain(); rs.gain.value = -1;
    const merge = ctx.createChannelMerger(2);

    this.out = ctx.createGain(); this.out.gain.value = 0.9;
    this.gate = ctx.createGain();
    this.align = ctx.createDelay(0.25); this.align.delayTime.value = 0;

    this.split.connect(midL, 0); this.split.connect(midR, 1); midL.connect(mid); midR.connect(mid);
    this.split.connect(sideL, 0); this.split.connect(sideR, 1); sideL.connect(this.guitarGain); sideR.connect(this.guitarGain);

    mid.connect(midLow); mid.connect(midHigh); midHigh.connect(this.vocalsGain);
    this.vocalsGain.connect(this.body); this.body.connect(this.air);

    this.guitarGain.connect(this.cutA); this.cutA.connect(this.cutB); this.cutB.connect(this.cutC);

    midLow.connect(merge, 0, 0); midLow.connect(merge, 0, 1);
    this.air.connect(merge, 0, 0); this.air.connect(merge, 0, 1);
    this.cutC.connect(ls); ls.connect(merge, 0, 0);
    this.cutC.connect(rs); rs.connect(merge, 0, 1);

    merge.connect(this.out); this.out.connect(this.gate); this.gate.connect(this.align); this.align.connect(dest);
  }

  private stopSrc() {
    const src = this.src;
    this.src = null;
    if (!src) return;
    const now = this.ctx.currentTime;
    try {
      this.gate.gain.cancelScheduledValues(now);
      this.gate.gain.setTargetAtTime(0.0001, now, 0.01);
      src.stop(now + 0.05);
    } catch {
      try { src.stop(); } catch { /* noop */ }
    }
    setTimeout(() => { try { src.disconnect(); } catch { /* noop */ } }, 80);
  }

  setAlign(sec: number) {
    this.align.delayTime.setTargetAtTime(Math.max(0, Math.min(0.1, sec || 0)), this.ctx.currentTime, 0.05);
  }

  apply() {
    const t = this.ctx.currentTime;
    if (this.usingRemoteStems) {
      // Real stems: no DSP coloring needed, just gate each source directly
      // (handled in play()); keep EQ neutral.
      this.body.gain.setTargetAtTime(0, t, 0.02);
      this.air.gain.setTargetAtTime(0, t, 0.02);
      this.cutA.gain.setTargetAtTime(0, t, 0.02);
      this.cutB.gain.setTargetAtTime(0, t, 0.02);
      this.cutC.gain.setTargetAtTime(0, t, 0.02);
      return;
    }
    this.vocalsGain.gain.setTargetAtTime(this.vocalsOn ? 1 : 0, t, 0.03);
    this.guitarGain.gain.setTargetAtTime(this.guitarOn ? 1 : 0, t, 0.03);
    this.body.gain.setTargetAtTime(this.guitarOn ? 0 : -14, t, 0.03);
    this.air.gain.setTargetAtTime(this.guitarOn ? 0 : -16, t, 0.03);
    this.cutA.gain.setTargetAtTime(this.vocalsOn ? 0 : -22, t, 0.03);
    this.cutB.gain.setTargetAtTime(this.vocalsOn ? 0 : -28, t, 0.03);
    this.cutC.gain.setTargetAtTime(this.vocalsOn ? 0 : -20, t, 0.03);
  }

  async load(file: File, hint?: number): Promise<TempoResult | { error: string }> {
    this.stopSrc();
    this.buffer = null;
    this.nudge = 0;
    this.rate = 1;
    this.cue = 0;
    this.remoteVocals = null;
    this.remoteInstrumental = null;
    this.usingRemoteStems = false;
    this.name = file.name.replace(/\.[^.]+$/, "");

    if (file.size > 22 * 1024 * 1024) {
      return { error: "File is too big. Use a clip under ~4 minutes." };
    }

    try {
      const raw = await file.arrayBuffer();
      const buf = await this.ctx.decodeAudioData(raw);
      const max = Math.min(buf.length, Math.floor(buf.sampleRate * 90));
      if (max < 64) return { error: "That file is empty." };

      let stereo: AudioBuffer;
      if (buf.numberOfChannels >= 2 && buf.length <= max) {
        stereo = buf;
      } else {
        stereo = this.ctx.createBuffer(2, max, buf.sampleRate);
        const L = buf.getChannelData(0);
        const R = buf.numberOfChannels > 1 ? buf.getChannelData(1) : L;
        stereo.getChannelData(0).set(L.subarray(0, max));
        stereo.getChannelData(1).set(R.subarray(0, max));
      }
      this.buffer = stereo;
      const a = analyzeTrack(stereo, hint || 120);
      this.nativeBpm = a.bpm;
      this.cue = a.offset;
      this.apply();
      return a;
    } catch {
      return { error: "Could not decode audio" };
    }
  }

  /** Swap in real server-separated stems once the backend job finishes. */
  useRemoteStems(vocals: AudioBuffer, instrumental: AudioBuffer) {
    this.remoteVocals = vocals;
    this.remoteInstrumental = instrumental;
    this.usingRemoteStems = true;
    this.apply();
    if (this.wantPlay) this.play();
  }

  play(when?: number, transport = 0) {
    this.wantPlay = true;
    if (!this.buffer) return;
    this.stopSrc();

    const src = this.ctx.createBufferSource();
    src.buffer = this.buffer;
    src.connect(this.split);
    src.playbackRate.value = this.rate || 1;

    const duration = this.buffer.duration;
    let cue = Math.max(0, (this.cue || 0) + (this.nudge || 0));
    if (cue > duration - 0.05) cue = Math.max(0, duration - 0.05);

    const bar = (4 * 60) / (this.nativeBpm || 120);
    const remain = Math.max(bar, duration - cue);
    const bars = Math.max(1, Math.floor(remain / bar + 1e-9));

    src.loop = true;
    src.loopStart = cue;
    src.loopEnd = Math.min(duration - 0.0005, cue + bars * bar);
    if (src.loopEnd <= src.loopStart + 0.08) src.loop = false;

    const span = src.loop ? src.loopEnd - src.loopStart : duration - cue;
    let off = cue + Math.max(0, transport) * (this.rate || 1);
    if (span > 0.05) off = cue + (((off - cue) % span) + span) % span;
    else off = cue;

    const now = this.ctx.currentTime;
    let startAt = when == null ? now : when;
    if (startAt < now) {
      off += (now - startAt) * (this.rate || 1);
      startAt = now;
      if (span > 0.05) off = cue + (((off - cue) % span) + span) % span;
    }
    if (!isFinite(off) || !isFinite(startAt) || off >= duration || off < 0) return;

    this.gate.gain.cancelScheduledValues(startAt);
    this.gate.gain.setValueAtTime(0.0001, startAt);
    this.gate.gain.linearRampToValueAtTime(1, startAt + 0.035);

    try {
      src.start(startAt, off);
      this.src = src;
    } catch {
      this.src = null;
    }
  }

  pause() {
    this.wantPlay = false;
    this.stopSrc();
  }

  rewind() {
    if (this.wantPlay) this.play();
  }
}
