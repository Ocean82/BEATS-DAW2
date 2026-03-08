# Stem Splitter Setup Guide

Backend for AI stem separation: 4 stems (Drums, Bass, Vocals, Other) via Demucs. Node API proxies uploads to the Python service and serves stem downloads.

**WSL/Linux (recommended for AWS parity):** Use `source venv/bin/activate` in `server/`. Run frontend from **project root** with `npm run dev`.

## Local Development Setup

### 1. Install Python Dependencies

```bash
cd server
python3 -m venv venv

# WSL / Linux / macOS
source venv/bin/activate

# Windows (cmd)
venv\Scripts\activate

pip install -r requirements-python.txt
```

### 2. Install Node Dependencies

```bash
# In server/
npm install
# In project root (for frontend)
cd .. && npm install
```

### 3. Start Services

**Current steps: start the server first, then the frontend.**

**Step 1 — Start the server (WSL, from server/):**
```bash
cd server
source venv/bin/activate
bash start-local.sh
```
Leave this terminal open. Python: port 5000, Node API: port 3001.

**If "Address already in use":** In WSL run `fuser -k 5000/tcp 3001/tcp`, then `bash start-local.sh` again.

**Step 2 — Start the frontend (second terminal, project root):**
```bash
npm run dev
```

**Step 3 — Open the app:** http://localhost:5173

**Alternative — run each service separately:** Terminal 1: `python python_service/stem_splitter.py` (5000). Terminal 2: from server/ `npm run dev` (3001). Terminal 3: from project root `npm run dev` (5173).

### 4. Test the API

```bash
# Check health
curl http://localhost:3001/api/stems/health

# Upload and split (replace with your audio file)
curl -X POST http://localhost:3001/api/stems/split \
  -F "file=@/path/to/your/song.mp3"
```

## How It Works

1. **Upload**: Client uploads audio file to Node.js API
2. **Forward**: Node.js forwards to Python service (Flask)
3. **Process**: Python uses the **combined plan** when `STEM_BACKEND=hybrid` (default):
   - **Stage 1:** MDX-Net ONNX extracts vocals (Kim_Vocal_2 / Voc_FT / HQ_4 / HQ_5 from `models/`)
   - **Phase inversion:** Instrumental = original − vocals
   - **Stage 2:** Demucs runs on instrumental only → Drums, Bass, Other; Vocals from Stage 1
   - Optional: `STEM_PHASE_PERFECT_OTHER=1` for phase-perfect Other = instrumental − drums − bass
4. **Fallback:** If ONNX is unavailable or `STEM_BACKEND=demucs_only`, single-pass Demucs on the full mix
5. **Download**: Client downloads stems via Node.js proxy

**Env:** `STEM_BACKEND=hybrid|demucs_only`, `STEM_MDX_CHUNK_SAMPLES` (optional), `STEM_PHASE_PERFECT_OTHER=1` (optional). Local Demucs weights: `models/htdemucs.pth` (used if present).

## Performance Notes

- **CPU**: ~2-5 minutes per song (3-4 min average)
- **GPU**: ~30-60 seconds per song (if CUDA available)
- **Memory**: ~2-4GB RAM during processing

## EC2 Deployment (Future)

When ready to deploy:

1. Update `.env`:
```
PYTHON_SERVICE_URL=http://localhost:5000  # or internal EC2 IP
PORT=3001
```

2. Use PM2 or systemd to run both services
3. Consider using nginx as reverse proxy
4. Optional: Add Redis queue for async processing

## Troubleshooting

**Python service won't start:**
- Make sure venv is activated
- Check Python version (3.8+)
- Install ffmpeg: `sudo apt install ffmpeg` (Linux) or `brew install ffmpeg` (Mac)

**Out of memory:**
- Reduce file size limit in `stem_splitter.py`
- Use CPU instead of GPU (slower but less memory)

**Slow processing:**
- First run downloads Demucs model (~300MB)
- Subsequent runs are faster
- Consider GPU instance on EC2 (g4dn.xlarge)
