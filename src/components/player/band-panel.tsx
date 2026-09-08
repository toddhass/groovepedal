import { useEffect, useState } from "react";
import { BandRow, InstrumentToggle } from "@/components/studio/controls";
import { ENSEMBLE_GROUPS, INSTRUMENT_BY_ID, INSTRUMENT_GROUPS, lineupLabel } from "@/lib/audio/instruments";
import { connectMidi, midiSupported, type MidiInfo } from "@/lib/audio/midi";
import { engine, useGroove } from "@/lib/audio/store";

export function BandPanel() {
  const ensemble = useGroove((s) => s.ensemble);
  const instruments = useGroove((s) => s.instruments);
  const cowbellOn = useGroove((s) => s.cowbellOn);
  const [midi, setMidi] = useState<MidiInfo>({ status: "empty", device: "" });

  useEffect(() => {
    if (!midiSupported()) setMidi({ status: "unsupported", device: "" });
  }, []);

  return (
    <section className="flex h-full min-h-0 min-w-0 flex-col gap-3 overflow-y-auto overflow-x-hidden rounded-2xl bg-card p-3 shadow-[var(--shadow-border)] sm:p-4">
      <p className="text-xs font-medium tracking-wide text-muted-foreground">Band</p>
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain rounded-lg bg-background p-1 shadow-[var(--shadow-border)]">
        {ENSEMBLE_GROUPS.map((group) => (
          <div key={group.label} className="py-1">
            <p className="px-3 pt-2 pb-1 text-xs tracking-wide text-muted-foreground">{group.label}</p>
            {group.ensembles.map((item) => (
              <BandRow
                key={item.id}
                label={item.label}
                lineup={lineupLabel(item.ids)}
                active={ensemble === item.id}
                onPick={() => engine().setEnsemble(item.id)}
              />
            ))}
          </div>
        ))}
      </div>
      {INSTRUMENT_GROUPS.map((group) => (
        <div key={group.id}>
          <p className="mb-2 text-xs font-medium tracking-wide text-muted-foreground">{group.label}</p>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {group.ids.map((id) => (
              <InstrumentToggle
                key={id}
                label={INSTRUMENT_BY_ID[id].label}
                on={instruments[id]}
                onToggle={() => engine().setInstrument(id, !instruments[id])}
              />
            ))}
          </div>
        </div>
      ))}
      <InstrumentToggle label="Cowbell" on={cowbellOn} onToggle={() => engine().setCowbellEnabled(!cowbellOn)} />
      <button
        type="button"
        className="flex min-h-11 w-full items-center justify-center rounded-lg bg-secondary text-sm font-medium touch-manipulation active:scale-[0.98]"
        onClick={() => {
          engine().unlock();
          void connectMidi((data) => engine().handleMidi(data)).then(setMidi);
        }}
      >
        {midi.status === "ready"
          ? `MIDI · ${midi.device}`
          : midi.status === "unsupported"
            ? "MIDI needs Chrome"
            : midi.status === "denied"
              ? "MIDI blocked"
              : "Connect MIDI"}
      </button>
      {midi.status === "unsupported" ? (
        <p className="text-xs leading-relaxed text-muted-foreground">
          iPhone Safari cannot see MIDI. Use Chrome on a computer, or MIDIWeb on iPhone.
        </p>
      ) : midi.status === "ready" ? (
        <p className="text-xs leading-relaxed text-muted-foreground">GM pads hit the kit. CC64 start/stop, CC65 fill, CC66 next part.</p>
      ) : null}
    </section>
  );
}
