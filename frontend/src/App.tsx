import { useEffect, useState } from "react";
import { useApp } from "./state/store";
import { NowPlaying } from "./components/NowPlaying";
import { Transport } from "./components/Transport";
import { Library } from "./components/Library";
import { PracticeTrackPanel } from "./components/PracticeTrackPanel";
import { BandPanel } from "./components/BandPanel";

export default function App() {
  const tab = useApp((s) => s.tab);
  const setTab = useApp((s) => s.setTab);
  const [status] = useState("Ready");

  useEffect(() => {
    document.body.className = `pane-${tab}`;
  }, [tab]);

  return (
    <div className="wrap">
      <header>
        <div className="brand">
          GroovePedal
          <small>Play along. Stay in the pocket.</small>
        </div>
        <span className="badge">{status}</span>
      </header>

      <div className="player">
        <NowPlaying />
        <Transport />
      </div>

      <Library />
      <PracticeTrackPanel />
      <BandPanel />

      <nav className="tabs">
        <button type="button" data-tab="songs" className={tab === "songs" ? "on" : ""} onClick={() => setTab("songs")}>Songs</button>
        <button type="button" data-tab="track" className={tab === "track" ? "on" : ""} onClick={() => setTab("track")}>Track</button>
        <button type="button" data-tab="band" className={tab === "band" ? "on" : ""} onClick={() => setTab("band")}>Band</button>
      </nav>

      <p className="foot">Software drum machine. Not affiliated with any hardware pedal.</p>
    </div>
  );
}
