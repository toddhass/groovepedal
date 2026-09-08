import { useEffect, useState } from "react";
import { SongRow } from "@/components/studio/controls";
import { localHits, searchCatalog, type SongHit } from "@/lib/songs/client-search";

export function SongLibrary({
  selectedId,
  onPick,
}: {
  selectedId: string;
  onPick: (id: string, hit: SongHit) => void;
}) {
  const [query, setQuery] = useState("");
  const [hits, setHits] = useState<SongHit[]>(() => localHits(""));
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) {
      setHits(localHits(""));
      setSearching(false);
      return;
    }
    const timer = window.setTimeout(() => {
      setSearching(true);
      void searchCatalog(q)
        .then(setHits)
        .finally(() => setSearching(false));
    }, 280);
    return () => window.clearTimeout(timer);
  }, [query]);

  return (
    <section className="flex h-full min-h-0 min-w-0 flex-col overflow-hidden rounded-2xl bg-card p-3 shadow-[var(--shadow-border)] sm:p-4">
      <p className="mb-3 text-xs font-medium tracking-wide text-muted-foreground">Library</p>
      <input
        type="search"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder="Search a song"
        aria-label="Search songs"
        className="h-11 w-full shrink-0 rounded-lg bg-background px-3 text-sm text-foreground shadow-[var(--shadow-border)] placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:outline-none sm:h-12"
      />
      <ul className="mt-2 min-h-0 flex-1 overflow-y-auto overscroll-contain">
        {searching && hits.length === 0 ? (
          <li className="px-3 py-8 text-center text-sm text-muted-foreground">Searching…</li>
        ) : hits.length === 0 ? (
          <li className="px-3 py-8 text-center text-sm text-muted-foreground">No match. Try a title or artist.</li>
        ) : (
          hits.map((item) => (
            <li key={item.id}>
              <SongRow
                title={item.title}
                artist={item.artist}
                bpm={item.bpm}
                active={item.id === selectedId}
                onPick={() => onPick(item.id, item)}
              />
            </li>
          ))
        )}
      </ul>
    </section>
  );
}
