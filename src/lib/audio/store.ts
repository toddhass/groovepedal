import { create } from "zustand";
import { emptyInstruments } from "./instruments";
import { getEngine, type EngineState } from "./engine";

const idle: EngineState = {
  playing: false,
  audioReady: false,
  songId: null,
  partIndex: 0,
  partName: "—",
  parts: [],
  step: 0,
  bar: 0,
  bars: 2,
  bpm: 120,
  songBpm: 120,
  inFill: false,
  fillQueued: false,
  nextPartQueued: false,
  accentQueued: false,
  volume: 1,
  muted: false,
  feel: "rock",
  bassOn: false,
  trumpetOn: false,
  cowbellOn: false,
  trackName: null,
  trackVocalsOn: true,
  trackGuitarOn: true,
  trackAi: "off",
  trackAiProgress: 0,
  trackAiMessage: "",
  trackOffset: 0,
  trackNativeBpm: 0,
  liveLock: "off",
  liveLockOn: false,
  countInOn: false,
  instruments: emptyInstruments(),
  ensemble: null,
};

export const useGroove = create<EngineState>(() => idle);

let bound = false;

export function bindGrooveStore() {
  if (bound || typeof window === "undefined") return () => undefined;
  bound = true;
  useGroove.setState(getEngine().getState());
  return getEngine().subscribe((state) => useGroove.setState(state));
}

export function engine() {
  return getEngine();
}
