import { create } from "zustand";
import { Synth } from "../audio/synth";
import { Sequencer } from "../audio/sequencer";
import { PracticeTrack } from "../audio/practiceTrack";
import { SoundFontKit } from "../audio/soundfontKit";
import { searchAppleMusic, hitToSeed } from "../api";
import { makeSong, Song, SEEDS } from "../data/songs";
import { Feel, LABELS, STYLES } from "../data/grooves";

interface Engine {
  ctx: AudioContext;
  synth: Synth;
  seq: Sequencer;
  track: PracticeTrack;
  masterGain: GainNode;
  sf: SoundFontKit;
}

let engine: Engine | null = null;
let searchTimer = 0;

function getEngine(): Engine {
  if (engine) return engine;
  const ctx = new AudioContext();

  const drums = ctx.createGain();
  drums.gain.value = 0.95;

  const hp = ctx.createBiquadFilter();
  hp.type = "highpass";
  hp.frequency.value = 35;
  hp.Q.value = 0.7;

  const presence = ctx.createBiquadFilter();
  presence.type = "peaking";
  presence.frequency.value = 180;
  presence.Q.value = 0.7;
  presence.gain.value = 2.5;

  const airCut = ctx.createBiquadFilter();
  airCut.type = "highshelf";
  airCut.frequency.value = 6500;
  airCut.gain.value = -3;

  const comp = ctx.createDynamicsCompressor();
  comp.threshold.value = -18;
  comp.knee.value = 18;
  comp.ratio.value = 3.2;
  comp.attack.value = 0.006;
  comp.release.value = 0.16;

  const masterGain = ctx.createGain();
  masterGain.gain.value = 0.9;

  drums.connect(hp);
  hp.connect(presence);
  presence.connect(airCut);
  airCut.connect(comp);
  comp.connect(masterGain);
  masterGain.connect(ctx.destination);

  const sf = new SoundFontKit(ctx, drums);
  const synth = new Synth(ctx, drums);
  const rawTrig = synth.trig.bind(synth);
  synth.trig = (voice, t, v) => {
    if (sf.hasDrum(voice) && sf.playDrum(voice, t, v)) return;
    rawTrig(voice, t, v);
  };
  const rawCrash = synth.crash.bind(synth);
  synth.crash = (t, v) => {
    if (sf.hasDrum("crash") && sf.playDrum("crash", t, v)) return;
    rawCrash(t, v);
  };

  const seq = new Sequencer(synth, ctx);
  const track = new PracticeTrack(ctx, masterGain);
  engine = { ctx, synth, seq, track, masterGain, sf };
  return engine;
}

interface AppState {
  tab: "songs" | "track" | "band";
  playing: boolean;
  song: Song;
  bpm: number;
  volume: number;
  step: number;
  partName: string;
  library: Song[];
  query: string;

  setTab: (t: AppState["tab"]) => void;
  setQuery: (q: string) => void;
  selectSong: (id: string) => void;
  selectFeel: (feel: Feel) => void;
  setBpm: (bpm: number) => void;
  setVolume: (v: number) => void;
  toggleStart: () => void;
  fill: () => void;
  nextPart: () => void;
  restart: () => void;
  crash: () => void;
  loadPracticeFile: (f: File) => Promise<{ error?: string; bpm?: number }>;
}

const seedLibrary = SEEDS.map(makeSong);
const initialSong = seedLibrary[0];

export const useApp = create<AppState>((set, get) => ({
  tab: "songs",
  playing: false,
  song: initialSong,
  bpm: initialSong.bpm,
  volume: 90,
  step: 0,
  partName: initialSong.parts[0]?.name ?? "\u2014",
  library: seedLibrary,
  query: "",

  setTab: (t) => set({ tab: t }),

  setQuery: (q) => {
    set({ query: q });
    const t = q.trim();
    window.clearTimeout(searchTimer);
    if (t.length < 2) {
      set({ library: seedLibrary });
      return;
    }
    const local = SEEDS.filter((s) =>
      (s.title + " " + s.artist).toLowerCase().includes(t.toLowerCase())
    ).map(makeSong);
    set({ library: local.length ? local : seedLibrary.filter((s) =>
      (s.title + " " + s.artist).toLowerCase().includes(t.toLowerCase())
    ) });
    searchTimer = window.setTimeout(() => {
      void searchAppleMusic(t)
        .then((hits) => {
          if (get().query.trim() !== t) return;
          const seen = new Set(local.map((s) => (s.title + "|" + s.artist).toLowerCase()));
          const extra = hits
            .map(hitToSeed)
            .filter((s) => s.title && s.artist && !seen.has((s.title + "|" + s.artist).toLowerCase()))
            .slice(0, 16)
            .map(makeSong);
          set({ library: [...local, ...extra] });
        })
        .catch((err) => console.warn("search failed", err));
    }, 280);
  },

  selectSong: (id) => {
    const fromLib = get().library.find((s) => s.id === id);
    const seed = SEEDS.find((s) => s.id === id);
    const song = fromLib ?? (seed ? makeSong(seed) : null);
    if (!song) return;
    const { seq, ctx } = getEngine();
    if (ctx.state === "suspended") void ctx.resume();
    seq.setParts(song.parts);
    set({ song, bpm: song.bpm, partName: song.parts[0]?.name ?? "\u2014" });
  },

  selectFeel: (feel) => {
    const cur = get().song;
    const song = makeSong({
      id: cur.id.startsWith("it-") ? cur.id : `custom-${feel}`,
      title: cur.id.startsWith("it-") ? cur.title : LABELS[feel],
      artist: cur.id.startsWith("it-") ? cur.artist : (STYLES.find((s) => s.id === feel)?.label ?? feel),
      feel,
    });
    const { seq } = getEngine();
    seq.setParts(song.parts);
    set({ song, bpm: song.bpm, partName: song.parts[0]?.name ?? "\u2014" });
  },

  setBpm: (bpm) => {
    const { seq } = getEngine();
    seq.bpm = bpm;
    set({ bpm });
  },

  setVolume: (v) => {
    const { masterGain, ctx } = getEngine();
    const lin = Math.max(0, Math.min(1, v / 100));
    masterGain.gain.setTargetAtTime(lin * lin * 1.1 + lin * 0.2, ctx.currentTime, 0.02);
    set({ volume: v });
  },

  toggleStart: () => {
    const { ctx, seq, track, sf, synth } = getEngine();
    if (ctx.state === "suspended") void ctx.resume();
    void sf.preload();

    if (get().playing) {
      seq.stop();
      track.pause();
      set({ playing: false });
      return;
    }

    seq.bpm = get().bpm;
    seq.setParts(get().song.parts);
    seq.onNext = (step, part) => set({ step, partName: part.name });
    seq.start();
    try { synth.trig("kick", ctx.currentTime, 1); } catch { /* unlock click */ }
    track.play(ctx.currentTime + 0.05);
    set({ playing: true });
  },

  fill: () => getEngine().seq.queueFill(),
  nextPart: () => {
    const { seq } = getEngine();
    seq.nextPart();
    set({ partName: seq.currentPart?.name ?? "\u2014" });
  },
  restart: () => {
    const { seq } = getEngine();
    seq.restart();
    set({ partName: seq.currentPart?.name ?? "\u2014" });
  },
  crash: () => getEngine().seq.queueCrash(),

  loadPracticeFile: async (f: File) => {
    const { track } = getEngine();
    const res = await track.load(f, get().bpm);
    if ("error" in res) return { error: res.error };
    return { bpm: res.bpm };
  },
}));

export function getAudioEngine() {
  return getEngine();
}
