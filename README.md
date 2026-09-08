# GroovePedal — modern stack rebuild

Rebuild of the single-file GroovePedal drum machine as a Vite/React/TypeScript
frontend with a Rust/axum backend.

## Frontend
```
cd frontend
npm install
npm run dev       # http://localhost:5173, proxies /api to :8787
npm run build      # production build to frontend/dist
```

## Backend
```
cd backend
cargo run           # listens on :8787
```

Requires a modern Rust toolchain (1.82+) — this repo's Cargo.lock resolves
cleanly there; older distro-packaged toolchains may need transitive-dep
pinning for edition2024 crates.

Real vocal/instrumental separation via `/api/stems` shells out to
[Demucs](https://github.com/facebookresearch/demucs):
```
pip install demucs   # + ffmpeg on PATH
```
Without Demucs installed, stem jobs will report an error; the frontend's
built-in mid-side vocals/guitar isolation still works with no backend at all.

## Layout
- `frontend/src/audio/` — synth engine (drums, cymbals, band instruments),
  step sequencer, tempo detection, practice-track mixer — ported from the
  original `index.html`
- `frontend/src/data/` — song library, groove/fill patterns, ensembles
- `frontend/src/components/` — Songs / Track / Band tabs
- `backend/src/apple.rs` — iTunes Search API proxy
- `backend/src/stems.rs` — Demucs job queue (DashMap actor pattern)
