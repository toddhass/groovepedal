export type Feel = "country" | "folk" | "ballad" | "rock" | "pop" | "southern" | "hiphop";

export interface Pattern {
  [voice: string]: string; // 16-char step string, digits 0-3 = velocity tier
}

export interface FeelGrooves {
  s: number; // swing
  i: Pattern; // intro
  v: Pattern; // verse
  c: Pattern; // chorus
  o: Pattern; // outro
}

export const FILLS: Record<Feel, Pattern> = {
  country: { kick: "2000000010000000", snare: "0000100010000000", hat: "2121212100000000", highTom: "0000000022000000", tom: "0000000000220000", floor: "0000000000002211", splash: "0000000000000010", crash: "0000000000000001" },
  folk: { kick: "2000000000000000", snare: "0000000010000000", highTom: "0000000002000000", tom: "0000000000201100", floor: "0000000000002211", crash: "0000000000000001" },
  ballad: { kick: "2000000000000000", snare: "0000000010000000", ride: "2000100000000000", highTom: "0000000002000000", tom: "0000000000200000", floor: "0000000000022200", crash: "0000000000000001" },
  rock: { kick: "2000001000001000", snare: "0000100010000000", hat: "2020202000000000", highTom: "0000002200000000", tom: "0000000022000000", floor: "0000000000221100", china: "0000000000000010", crash: "0000000000000001" },
  pop: { kick: "2000200020000000", snare: "0000100010000000", highTom: "0000000022000000", tom: "0000000000220000", floor: "0000000000001111", splash: "0000000000000010", crash: "0000000000000001" },
  southern: { kick: "2000001000000000", snare: "0000100000100000", hat: "2020202000000000", highTom: "0000000022000000", tom: "0000000000110000", floor: "0000000000002211", china: "0000000000000010", crash: "0000000000000001" },
  hiphop: { kick: "2000000020001000", snare: "0000200000000000", hat: "2020202000000000", clap: "0000000000002200", highTom: "0000000002000000", tom: "0000000000200000", floor: "0000000000021100", crash: "0000000000000001" },
};

export const G: Record<Feel, FeelGrooves> = {
  country: { s: 0.22, i: { kick: "2000000020000000", rim: "0000200000002000", hat: "2121212121212121" }, v: { kick: "2000000020000000", snare: "0000200000002000", hat: "2121212121212121", rim: "0030003000300030" }, c: { kick: "2000001020001000", snare: "0000200000002000", hat: "2121212121212101", openHat: "0000000000000010", splash: "0000000000000010", crash: "2000000000000000" }, o: { kick: "2000000020000000", snare: "0000200000002000", hat: "2020202020202000", openHat: "0000000000000010" } },
  folk: { s: 0.08, i: { kick: "2000000000000000", rim: "0000000020000000", hat: "2000100020001000" }, v: { kick: "2000000020000000", rim: "0000200000002000", hat: "2000100020001000" }, c: { kick: "2000000020000000", snare: "0000200000002000", hat: "2000100020001000", crash: "2000000000000000" }, o: { kick: "2000000000000000", rim: "0000000020000000", ride: "2000200020002000" } },
  ballad: { s: 0, i: { kick: "2000000000000000", ride: "2000200020002000" }, v: { kick: "2000000000000000", snare: "0000000020000000", ride: "2000200020002000" }, c: { kick: "2000000020000000", snare: "0000000020000000", ride: "2020202020202020", crash: "2000000000000000" }, o: { kick: "2000000000000000", snare: "0000000020000000", ride: "2000000020000000" } },
  rock: { s: 0, i: { kick: "2000001000000000", snare: "0000200000002000", hat: "2020202020202020" }, v: { kick: "2000001000000000", snare: "0000200000002000", hat: "2121212121212121" }, c: { kick: "2000101020001010", snare: "0000200000002000", hat: "2020202020202000", openHat: "0000000000000010", splash: "0000000000000010", crash: "2000000000000000" }, o: { kick: "2000001000100010", snare: "0000200000002000", hat: "2020202020202020", highTom: "0000000000300000", floor: "0000000000002000" } },
  pop: { s: 0, i: { kick: "2000200020002000", snare: "0000200000002000", hat: "2020202020202020" }, v: { kick: "2000200020002000", snare: "0000200000002000", hat: "2020202020202000", openHat: "0000000000000010" }, c: { kick: "2010201020102010", snare: "0000200000002000", hat: "2121212121212101", openHat: "0000000000000010", clap: "0000200000002000", splash: "0000000000000010", crash: "2000000000000000" }, o: { kick: "2000200020002000", snare: "0000200000002000", ride: "2020202020202020" } },
  southern: { s: 0.16, i: { kick: "2000001020000000", snare: "0000200300002000", hat: "2020202020202020", crash: "2000000000000000" }, v: { kick: "2000001020000000", snare: "0000200300002003", hat: "2020202020202020" }, c: { kick: "2000101020001010", snare: "0000200000002000", hat: "2020202020202002", openHat: "0000000000000010", china: "0000000000001000", crash: "2000000000000000" }, o: { kick: "2000001020000000", snare: "0000200000002000", hat: "2020202020202000", openHat: "0000000000000010" } },
  hiphop: { s: 0.14, i: { kick: "2000000000002000", hat: "2000200020002000" }, v: { kick: "2000000020001000", snare: "0000200000002000", hat: "2020202020202020" }, c: { kick: "2000200020002010", snare: "0000200000002000", hat: "2120212021202101", openHat: "0000000000000010", clap: "0000200000002000", splash: "0000000000000010", crash: "2000000000000000" }, o: { kick: "2000000000002000", snare: "0000200000002000", hat: "2000200020002000" } },
};

export const LABELS: Record<Feel, string> = {
  country: "Country train", folk: "Folk two-step", ballad: "Half-time ballad",
  rock: "Rock", pop: "Four-on-the-floor", southern: "Southern shuffle", hiphop: "Hip hop boom-bap",
};

export const STYLES: { id: Feel; label: string }[] = [
  { id: "country", label: "Country" }, { id: "rock", label: "Rock" }, { id: "hiphop", label: "Hip hop" },
  { id: "pop", label: "Pop" }, { id: "folk", label: "Folk" }, { id: "ballad", label: "Ballad" }, { id: "southern", label: "Southern" },
];

export const DEF: Record<Feel, number> = { country: 132, folk: 108, ballad: 72, rock: 116, pop: 120, southern: 100, hiphop: 90 };

// Bassline/root-note "accent" layer: br = rhythm string, bn = note freqs per step,
// tr/tn = a secondary treble accent layer.
export const AC: Record<Feel, { br: string; bn: number[]; tr: string; tn: number[] }> = {
  country: { br: "2000200020002000", bn: [49, 0, 0, 0, 73.42, 0, 0, 0, 49, 0, 0, 0, 73.42, 0, 65.41, 0], tr: "0000200000002000", tn: [0, 0, 0, 0, 493.88, 0, 0, 0, 0, 0, 0, 0, 392, 0, 0, 0] },
  folk: { br: "2000000020000000", bn: [73.42, 0, 0, 0, 0, 0, 0, 0, 55, 0, 0, 0, 0, 0, 0, 0], tr: "0000000020000000", tn: [0, 0, 0, 0, 0, 0, 0, 0, 440, 0, 0, 0, 0, 0, 0, 0] },
  ballad: { br: "2000000000002000", bn: [55, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 41.2, 0, 0, 0], tr: "0000000020000000", tn: [0, 0, 0, 0, 0, 0, 0, 0, 329.63, 0, 0, 0, 0, 0, 0, 0] },
  rock: { br: "2000000020001000", bn: [82.41, 0, 0, 0, 0, 0, 0, 0, 82.41, 0, 0, 0, 110, 0, 0, 0], tr: "0000200000002000", tn: [0, 0, 0, 0, 493.88, 0, 0, 0, 0, 0, 0, 0, 329.63, 0, 0, 0] },
  pop: { br: "2000200020002000", bn: [65.41, 0, 0, 0, 98, 0, 0, 0, 110, 0, 0, 0, 98, 0, 0, 0], tr: "0000200000002010", tn: [0, 0, 0, 0, 329.63, 0, 0, 0, 0, 0, 0, 0, 392, 0, 440, 0] },
  southern: { br: "2000001020000010", bn: [73.42, 0, 0, 0, 0, 0, 55, 0, 73.42, 0, 0, 0, 0, 0, 49, 0], tr: "0000200300002000", tn: [0, 0, 0, 0, 587.33, 0, 493.88, 0, 0, 0, 0, 0, 440, 0, 0, 0] },
  hiphop: { br: "2000000020001000", bn: [41.2, 0, 0, 0, 0, 0, 0, 0, 49, 0, 0, 0, 55, 0, 0, 0], tr: "0000200000002000", tn: [0, 0, 0, 0, 392, 0, 0, 0, 0, 0, 0, 0, 293.66, 0, 0, 0] },
};

export const CB: Record<Feel, [string, string]> = {
  country: ["2000000020000000", "2000200020002000"],
  folk: ["2000000000000000", "2000000020000000"],
  ballad: ["2000000000000000", "2000000020000000"],
  rock: ["2000200020002000", "2010201020102010"],
  pop: ["2000200020002000", "2010201020102010"],
  southern: ["2000001020000010", "2000201020002010"],
  hiphop: ["0000200000002000", "2000200000002010"],
};

export function cowbellRhythm(feel: Feel, partId: string): string {
  const pair = CB[feel] || CB.rock;
  return partId === "chorus" ? pair[1] : pair[0];
}

export function feelFromGenre(genre: string | undefined, bpm: number | undefined): Feel {
  const g = (genre || "").toLowerCase();
  if (/hip.?hop|rap|trap/.test(g)) return "hiphop";
  if (/country|americana|bluegrass/.test(g)) return "country";
  if (/folk|acoustic|singer/.test(g)) return "folk";
  if (/southern/.test(g)) return "southern";
  if (/ballad|blues|soul|jazz/.test(g)) return "ballad";
  if (/metal|punk|grunge|alternative|indie/.test(g)) return "rock";
  if (/rock/.test(g)) return bpm && bpm < 90 ? "ballad" : "rock";
  if (/pop|dance|disco|r&b|funk/.test(g)) return "pop";
  if (bpm && bpm < 80) return "ballad";
  if (bpm && bpm >= 84 && bpm <= 98) return "hiphop";
  return "rock";
}

export interface SongPart {
  id: string;
  name: string;
  bars: number;
  swing: number;
  groove: Partial<Pattern>;
  fill: Partial<Pattern>;
}

export function partsFor(feel: Feel): SongPart[] {
  const f = G[feel] || G.rock;
  const fl = FILLS[feel] || FILLS.rock;
  return [
    { id: "intro", name: "Intro", bars: 2, swing: f.s, groove: f.i, fill: fl },
    { id: "verse", name: "Verse", bars: 2, swing: f.s, groove: f.v, fill: fl },
    { id: "chorus", name: "Chorus", bars: 2, swing: f.s * 0.85, groove: f.c, fill: fl },
    { id: "outro", name: "Outro", bars: 2, swing: f.s, groove: f.o, fill: fl },
  ];
}

function vel(d: string): number {
  return d === "2" ? 1 : d === "1" ? 0.72 : d === "3" ? 0.3 : 0;
}
export function hit(track: string | undefined, step: number): number {
  if (!track) return 0;
  return vel(track[step % track.length] || "0");
}
