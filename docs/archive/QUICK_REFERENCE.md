# Quick Reference

## 🚀 Start the App

**Start the server first, then the frontend.**

### Step 1 — Start the server (WSL)

```bash
cd server
bash check-setup.sh              # optional: verify Python, Node, venv
source venv/bin/activate
bash start-local.sh
```

Leave this terminal open. Python: port 5000, Node API: port 3001.

**If "Address already in use":** In WSL run `fuser -k 5000/tcp 3001/tcp`, then `bash start-local.sh` again.

### Step 2 — Start the frontend

In a **second terminal**, from the **project root**:

```bash
npm run dev
```

### Step 3 — Open the app

Open: **http://localhost:5173** (Stem Mixer is the default landing)

## 📁 Project Structure

```
BEATS-DAW2/
├── src/                          # Frontend
│   ├── components/
│   │   ├── StemSplitter.tsx     # NEW: Upload & split UI
│   │   ├── Timeline.tsx         # Waveform display
│   │   ├── MixerPanel.tsx       # Volume, pan, EQ
│   │   └── TransportBar.tsx     # Play/pause/export
│   ├── audio/
│   │   ├── audioEngine.ts       # Web Audio API
│   │   └── mixdownExporter.ts  # WAV export
│   └── store/
│       └── dawStore.ts          # State management
│
├── server/                       # Backend
│   ├── python_service/
│   │   └── stem_splitter.py    # NEW: Demucs AI service
│   ├── src/
│   │   └── routes/
│   │       └── stems.ts        # NEW: Upload/download API
│   ├── requirements-python.txt  # NEW: Python deps
│   ├── setup.bat               # NEW: Setup script
│   └── start-local.bat         # NEW: Start script
│
└── docs/                        # Documentation
    ├── GET_STARTED.md          # Start here!
    ├── TEST_INSTRUCTIONS.md
    ├── ARCHITECTURE.md
    └── DEPLOYMENT_CHECKLIST.md
```

## 🔧 Commands

### Setup
**WSL:** From `server/`: `bash check-setup.sh`; then `source venv/bin/activate`, `pip install -r requirements-python.txt`, `npm install`; from root: `npm install`
**Windows:** From `server/`: `check-setup.bat`, `setup.bat`

### Development
**Current steps:** (1) Start server first: `cd server` → `source venv/bin/activate` → `bash start-local.sh`. (2) Start frontend: from project root run `npm run dev`. (3) Open http://localhost:5173.
**Or run separately:** Python: `python python_service/stem_splitter.py` (5000); Node: `npm run dev` in server/ (3001); Frontend: `npm run dev` in root (5173).

### Testing
```bash
# Health checks
curl http://localhost:5000/health  # Python service
curl http://localhost:3001/api/stems/health  # Node API
```

## 🌐 URLs

- Frontend: http://localhost:5173
- Node API: http://localhost:3001
- Python Service: http://localhost:5000

## 📊 API Endpoints

### Node.js (Port 3001)
- `POST /api/stems/split` - Upload & split
- `GET /api/stems/download/:jobId/:stem` - Download stem
- `GET /api/stems/health` - Health check

### Python (Port 5000)
- `POST /split` - Process audio
- `GET /download/:jobId/:stem` - Serve stem
- `GET /health` - Service status

## 🎵 Workflow (stem guide: 5 steps)

1. **Upload** — Choose audio file (MP3, WAV, FLAC, etc.)
2. **Split** — Click "Split into Stems" (2-5 min)
3. **Load** — Click "Load All Stems to Tracks"
4. **Mix** — Volume, pan, mute/solo, presets (Karaoke, Instrumental, Acapella); use Mastering presets and A/B
5. **Export** — Export Mix (WAV)

## ⚡ Performance

- Upload: < 1 sec
- Processing: 2-5 min (CPU) or 30-60 sec (GPU)
- Download: < 1 sec
- Memory: 2-4GB

## 🐛 Troubleshooting

### Python service won't start
**WSL:** `cd server && source venv/bin/activate && pip install -r requirements-python.txt && python python_service/stem_splitter.py`
**Windows:** `cd server`, `venv\Scripts\activate`, `pip install -r requirements-python.txt`, `python python_service/stem_splitter.py`

### Node API errors
```bash
cd server
npm install
npm run dev
```

### Frontend blank
```bash
npm install
npm run dev
```

## 📝 Key Files

### Configuration
- `server/.env` - Environment variables
- `server/requirements-python.txt` - Python packages
- `server/package.json` - Node packages

### Main Code
- `src/components/StemSplitter.tsx` - Upload UI
- `server/python_service/stem_splitter.py` - AI processing
- `server/src/routes/stems.ts` - API routes

### Documentation
- `GET_STARTED.md` - Setup guide
- `TEST_INSTRUCTIONS.md` - Testing
- `ARCHITECTURE.md` - System design
- `DEPLOYMENT_CHECKLIST.md` - Launch plan

## 🎯 Next Steps

1. ✅ Test locally
2. ⏳ Deploy to EC2
3. ⏳ Add features
4. ⏳ Launch publicly

## 💡 Tips

- Start with short songs (2-3 min) for testing
- First run downloads AI model (~300MB)
- Use MP3 for faster uploads
- Close other apps if low on RAM
- GPU processing is 5-10x faster

## 🆘 Help

1. Check GET_STARTED.md
2. Check TEST_INSTRUCTIONS.md
3. Check browser console (F12)
4. Check service logs in terminals

## 📦 Dependencies

### Python
- demucs 4.0.1
- torch 2.1.0
- flask 3.0.0

### Node.js
- express 4.18.0
- multer 1.4.5
- node-fetch 3.3.0

### Frontend
- react 19.2.3
- vite 7.2.4
- zustand 5.0.11

## 🔐 Security Notes

- No authentication (add for production)
- No rate limiting (add for production)
- CORS enabled (restrict for production)
- File size limit: 100MB
- Allowed formats: MP3, WAV, FLAC, OGG, M4A

## 💰 Cost Estimates

### Local Development
- Free

### EC2 Production
- CPU (t4g.medium): ~$40/month
- GPU (g4dn.xlarge): ~$500/month

## 📈 Metrics to Track

- Songs processed
- Processing time
- Error rate
- User satisfaction
- Server costs

---

**Quick Start (WSL):** `cd server && source venv/bin/activate && bash start-local.sh` → then `npm run dev` from root. **(Windows):** `cd server && start-local.bat` → then `npm run dev` from root.
