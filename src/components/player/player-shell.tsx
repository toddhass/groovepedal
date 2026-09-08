import { useEffect, useState } from "react";
import { Logo } from "@/components/logo";
import { BandPanel } from "@/components/player/band-panel";
import { GrooveControls } from "@/components/player/groove-controls";
import { PracticeTrackPanel } from "@/components/player/practice-track-panel";
import { SongLibrary } from "@/components/player/song-library";
import { Transport } from "@/components/player/transport";
import { PanelTabs } from "@/components/studio/controls";
import { engine, bindGrooveStore, useGroove } from "@/lib/audio/store";
import { SEED_SONGS } from "@/lib/songs/catalog";
import { buildGrooveSong, isFeel } from "@/lib/songs/families";
import type { SongHit } from "@/lib/songs/client-search";
import type { Song } from "@/lib/songs/types";
import { cn } from "@/lib/utils";

const LAST_SONG_KEY = "groovepedal:lastSong";

export function PlayerShell({ initialId }: { initialId?: string }) {
  const [library, setLibrary] = useState<Song[]>(SEED_SONGS);
  const [selectedId, setSelectedId] = useState(() => initialId || SEED_SONGS[0]?.id || "wagon-wheel");
  const [panel, setPanel] = useState<"songs" | "track" | "band">("songs");
  const playing = useGroove((s) => s.playing);
  const audioReady = useGroove((s) => s.audioReady);
  const inFill = useGroove((s) => s.inFill);

  const song = library.find((item) => item.id === selectedId) ?? SEED_SONGS[0]!;

  useEffect(() => bindGrooveStore(), []);

  useEffect(() => {
    if (typeof window === "undefined" || initialId) return;
    try {
      const last = window.localStorage.getItem(LAST_SONG_KEY);
      if (last) setSelectedId(last);
    } catch {
      // ignore
    }
  }, [initialId]);

  useEffect(() => {
    try {
      engine().load(song);
    } catch {
      // Preview iframes can reject audio setup; the UI still has to paint.
    }
    try {
      window.localStorage.setItem(LAST_SONG_KEY, song.id);
    } catch {
      // ignore
    }
  }, [song]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const tag = target?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || target?.isContentEditable) return;
      if (event.repeat) return;
      if (event.code === "Space") {
        event.preventDefault();
        engine().unlock();
        engine().toggle();
        return;
      }
      const key = event.key.toLowerCase();
      if (key === "f") engine().queueFill();
      else if (key === "n") engine().queueNextPart();
      else if (key === "r") engine().restart();
      else if (key === "a") engine().queueAccent();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const pickSong = (id: string, hit?: SongHit) => {
    if (id === selectedId) return;
    try {
      engine().stop();
    } catch {
      // ignore
    }
    if (hit && hit.source === "catalog" && !library.some((item) => item.id === id)) {
      const feel = isFeel(hit.feel) ? hit.feel : "rock";
      setLibrary((prev) => [
        ...prev,
        buildGrooveSong({ id: hit.id, title: hit.title, artist: hit.artist, bpm: hit.bpm || 120, feel }),
      ]);
    }
    setSelectedId(id);
  };

  const status = !playing ? "Ready" : !audioReady ? "Tap for sound" : inFill ? "Fill" : "Playing";

  return (
    <div
      className="mx-auto flex min-h-dvh w-full min-w-0 max-w-7xl flex-col gap-4 px-3 py-4 sm:gap-5 sm:px-6 sm:py-6 lg:px-8 lg:py-8 pb-[max(1rem,env(safe-area-inset-bottom))]"
      style={{ backgroundColor: "#11100e", color: "#f7f4ee" }}
    >
      <header className="flex shrink-0 items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2.5">
          <Logo className="size-7 text-foreground" />
          <div className="min-w-0">
            <p className="text-sm font-semibold tracking-tight text-foreground">GroovePedal</p>
            <p className="truncate text-xs text-muted-foreground">Play along. Stay in the pocket.</p>
          </div>
        </div>
        <span
          className={cn(
            "shrink-0 rounded-full px-3 py-1 text-xs font-medium tabular-nums",
            playing && audioReady ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground",
          )}
        >
          {status}
        </span>
      </header>

      <div className="grid min-h-0 min-w-0 flex-1 grid-cols-1 gap-4 lg:grid-cols-[minmax(16rem,0.95fr)_minmax(20rem,1.2fr)_minmax(16rem,0.95fr)] lg:items-stretch">
        <div className="flex min-w-0 flex-col gap-3 lg:col-start-2 lg:row-start-1 lg:sticky lg:top-6 lg:self-start">
          <Transport title={song.title} artist={song.artist} />
          <GrooveControls />
        </div>
        <div className={cn("min-h-0 h-full lg:col-start-1 lg:row-start-1 lg:flex lg:min-h-96 lg:flex-col", panel === "songs" ? "flex" : "hidden lg:flex")}>
          <SongLibrary selectedId={selectedId} onPick={pickSong} />
        </div>
        <div className={cn("min-h-0 h-full lg:col-start-3 lg:row-start-1 lg:flex lg:min-h-96 lg:flex-col", panel === "track" || panel === "band" ? "flex" : "hidden lg:flex")}>
          <div className="hidden lg:mb-3 lg:block">
            <PanelTabs
              value={panel === "band" ? "band" : "track"}
              onChange={(id) => setPanel(id as "track" | "band")}
              items={[
                { id: "track", label: "Track" },
                { id: "band", label: "Band" },
              ]}
            />
          </div>
          {panel === "band" ? <BandPanel /> : <PracticeTrackPanel title={song.title} artist={song.artist} />}
        </div>
      </div>

      <p className="order-4 shrink-0 text-center text-xs text-muted-foreground">
        Software drum machine. Not affiliated with any hardware pedal. Space starts. F fill, N next, R restart.
      </p>
      <div className="sticky bottom-0 z-10 order-5 shrink-0 -mx-3 bg-background/90 px-3 pt-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] backdrop-blur-sm lg:hidden">
        <PanelTabs
          value={panel}
          onChange={(id) => setPanel(id as "songs" | "track" | "band")}
          items={[
            { id: "songs", label: "Songs" },
            { id: "track", label: "Track" },
            { id: "band", label: "Band" },
          ]}
        />
      </div>
    </div>
  );
}
