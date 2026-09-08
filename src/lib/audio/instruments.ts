export const INSTRUMENT_IDS = [
  "bass",
  "guitar",
  "piano",
  "organ",
  "trumpet",
  "sax",
  "trombone",
  "horn",
  "flute",
  "clarinet",
  "oboe",
  "violin",
  "cello",
  "timpani",
] as const;

export type InstrumentId = (typeof INSTRUMENT_IDS)[number];

export type InstrumentLayer = "bass" | "lead";

export type InstrumentDef = {
  id: InstrumentId;
  label: string;
  layer: InstrumentLayer;
  octave: number;
};

export const INSTRUMENTS: InstrumentDef[] = [
  { id: "bass", label: "Bass", layer: "bass", octave: 1 },
  { id: "guitar", label: "Guitar", layer: "bass", octave: 2 },
  { id: "piano", label: "Piano", layer: "bass", octave: 4 },
  { id: "organ", label: "Organ", layer: "bass", octave: 2 },
  { id: "trumpet", label: "Trumpet", layer: "lead", octave: 1 },
  { id: "sax", label: "Sax", layer: "lead", octave: 0.5 },
  { id: "trombone", label: "Trombone", layer: "lead", octave: 0.5 },
  { id: "horn", label: "Horn", layer: "lead", octave: 0.5 },
  { id: "flute", label: "Flute", layer: "lead", octave: 2 },
  { id: "clarinet", label: "Clarinet", layer: "lead", octave: 1 },
  { id: "oboe", label: "Oboe", layer: "lead", octave: 1 },
  { id: "violin", label: "Violin", layer: "lead", octave: 1 },
  { id: "cello", label: "Cello", layer: "bass", octave: 1 },
  { id: "timpani", label: "Timpani", layer: "bass", octave: 0.5 },
];

export const INSTRUMENT_BY_ID: Record<InstrumentId, InstrumentDef> = Object.fromEntries(
  INSTRUMENTS.map((item) => [item.id, item]),
) as Record<InstrumentId, InstrumentDef>;

export const INSTRUMENT_GROUPS: { id: string; label: string; ids: InstrumentId[] }[] = [
  { id: "rhythm", label: "Rhythm section", ids: ["bass", "guitar", "piano", "organ"] },
  { id: "horns", label: "Horns", ids: ["trumpet", "sax", "trombone", "horn"] },
  { id: "winds", label: "Woodwinds", ids: ["flute", "clarinet", "oboe"] },
  { id: "orchestra", label: "Strings & orchestra", ids: ["violin", "cello", "timpani"] },
];

export type Ensemble = {
  id: string;
  label: string;
  group: string;
  ids: InstrumentId[];
};

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

export type EnsembleId = (typeof ENSEMBLES)[number]["id"];

export const ENSEMBLE_GROUPS: { label: string; ensembles: Ensemble[] }[] = (() => {
  const groups: { label: string; ensembles: Ensemble[] }[] = [];
  for (const ensemble of ENSEMBLES) {
    const existing = groups.find((group) => group.label === ensemble.group);
    if (existing) existing.ensembles.push(ensemble);
    else groups.push({ label: ensemble.group, ensembles: [ensemble] });
  }
  return groups;
})();

export function lineupLabel(ids: InstrumentId[]): string {
  return ids.map((id) => INSTRUMENT_BY_ID[id].label).join(" · ");
}

export function emptyInstruments(): Record<InstrumentId, boolean> {
  const next = {} as Record<InstrumentId, boolean>;
  for (const id of INSTRUMENT_IDS) next[id] = false;
  return next;
}

export function instrumentsFromSet(enabled: Iterable<string>): Record<InstrumentId, boolean> {
  const next = emptyInstruments();
  for (const id of enabled) {
    if (id in next) next[id as InstrumentId] = true;
  }
  return next;
}

function sameSet(ids: InstrumentId[], enabled: Set<string>): boolean {
  if (ids.length !== enabled.size) return false;
  return ids.every((id) => enabled.has(id));
}

export function matchEnsemble(enabled: Set<string>, current: EnsembleId | null = null): EnsembleId | null {
  if (current) {
    const preset = ENSEMBLES.find((item) => item.id === current);
    if (preset && sameSet(preset.ids, enabled)) return current;
  }
  for (const ensemble of ENSEMBLES) {
    if (sameSet(ensemble.ids, enabled)) return ensemble.id;
  }
  return null;
}
