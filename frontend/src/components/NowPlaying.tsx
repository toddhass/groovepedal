import { useApp } from "../state/store";
import { LABELS } from "../data/grooves";

export function NowPlaying() {
  const song = useApp((s) => s.song);
  const bpm = useApp((s) => s.bpm);
  const step = useApp((s) => s.step);
  const partName = useApp((s) => s.partName);
  const playing = useApp((s) => s.playing);

  const dots = Array.from({ length: 16 }, (_, i) => i);

  return (
    <section className="card now">
      <p className="kicker">Now playing</p>
      <h2>{song.title}</h2>
      <p className="who">{song.artist}</p>
      <dl className="meta">
        <div><dt>Groove</dt><dd>{LABELS[song.feel]}</dd></div>
        <div><dt>Part</dt><dd>{partName}</dd></div>
        <div><dt>Tempo</dt><dd>{bpm}</dd></div>
      </dl>
      <div className="steps">
        <div className="beat">
          {dots.map((i) => (
            <span key={i} className={`step${playing && i === step ? " on" : ""}`} />
          ))}
        </div>
      </div>
    </section>
  );
}
