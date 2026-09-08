import { LevelRange, StyleChip } from "@/components/studio/controls";
import { MAX_BPM, MIN_BPM } from "@/lib/audio/engine";
import { engine, useGroove } from "@/lib/audio/store";
import { STYLE_OPTIONS } from "@/lib/songs/families";

export function GrooveControls() {
  const feel = useGroove((s) => s.feel);
  const bpm = useGroove((s) => s.bpm);
  const volume = useGroove((s) => s.volume);
  const muted = useGroove((s) => s.muted);
  const volumePct = muted ? 0 : Math.round(volume * 100);

  return (
    <div className="rounded-2xl bg-card p-4 shadow-[var(--shadow-border)] sm:p-5">
      <p className="mb-3 text-xs font-medium tracking-wide text-muted-foreground">Groove</p>
      <div className="flex flex-wrap gap-2">
        {STYLE_OPTIONS.map((style) => (
          <StyleChip
            key={style.id}
            label={style.label}
            active={feel === style.id}
            onPick={() => engine().setFeel(style.id)}
          />
        ))}
      </div>
      <label className="mt-5 flex items-center gap-3">
        <span className="w-14 shrink-0 text-xs text-muted-foreground">Tempo</span>
        <LevelRange value={bpm} min={MIN_BPM} max={MAX_BPM} step={1} label="Tempo" onValue={(value) => engine().setBpm(value)} />
        <span className="w-8 shrink-0 text-right text-sm tabular-nums">{bpm}</span>
      </label>
      <label className="mt-2 flex items-center gap-3">
        <span className="w-14 shrink-0 text-xs text-muted-foreground">Volume</span>
        <LevelRange
          value={volumePct}
          min={0}
          max={100}
          step={1}
          label="Volume"
          onValue={(value) => {
            if (value <= 0) engine().setMuted(true);
            else {
              engine().setMuted(false);
              engine().setVolume(value / 100);
            }
          }}
        />
        <span className="w-8 shrink-0 text-right text-sm tabular-nums">{volumePct}</span>
      </label>
    </div>
  );
}
