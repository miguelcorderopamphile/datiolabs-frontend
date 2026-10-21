# DatioLabs Frontend

The TypeScript interface for [DatioLabs Retail](https://github.com/miguelcorderopamphile/datiolabs),
a point-of-sale program for small shops in Venezuela. It is a Vite single-page app that runs
inside the Tauri desktop shell and, with an in-memory store, in the browser.

The Rust core and the desktop shell live in the
[main repository](https://github.com/miguelcorderopamphile/datiolabs). The shell loads the
`dist/` build of this app.

The engineering case study lives in `public/engineering/` and is served at
[datiolabs.com/engineering](https://datiolabs.com/engineering).

## Development

```bash
npm ci
npm run dev
npm test
npm run build
```

`npm run build` writes `dist/`. To package the desktop application, clone this repository as
`ui/` next to the core repository and run the Tauri build there:

```bash
git clone https://github.com/miguelcorderopamphile/datiolabs-frontend.git ui
cd ui && npm ci && npm run build
```

## Layout

- `src/negocio/` — domain logic and the typed IPC client (`api.ts`).
- `src/viewmodels/`, `src/views/` — workspace state and rendering.
- `src/models/` — shared data model.
- `tests/` — unit and property tests for money, cart invariants and view models.
- `demo/` — the in-memory demo the desktop window opens.
- `public/` — static assets.

Money is integer cents here; the Rust core uses `rust_decimal`. The conversion happens at the
IPC boundary, so no float enters a price, a tax or a change calculation.

## License

MIT. See [`LICENSE`](LICENSE).
