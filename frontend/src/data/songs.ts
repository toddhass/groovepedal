import { DEF, Feel, FILLS, partsFor, SongPart } from "./grooves";

export interface SongSeed {
  id: string;
  title: string;
  artist: string;
  bpm: number;
  feel: Feel;
}

export const SEEDS: SongSeed[] = [
  { id: "wagon-wheel", title: "Wagon Wheel", artist: "Old Crow Medicine Show", bpm: 146, feel: "country" },
  { id: "leaving-on-a-jet-plane", title: "Leaving on a Jet Plane", artist: "John Denver", bpm: 121, feel: "folk" },
  { id: "wild-horses", title: "Wild Horses", artist: "The Rolling Stones", bpm: 76, feel: "ballad" },
  { id: "wonderwall", title: "Wonderwall", artist: "Oasis", bpm: 87, feel: "rock" },
  { id: "brown-eyed-girl", title: "Brown Eyed Girl", artist: "Van Morrison", bpm: 129, feel: "pop" },
  { id: "country-roads", title: "Take Me Home Country Roads", artist: "John Denver", bpm: 82, feel: "folk" },
  { id: "sweet-home-alabama", title: "Sweet Home Alabama", artist: "Lynyrd Skynyrd", bpm: 98, feel: "southern" },
];

export interface Song {
  id: string;
  title: string;
  artist: string;
  bpm: number;
  feel: Feel;
  parts: SongPart[];
}

// A couple of songs have hand-tuned parts that don't fit their feel's stock
// groove (e.g. lighter folk fingerpicking patterns). These are the exceptions
// from the original makeSong(); everything else falls back to partsFor(feel).
const OVERRIDES: Record<string, (bpm: number) => SongPart[]> = {
  "leaving-on-a-jet-plane": () => {
    const fl = FILLS.folk;
    return [
      { id: "intro", name: "Intro", bars: 2, swing: 0.04, groove: { kick: "2000000000000000", hat: "2000100020001000" }, fill: fl },
      { id: "verse", name: "Verse", bars: 2, swing: 0.05, groove: { kick: "2000000000000000", rim: "0000000020000000", hat: "2000100020001000" }, fill: fl },
      { id: "chorus", name: "Chorus", bars: 2, swing: 0.05, groove: { kick: "2000000020000000", snare: "0000000020000000", hat: "2000100020001000", crash: "2000000000000000" }, fill: fl },
      { id: "outro", name: "Outro", bars: 2, swing: 0.05, groove: { kick: "2000000000000000", ride: "2000200020002000" }, fill: fl },
    ];
  },
  "country-roads": () => {
    const fl2 = FILLS.folk;
    return [
      { id: "intro", name: "Intro", bars: 2, swing: 0.1, groove: { kick: "2000000020000000", rim: "0000200000002000", hat: "2000100020001000" }, fill: fl2 },
      { id: "verse", name: "Verse", bars: 2, swing: 0.1, groove: { kick: "2000000020000000", rim: "0000200000002000", hat: "2000100020001000" }, fill: fl2 },
      { id: "chorus", name: "Chorus", bars: 2, swing: 0.08, groove: { kick: "2000100020001000", snare: "0000200000002000", hat: "2000100020001000", crash: "2000000000000000" }, fill: fl2 },
      { id: "outro", name: "Outro", bars: 2, swing: 0.1, groove: { kick: "2000000020000000", rim: "0000200000002000", ride: "2000200020002000" }, fill: fl2 },
    ];
  },
};

export function makeSong(seed: SongSeed | { id: string; title: string; artist: string; bpm?: number; feel?: Feel }): Song {
  const feel = seed.feel || "rock";
  let bpm = seed.bpm || DEF[feel];
  if (feel !== "country" && feel !== "pop" && feel !== "hiphop" && bpm > 132) bpm /= 2;
  if (bpm > 185) bpm /= 2;
  bpm = Math.round(Math.min(240, Math.max(40, bpm)));

  const parts = OVERRIDES[seed.id] ? OVERRIDES[seed.id](bpm) : partsFor(feel);

  return { id: seed.id, title: seed.title, artist: seed.artist, bpm, feel, parts };
}

export interface Instrument {
  id: string;
  label: string;
  layer: "bass" | "lead";
  oct: number;
  group: string;
}

export const INST: Instrument[] = [
  { id: "bass", label: "Bass", layer: "bass", oct: 1, group: "Rhythm section" },
  { id: "guitar", label: "Guitar", layer: "bass", oct: 2, group: "Rhythm section" },
  { id: "piano", label: "Piano", layer: "bass", oct: 4, group: "Rhythm section" },
  { id: "organ", label: "Organ", layer: "bass", oct: 2, group: "Rhythm section" },
  { id: "trumpet", label: "Trumpet", layer: "lead", oct: 1, group: "Horns" },
  { id: "sax", label: "Sax", layer: "lead", oct: 0.5, group: "Horns" },
  { id: "trombone", label: "Trombone", layer: "lead", oct: 0.5, group: "Horns" },
  { id: "horn", label: "Horn", layer: "lead", oct: 0.5, group: "Horns" },
  { id: "flute", label: "Flute", layer: "lead", oct: 2, group: "Woodwinds" },
  { id: "clarinet", label: "Clarinet", layer: "lead", oct: 1, group: "Woodwinds" },
  { id: "oboe", label: "Oboe", layer: "lead", oct: 1, group: "Woodwinds" },
  { id: "violin", label: "Violin", layer: "lead", oct: 1, group: "Strings & orchestra" },
  { id: "cello", label: "Cello", layer: "bass", oct: 1, group: "Strings & orchestra" },
  { id: "timpani", label: "Timpani", layer: "bass", oct: 0.5, group: "Strings & orchestra" },
];
export const INST_MAP: Record<string, Instrument> = Object.fromEntries(INST.map((i) => [i.id, i]));

export interface Ensemble {
  id: string;
  label: string;
  group: string;
  ids: string[];
}

export const ENSEMBLES: Ensemble[] = [
  { id: "rock", label: "Rock band", group: "Rock & pop", ids: ["bass", "guitar", "organ"] },
  { id: "pop", label: "Pop band", group: "Rock & pop", ids: ["bass", "guitar", "piano"] },
  { id: "punk", label: "Punk trio", group: "Rock & pop", ids: ["bass", "guitar"] },
  { id: "metal", label: "Metal", group: "Rock & pop", ids: ["bass", "guitar", "organ"] },
  { id: "funk", label: "Funk", group: "Rock & pop", ids: ["bass", "guitar", "organ", "sax", "trumpet"] },
  { id: "jazz", label: "Jazz combo", group: "Jazz & blues", ids: ["bass", "piano", "sax", "trumpet"] },
  { id: "bigband", label: "Big band", group: "Jazz & blues", ids: ["bass", "piano", "trumpet", "sax", "trombone"] },
  { id: "dixieland", label: "Dixieland", group: "Jazz & blues", ids: ["bass", "piano", "trumpet", "trombone", "clarinet"] },
  { id: "blues", label: "Blues band", group: "Jazz & blues", ids: ["bass", "guitar", "piano", "organ"] },
  { id: "soul", label: "Soul", group: "Jazz & blues", ids: ["bass", "piano", "organ", "trumpet", "sax"] },
  { id: "country", label: "Country band", group: "Roots", ids: ["bass", "guitar", "piano", "violin"] },
  { id: "folk", label: "Folk band", group: "Roots", ids: ["bass", "guitar", "flute"] },
  { id: "gospel", label: "Gospel", group: "Roots", ids: ["bass", "piano", "organ"] },
  { id: "reggae", label: "Reggae / ska", group: "Roots", ids: ["bass", "guitar", "organ", "sax", "trombone"] },
  { id: "marching", label: "Marching band", group: "Wind & orchestra", ids: ["trumpet", "trombone", "horn", "flute", "clarinet"] },
  { id: "concert", label: "Concert band", group: "Wind & orchestra", ids: ["flute", "clarinet", "oboe", "sax", "trumpet", "trombone", "horn"] },
  { id: "brass", label: "Brass band", group: "Wind & orchestra", ids: ["bass", "trumpet", "trombone", "horn"] },
  { id: "symphony", label: "Symphony", group: "Wind & orchestra", ids: ["violin", "cello", "flute", "horn", "timpani"] },
  { id: "chamber", label: "Chamber strings", group: "Wind & orchestra", ids: ["violin", "cello"] },
  { id: "baroque", label: "Baroque ensemble", group: "Wind & orchestra", ids: ["violin", "cello", "flute", "oboe", "piano"] },
];
