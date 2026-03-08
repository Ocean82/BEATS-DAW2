*Archived 2026-03-03. Superseded by [docs/stem_guide.md](../../docs/stem_guide.md), [docs/detailed_stem_guides.md](../../docs/detailed_stem_guides.md), and [STEM_GUIDE_COMPLIANCE_REVIEW.md](../../STEM_GUIDE_COMPLIANCE_REVIEW.md).*

---

# Stem Splitter Direction Review

**Last updated:** 2026-03-02  
**Context:** Original browser DAW refactored toward a CPU-only stem splitter + simple mixer aimed at average music users (karaoke, remixing, simple re-balancing), running under WSL with no GPU access.

---

## 0. Agreed product vision (we're aligned)

- **Default experience:** App opens straight to a **beginner-friendly stem separator and mixer** page—easy to follow, no DAW jargon. No removal of existing features; we're **adding** this as the default and keeping the DAW elsewhere.
- **Beginner flow:** Users can:
  - Upload a song and separate it into stems (Drums, Bass, Vocals, Other).
  - Manipulate each part (volume, pan, mute/solo, presets).
  - Use one or more stems and **mix with parts of another uploaded song** (e.g. vocals from track A + drums from track B).
  - Apply fades in/out, adjust tempo, pitch, beats—**play DJ for a moment** and create their own remix.
  - Export the result.
- **Advanced users:** Full DAW (instruments, MIDI effects, sample library, etc.) remains available on a **separate page**, reached via a **menu button or screen tab**. Either: open straight to the beginner page and let users switch to "Advanced DAW" when they choose, or (later) add a landing/login and let them pick beginner vs advanced. For now: open to beginner page, with a clear way to go to Advanced DAW.
- **CPU-only:** Force CPU in the stem-splitting service; no GPU until/if the product generates income. Server will stay CPU-only for the foreseeable future. Keeps cost and complexity down.
- **Summary:** We are **not really removing much**—we're adding a beginner/average-user stem mixer as the default and moving the DAW to its own page so both audiences are served.

---

(Remaining sections 1–8 preserved as in original file for historical reference.)
