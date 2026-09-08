import { Link, useNavigate } from "@tanstack/react-router";
import { ChevronLeft, ChevronRight, Minus, Play, Plus, Square } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { consumeAutoStart, getEngine, playSongNow, type EngineState } from "@/lib/audio/engine";
import { emptyInstruments } from "@/lib/audio/instruments";
import { usePress } from "@/lib/press";
import { feelLabel } from "@/lib/songs/families";
import type { Song, SongSummary } from "@/lib/songs/types";
import { cn } from "@/lib/utils";

const LAST_SONG_KEY = "groovepedal:lastSong";

export { usePress } from "@/lib/press";

function initialState(song: Song): EngineState {
  const first = song.parts.parts[0];
  return {
    playing: false,
    audioReady: false,
    songId: song.id,
    partIndex: 0,
    partName: first?.name ?? "—",
    parts: song.parts.parts.map((part) => ({ id: part.id, name: part.name })),
    step: 0,
    bar: 0,
    bars: first?.bars ?? 2,
    bpm: song.bpm,
    songBpm: song.bpm,
    inFill: false,
    fillQueued: false,
    nextPartQueued: false,
    accentQueued: false,
    volume: 1,
    muted: false,
    feel: song.feel,
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
}

function Footswitch({
  label,
  hint,
  armed,
  onPress,
}: {
  label: string;
  hint: string;
  armed?: boolean;
  onPress: () => void;
}) {
  const press = usePress(onPress);
  return (
    <button
      type="button"
      {...press}
      className={cn(
        "flex min-h-16 touch-manipulation flex-col items-center justify-center gap-1 rounded-xl bg-secondary px-2 py-3 text-center shadow-[var(--shadow-border)] transition-[box-shadow,transform,background-color] duration-150 ease-[cubic-bezier(0.22,1,0.36,1)] select-none active:scale-[0.98]",
        armed && "bg-accent shadow-[var(--shadow-border-hover)]",
      )}
    >
      <span className="font-display text-sm tracking-[0.16em] text-foreground">{label}</span>
      <span className="hidden text-xs tracking-wider text-muted-foreground uppercase sm:block">
        {hint}
      </span>
    </button>
  );
}

function SongChip({
  title,
  active,
  onPress,
}: {
  title: string;
  active: boolean;
  onPress: () => void;
}) {
  const press = usePress(onPress);
  return (
    <button
      type="button"
      {...press}
      className={cn(
        "h-11 min-h-11 touch-manipulation rounded-full px-3 text-xs tracking-wide shadow-[var(--shadow-border)] transition-colors duration-150",
        active ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground",
      )}
    >
      {title}
    </button>
  );
}

function PartChip({
  name,
  active,
  queued,
  onPress,
}: {
  name: string;
  active: boolean;
  queued: boolean;
  onPress: () => void;
}) {
  const press = usePress(onPress);
  return (
    <button
      type="button"
      {...press}
      className={cn(
        "h-11 min-h-11 touch-manipulation rounded-full px-3 text-xs tracking-wide shadow-[var(--shadow-border)] transition-colors duration-150",
        active
          ? "bg-primary text-primary-foreground"
          : queued
            ? "bg-accent text-foreground"
            : "bg-secondary text-muted-foreground",
      )}
    >
      {name}
    </button>
  );
}

export function PlayerView({ song, songs }: { song: Song; songs: SongSummary[] }) {
  const navigate = useNavigate();
  const [state, setState] = useState<EngineState>(() => initialState(song));

  useEffect(() => {
    const engine = getEngine();
    engine.load(song);
    try {
      window.localStorage.setItem(LAST_SONG_KEY, song.id);
    } catch {
      // ignore quota
    }
    const unsub = engine.subscribe(setState);
    if (consumeAutoStart() && !engine.getState().playing) engine.start();
    return unsub;
  }, [song]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const tag = target?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || target?.isContentEditable) {
        return;
      }
      if (event.repeat) return;
      const engine = getEngine();
      if (event.code === "Space") {
        event.preventDefault();
        engine.unlock();
        engine.toggle();
        return;
      }
      const key = event.key.toLowerCase();
      if (key === "f") {
        event.preventDefault();
        engine.queueFill();
      } else if (key === "n") {
        event.preventDefault();
        engine.queueNextPart();
      } else if (key === "r") {
        event.preventDefault();
        engine.restart();
      } else if (key === "a") {
        event.preventDefault();
        engine.queueAccent();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const steps = Array.from({ length: 16 }, (_, index) => index);
  const startPress = usePress(() => {
    const engine = getEngine();
    engine.unlock();
    engine.toggle();
  });
  const slowerPress = usePress(() => getEngine().nudgeBpm(-1));
  const fasterPress = usePress(() => getEngine().nudgeBpm(1));
  const resetPress = usePress(() => getEngine().resetBpm());
  const mutePress = usePress(() => getEngine().setMuted(!state.muted));
  const quieterPress = usePress(() => getEngine().nudgeVolume(-0.1));
  const louderPress = usePress(() => getEngine().nudgeVolume(0.1));

  const songIndex = Math.max(
    0,
    songs.findIndex((item) => item.id === song.id),
  );
  const goToSong = (id: string) => {
    if (id === song.id) return;
    playSongNow(id);
    void navigate({ to: "/play/$songId", params: { songId: id } });
  };
  const prevSong = songs[(songIndex - 1 + songs.length) % songs.length];
  const nextSong = songs[(songIndex + 1) % songs.length];
  const prevPress = usePress(() => {
    if (prevSong) goToSong(prevSong.id);
  });
  const nextPress = usePress(() => {
    if (nextSong) goToSong(nextSong.id);
  });

  return (
    <div
      className="mx-auto flex w-full max-w-lg flex-col gap-4 pb-[env(safe-area-inset-bottom)]"
      data-audio={state.audioReady ? "running" : "blocked"}
    >
      <div className="flex flex-col gap-2">
        <span className="text-xs tracking-wider text-muted-foreground uppercase">Song</span>
        <div className="flex items-center gap-2">
          <button
            type="button"
            className="flex size-11 shrink-0 touch-manipulation items-center justify-center rounded-md bg-secondary text-foreground shadow-[var(--shadow-border)] active:scale-[0.98]"
            {...prevPress}
            aria-label="Previous song"
          >
            <ChevronLeft className="size-4" />
          </button>
          <div className="min-w-0 flex-1 text-center">
            <p className="truncate font-display text-lg tracking-wide">{song.title}</p>
            <p className="truncate text-xs text-muted-foreground">
              {songIndex + 1} / {songs.length}
            </p>
          </div>
          <button
            type="button"
            className="flex size-11 shrink-0 touch-manipulation items-center justify-center rounded-md bg-secondary text-foreground shadow-[var(--shadow-border)] active:scale-[0.98]"
            {...nextPress}
            aria-label="Next song"
          >
            <ChevronRight className="size-4" />
          </button>
        </div>
        <div className="flex flex-wrap gap-2">
          {songs.map((item) => (
            <SongChip
              key={item.id}
              title={item.title}
              active={item.id === song.id}
              onPress={() => goToSong(item.id)}
            />
          ))}
        </div>
      </div>

      <section className="rounded-3xl bg-card p-4 shadow-[var(--shadow-border)] sm:p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="font-display text-[11px] tracking-[0.22em] text-muted-foreground">
              GROOVEPEDAL
            </p>
            <h1 className="mt-1 font-display text-2xl tracking-wide sm:text-3xl">{song.title}</h1>
            <p className="mt-1 truncate text-sm text-muted-foreground">{song.artist}</p>
          </div>
          <div className="flex flex-col items-end gap-2">
            <span
              className={cn("size-3 rounded-full", state.playing ? "led-on led-live" : "bg-led-dim")}
              aria-hidden="true"
            />
          </div>
        </div>

        <div className="mt-4 rounded-lg bg-background px-3 py-3">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs tracking-wider text-muted-foreground uppercase">Tempo</span>
            {state.bpm !== state.songBpm ? (
              <button
                type="button"
                className="text-xs tracking-wide text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
                {...resetPress}
              >
                Reset {state.songBpm}
              </button>
            ) : (
              <span className="text-xs text-muted-foreground">Song {state.songBpm}</span>
            )}
          </div>
          <div className="mt-2 flex items-center gap-3">
            <button
              type="button"
              className="flex size-11 shrink-0 touch-manipulation items-center justify-center rounded-md bg-secondary text-foreground shadow-[var(--shadow-border)] active:scale-[0.98]"
              {...slowerPress}
              aria-label="Slow down one BPM"
            >
              <Minus className="size-4" />
            </button>
            <div className="min-w-0 flex-1 text-center">
              <p className="font-display text-3xl tabular-nums tracking-wide">{state.bpm}</p>
              <p className="text-xs tracking-wider text-muted-foreground uppercase">BPM</p>
            </div>
            <button
              type="button"
              className="flex size-11 shrink-0 touch-manipulation items-center justify-center rounded-md bg-secondary text-foreground shadow-[var(--shadow-border)] active:scale-[0.98]"
              {...fasterPress}
              aria-label="Speed up one BPM"
            >
              <Plus className="size-4" />
            </button>
          </div>
        </div>

        <div className="mt-5 rounded-lg bg-background px-3 py-4">
          <div className="flex items-center justify-between gap-3">
            <p className="font-display text-3xl tracking-[0.12em]">{state.partName}</p>
            <p className="text-xs tabular-nums text-muted-foreground">
              Bar {state.bar + 1}/{state.bars}
              {state.inFill ? " · Fill" : ""}
            </p>
          </div>
          <div className="mt-4 flex gap-1">
            {steps.map((step) => {
              const on = state.playing && state.step === step;
              const beat = step % 4 === 0;
              return (
                <span
                  key={step}
                  className={cn(
                    "h-2 flex-1 rounded-full transition-opacity duration-75",
                    on ? "bg-primary opacity-100" : beat ? "bg-led-dim opacity-80" : "bg-led-dim/50",
                  )}
                />
              );
            })}
          </div>
        </div>

        <Button
          type="button"
          size="lg"
          className="mt-4 h-16 w-full touch-manipulation rounded-xl font-display text-xl tracking-[0.2em]"
          {...startPress}
        >
          {state.playing && state.audioReady ? (
            <>
              <Square className="size-5 fill-current" />
              STOP
            </>
          ) : (
            <>
              <Play className="size-5 translate-x-px fill-current" />
              START
            </>
          )}
        </Button>
        {state.playing && !state.audioReady ? (
          <button
            type="button"
            className="mt-3 min-h-16 w-full touch-manipulation rounded-xl bg-primary px-4 py-4 text-center font-display text-lg tracking-[0.14em] text-primary-foreground"
            {...startPress}
          >
            Tap for sound
          </button>
        ) : !state.playing ? (
          <p className="mt-3 text-center text-sm text-muted-foreground">
            Tap Start to hear the drums.
          </p>
        ) : null}

        <div className="mt-4 flex flex-wrap gap-2">
          {song.parts.parts.map((part, index) => {
            const active = index === state.partIndex;
            const queued =
              state.nextPartQueued &&
              index === (state.partIndex + 1) % song.parts.parts.length;
            return (
              <PartChip
                key={part.id}
                name={part.name}
                active={active}
                queued={queued}
                onPress={() => getEngine().goToPart(index)}
              />
            );
          })}
        </div>

        <div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-4">
          <Footswitch
            label="FILL"
            hint="F"
            armed={state.fillQueued || state.inFill}
            onPress={() => getEngine().queueFill()}
          />
          <Footswitch
            label="NEXT"
            hint="N"
            armed={state.nextPartQueued}
            onPress={() => getEngine().queueNextPart()}
          />
          <Footswitch label="RESTART" hint="R" onPress={() => getEngine().restart()} />
          <Footswitch
            label="ACCENT"
            hint="A"
            armed={state.accentQueued}
            onPress={() => getEngine().queueAccent()}
          />
        </div>

        <div className="mt-5 rounded-lg bg-background px-3 py-3">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs tracking-wider text-muted-foreground uppercase">Volume</span>
            <button
              type="button"
              className="text-xs tracking-wide text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
              {...mutePress}
            >
              {state.muted || state.volume === 0 ? "Unmute" : "Mute"}
            </button>
          </div>
          <div className="mt-2 flex items-center gap-3">
            <button
              type="button"
              className="flex size-11 shrink-0 touch-manipulation items-center justify-center rounded-md bg-secondary text-foreground shadow-[var(--shadow-border)] active:scale-[0.98]"
              {...quieterPress}
              aria-label="Volume down"
            >
              <Minus className="size-4" />
            </button>
            <div className="min-w-0 flex-1 text-center">
              <p className="font-display text-3xl tabular-nums tracking-wide">
                {state.muted ? 0 : Math.round(state.volume * 100)}
              </p>
              <p className="text-xs tracking-wider text-muted-foreground uppercase">
                {state.muted ? "Muted" : "Volume"}
              </p>
            </div>
            <button
              type="button"
              className="flex size-11 shrink-0 touch-manipulation items-center justify-center rounded-md bg-secondary text-foreground shadow-[var(--shadow-border)] active:scale-[0.98]"
              {...louderPress}
              aria-label="Volume up"
            >
              <Plus className="size-4" />
            </button>
          </div>
        </div>
      </section>

      <p className="hidden text-center text-xs tracking-wide text-muted-foreground sm:block">
        Space start/stop · F fill · N next part · R restart · A accent
      </p>
      <p className="text-center text-xs text-muted-foreground sm:hidden">
        {feelLabel(song.feel)} groove · tap Start to play
      </p>
      <p className="text-center text-xs text-muted-foreground">
        <Link to="/" className="underline-offset-4 hover:underline">
          Back to songs
        </Link>
      </p>
    </div>
  );
}

export function lastPlayedSongId(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(LAST_SONG_KEY);
  } catch {
    return null;
  }
}
