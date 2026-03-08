# Testing Your Stem Splitter

## Pre-Test Checklist

Before testing, make sure you have:
- [ ] Python 3.8+ installed (`python --version`)
- [ ] Node.js 18+ installed (`node --version`)
- [ ] At least 4GB free RAM
- [ ] An audio file to test (MP3 or WAV, under 10MB recommended for first test)

## Setup Steps

### 1. Install Dependencies

```bash
# In server folder
cd server
python -m venv venv

# Activate venv
venv\Scripts\activate  # Windows
# OR
source venv/bin/activate  # Mac/Linux

# Install Python packages (takes 2-3 minutes)
pip install -r requirements-python.txt

# Install Node packages
npm install

# Install frontend packages
cd ..
npm install
```

### 2. Start Services

**Start the server first, then the frontend.**

**Step 1 — Start the server (WSL):**
```bash
cd server
source venv/bin/activate
bash start-local.sh
```
Leave this terminal open. You should see Python (port 5000) and Node (port 3001) start.

**If "Address already in use":** In WSL run `fuser -k 5000/tcp 3001/tcp`, then `bash start-local.sh` again.

**Step 2 — Start the frontend (second terminal, project root):**
```bash
npm run dev
```

You should see:
```
VITE ready in XXXms
➜ Local: http://localhost:5173/
```

**Alternative — run each service in its own terminal:** Terminal 1: `cd server && source venv/bin/activate && python python_service/stem_splitter.py` (5000). Terminal 2: `cd server && npm run dev` (3001). Terminal 3: from project root `npm run dev` (5173).

## Testing the App

### 1. Open the App
- Navigate to http://localhost:5173
- You should see the DAW interface

### 2. Open Stem Splitter
- Click the **🤖 AI Stem Split** button at the bottom of the screen
- A modal should appear

### 3. Upload a Song
- Click "Choose Audio File"
- Select an MP3 or WAV file (start with something short, 2-3 minutes)
- File name should appear

### 4. Split Stems
- Click "✨ Split into Stems"
- Progress will show:
  - "Uploading..."
  - "Separating stems (this may take 2-5 minutes)..."
  - "✓ Stems ready!"

**Expected timing:**
- Short song (2-3 min): 2-3 minutes on CPU
- Medium song (4-5 min): 4-5 minutes on CPU
- With GPU: 30-60 seconds

### 5. Review Stems
You should see 4 stems:
- Drums
- Bass
- Vocals
- Other

Each with:
- File size
- Download button

### 6. Load to Tracks
- Click "✓ Load All Stems to Tracks"
- 4 new tracks should appear in the timeline
- Each track has the stem audio loaded

### 7. Mix the Stems
- Adjust volume sliders for each track
- Pan left/right
- Add EQ, reverb
- Press spacebar to play/pause

### 8. Export Final Mix
- Click the export button in the transport bar
- Click "⬇️ Export WAV"
- Download should start

## Troubleshooting

### Python Service Won't Start

**Error: "No module named 'demucs'"**
```bash
# Make sure venv is activated
venv\Scripts\activate
pip install -r requirements-python.txt
```

**Error: "torch not found"**
```bash
# Install PyTorch
pip install torch torchaudio
```

### Node API Errors

**Error: "Python service unavailable"**
- Check Terminal 1 - Python service should be running
- Visit http://localhost:5000/health
- Should return: `{"status": "ok", "model": "htdemucs", "device": "cpu"}`

**Error: "Cannot find module 'form-data'"**
```bash
cd server
npm install
```

### Frontend Issues

**Blank screen**
- Check browser console (F12)
- Make sure frontend is running on port 5173

**Upload fails**
- Check file size (< 100MB)
- Check file format (MP3, WAV, FLAC, OGG, M4A)
- Check Node API is running (http://localhost:3001/health)

### Performance Issues

**Very slow processing**
- First run downloads Demucs model (~300MB) - this is normal
- CPU processing is slow (2-5 min per song)
- Try a shorter song
- Close other apps to free RAM

**Out of memory**
- Try a shorter song (< 3 minutes)
- Close other apps
- Restart Python service

## Success Criteria

✅ You've successfully tested when:
1. Python service starts without errors
2. Node API starts without errors
3. Frontend loads in browser
4. You can upload an audio file
5. Stems are generated (4 files)
6. Stems load into tracks
7. You can play and mix the stems
8. You can export the final mix

## Next Steps

Once local testing works:
1. Test with different audio formats (MP3, WAV, FLAC)
2. Test with different song lengths
3. Test the mixer features (EQ, reverb, pan)
4. Prepare for EC2 deployment

## Getting Help

If you're stuck:
1. Check all 3 services are running
2. Check browser console for errors (F12)
3. Check Python service logs in Terminal 1
4. Check Node API logs in Terminal 2
5. Try restarting all services

Common issues are usually:
- Forgot to activate Python venv
- Wrong directory (make sure you're in `server/` for Python service)
- Port conflicts (something else using 3001 or 5000)
