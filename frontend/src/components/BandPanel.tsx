import { useState } from "react";
import { ENSEMBLES, INST, INST_MAP } from "../data/songs";

export function BandPanel() {
  const [ensemble, setEnsemble] = useState<string | null>(null);
  const [instruments, setInstruments] = useState<Set<string>>(new Set());
  function pickEnsemble(id: string) {
    const e = ENSEMBLES.find((x) => x.id === id);
    if (!e) return;
    setEnsemble(id);
    setInstruments(new Set(e.ids));
  }
  function toggleInstrument(id: string) {
    setInstruments((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
    setEnsemble(null);
  }
  const groups = Array.from(new Set(ENSEMBLES.map((e) => e.group)));
  const instGroups = Array.from(new Set(INST.map((i) => i.group)));
  return (
    <div className="rail rail-band card">
      <p className="kicker">Band</p>
      <div className="band-list">
        {groups.map((group) => (
          <div key={group}>
            <p className="band-group">{group}</p>
            {ENSEMBLES.filter((e) => e.group === group).map((e) => (
              <button key={e.id} type="button" className={`band-row${ensemble === e.id ? " on" : ""}`} onClick={() => pickEnsemble(e.id)}>
                <span className="t">{e.label}</span>
                <span className="a">{e.ids.map((id) => INST_MAP[id]?.label).join(", ")}</span>
              </button>
            ))}
          </div>
        ))}
      </div>
      {instGroups.map((group) => (
        <div key={group}>
          <p className="label" style={{ marginTop: ".5rem" }}>{group}</p>
          <div className="inst-grid">
            {INST.filter((i) => i.group === group).map((i) => (
              <button key={i.id} type="button" className={`inst${instruments.has(i.id) ? " on" : ""}`} onClick={() => toggleInstrument(i.id)}>{i.label}</button>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
