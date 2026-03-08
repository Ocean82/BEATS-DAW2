# 🎵 Stem Splitter Quick Start

Your DAW has been refactored into a **Stem Splitter + Mixer** app!

## What It Does

Upload any song → AI splits it into 4 stems:
- 🥁 **Drums** - All percussion
- 🎸 **Bass** - Bass guitar, synth bass
- 🎤 **Vocals** - Lead and backing vocals  
- 🎹 **Other** - Everything else (guitars, keys, etc.)

Then mix them together with professional effects!

## Setup (5 minutes)

### 1. Install Python Dependencies

```bash
cd server
python -m venv venv

# Activate virtual environment
# Windows:
venv\Scripts\activate
# Mac/Linux:
source venv/bin/activate

# Install packages (this will download Demucs model ~300MB on first run)
pip install -r requirements-python.txt
```

### 2. Install Node Dependencies

```bash
# In server folder
npm install

# In root folder
cd ..
npm install
```

### 3. Start Everything

**Option A: One command (recommended)**
```bash
cd server
npm run dev:all
```

**Option B: Separate terminals**

Terminal 1 - Python service:
```bash
cd server
python python_service/stem_splitter.py
```

Terminal 2 - Node API:
```bash
cd server
npm run dev
```

Terminal 3 - Frontend:
```bash
npm run dev
```

### 4. Open the App

Visit: http://localhost:5173

Click the **🤖 AI Stem Split** button at the bottom!

## How to Use

1. Click "Choose Audio File" and select an MP3/WAV
2. Click "Split into Stems" (takes 2-5 minutes)
3. Click "Load All Stems to Tracks"
4. Mix with volume, pan, EQ, reverb
5. Export final mix as WAV

## Performance

- **CPU**: 2-5 minutes per song
- **GPU** (if you have CUDA): 30-60 seconds
- **Memory**: 2-4GB RAM during processing

## Troubleshooting

**"Python service unavailable"**
- Make sure you ran `python python_service/stem_splitter.py`
- Check it's running on port 5000

**"Out of memory"**
- Try a shorter song (< 4 minutes)
- Close other apps
- Use a smaller file format (MP3 instead of WAV)

**Slow processing**
- First run downloads the Demucs model (~300MB)
- CPU processing is slow but works
- Consider GPU instance on EC2 later

## Next Steps

Once you verify it works locally:

1. Deploy to EC2 t4g.medium (or g4dn.xlarge for GPU)
2. Add Redis queue for async processing
3. Add user accounts and project saving
4. Consider paid API (Replicate/Lalal.ai) for faster processing

## Tech Stack

- **Frontend**: React + Vite + Web Audio API
- **Backend**: Node.js + Express
- **AI**: Demucs (Facebook Research) - state-of-the-art stem separation
- **Audio**: PyTorch + Torchaudio

Enjoy! 🎉
