export interface AppleHit {
  trackId: number;
  trackName: string;
  artistName: string;
  previewUrl: string;
}

export async function searchAppleMusic(term: string): Promise<AppleHit[]> {
  const res = await fetch(`/api/apple-search?term=${encodeURIComponent(term)}`);
  if (!res.ok) throw new Error(`Apple search failed (${res.status})`);
  const data = await res.json();
  return data.results ?? [];
}

export type StemJobStatus = "queued" | "running" | "done" | "error";

export interface StemJob {
  id: string;
  status: StemJobStatus;
  vocalsUrl?: string;
  instrumentalUrl?: string;
  error?: string;
}

export async function submitStemJob(file: File): Promise<StemJob> {
  const form = new FormData();
  form.append("file", file);
  const res = await fetch("/api/stems", { method: "POST", body: form });
  if (!res.ok) throw new Error(`Stem job submission failed (${res.status})`);
  return res.json();
}

export async function getStemJob(id: string): Promise<StemJob> {
  const res = await fetch(`/api/stems/${id}`);
  if (!res.ok) throw new Error(`Stem job lookup failed (${res.status})`);
  return res.json();
}

/** Poll a stem job until it's done or errors, calling onProgress for the UI bar. */
export async function waitForStemJob(id: string, onProgress?: (job: StemJob) => void): Promise<StemJob> {
  for (;;) {
    const job = await getStemJob(id);
    onProgress?.(job);
    if (job.status === "done" || job.status === "error") return job;
    await new Promise((r) => setTimeout(r, 1500));
  }
}
