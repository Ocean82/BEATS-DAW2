*Archived 2026-03-03. For current setup see [GET_STARTED.md](../../GET_STARTED.md) and [WSL_SETUP_GUIDE.md](../../WSL_SETUP_GUIDE.md).*

---

# Virtual Environment Cleanup - COMPLETE ✅

**Date**: March 3, 2026  
**Action**: Removed Windows venv, prepared for WSL/AWS deployment

---

## What Was Done

### ✅ Removed
- `server/venv/` (Windows venv, 1.9 GB)
  - Reason: Won't work on AWS EC2 (Ubuntu)
  - Windows Python binaries incompatible with Linux

### ⏳ Next Steps Required
- Create WSL venv in `server/venv/`
- Install Python packages in WSL
- Test services in WSL

### ℹ️ Optional
- Remove `./venv/` (root WSL venv, 5.4 GB)
  - Not used by any scripts
  - Saves additional disk space

---

## Quick Setup Commands

### Create WSL venv (Required)

```bash
# Open WSL terminal
cd /mnt/d/DAW\ Collection/BEATS-DAW2/server

# Create venv
python3 -m venv venv

# Activate
source venv/bin/activate

# Install packages (~5-10 min)
pip install --upgrade pip
pip install -r requirements-python.txt

# Test
python python_service/stem_splitter.py
```

### Remove Root venv (Optional)

```bash
# From WSL:
cd /mnt/d/DAW\ Collection/BEATS-DAW2
rm -rf venv

# Or from Windows PowerShell:
Remove-Item -Recurse -Force venv
```

---

## Why This Matters for AWS

### Before (Windows venv)
```
Local: Windows Python → Windows binaries
AWS:   Ubuntu Python → Linux binaries
Result: ❌ Won't work, need to reinstall everything
```

### After (WSL venv)
```
Local: WSL Ubuntu Python → Linux binaries
AWS:   EC2 Ubuntu Python → Linux binaries  
Result: ✅ Identical environment, seamless deployment
```

---

## Disk Space Impact

| Item | Size | Status |
|------|------|--------|
| `server/venv/` (Windows) | 1.9 GB | ✅ Deleted |
| `./venv/` (WSL, unused) | 5.4 GB | ⏳ Optional delete |
| `server/venv/` (WSL, new) | ~2.0 GB | ⏳ To be created |
| **Net savings** | **5.3 GB** | After cleanup |

---

## Documentation Updated

- ✅ Created `WSL_SETUP_GUIDE.md` - Complete WSL setup instructions
- ✅ Created `VENV_CLEANUP_ANALYSIS.md` - Technical analysis
- ✅ Updated `readme.md` - Quick start now shows WSL first
- ℹ️ `GET_STARTED.md` - Already mentions WSL as primary

---

## Verification Checklist

After creating WSL venv, verify:

```bash
# 1. Check Python location
which python
# Should show: /mnt/d/.../server/venv/bin/python

# 2. Check packages
pip list | grep demucs
pip list | grep torch
pip list | grep flask

# 3. Test Python service
python python_service/stem_splitter.py
# Should start Flask on port 5000

# 4. Test health endpoint
curl http://localhost:5000/health
# Should return: {"status":"ok"}
```

---

## Summary

**Problem**: Had duplicate venvs (Windows + WSL), Windows venv won't work on AWS  
**Solution**: Removed Windows venv, documented WSL setup  
**Benefit**: Local environment now matches AWS EC2 exactly  
**Next**: Follow [WSL_SETUP_GUIDE.md](WSL_SETUP_GUIDE.md) to create WSL venv

---

## Files to Reference

1. **[WSL_SETUP_GUIDE.md](../../WSL_SETUP_GUIDE.md)** - Step-by-step WSL setup
2. **[VENV_CLEANUP_ANALYSIS.md](VENV_CLEANUP_ANALYSIS.md)** - Technical details (this archive)
3. **[readme.md](../../readme.md)** - Updated quick start
4. **[GET_STARTED.md](../../GET_STARTED.md)** - Full setup guide

---

**Ready to proceed?** Follow [WSL_SETUP_GUIDE.md](../../WSL_SETUP_GUIDE.md) to set up your WSL venv.
