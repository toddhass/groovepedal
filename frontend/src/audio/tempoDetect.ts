export interface TempoResult {
  bpm: number;
  offset: number;
}

// Autocorrelation-based tempo + downbeat detection, ported from analyzeTrack().
// Runs on decoded PCM directly (up to the first 12s), no ML involved -
// this is what sets the initial guess before/instead of the backend's
// server-side analysis.
export function analyzeTrack(buf: AudioBuffer, hint?: number): TempoResult {
  const sr = buf.sampleRate;
  const hop = Math.max(64, Math.round(sr / 200));
  const n = Math.min(buf.length, Math.floor(sr * 12));
  const L = buf.getChannelData(0);
  const R = buf.numberOfChannels > 1 ? buf.getChannelData(1) : L;

  const full: number[] = [], bass: number[] = [];
  let lp = 0;
  const rc = 1 / (2 * Math.PI * 110);
  const a = 1 / sr / (rc + 1 / sr);

  for (let i = 0; i + hop < n; i += hop) {
    let acc = 0, bacc = 0;
    for (let j = 0; j < hop; j++) {
      const s = (L[i + j] + R[i + j]) * 0.5;
      lp += a * (s - lp);
      acc += s * s;
      bacc += lp * lp;
    }
    full.push(Math.sqrt(acc / hop));
    bass.push(Math.sqrt(bacc / hop));
  }

  if (full.length < 48) return { bpm: Math.round((hint || 120) * 1000) / 1000, offset: 0 };

  const flux: number[] = [];
  for (let i = 1; i < full.length; i++) flux.push(Math.max(0, full[i] - full[i - 1]));

  const minLag = Math.round(((60 / 180) * sr) / hop);
  const maxLag = Math.round(((60 / 70) * sr) / hop);
  const corr: number[] = [];
  let best = 0, bestLag = minLag;
  for (let lag = minLag; lag <= maxLag; lag++) {
    let c = 0;
    for (let k = 0; k < flux.length - lag; k++) c += flux[k] * flux[k + lag];
    corr[lag] = c;
    if (c > best) { best = c; bestLag = lag; }
  }
  if (bestLag > minLag && bestLag < maxLag) {
    const c0 = corr[bestLag - 1] || 0, c1 = corr[bestLag] || 0, c2 = corr[bestLag + 1] || 0;
    const den = c0 - 2 * c1 + c2;
    if (Math.abs(den) > 1e-12) {
      const delta = (0.5 * (c0 - c2)) / den;
      if (delta > -1 && delta < 1) bestLag += delta;
    }
  }

  let bpm = 60 / ((bestLag * hop) / sr);
  const cands = [bpm, bpm * 2, bpm / 2, bpm * 1.5, bpm / 1.5];
  const h = hint || 120;
  let pick = bpm, dist = 1e9;
  for (const v of cands) {
    if (v < 60 || v > 200) continue;
    const d = Math.abs(v - h);
    if (d < dist) { dist = d; pick = v; }
  }
  if (Math.abs(pick - h) / h < 0.004) bpm = h;
  else bpm = Math.round(Math.min(180, Math.max(60, pick)) * 1000) / 1000;

  const period = ((60 / bpm) * sr) / hop;
  let bestScore = -1e12, bestOff = 0;
  const search = Math.max(1, Math.floor(period));
  for (let off = 0; off < search; off++) {
    let score = 0;
    for (let beat = 0; beat < 16; beat++) {
      const idx = Math.round(off + beat * period);
      if (idx >= bass.length) break;
      const pos = beat % 4;
      const bv = bass[idx] || 0, fv = full[idx] || 0;
      if (pos === 0) score += bv * 4.2 + fv * 0.25;
      else if (pos === 2) score += bv * 2.4 + fv * 0.25;
      else score += fv * 0.7 - bv * 0.8;
    }
    if (score > bestScore) { bestScore = score; bestOff = off; }
  }

  return { bpm, offset: Math.max(0, (bestOff * hop) / sr) };
}
