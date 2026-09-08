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
