*Archived 2026-03-03. As of 2026-03-02. For current setup see [GET_STARTED.md](../../GET_STARTED.md) and [WSL_SETUP_GUIDE.md](../../WSL_SETUP_GUIDE.md).*

---

# Setup, Builds, Dependencies & UI Audit

**Date:** 2026-03-02

## 1. Setup commands tested

| Command | Location | Result |
|--------|----------|--------|
| `npm install` | Project root | OK – 0 vulnerabilities |
| `npm install` | server/ | OK – 20 low severity (see Dependencies) |
| `npm run build` | Project root | OK – Vite build succeeds |
| `npm run build` | server/ | OK – after TS fix (see below) |
| `bash check-setup.sh` | server/ | OK – detects Python, Node, venv (root WSL), packages when present |

**Fixes applied during audit**

- **Server TypeScript:** `result` from `response.json()` was `unknown`. Added `SplitResponse` interface and `as SplitResponse` so `tsc` passes.
- **App.tsx:** Added missing `registerAudioBuffer` import from `./audio/mixdownExporter` (used by mic recorder and sample library).

---

## 2. Hooks and builds

- **Git hooks:** No Husky or pre-commit hooks present. No hook-related failures.
- **Frontend build:** `vite build` with `vite-plugin-singlefile` – produces `dist/index.html` (single-file bundle). Correct.
- **Server build:** `tsc` with `tsconfig.json` (NodeNext, strict, outDir `dist`). Correct after the `stems.ts` type fix.
- **Python:** No build step; `stem_splitter.py` is run directly. `requirements-python.txt` used for install.

---

## 3. Dependencies

### Frontend (package.json)

- **Unused (optional cleanup):** `tone` and `wavesurfer.js` are not imported anywhere in `src/`. Safe to remove to reduce bundle size if desired.
- All other deps are used (React, Zustand, Tailwind, Vite, lucide-react, etc.).

### Server (server/package.json)

- **Audit:** `npm audit` reports 20 low severity issues. Run `npm audit fix` (or `npm audit fix --force` with care) if you want to address them.
- Stems route uses `node-fetch` and `form-data`; types fixed for the split response.

### Python (server/requirements-python.txt)

- demucs, torch, torchaudio, flask, flask-cors, etc. – all required by `stem_splitter.py`. Versions relaxed to `torch>=2.1.0,<2.5` for installability.

---

## 4. Setup scripts and docs

- **check-setup.bat** – Windows only; do not run with `bash`.
- **check-setup.sh** – For WSL/Linux/macOS. Prefers `venv/bin/activate` then `../venv/bin/activate`. Run with `bash check-setup.sh` from `server/`. Strip CRLF if needed: `sed -i 's/\r$//' check-setup.sh`.
- **setup.bat** – Windows: creates server venv, pip install, npm install (server + root). WSL users: use venv + pip + npm manually as in GET_STARTED.
- **start-local.bat** – Starts Python (background) and Node API only. Does **not** start the frontend. GET_STARTED updated to say: run frontend from project root with `npm run dev` in a second terminal.
- **start-local.sh** – Added for WSL: starts Python (background) and Node from `server/`; instructs user to run frontend from project root in another terminal.

---

## 5. UI checklist – all required UI present and wired

| Item | Status |
|------|--------|
| **Default route** | Stem Mixer page (beginner) – OK |
| **Stem Mixer page** | Header, step line, StemSplitter, BPM/pitch/master vol, presets (Karaoke, Instrumental, Acapella), stem strips (vol/pan/mute/solo), Export Mix – OK |
| **StemSplitter** | Upload, health check, Split button, progress, error, stems list, **Download** (programmatic fetch + blob), Load to Tracks – OK |
| **Export modal** | Used from Stem Mixer and Advanced DAW; exportWav with bpm, tracks, masterVolume, masterTranspose – OK |
| **Advanced DAW** | "← Stem Mixer" link, TransportBar, SidePanel, main panel (Timeline/Mixer/EQ/MIDI/Tuner/Library), bottom instruments (Piano, Drums), AI Stem Split button, Export – OK |
| **Navigation** | Stem Mixer → "Advanced DAW →"; Advanced DAW → "← Stem Mixer" – OK |
| **Playback** | Spacebar in Advanced DAW; transport in TransportBar – OK |
| **Export** | Includes masterTranspose (pitch) in offline render – OK |

No missing UI for the current design. GET_STARTED updated so "First Test" matches the Stem Mixer–first flow and the need to run the frontend separately from start-local.

---

## 6. Quick verification commands

From project root:

```bash
npm install
npm run build
```

From `server/`:

```bash
npm install
npm run build
bash check-setup.sh   # WSL/Linux; use check-setup.bat on Windows cmd
```

To run the app: start Python + Node (e.g. `bash start-local.sh` or `start-local.bat` from `server/`), then from project root run `npm run dev` and open http://localhost:5173.
