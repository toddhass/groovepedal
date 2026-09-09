import { Synth, DrumVoice } from "./synth";
import { hit, Pattern, SongPart } from "../data/grooves";

const LOOKAHEAD_MS = 25;
const SCHEDULE_AHEAD_SEC = 0.12;
const STEPS_PER_BAR = 16;

export interface SequencerCallbacks {
  onStep?: (step: number, part: SongPart) => void;
}

export class Sequencer {
  private synth: Synth;
  private ctx: AudioContext;
  private timer: number | null = null;
  private nextStepTime = 0;
  private step = 0;
  private barsPlayed = 0;
  bpm = 120;
  playing = false;
  parts: SongPart[] = [];
  partIndex = 0;
  fillQueued = false;
  crashQueued = false;
  onNext: SequencerCallbacks["onStep"];

  constructor(synth: Synth, ctx: AudioContext) {
    this.synth = synth;
    this.ctx = ctx;
  }
  setParts(parts: SongPart[]) { this.parts = parts; this.partIndex = 0; this.barsPlayed = 0; }
  get currentPart(): SongPart | undefined { return this.parts[this.partIndex]; }
  private stepDuration() { return 60 / this.bpm / 4; }
  private scheduleStep(stepIndex: number, time: number, part: SongPart, useFill: boolean) {
    const pattern: Partial<Pattern> = useFill ? part.fill : part.groove;
    for (const voice of Object.keys(pattern)) {
      const v = hit(pattern[voice], stepIndex);
      if (v > 0) this.synth.trig(voice as DrumVoice, time, v);
    }
    if (this.crashQueued && stepIndex === 0) {
      this.synth.crash(time, 1);
      this.crashQueued = false;
    }
  }
  private advance() {
    const part = this.currentPart;
    if (!part) return;
    const swing = this.step % 2 === 1 ? part.swing * this.stepDuration() : 0;
    const time = this.nextStepTime + swing;
    const lastStepOfBar = this.step === STEPS_PER_BAR - 1;
    const isLastBarOfPart = this.barsPlayed >= part.bars - 1;
    const useFill = this.fillQueued && lastStepOfBar === false && this.step >= STEPS_PER_BAR - 4 && isLastBarOfPart;
    this.scheduleStep(this.step, time, part, useFill);
    this.onNext?.(this.step, part);
    this.nextStepTime += this.stepDuration();
    this.step++;
    if (this.step >= STEPS_PER_BAR) {
      this.step = 0;
      this.barsPlayed++;
      if (this.barsPlayed >= part.bars) {
        this.barsPlayed = 0;
        this.fillQueued = false;
        this.partIndex = (this.partIndex + 1) % this.parts.length;
      }
    }
  }
  private tick = () => {
    while (this.nextStepTime < this.ctx.currentTime + SCHEDULE_AHEAD_SEC) this.advance();
    this.timer = window.setTimeout(this.tick, LOOKAHEAD_MS);
  };
  start() {
    if (this.playing) return;
    this.playing = true;
    this.step = 0;
    this.barsPlayed = 0;
    this.nextStepTime = this.ctx.currentTime + 0.05;
    this.tick();
  }
  stop() {
    this.playing = false;
    if (this.timer != null) { clearTimeout(this.timer); this.timer = null; }
  }
  restart() { this.step = 0; this.barsPlayed = 0; this.partIndex = 0; }
  nextPart() { this.partIndex = (this.partIndex + 1) % this.parts.length; this.step = 0; this.barsPlayed = 0; }
  queueFill() { this.fillQueued = true; }
  queueCrash() { this.crashQueued = true; }
}
