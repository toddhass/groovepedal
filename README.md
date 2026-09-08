# GroovePedal — React player (`react-ui`)

This branch is the React + TypeScript rewrite. `main` stays the proven static HTML player.

- Vite + React + TypeScript
- Audio engine is framework-agnostic (`src/lib/audio`)
- Zustand store for transport
- Songs as typed JSON (`src/lib/songs/seeds.json`)
- Client-side only — no backend, no AI stem split

Built output: `index.html` + `assets/`.
