import { Play, Square } from "lucide-react";
import { PedalButton, StepGrid } from "@/components/studio/controls";
import { engine, useGroove } from "@/lib/audio/store";
import { usePress } from "@/lib/press";
import { feelLabel } from "@/lib/songs/families";
import { cn } from "@/lib/utils";

export function Transport({ title, artist }: { title: string; artist: string }) {
  const playing = useGroove((s) => s.playing);
  const audioReady = useGroove((s) => s.audioReady);
  const inFill = useGroove((s) => s.inFill);
  const step = useGroove((s) => s.step);
  const partName = useGroove((s) => s.partName);
  const bpm = useGroove((s) => s.bpm);
  const feel = useGroove((s) => s.feel);
  const fillQueued = useGroove((s) => s.fillQueued);
  const nextPartQueued = useGroove((s) => s.nextPartQueued);
  const accentQueued = useGroove((s) => s.accentQueued);

  const startPress = usePress(() => engine().toggle());

  return (
    <section className="flex min-w-0 flex-col gap-3">
      <div className="rounded-2xl bg-card p-4 shadow-[var(--shadow-border)] sm:p-5">
        <p className="text-xs font-medium tracking-wide text-muted-foreground">Now playing</p>
        <h1 className="mt-2 truncate text-xl font-semibold tracking-tight text-foreground sm:text-2xl">{title}</h1>
        <p className="mt-1 truncate text-sm text-muted-foreground">{artist}</p>
        <dl className="mt-4 grid grid-cols-3 gap-3 text-center">
          <div>
            <dt className="text-xs text-muted-foreground">Groove</dt>
            <dd className="mt-0.5 truncate text-sm font-medium">{feelLabel(feel)}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Part</dt>
            <dd className="mt-0.5 truncate text-sm font-medium">{partName}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Tempo</dt>
            <dd className="mt-0.5 text-sm font-medium tabular-nums">{bpm}</dd>
          </div>
        </dl>
        <div className="mt-5">
          <StepGrid step={step} playing={playing && audioReady} inFill={inFill} />
        </div>
      </div>

      <button
        type="button"
        {...startPress}
        className={cn(
          "flex min-h-14 w-full items-center justify-center gap-2 rounded-xl text-base font-semibold tracking-wide touch-manipulation transition-transform duration-150 active:scale-[0.99] sm:min-h-16 sm:text-lg",
          playing ? "bg-secondary text-foreground shadow-[var(--shadow-border)]" : "bg-primary text-primary-foreground",
        )}
      >
        {playing && audioReady ? (
          <>
            <Square className="size-4 fill-current" />
            Stop
          </>
        ) : playing ? (
          "Tap for sound"
        ) : (
          <>
            <Play className="size-4 translate-x-px fill-current" />
            Start
          </>
        )}
      </button>

      <div className="grid grid-cols-2 gap-2 sm:gap-3">
        <PedalButton label="Fill" tone="fill" armed={fillQueued || inFill} onPress={() => engine().queueFill()} />
        <PedalButton label="Next part" tone="next" armed={nextPartQueued} onPress={() => engine().queueNextPart()} />
        <PedalButton label="Restart" tone="restart" onPress={() => engine().restart()} />
        <PedalButton label="Crash" tone="accent" armed={accentQueued} onPress={() => engine().queueAccent()} />
      </div>
    </section>
  );
}
