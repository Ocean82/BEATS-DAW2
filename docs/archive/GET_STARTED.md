# 🚀 Get Started with Stem Splitter

Welcome! Your DAW has been transformed into a powerful AI stem splitter and mixer. This guide will get you up and running in 10 minutes.

**Environment: WSL / Linux.** The project runs on WSL locally and **Ubuntu on the server**. Use a Linux-style venv: `python3 -m venv venv` and `source venv/bin/activate`. No Windows-native tooling is used on the server.

## What You'll Build (stem guide workflow)

1. **Upload** — Choose an audio file (MP3, WAV, FLAC, etc.)
2. **Split** — AI separates into 4 stems (Drums, Bass, Vocals, Other)
3. **Load** — Load stems to mixer tracks
4. **Mix** — Adjust volume, pan, presets; apply mastering (LUFS, presets, A/B)
5. **Export** — Download WAV (and optionally stems)

See [docs/stem_guide.md](docs/stem_guide.md) and [docs/detailed_stem_guides.md](docs/detailed_stem_guides.md) for the full product spec.

## Prerequisites

- **WSL2** (recommended) or Linux / macOS
- Python 3.8 or higher
- Node.js 18 or higher
- 4GB+ free RAM
- 2GB+ free disk space

## Installation (5 minutes)

### Step 1: Check Your Setup

From the project root or `server/`:

```bash
cd server
bash check-setup.sh
```

This verifies Python, Node, venv (`venv/bin/activate`), and dependencies. If you see errors, follow the script’s instructions.

### Step 2: Run Setup

If check-setup passed, run setup. From `server/`: create venv if needed (`python3 -m venv venv`), then `source venv/bin/activate`, then `pip install -r requirements-python.txt`. Then run `npm install` in `server/` and `npm install` in project root.

Setup will:
- Create Python virtual environment
- Install Demucs AI model (~300MB download)
- Install all dependencies
- Set up the project

**Note:** First-time setup takes 5-10 minutes due to downloads.

### Step 3: Start the App

**Start the server first, then the frontend.**

1. **Start the server (backend):** In a WSL terminal, from the project directory:
   ```bash
   cd server
   source venv/bin/activate
   bash start-local.sh
   ```
   Leave this terminal open. Python runs on port 5000, Node API on port 3001.

   **If you see "Address already in use" or "Port 5000/3001 is in use":** In WSL run `fuser -k 5000/tcp 3001/tcp`, then run `bash start-local.sh` again.

2. **Start the frontend:** Open a second terminal. From the **project root** run:
   ```bash
   npm run dev
   ```

3. **Open the app:** In your browser go to **http://localhost:5173**. The app opens on the **Stem Mixer** page by default.

## First Test (5 minutes)

The app opens on the **Stem Mixer** page (beginner-friendly). You can switch to **Advanced DAW** via the header button for timeline, instruments, and full mixer.

### 1. Upload a Song (on Stem Mixer)
- Click "Choose Audio File"
- Select an MP3 or WAV (start with a short song, 2-3 minutes)
- Supported formats: MP3, WAV, FLAC, OGG, M4A

### 2. Split Stems
- Click "✨ Split into Stems"
- Wait 2-5 minutes (CPU processing)
- You'll see progress updates

### 3. Review Results
You'll get 4 stems:
- 🥁 **Drums** - All percussion
- 🎸 **Bass** - Bass instruments
- 🎤 **Vocals** - All vocals
- 🎹 **Other** - Everything else

### 4. Load to Mixer
- Click "✓ Load All Stems to Tracks"
- 4 tracks appear; use the on-page mixer (volume, pan, mute/solo, presets)

### 5. Mix, Master & Export
- On the Stem Mixer page: adjust tempo (BPM), pitch (semitones), master volume, and per-stem volume/pan/mute/solo
- Use mix presets (Karaoke, Instrumental, Acapella) and mastering presets (Spotify, YouTube, Club, etc.); use A/B toggle to compare unmastered vs mastered
- Click **Export Mix** to save as WAV. In Advanced DAW, press **Spacebar** to play/pause and use the transport Export button

## Quick Reference

### Keyboard Shortcuts
- **Spacebar** - Play/Pause
- **Ctrl+S** - (Future: Save project)

### Service URLs
- Frontend: http://localhost:5173
- Node API: http://localhost:3001
- Python Service: http://localhost:5000

### Health Checks
- Node API: http://localhost:3001/api/stems/health
- Python Service: http://localhost:5000/health

## Troubleshooting

### "Python service unavailable"
1. Check Terminal 1 - Python service should be running
2. Visit http://localhost:5000/health
3. Should return: `{"status": "ok"}`

**Fix (WSL):**
```bash
cd server   # or cd to project root if venv is there
source venv/bin/activate   # or source ../venv/bin/activate from server/
python python_service/stem_splitter.py
```

**Fix (Windows cmd):**
```bash
cd server
venv\Scripts\activate
python python_service\stem_splitter.py
```

### "venv/bin/activate: No such device" when running from Cursor/IDE
WSL can return "No such device" when the project is on a Windows drive (e.g. `D:\`) and a script runs in a non-interactive WSL session—the drive may not be accessible in that context (folder-mounted volume, SUBST, or launch environment). **Workaround:** Start the server from a **real WSL terminal** (e.g. open Ubuntu from the Start menu, `cd` to your project, then run `cd server && source venv/bin/activate && bash start-local.sh`). Or work from a path inside WSL (e.g. `~/projects/BEATS-DAW2`) so the venv is on the Linux filesystem.

### "No module named 'torch.hub'" or Python stem service fails in WSL
If the venv was created or used from Windows, torch may be the wrong build for Linux. In WSL, from `server/`:
```bash
source venv/bin/activate
pip uninstall -y torch torchaudio
pip install 'torch>=2.1.0,<2.5' 'torchaudio>=2.1.0,<2.5' --index-url https://download.pytorch.org/whl/cpu
```
Then start the Python service again.

### "Out of memory"
- Try a shorter song (< 3 minutes)
- Close other applications
- Restart the Python service

### Slow Processing
- First run downloads the AI model (~300MB) - this is normal
- CPU processing takes 2-5 minutes per song
- Subsequent runs are faster
- GPU processing (if available) is 30-60 seconds

### Port Already in Use
If you see "Address already in use" or "Port 5000 is in use":

**WSL / Linux (port 5000 – Python):**
```bash
# Find process using port 5000
lsof -i :5000
# Or: fuser 5000/tcp
# Kill it (use the PID from the second column)
kill <PID>
```

**WSL / Linux (port 3001 – Node):**
```bash
lsof -i :3001
kill <PID>
```

**Use a different port:** In `server/.env` set:
```bash
PYTHON_SERVICE_PORT=5001
PYTHON_SERVICE_URL=http://localhost:5001
```
Then restart Python and Node (Node reads `PYTHON_SERVICE_URL`; Python reads `PYTHON_SERVICE_PORT`).

## File Limits

- Max upload size: 100MB
- Recommended: Songs under 5 minutes
- Longer songs work but take more time

## Performance Tips

### For Faster Processing
1. Use shorter songs for testing
2. Close unnecessary applications
3. Use MP3 instead of WAV (smaller files)
4. Consider GPU instance for production

### For Better Quality
1. Use high-quality source files
2. Avoid heavily compressed MP3s
3. WAV/FLAC gives best results

## Next Steps

### Learn More
- [TEST_INSTRUCTIONS.md](TEST_INSTRUCTIONS.md) - Detailed testing guide
- [REFACTOR_SUMMARY.md](REFACTOR_SUMMARY.md) - Technical details
- [server/README_STEM_SPLITTER.md](server/README_STEM_SPLITTER.md) - Backend docs

### Deploy to Production
1. Test thoroughly locally
2. Set up AWS EC2 instance
3. Install dependencies on EC2
4. Configure nginx reverse proxy
5. Set up SSL certificate
6. Add domain name

### Enhance the App
- Add user accounts
- Add project saving
- Add more effects
- Add stem preview before download
- Add batch processing
- Add payment system

## Getting Help

If you're stuck:

1. **Check Services**
   - All 3 terminals should be running
   - No error messages in any terminal

2. **Check Browser Console**
   - Press F12 in browser
   - Look for errors in Console tab

3. **Restart Everything**
   ```bash
   # Stop all services (Ctrl+C in each terminal)
   # Then restart
   cd server
   start-local.bat
   ```

4. **Re-run Setup**
   ```bash
   cd server
   setup.bat
   ```

## Common Issues

### "Module not found"
**WSL:** `source venv/bin/activate` (or `source ../venv/bin/activate` from server/), then `pip install -r requirements-python.txt`

**Windows:** `cd server`, `venv\Scripts\activate`, `pip install -r requirements-python.txt`

### "Cannot find module"
```bash
cd server
npm install
cd ..
npm install
```

### "CUDA out of memory"
- You have a GPU but not enough VRAM
- The app will automatically fall back to CPU
- This is normal and expected

## Success Checklist

✅ Setup completed without errors
✅ All 3 services start successfully
✅ Frontend loads in browser
✅ Can upload an audio file
✅ Stems are generated (4 files)
✅ Stems load into tracks
✅ Can play and mix stems
✅ Can export final mix

## What's Next?

Once you've tested locally and everything works:

1. **Optimize Performance**
   - Add progress indicators
   - Add queue system
   - Add caching

2. **Deploy to EC2**
   - Choose instance type (CPU vs GPU)
   - Set up production environment
   - Configure monitoring

3. **Add Features**
   - User accounts
   - Project saving
   - Collaboration
   - More effects

4. **Monetize**
   - Free tier (5 songs/month)
   - Paid tiers
   - API access
   - White-label licensing

## Support

Need help? Check these resources:
- TEST_INSTRUCTIONS.md - Detailed testing
- REFACTOR_SUMMARY.md - Technical overview
- server/README_STEM_SPLITTER.md - Backend details

## License

MIT - Free to use and modify

---

**Ready to start?**

**WSL:** `cd server && bash check-setup.sh` then `source venv/bin/activate` and `bash start-local.sh`; in a second terminal from project root: `npm run dev`.

**Windows:** `cd server` then `check-setup.bat` and `start-local.bat`; in a second terminal from project root: `npm run dev`.

Then open http://localhost:5173. 🎵
