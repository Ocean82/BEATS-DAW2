# 👋 START HERE

Welcome to the Stem Splitter & Mixer app!

## What Is This?

AI-powered stem separation and mixing: upload a song, split into drums, bass, vocals, and other instruments, then mix and master in the browser. The app opens on the **Stem Mixer** (default landing). **Advanced DAW** (timeline, instruments, MIDI) is on a separate page via the header.

**Product spec:** [docs/stem_guide.md](docs/stem_guide.md) · [docs/detailed_stem_guides.md](docs/detailed_stem_guides.md)

## Stem Workflow (5 steps)

1. **Upload** — Choose an audio file (MP3, WAV, FLAC, etc.)
2. **Split** — AI separates into 4 stems (Drums, Bass, Vocals, Other)
3. **Load** — Load stems to mixer tracks
4. **Mix** — Adjust volume, pan, presets (Karaoke, Instrumental, Acapella); apply mastering
5. **Export** — Download WAV (and stems)

---

## I'm Ready to Test!

**Environment: WSL / Linux.** Project and server run on **Ubuntu** (WSL locally, Ubuntu on server). Use bash and `venv/bin/activate`.

### Step 1 — Start the server (backend) first

In a WSL terminal, from the project directory:

```bash
cd server
bash check-setup.sh              # optional: verify Python, Node, venv
source venv/bin/activate
bash start-local.sh
```

Leave this terminal open. You should see Python (port 5000) and Node (port 3001) start.

**If you see "Address already in use" or "Port 5000/3001 is in use":** In WSL run `fuser -k 5000/tcp 3001/tcp`, then run `bash start-local.sh` again.

### Step 2 — Start the frontend

Open a **second terminal**. From the **project root**:

```bash
npm run dev
```

### Step 3 — Open the app

Then open: **http://localhost:5173** — you’ll see the **Stem Mixer** first.

---

## I Want to Understand First

1. **[GET_STARTED.md](GET_STARTED.md)** — Full setup (WSL / Linux)
2. **[WHAT_I_BUILT.md](WHAT_I_BUILT.md)** — Overview
3. **[QUICK_REFERENCE.md](QUICK_REFERENCE.md)** — Commands & tips
4. **[docs/stem_guide.md](docs/stem_guide.md)** — Product feature spec

## I Want All the Details

### Setup & Testing
- [GET_STARTED.md](GET_STARTED.md) — Setup guide
- [WSL_SETUP_GUIDE.md](WSL_SETUP_GUIDE.md) — WSL-specific steps
- [TEST_INSTRUCTIONS.md](TEST_INSTRUCTIONS.md) — Testing
- Project test scripts (WSL): `npm run test` (setup), `npm run test:health` (with backend running)
- [QUICK_REFERENCE.md](QUICK_REFERENCE.md) — Quick commands

### Product & Compliance
- [docs/stem_guide.md](docs/stem_guide.md) — Stem guide (MVP features)
- [docs/detailed_stem_guides.md](docs/detailed_stem_guides.md) — Detailed outline
- [STEM_GUIDE_COMPLIANCE_REVIEW.md](STEM_GUIDE_COMPLIANCE_REVIEW.md) — Compliance status

### Technical
- [REFACTOR_SUMMARY.md](REFACTOR_SUMMARY.md) — What changed
- [ARCHITECTURE.md](ARCHITECTURE.md) — System design
- [server/README_STEM_SPLITTER.md](server/README_STEM_SPLITTER.md) — Backend

### Deployment
- [DEPLOYMENT_CHECKLIST.md](DEPLOYMENT_CHECKLIST.md) — Launch plan

---

## I Have Questions

### How long does setup take?
- First time: 10–15 minutes (AI model download)
- After that: 30 seconds to start

### How long does processing take?
- CPU: 2–5 minutes per song
- GPU: 30–60 seconds per song

### What can I do with this?
- Karaoke (remove vocals)
- Isolate drums/bass for remixing
- Instrumental / acapella versions
- Stem mixing and mastering

### Is it ready for production?
- Local testing: ✅ Yes
- EC2 deployment: ✅ When you’re ready
- Monetization: ⏳ Add auth first

### What's the quality like?
- Demucs (Facebook Research), 4-stem separation
- Professional-quality results

---

## Testing

Tests are intended for **WSL/Ubuntu (CPU-only)** to match the recommended environment.

- **Setup only:** `npm run test` or `npm run test:setup` — runs `server/check-setup.sh` (Python, Node, venv, deps).
- **Health checks:** Start the backend first (`cd server && source venv/bin/activate && bash start-local.sh`), then in another terminal run `npm run test:health` — hits `GET /health` and `GET /api/stems/health`.

Logs: Python → `server/python_service/logs/stem_splitter.log`; Node → `server/logs/beats-daw.log` (and console).

---

## Quick Troubleshooting

### "Python not found"
Install Python 3.8+ (python.org). On WSL: `sudo apt install python3 python3-venv`.

### "Node not found"
Install Node.js 18+ (nodejs.org). On WSL: use nvm or Node from package manager.

### "Virtual environment not found"
From `server/`: `python3 -m venv venv` then `source venv/bin/activate`.

### "Python service unavailable"
`cd server && source venv/bin/activate && python python_service/stem_splitter.py`

### "Out of memory"
Use a shorter clip; close other apps; restart the Python service.

---

## File Structure

```
📁 Root
├── 📄 START_HERE.md
├── 📄 GET_STARTED.md
├── 📄 readme.md
├── 📁 docs/
│   ├── stem_guide.md
│   └── detailed_stem_guides.md
├── 📁 scripts/
│   ├── run-tests.sh      # test runner (setup + optional health)
│   ├── test-setup.sh     # runs server/check-setup.sh
│   └── test-health.sh    # GET /health, /api/stems/health
├── 📁 src/
│   └── components/
│       ├── StemSplitter.tsx
│       ├── StemMixerView.tsx
│       └── MasteringPanel.tsx
├── 📁 server/
│   ├── check-setup.sh
│   ├── start-local.sh
│   ├── python_service/stem_splitter.py  # logs → python_service/logs/
│   ├── src/logger.ts                    # logs → server/logs/
│   └── README_STEM_SPLITTER.md
└── ...
```

---

## Ready?

1. **Start the server first:** `cd server` → `source venv/bin/activate` → `bash start-local.sh` (leave terminal open).
2. **Start the frontend:** In a second terminal, from project root run `npm run dev`.
3. **Open:** **http://localhost:5173**

🎵 Let's split some stems!
