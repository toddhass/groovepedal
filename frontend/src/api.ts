import { Feel, feelFromGenre } from "./data/grooves";

export interface AppleHit {
  trackId: number;
  trackName: string;
  artistName: string;
  previewUrl?: string;
  primaryGenreName?: string;
}

export async function searchAppleMusic(term: string): Promise<AppleHit[]> {
  const url =
    `https://itunes.apple.com/search?term=${encodeURIComponent(term)}` +
    `&entity=song&limit=20`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Apple search failed (${res.status})`);
  const data = await res.json();
  return (data.results ?? []) as AppleHit[];
}

export function hitToSeed(t: AppleHit): {
  id: string; title: string; artist: string; bpm: number; feel: Feel;
} {
  const title = (t.trackName || "")
    .replace(/\s*\([^)]*(remaster|live|edit|version|remix)[^)]*\)/ig, "")
    .trim() || t.trackName;
  return {
    id: `it-${t.trackId}`,
    title,
    artist: t.artistName || "Unknown",
    bpm: 0,
    feel: feelFromGenre(t.primaryGenreName, 0),
  };
}
