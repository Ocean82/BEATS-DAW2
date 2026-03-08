# WSL Setup Guide for AWS-Ready Development

**Purpose**: Set up your development environment to match AWS EC2 (Ubuntu)

---

## Why WSL?

Your AWS EC2 server will run Ubuntu Linux. By developing in WSL (Windows Subsystem for Linux), you ensure:
- ✅ Same Python packages and binaries as production
- ✅ Same file paths and permissions
- ✅ Same shell scripts work locally and on AWS
- ✅ No surprises when deploying

**Windows venv = Won't work on AWS**  
**WSL venv = Identical to AWS**

---

## Current Status

✅ Windows venv removed from `server/venv/` (was 1.9 GB)  
⏳ Need to create WSL venv in `server/venv/`  
ℹ️ Root `venv/` exists but isn't used by scripts (can be removed)

---

## Setup Steps

### 1. Open WSL Terminal

From Windows, open Ubuntu (WSL):
```bash
# Option A: Windows Terminal → Ubuntu tab
# Option B: Start menu → Ubuntu
# Option C: PowerShell → wsl
```

### 2. Navigate to Project

```bash
cd /mnt/d/DAW\ Collection/BEATS-DAW2/server
```

### 3. Create WSL venv

```bash
# Create virtual environment
python3 -m venv venv

# Activate it
source venv/bin/activate

# Verify it's active (should show (venv) in prompt)
which python
# Should output: /mnt/d/DAW Collection/BEATS-DAW2/server/venv/bin/python
```

### 4. Install Python Packages

```bash
# Install all dependencies (~5-10 minutes first time)
pip install --upgrade pip
pip install -r requirements-python.txt

# Verify installation
python -c "import demucs; print('Demucs installed!')"
python -c "import torch; print('PyTorch installed!')"
python -c "import flask; print('Flask installed!')"
```

### 5. Test Python Service

```bash
# Still in server/ with venv activated
python python_service/stem_splitter.py
```

You should see:
```
 * Serving Flask app 'stem_splitter'
 * Running on http://127.0.0.1:5000
```

Press Ctrl+C to stop, then continue.

### 6. Install Node Packages

```bash
# Still in server/
npm install

# Go to project root for frontend packages
cd ..
npm install
```

---

## Running the App (WSL)

### Option A: Use Start Script

`start-local.sh` starts **Python** (port 5000) and **Node API** (port 3001) only. Run the frontend from **project root** in a second terminal.

```bash
# Terminal 1 (WSL) - Start Python + Node API
cd /mnt/d/DAW\ Collection/BEATS-DAW2/server
source venv/bin/activate   # if not already active
bash start-local.sh

# Terminal 2 (Windows or WSL) - Start Frontend
cd /mnt/d/DAW\ Collection/BEATS-DAW2
npm run dev
```

Then open **http://localhost:5173** (Stem Mixer is the default landing).

### Option B: Manual (3 Terminals)

```bash
# Terminal 1 (WSL) - Python Service
cd /mnt/d/DAW\ Collection/BEATS-DAW2/server
source venv/bin/activate
python python_service/stem_splitter.py

# Terminal 2 (WSL) - Node API
cd /mnt/d/DAW\ Collection/BEATS-DAW2/server
npm run dev

# Terminal 3 (Windows or WSL) - Frontend
cd /mnt/d/DAW\ Collection/BEATS-DAW2
npm run dev
```

Then open: **http://localhost:5173**

---

## Verifying Setup

### Check Python Environment

```bash
cd server
source venv/bin/activate

# Should show WSL path, not Windows
which python
# ✅ /mnt/d/.../server/venv/bin/python
# ❌ /c/Users/.../Python312/python.exe

# Check installed packages
pip list | grep demucs
pip list | grep torch
pip list | grep flask
```

### Check Services

```bash
# Python service
curl http://localhost:5000/health
# Should return: {"status":"ok"}

# Node API
curl http://localhost:3001/api/stems/health
# Should return: {"status":"ok","python_service":"ok"}
```

---

## Optional: Remove Root venv

The root `venv/` directory (5.4 GB) isn't used by any scripts. You can remove it:

```bash
# From WSL
cd /mnt/d/DAW\ Collection/BEATS-DAW2
rm -rf venv
```

Or from Windows PowerShell:
```powershell
Remove-Item -Recurse -Force venv
```

This saves 5.4 GB of disk space.

---

## Troubleshooting

### "python3: command not found"

Install Python in WSL:
```bash
sudo apt update
sudo apt install python3 python3-pip python3-venv
```

### "pip: command not found"

```bash
sudo apt install python3-pip
```

### "Cannot activate venv"

Make sure you're in WSL, not Windows cmd:
```bash
# This works in WSL:
source venv/bin/activate

# This is for Windows cmd (won't work in WSL):
venv\Scripts\activate.bat
```

### "Module not found" after installation

Make sure venv is activated:
```bash
source venv/bin/activate
# Should see (venv) in prompt
pip install -r requirements-python.txt
```

### Slow pip install

First-time installation downloads ~2GB of packages. This is normal.

---

## AWS Deployment Comparison

### Local (WSL)
```bash
cd server
source venv/bin/activate
python python_service/stem_splitter.py
```

### AWS EC2 (Ubuntu)
```bash
cd server
source venv/bin/activate
python python_service/stem_splitter.py
```

**Identical!** Your local WSL setup matches AWS exactly.

---

## File Structure After Setup

```
BEATS-DAW2/
├── server/
│   ├── venv/              ← WSL venv (Linux binaries)
│   │   ├── bin/           ← Linux executables
│   │   ├── lib/           ← Python packages
│   │   └── pyvenv.cfg
│   ├── python_service/
│   ├── requirements-python.txt
│   └── start-local.sh     ← Use this in WSL
├── node_modules/
└── package.json
```

---

## Next Steps

1. ✅ WSL venv created in `server/venv/`
2. ✅ Python packages installed
3. ✅ Services tested locally
4. ⏳ Test stem splitting with a song
5. ⏳ Deploy to AWS EC2 (will use same setup)

---

## Summary

**Before**: 
- Windows venv (1.9 GB) - Won't work on AWS ❌
- Root WSL venv (5.4 GB) - Not used by scripts ❌

**After**:
- Server WSL venv - Matches AWS exactly ✅
- Disk space saved: 7.3 GB 💾

**Development**: Use WSL for Python service, Windows or WSL for frontend  
**Production**: Same commands work on AWS EC2 Ubuntu
