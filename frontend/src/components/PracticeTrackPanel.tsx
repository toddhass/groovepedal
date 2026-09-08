import { useRef, useState } from "react";
import { useApp, getAudioEngine } from "../state/store";
import { AppleHit, searchAppleMusic, submitStemJob, waitForStemJob } from "../api";

export function PracticeTrackPanel() {
  const loadPracticeFile = useApp((s) => s.loadPracticeFile);
  const [trackName, setTrackName] = useState("No file loaded");
  const [detected, setDetected] = useState<string>("");
  const [vocalsOn, setVocalsOn] = useState(true);
  const [guitarOn, setGuitarOn] = useState(true);
  const [aiBusy, setAiBusy] = useState(false);
  const [aiProgress, setAiProgress] = useState(0);
  const [aiStatus, setAiStatus] = useState("");
  const [hits, setHits] = useState<AppleHit[]>([]);
  const [searching, setSearching] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const lastFileRef = useRef<File | null>(null);

  async function onFile(f: File) {
    lastFileRef.current = f;
    setTrackName(f.name.replace(/\.[^.]+$/, ""));
    setDetected("Analyzing tempo…");
    const res = await loadPracticeFile(f);
    if (res.error) {
      setDetected(res.error);
      return;
    }
    setDetected(`Detected ${Math.round(res.bpm ?? 0)} BPM`);
  }

  function applyMix(v: boolean, g: boolean) {
    const { track } = getAudioEngine();
    track.vocalsOn = v;
    track.guitarOn = g;
    track.apply();
  }

  async function runAiSplit() {
    const file = lastFileRef.current;
    if (!file) return;
    setAiBusy(true);
    setAiProgress(5);
    setAiStatus("Uploading…");
    try {
      const job = await submitStemJob(file);
      setAiStatus("Separating stems…");
      const finished = await waitForStemJob(job.id, (j) => {
        setAiProgress(j.status === "running" ? 60 : j.status === "done" ? 100 : 20);
      });
      if (finished.status === "error" || !finished.vocalsUrl || !finished.instrumentalUrl) {
        setAiStatus(finished.error || "Separation failed.");
        return;
      }
      const { ctx, track } = getAudioEngine();
      const [vBuf, iBuf] = await Promise.all([
        fetch(finished.vocalsUrl).then((r) => r.arrayBuffer()).then((b) => ctx.decodeAudioData(b)),
        fetch(finished.instrumentalUrl).then((r) => r.arrayBuffer()).then((b) => ctx.decodeAudioData(b)),
      ]);
      track.useRemoteStems(vBuf, iBuf);
      setAiStatus("Real stems ready.");
    } catch (e) {
      setAiStatus(e instanceof Error ? e.message : "Separation failed.");
    } finally {
      setAiBusy(false);
    }
  }

  async function onSearch(term: string) {
    if (!term.trim()) { setHits([]); return; }
    setSearching(true);
    try {
      setHits(await searchAppleMusic(term));
    } catch {
      setHits([]);
    } finally {
      setSearching(false);
    }
  }

  async function loadPreview(hit: AppleHit) {
    const res = await fetch(hit.previewUrl);
    const blob = await res.blob();
    const file = new File([blob], `${hit.artistName} - ${hit.trackName}.m4a`, { type: blob.type });
    await onFile(file);
  }

  return (
    <div className="rail rail-track card">
      <p className="kicker">Practice track</p>
      <p className="hint">Load an mp3 or m4a, or search a 30-second Apple preview. Then hit Start.</p>

      <input
        type="search" placeholder="Search Apple Music previews" aria-label="Search Apple Music"
        onChange={(e) => void onSearch(e.target.value)}
      />
      <div className="apple-list">
        {searching && <p className="empty">Searching…</p>}
        {!searching && hits.map((h) => (
          <button key={h.trackId} type="button" className="apple-row" onClick={() => void loadPreview(h)}>
            <span className="t">{h.trackName}</span>
            <span className="a">{h.artistName}</span>
          </button>
        ))}
      </div>

      <div className="inst-grid">
        <label className="inst file-btn">
          Load file
          <input
            ref={fileInputRef} type="file"
            accept="audio/*,.mp3,.m4a,.wav,.aac,.ogg"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) void onFile(f); }}
          />
        </label>
        <button className="inst" type="button" onClick={() => void runAiSplit()} disabled={!lastFileRef.current || aiBusy}>
          {aiBusy ? "Splitting…" : "AI split"}
        </button>
      </div>

      <p className="track-name">{trackName}</p>
      <p className="hint">{detected || aiStatus}</p>
      {aiBusy && (
        <div className="ai-bar">
          <div className="ai-fill" style={{ width: `${aiProgress}%` }} />
        </div>
      )}

      <div className="inst-grid">
        <button
          className={`inst${vocalsOn ? " on" : ""}`} type="button"
          onClick={() => { const v = !vocalsOn; setVocalsOn(v); applyMix(v, guitarOn); }}
        >
          Vocals
        </button>
        <button
          className={`inst${guitarOn ? " on" : ""}`} type="button"
          onClick={() => { const g = !guitarOn; setGuitarOn(g); applyMix(vocalsOn, g); }}
        >
          Guitar
        </button>
      </div>
    </div>
  );
}
