import { useEffect, useState } from "react";
import { InstrumentToggle, PedalButton } from "@/components/studio/controls";
import { searchAppleSongs, type AppleHit } from "@/lib/audio/itunes";
import { engine, useGroove } from "@/lib/audio/store";
import { cn } from "@/lib/utils";

export function PracticeTrackPanel({ title, artist }: { title: string; artist: string }) {
  const trackName = useGroove((s) => s.trackName);
  const trackAi = useGroove((s) => s.trackAi);
  const trackAiMessage = useGroove((s) => s.trackAiMessage);
  const countInOn = useGroove((s) => s.countInOn);
  const liveLockOn = useGroove((s) => s.liveLockOn);
  const liveLock = useGroove((s) => s.liveLock);
  const trackVocalsOn = useGroove((s) => s.trackVocalsOn);
  const trackGuitarOn = useGroove((s) => s.trackGuitarOn);

  return (
    <section className="flex h-full min-h-0 min-w-0 flex-col gap-3 overflow-y-auto overflow-x-hidden rounded-2xl bg-card p-3 shadow-[var(--shadow-border)] sm:p-4">
      <p className="text-xs font-medium tracking-wide text-muted-foreground">Practice track</p>
      <p className="text-sm leading-relaxed text-muted-foreground">
        Load an mp3 or m4a, or tap a 30-second Apple preview. Then hit Start.
      </p>
      <ApplePreviewPicker query={`${title} ${artist}`} />
      <div className="grid grid-cols-2 gap-2">
        <label className="flex min-h-11 cursor-pointer items-center justify-center rounded-lg bg-secondary text-sm font-medium touch-manipulation active:scale-[0.98]">
          Load file
          <input
            type="file"
            accept="audio/*,video/webm,video/mp4,.mp3,.m4a,.wav,.aac,.ogg,.webm,.mp4,.mkv"
            className="sr-only"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) engine().loadPracticeFile(file);
              event.target.value = "";
            }}
          />
        </label>
        <button
          type="button"
          className="min-h-11 rounded-lg bg-secondary text-sm font-medium touch-manipulation active:scale-[0.98]"
          onClick={() => {
            window.open(
              `https://www.youtube.com/results?search_query=${encodeURIComponent(`${title} ${artist} instrumental`)}`,
              "_blank",
              "noopener,noreferrer",
            );
          }}
        >
          Find instrumental
        </button>
      </div>
      <p className="truncate text-sm text-foreground">{trackName ?? "No file loaded"}</p>
      {trackName ? (
        <p className="text-xs leading-relaxed text-muted-foreground">
          {trackAi === "error" ? trackAiMessage : trackAiMessage || "Hit Start to play. Guitar off uses a quick mute."}
        </p>
      ) : null}
      <div className="grid grid-cols-2 gap-2">
        <InstrumentToggle label="Count-in" on={countInOn} onToggle={() => engine().setCountIn(!countInOn)} />
        <InstrumentToggle
          label={liveLock === "locked" ? "AI lock · live" : liveLock === "listening" ? "AI lock · listen" : "AI lock"}
          on={Boolean(trackName) && liveLockOn}
          disabled={!trackName}
          onToggle={() => {
            if (!trackName) return;
            engine().setLiveLock(!liveLockOn);
          }}
        />
        <InstrumentToggle
          label="Vocals"
          on={Boolean(trackName) && trackVocalsOn}
          disabled={!trackName}
          onToggle={() => {
            if (!trackName) return;
            engine().setTrackVocals(!trackVocalsOn);
          }}
        />
        <InstrumentToggle
          label="Guitar"
          on={Boolean(trackName) && trackGuitarOn}
          disabled={!trackName}
          onToggle={() => {
            if (!trackName) return;
            engine().setTrackGuitar(!trackGuitarOn);
          }}
        />
      </div>
      {trackName ? (
        <div className="grid grid-cols-2 gap-2">
          <PedalButton label="Song early" tone="restart" onPress={() => engine().nudgeTrack(1)} />
          <PedalButton label="Song late" tone="next" onPress={() => engine().nudgeTrack(-1)} />
        </div>
      ) : null}
    </section>
  );
}

function ApplePreviewPicker({ query }: { query: string }) {
  const [hits, setHits] = useState<AppleHit[]>([]);
  const [status, setStatus] = useState<"idle" | "loading" | "ready" | "error">("idle");
  const [picking, setPicking] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    setStatus("loading");
    setHits([]);
    void searchAppleSongs(query)
      .then((next) => {
        if (cancelled) return;
        setHits(next);
        setStatus("ready");
      })
      .catch(() => {
        if (cancelled) return;
        setHits([]);
        setStatus("error");
      });
    return () => {
      cancelled = true;
    };
  }, [query]);

  if (status === "loading") return <p className="text-xs text-muted-foreground">Searching Apple catalog…</p>;
  if (status === "error") return <p className="text-xs text-muted-foreground">Apple catalog unavailable — load a purchased file instead.</p>;
  if (!hits.length) return <p className="text-xs text-muted-foreground">No Apple preview for this title — load a purchased m4a.</p>;

  return (
    <div className="max-h-40 space-y-0.5 overflow-y-auto rounded-lg bg-background p-1 shadow-[var(--shadow-border)]">
      {hits.map((hit) => (
        <button
          key={hit.trackId}
          type="button"
          className={cn(
            "flex min-h-11 w-full flex-col justify-center rounded-md px-3 py-2 text-left touch-manipulation active:scale-[0.99]",
            picking === hit.trackId ? "bg-primary/10" : "",
          )}
          onClick={() => {
            setPicking(hit.trackId);
            void engine()
              .loadApplePreview(hit.previewUrl, `${hit.trackName} (Apple 30s)`)
              .catch(() => setPicking(null));
          }}
        >
          <span className="truncate text-sm font-medium text-foreground">{hit.trackName}</span>
          <span className="truncate text-xs text-muted-foreground">{hit.artistName} · 30s</span>
        </button>
      ))}
    </div>
  );
}
