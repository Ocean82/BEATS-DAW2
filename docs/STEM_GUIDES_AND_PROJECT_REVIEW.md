# Stem Guides & Project Implementation Review

**Date:** March 3, 2026  
**Scope:** All stem guides and outlines in `docs/`, project implementation alignment, Ubuntu/WSL and CPU-only setup.

**Authoritative specs:** [stem_guide.md](stem_guide.md) · [detailed_stem_guides.md](detailed_stem_guides.md)

---

## 1. Docs Reviewed

| Document | Purpose |
|----------|---------|
| **stem_guide.md** | Main product spec: MVP + Phase 2 for Stem Separation, Mixer, Mastering, Project Management, Technical Infrastructure, UX. |
| **detailed_stem_guides.md** | Same content in alternate form (Must-Have vs Enhanced, ideal workflow, monetization). |
| **MIDI_EFFECTS.md** | MIDI effects (Arpeggiator, Quantizer, etc.) — separate from stem workflow. |
| **archive/** | STEM_APP_DIRECTION_REVIEW, SETUP_AND_UI_AUDIT, VENV_* — historical; direction aligns with CPU-only, WSL, stem mixer as default. |

---

## 2. Workflow: Guide vs Project

**Guide’s ideal flow:**  
`Import → Review → Mix → Master → Export`

**Project flow:**  
`Upload → Split → Load to tracks → Mix (levels, tempo, pitch, presets) → Master (LUFS, presets, A/B) → Export`

**Verdict:** Aligned. The app adds an explicit “Load to tracks” step after separation; the rest matches. Default landing is Stem Mixer; Advanced DAW is a separate page. No mixing of beginner vs advanced flows.

---

## 3. Stem Separator: Guide vs Implementation

| Guide requirement | Status | Implementation |
|-------------------|--------|----------------|
| Drag & drop upload | Missing | File input button only (`StemSplitter.tsx`). |
| Formats (MP3, WAV, FLAC, AAC, OGG) | Done | Backend + frontend accept MP3, WAV, FLAC, OGG, M4A, AAC. |
| File size limit | Done | 100MB (Node + Python). |
| 2/4/5 stem options | Partial | 4-stem only (Drums, Bass, Vocals, Other). No 2-stem or 5-stem. |
| Model selection (Fast vs High Quality) | Missing | Single model `htdemucs`; no toggle. |
| Progress indicators | Done | “Uploading…”, “Separating stems…”, “✓ Stems ready!”. |
| Pre-processing preview | Missing | No short snippet preview before full split. |
| Mute/Solo per stem | Done | In mixer after Load to tracks. |
| Stem cleanup / noise reduction | Missing | No vocal cleanup toggle. |
| Multi-track export (ZIP) | Done | “Download All Stems (ZIP)” in `StemSplitter.tsx` (JSZip). |

**Summary:** 4-stem separation, formats, progress, ZIP export, and mute/solo are in place. Missing: drag-and-drop, 2/5-stem modes, model choice, preview, stem cleanup.

---

## 4. Mixer (DAW-Lite): Guide vs Implementation

| Guide requirement | Status | Implementation |
|-------------------|--------|----------------|
| Channel strips (volume, pan, mute, solo) | Done | `StemMixerView` per-stem faders and pan. |
| Volume fader (-∞ to +6 dB) | Done | 0–1 range (UI); gain staging in engine. |
| Pan knob | Done | Per stem. |
| Mute / Solo | Done | Per stem. |
| Invert Phase | Done | Per-stem phase button; `phaseInverted` in store and `audioEngine`. |
| Master bus + peak monitoring | Done | Master volume; VU/peak in Advanced DAW mixer. |
| 3-band EQ | Done | EffectsPanel / track effects. |
| Compressor | Done | Threshold/ratio in track effects. |
| Saturation / “Vibe” | Partial | Present but not explicitly labeled as saturation. |
| Send effects (Reverb, Delay) | Done | Global sends. |
| Waveform multi-track view | Done | Timeline when stems loaded. |
| Transport (play, stop, loop) | Done | TransportBar. |
| Reset Mix | Done | “Reset Mix” in `StemMixerView` (volume, pan, mute, solo, phase). |
| Horizontal zoom | Done | Timeline zoom. |
| Undo/Redo (50 steps) | Missing | No history stack in `dawStore`. |
| Bussing/grouping (Phase 2) | Missing | No “Link Vol/Pan” or groups. |

**Summary:** Core mixer and Reset Mix are implemented. Invert Phase is present. Missing: undo/redo, grouping.

---

## 5. Mastering Suite: Guide vs Implementation

| Guide requirement | Status | Implementation |
|-------------------|--------|----------------|
| LUFS metering (Integrated, Short-term) | Done | `MasteringPanel` + `masteringEngine`; Analyze button. |
| True Peak (dBTP) | Done | Display in MasteringPanel. |
| Limiter (ceiling, threshold, target LUFS) | Done | `masteringEngine` + UI. |
| Stereo width | Done | Width control in mastering. |
| Spectral analysis (FFT) | Done | MixerPanel spectrum. |
| One-click presets (Spotify, YouTube, Club, Podcast, etc.) | Done | `MASTERING_PRESETS` in MasteringPanel. |
| A/B comparison (unmastered vs mastered) | Done | `masteringBypass` in StemMixerView (“A: Original” / “B: Mastered”). |
| Dithering toggle | Done | `mastering.ditherEnabled`; toggle in MasteringPanel; used in WAV export. |

**Summary:** Mastering is implemented as specified: LUFS, True Peak, limiter, presets, A/B, dithering. Phase 2 items (multiband dynamics, EQ curve matching, 24/32-bit options) are not required for MVP.

---

## 6. Project & Workflow Management: Guide vs Implementation

| Guide requirement | Status | Implementation |
|-------------------|--------|----------------|
| Cloud save / auto-save | Missing | No persistence. |
| Undo/Redo (50 steps) | Missing | No history in store. |
| Version control (multiple project versions) | Missing | Not implemented. |
| Export formats (WAV 16/24, MP3 128/320, OGG) | Partial | WAV (16-bit) and MP3 (192 kbps) in ExportModal. No OGG, no 24-bit WAV option. |
| Batch stem download (ZIP) | Done | “Download All Stems (ZIP)” in StemSplitter. |
| Single master file download | Done | “Export Mix” → ExportModal → WAV or MP3. |
| Metadata (Artist, Title, ISRC) | Missing | No fields in export. |

**Summary:** Export and stem ZIP work. Missing: cloud save, undo/redo, versions, OGG/24-bit, metadata.

---

## 7. Technical Infrastructure & Ubuntu / CPU-Only

| Guide / requirement | Status | Implementation |
|---------------------|--------|----------------|
| Server-side AI (Python/PyTorch) | Done | `server/python_service/stem_splitter.py` (Demucs). |
| CPU-only stem separation | Done | `stem_splitter.py`: `DEVICE = os.environ.get("STEM_DEVICE", "cpu").lower()`; forced to `"cpu"` if not cuda. |
| Client-side mixing/mastering | Done | Web Audio API; no server for mix/master. |
| WebSocket/polling for progress | Partial | Single request/response for split; no streaming progress %. |
| WASM for DSP | Missing | Not used; Web Audio used instead. |
| Canvas waveform/spectrum | Done | Timeline and spectrum. |
| SSL / auto-deletion of files | Partial | Dev only for SSL; no documented auto-deletion policy. |
| Ubuntu / WSL structure | Done | `check-setup.sh`, `start-local.sh` are bash; WSL venv preferred; `GET_STARTED.md` and `WSL_SETUP_GUIDE.md` describe Ubuntu/WSL. |

**Project structure for Ubuntu/WSL:**

- **Server:** `server/` — Node API + Python stem service. Run with `bash start-local.sh` (from `server/`), then `npm run dev` from project root for frontend.
- **Python:** `python3 -m venv venv`, `source venv/bin/activate`, `pip install -r requirements-python.txt`. Scripts assume `venv/bin/activate` (WSL/Linux).
- **CPU-only:** No GPU required; `stem_splitter.py` uses CPU by default; docs state 2–5 minutes per song on CPU.

**Verdict:** Project is structured for Ubuntu/WSL and CPU-only as intended. No project code depends on GPU; third-party packages in venv may reference CUDA but are not used for inference.

---

## 8. Missing Features / Gaps (Prioritized)

**High (guide MVP, not yet in app)**  
- Drag-and-drop upload in Stem Splitter.  
- Undo/Redo (history stack, e.g. 50 steps).  
- Onboarding / tooltips (e.g. LUFS, stem separation).

**Medium (guide MVP or common expectation)**  
- 2-stem and 5-stem separation options (backend + UI).  
- Model selection (Fast vs High Quality).  
- Pre-processing preview (short snippet before full split).  
- Stem cleanup / noise reduction toggle for vocals.  
- OGG export and/or 24-bit WAV option.  
- Metadata (Artist, Title, ISRC) on export.

**Lower (Phase 2 / infra)**  
- Cloud save and project versions.  
- WebSocket or polling for real-time split progress (e.g. %).  
- Auto-deletion policy for uploaded/processed files.  
- Bussing/grouping (Link Vol/Pan).

---

## 9. Conclusion

- **Flow:** The app follows the guide’s flow (Import → Review → Mix → Master → Export), with an explicit “Load to tracks” step. Stem Mixer is default; Advanced DAW is separate.  
- **Stem separator:** 4-stem, formats, progress, ZIP, and mute/solo match the guide; drag-drop, 2/5-stem, model choice, preview, and cleanup are missing.  
- **Mixer:** Channel strips, Reset Mix, Invert Phase, EQ, compressor, sends, transport, and zoom match; undo/redo and grouping are missing.  
- **Mastering:** LUFS, True Peak, limiter, presets, A/B, and dithering match the guide.  
- **Ubuntu / WSL / CPU:** Setup and scripts are WSL/Ubuntu-friendly; stem separation is CPU-only in project code and documented as such.

The project largely reflects the stem separator, mixer, and mastering features described in the guides. The main gaps are: drag-and-drop upload, undo/redo, onboarding, optional stem modes (2/5) and model selection, and project persistence (cloud save, metadata, OGG/24-bit). The existing **STEM_GUIDE_COMPLIANCE_REVIEW.md** in the project root is outdated (e.g. it lists Reset Mix, Invert Phase, ZIP, MP3, and dithering as missing); the tables above reflect the current implementation.
