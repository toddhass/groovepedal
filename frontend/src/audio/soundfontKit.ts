/**
 * Multi-sampled SoundFont playback via WebAudioFont (SF2 → wavetable).
 * JCLive / FluidR3 GM percussion + a few band instruments.
 * Falls through to the oscillator Synth until a preset is decoded.
 */

export type SfDrum =
  | "kick" | "snare" | "clap" | "rim" | "hat" | "openHat" | "pedalHat"
  | "ride" | "crash" | "splash" | "china"
  | "highTom" | "tom" | "floor" | "cowbell";

type PresetSpec = {
  file: string;
  global: string;
  pitch: number;
  dur: number;
  gain: number;
};

const DATA = "https://surikov.github.io/webaudiofontdata/sound/";
const PLAYER = "https://surikov.github.io/webaudiofont/npm/dist/WebAudioFontPlayer.js";

const DRUMS: Record<SfDrum, PresetSpec> = {
  kick:     { file: "12836_6_JCLive_sf2_file.js", global: "_drum_36_6_JCLive_sf2_file", pitch: 36, dur: 1.15, gain: 0.72 },
  snare:    { file: "12838_6_JCLive_sf2_file.js", global: "_drum_38_6_JCLive_sf2_file", pitch: 38, dur: 0.7,  gain: 0.62 },
  clap:     { file: "12839_6_JCLive_sf2_file.js", global: "_drum_39_6_JCLive_sf2_file", pitch: 39, dur: 0.5,  gain: 0.55 },
  rim:      { file: "12837_6_JCLive_sf2_file.js", global: "_drum_37_6_JCLive_sf2_file", pitch: 37, dur: 0.35, gain: 0.5 },
  hat:      { file: "12842_6_JCLive_sf2_file.js", global: "_drum_42_6_JCLive_sf2_file", pitch: 42, dur: 0.18, gain: 0.28 },
  openHat:  { file: "12846_6_JCLive_sf2_file.js", global: "_drum_46_6_JCLive_sf2_file", pitch: 46, dur: 0.45, gain: 0.32 },
  pedalHat: { file: "12844_6_JCLive_sf2_file.js", global: "_drum_44_6_JCLive_sf2_file", pitch: 44, dur: 0.16, gain: 0.3 },
  ride:     { file: "12851_6_JCLive_sf2_file.js", global: "_drum_51_6_JCLive_sf2_file", pitch: 51, dur: 1.4,  gain: 0.38 },
  crash:    { file: "12849_6_JCLive_sf2_file.js", global: "_drum_49_6_JCLive_sf2_file", pitch: 49, dur: 2.2,  gain: 0.48 },
  splash:   { file: "12855_6_JCLive_sf2_file.js", global: "_drum_55_6_JCLive_sf2_file", pitch: 55, dur: 0.7,  gain: 0.4 },
  china:    { file: "12852_6_JCLive_sf2_file.js", global: "_drum_52_6_JCLive_sf2_file", pitch: 52, dur: 1.1,  gain: 0.42 },
  highTom:  { file: "12850_6_JCLive_sf2_file.js", global: "_drum_50_6_JCLive_sf2_file", pitch: 50, dur: 0.7,  gain: 0.5 },
  tom:      { file: "12847_6_JCLive_sf2_file.js", global: "_drum_47_6_JCLive_sf2_file", pitch: 47, dur: 0.75, gain: 0.52 },
  floor:    { file: "12841_6_JCLive_sf2_file.js", global: "_drum_41_6_JCLive_sf2_file", pitch: 41, dur: 0.9,  gain: 0.55 },
  cowbell:  { file: "12856_6_JCLive_sf2_file.js", global: "_drum_56_6_JCLive_sf2_file", pitch: 56, dur: 0.4,  gain: 0.4 },
};

const TONES: Record<string, PresetSpec> = {
  bass:     { file: "0320_FluidR3_GM_sf2_file.js", global: "_tone_0320_FluidR3_GM_sf2_file", pitch: 36, dur: 0.55, gain: 0.45 },
  guitar:   { file: "0250_FluidR3_GM_sf2_file.js", global: "_tone_0250_FluidR3_GM_sf2_file", pitch: 52, dur: 0.7,  gain: 0.32 },
  piano:    { file: "0000_FluidR3_GM_sf2_file.js", global: "_tone_0000_FluidR3_GM_sf2_file", pitch: 60, dur: 0.8,  gain: 0.28 },
  trumpet:  { file: "0560_FluidR3_GM_sf2_file.js", global: "_tone_0560_FluidR3_GM_sf2_file", pitch: 67, dur: 0.45, gain: 0.26 },
};

type WafPlayer = {
  loader: {
    startLoad: (ctx: AudioContext, url: string, name: string) => void;
    waitLoad: (cb: () => void) => void;
    decodeAfterLoading: (ctx: BaseAudioContext, name: string) => void;
  };
  queueWaveTable: (
    ctx: BaseAudioContext,
    dest: AudioNode,
    preset: unknown,
    when: number,
    pitch: number,
    duration: number,
    volume: number
  ) => unknown;
};

function loadScript(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const existing = document.querySelector(`script[data-waf="${src}"]`);
    if (existing) {
      resolve();
      return;
    }
    const s = document.createElement("script");
    s.src = src;
    s.async = true;
    s.dataset.waf = src;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error(`SoundFont script failed: ${src}`));
    document.head.appendChild(s);
  });
}

function globalPreset(name: string): unknown {
  return (window as unknown as Record<string, unknown>)[name];
}

export class SoundFontKit {
  private ctx: BaseAudioContext;
  private dest: AudioNode;
  private player: WafPlayer | null = null;
  private ready = new Set<string>();
  status: "idle" | "loading" | "ready" | "error" = "idle";

  constructor(ctx: BaseAudioContext, dest: AudioNode) {
    this.ctx = ctx;
    this.dest = dest;
  }

  async preload(): Promise<void> {
    if (this.status === "loading" || this.status === "ready") return;
    this.status = "loading";
    try {
      await loadScript(PLAYER);
      const W = window as unknown as { WebAudioFontPlayer: new () => WafPlayer };
      this.player = new W.WebAudioFontPlayer();

      const first = ["kick", "snare", "hat", "openHat", "crash", "ride"] as SfDrum[];
      await this.loadSpecs(first.map((k) => DRUMS[k]));
      this.status = "ready";

      const rest = (Object.keys(DRUMS) as SfDrum[]).filter((k) => !first.includes(k));
      void this.loadSpecs(rest.map((k) => DRUMS[k]));
      void this.loadSpecs(Object.values(TONES));
    } catch (err) {
      console.warn("SoundFont preload failed", err);
      this.status = "error";
    }
  }

  private async loadSpecs(specs: PresetSpec[]): Promise<void> {
    if (!this.player) return;
    await Promise.all(specs.map((spec) => this.loadOne(spec)));
  }

  private async loadOne(spec: PresetSpec): Promise<void> {
    if (this.ready.has(spec.global)) return;
    try {
      await loadScript(DATA + spec.file);
      const preset = globalPreset(spec.global);
      if (!preset || !this.player) return;
      this.player.loader.decodeAfterLoading(this.ctx, spec.global);
      this.ready.add(spec.global);
    } catch (err) {
      console.warn("SoundFont missing", spec.file, err);
    }
  }

  hasDrum(voice: string): boolean {
    const spec = DRUMS[voice as SfDrum];
    return !!(spec && this.ready.has(spec.global) && this.player);
  }

  playDrum(voice: string, when: number, velocity: number): boolean {
    const spec = DRUMS[voice as SfDrum];
    if (!spec || !this.player) return false;
    const preset = globalPreset(spec.global);
    if (!preset) return false;
    const vol = Math.max(0.05, Math.min(1, velocity)) * spec.gain;
    try {
      this.player.queueWaveTable(this.ctx, this.dest, preset, when, spec.pitch, spec.dur, vol);
      return true;
    } catch {
      return false;
    }
  }

  playTone(name: string, when: number, velocity: number, freqHz: number): boolean {
    const spec = TONES[name];
    if (!spec || !this.player) return false;
    const preset = globalPreset(spec.global);
    if (!preset) return false;
    const midi = Math.round(69 + 12 * Math.log2(Math.max(20, freqHz) / 440));
    const vol = Math.max(0.05, Math.min(1, velocity)) * spec.gain;
    try {
      this.player.queueWaveTable(this.ctx, this.dest, preset, when, midi, spec.dur, vol);
      return true;
    } catch {
      return false;
    }
  }
}
