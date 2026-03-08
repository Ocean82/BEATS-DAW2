*Archived 2026-03-03. For current setup see [GET_STARTED.md](../../GET_STARTED.md) and [WSL_SETUP_GUIDE.md](../../WSL_SETUP_GUIDE.md).*

---

# Virtual Environment Cleanup Analysis

**Date**: March 3, 2026  
**Issue**: Duplicate venv directories found in project

---

## Current Situation

### Found venv Directories

1. **Root venv** (`./venv/`)
   - Type: Linux/WSL venv
   - Python: `/usr/bin` (WSL Ubuntu)
   - Size: ~5.4 GB
   - Files: 28,583 files
   - Created for: WSL/Linux environment

2. **Server venv** (`./server/venv/`)
   - Type: Windows venv
   - Python: `C:\Users\sammy\AppData\Local\Programs\Python\Python312`
   - Size: ~1.9 GB
   - Files: 32,063 files
   - Created for: Windows environment

---

## Analysis

### Which venv is correct?

Based on the documentation and setup scripts:

**Primary Environment: WSL (Ubuntu)**
- GET_STARTED.md states: "Primary environment: WSL / Linux"
- start-local.sh checks for both `venv/bin/activate` and `../venv/bin/activate`
- The Python service runs in WSL

**Correct venv**: `./server/venv/` (but should be WSL-based, not Windows)

### Why the duplication?

1. **Root venv** (`./venv/`): Created in WSL at project root (5.4 GB)
   - This is a WSL/Linux venv
   - Likely created by running `python3 -m venv venv` from project root in WSL

2. **Server venv** (`./server/venv/`): Created in Windows at server/ (1.9 GB)
   - This is a Windows venv
   - Created by running `setup.bat` from Windows cmd
   - Points to Windows Python installation

### The Problem

You're using WSL for the server, but the `server/venv/` is a Windows venv. This won't work because:
- WSL cannot use Windows Python packages
- Windows cannot use WSL Python packages
- They have different binary formats and paths

---

## Recommended Solution

### Option 1: Use WSL Exclusively (RECOMMENDED)

Since you're running the server in WSL:

1. **Delete Windows venv**: Remove `./server/venv/` (Windows-based)
2. **Keep or recreate WSL venv in server/**: 
   - Either move `./venv/` to `./server/venv/`
   - Or create fresh: `cd server && python3 -m venv venv`
3. **Install packages in WSL**: `source server/venv/bin/activate && pip install -r server/requirements-python.txt`

### Option 2: Use Windows Exclusively

If you want to run everything in Windows (not WSL):

1. **Delete WSL venv**: Remove `./venv/` (WSL-based)
2. **Keep Windows venv**: Keep `./server/venv/`
3. **Run from Windows cmd**: Use `setup.bat` and `start-local.bat`

---

## Recommendation: Option 1 (WSL)

Since your documentation says "Primary environment: WSL / Linux" and you mentioned using WSL, I recommend:

### Step 1: Backup (if needed)
```bash
# If you have any custom packages, list them first
# From Windows PowerShell:
# server\venv\Scripts\pip.exe freeze > windows-packages.txt
```

### Step 2: Remove Windows venv
```bash
# From Windows PowerShell or cmd:
rmdir /s /q server\venv
```

### Step 3: Create WSL venv in server/
```bash
# From WSL terminal:
cd server
python3 -m venv venv
source venv/bin/activate
pip install -r requirements-python.txt
```

### Step 4: Remove root venv (optional)
```bash
# From Windows PowerShell:
rmdir /s /q venv
```

Or keep it if you want a backup, but update `.gitignore` to exclude both.

---

## Updated Workflow

After cleanup, your workflow should be:

### Starting the app (WSL):
```bash
# Terminal 1 (WSL) - Python service
cd server
source venv/bin/activate
python python_service/stem_splitter.py

# Terminal 2 (WSL) - Node API
cd server
npm run dev

# Terminal 3 (Windows or WSL) - Frontend
cd /mnt/d/DAW\ Collection/BEATS-DAW2  # or just navigate in Windows
npm run dev
```

### Or use the start script:
```bash
# From server/ in WSL:
bash start-local.sh

# Then in another terminal (Windows or WSL):
npm run dev
```

---

## Files to Update

### .gitignore
Ensure both venv directories are ignored:
```
venv/
server/venv/
```

### Documentation
Update any references to Windows-specific venv activation:
- GET_STARTED.md ✅ Already mentions WSL as primary
- server/setup.bat ⚠️ Should note it's for Windows-only setup
- server/start-local.bat ⚠️ Should note it's for Windows-only

---

## Summary

**Current State**: 
- Root venv (WSL, 5.4 GB) - Not used by scripts
- Server venv (Windows, 1.9 GB) - Wrong platform for WSL

**Recommended State**:
- Server venv (WSL) - Single venv in correct location
- Root venv - Removed

**Action Required**:
1. Delete `server/venv/` (Windows venv)
2. Create fresh WSL venv in `server/venv/`
3. Optionally delete root `venv/`
4. Update scripts to be clear about WSL vs Windows usage

**Disk Space Saved**: ~7.3 GB after cleanup
