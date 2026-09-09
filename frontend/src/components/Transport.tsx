import { useApp } from "../state/store";
import { STYLES } from "../data/grooves";

export function Transport() {
  const playing = useApp((s) => s.playing);
  const toggleStart = useApp((s) => s.toggleStart);
  const fill = useApp((s) => s.fill);
  const nextPart = useApp((s) => s.nextPart);
  const restart = useApp((s) => s.restart);
  const crash = useApp((s) => s.crash);
  const song = useApp((s) => s.song);
  const selectFeel = useApp((s) => s.selectFeel);
  const bpm = useApp((s) => s.bpm);
  const setBpm = useApp((s) => s.setBpm);
  const volume = useApp((s) => s.volume);
  const setVolume = useApp((s) => s.setVolume);
  return (
    <>
      <button className={`start${playing ? " stop" : ""}`} type="button" onPointerDown={(e) => { e.preventDefault(); toggleStart(); }}>
        {playing ? "Stop" : "Start"}
      </button>
      <div className="grid">
        <button className="pedal fill" type="button" onPointerDown={fill}>Fill</button>
        <button className="pedal next" type="button" onPointerDown={nextPart}>Next part</button>
        <button className="pedal restart" type="button" onPointerDown={restart}>Restart</button>
        <button className="pedal crash" type="button" onPointerDown={crash}>Crash</button>
      </div>
      <section className="card">
        <p className="label">Groove</p>
        <div className="chips">
          {STYLES.map((s) => (
            <button key={s.id} type="button" className={`chip${song.feel === s.id ? " on" : ""}`} onPointerDown={() => selectFeel(s.id)}>{s.label}</button>
          ))}
        </div>
        <div className="sliders" style={{ marginTop: "1rem" }}>
          <label className="sl">Tempo<input type="range" min={40} max={240} value={bpm} onChange={(e) => setBpm(Number(e.target.value))} /><span>{bpm}</span></label>
          <label className="sl">Volume<input type="range" min={0} max={100} value={volume} onChange={(e) => setVolume(Number(e.target.value))} /><span>{volume}</span></label>
        </div>
      </section>
    </>
  );
}
