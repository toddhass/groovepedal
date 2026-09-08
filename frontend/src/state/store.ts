import { create } from "zustand";
import { Synth } from "../audio/synth";
import { Sequencer } from "../audio/sequencer";
import { PracticeTrack } from "../audio/practiceTrack";
import { makeSong, Song, SEEDS } from "../data/songs";
import { Feel, LABELS, STYLES } from "../data/grooves";

interface Engine {
  ctx: AudioContext;
  synth: Synth;
  seq: Sequencer;
  track: PracticeTrack;
  masterGain: GainNode;
}

let engine: Engine | null = null;

function getEngine(): Engine {
  if (engine) return engine;
  const ctx = new AudioContext();

  const drums = ctx.createGain();
  drums.gain.value = 0.9;

  const hp = ctx.createBiquadFilter();
  hp.type = "highpass";
  hp.frequency.value = 38;
  hp.Q.value = 0.7;

  const presence = ctx.createBiquadFilter();
  presence.type = "peaking";
  presence.frequency.value = 180;
  presence.Q.value = 0.7;
  presence.gain.value = 2.5;

  const airCut = ctx.createBiquadFilter();
  airCut.type = "highshelf";
  airCut.frequency.value = 6500;
  airCut.gain.value = -4.5;

  const comp = ctx.createDynamicsCompressor();
  comp.threshold.value = -18;
  comp.knee.value = 18;
  comp.ratio.value = 3.2;
  comp.attack.value = 0.006;
  comp.release.value = 0.16;

  const masterGain = ctx.createGain();
  masterGain.gain.value = 0.85;

  drums.connect(hp);
  hp.connect(presence);
  presence.connect(airCut);
  airCut.connect(comp);
  comp.connect(masterGain);
  masterGain.connect(ctx.destination);

  const synth = new Synth(ctx, drums);
  const seq = new Sequencer(synth, ctx);
  const track = new PracticeTrack(ctx, masterGain);
  engine = { ctx, synth, seq, track, masterGain };
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

const initialSong = makeSong(SEEDS[0]);

export const useApp = create<AppState>((set, get) => ({
  tab: "songs",
  playing: false,
  song: initialSong,
  bpm: initialSong.bpm,
  volume: 85,
  step: 0,
  partName: initialSong.parts[0]?.name ?? "—",
  library: SEEDS.map(makeSong),
  query: "",

  setTab: (t) => set({ tab: t }),
  setQuery: (q) => set({ query: q }),

  selectSong: (id) => {
    const seed = SEEDS.find((s) => s.id === id);
    if (!seed) return;
    const song = makeSong(seed);
    const { seq } = getEngine();
    seq.setParts(song.parts);
    set({ song, bpm: song.bpm, partName: song.parts[0]?.name ?? "—" });
  },

  selectFeel: (feel) => {
    const cur = get().song;
    const song = makeSong({ id: `custom-${feel}`, title: LABELS[feel], artist: STYLES.find((s) => s.id === feel)?.label ?? feel, feel });
    const { seq } = getEngine();
    seq.setParts(song.parts);
    set({ song, bpm: song.bpm, partName: song.parts[0]?.name ?? "—" });
    void cur;
  },

  setBpm: (bpm) => {
    const { seq } = getEngine();
    seq.bpm = bpm;
    set({ bpm });
  },

  setVolume: (v) => {
    const { masterGain } = getEngine();
    const lin = Math.max(0, Math.min(1, v / 100));
    masterGain.gain.setTargetAtTime(lin * lin * 1.15 + lin * 0.15, getEngine().ctx.currentTime, 0.02);
    set({ volume: v });
  },

  toggleStart: () => {
    const { ctx, seq, track } = getEngine();
    if (ctx.state === "suspended") void ctx.resume();

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
    track.play(ctx.currentTime + 0.05);
    set({ playing: true });
  },

  fill: () => getEngine().seq.queueFill(),
  nextPart: () => {
    const { seq } = getEngine();
    seq.nextPart();
    set({ partName: seq.currentPart?.name ?? "—" });
  },
  restart: () => {
    const { seq } = getEngine();
    seq.restart();
    set({ partName: seq.currentPart?.name ?? "—" });
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
