# Model strategy comparison

**Date:** March 3, 2026  
**Compared:** [model-strategy.md](model-strategy.md) (your plan) vs [MODELS_INVESTIGATION_AND_RECOMMENDATIONS.md](MODELS_INVESTIGATION_AND_RECOMMENDATIONS.md) §8 (recommendations plan).

**Criteria:** Stability, quality, speed. We choose the higher-scoring plan, or a combination if it scores better.

---

## 1. Side-by-side summary

| Aspect | Your plan (model-strategy.md) | Recommendations plan (§8) |
|--------|------------------------------|----------------------------|
| **Stage 1 (vocal vs inst)** | BS-Roformer-Viperx-1297 (ONNX). Fallback: Kim_Vocal_2 (ONNX). | MDX23C-InstVoc HQ or MDX-Net HQ_4 (ONNX). Speed: HQ_5. |
| **Stage 2 (4-stem)** | htdemucs_ft (v4 ONNX) on instrumental. | Demucs 4 (htdemucs_ft) on instrumental (PyTorch in current stack). |
| **Instrumental source** | **Phase inversion:** Original − Vocals = Instrumental (no second model pass). | Use model’s instrumental output from Stage 1. |
| **Other stem** | Optional: inst_temp − (drums + bass) = other (phase-perfect). | From Demucs “other” output only. |
| **Vocal refinement** | Optional: UVR-Denoise; optional ensemble Kim_Vocal_2 + Roformer (Avg/Avg). | Not specified. |
| **MDX/MDX-like** | Segment 256, **Overlap 2**. | Segment 256 (or 512 if 16GB+ RAM), **Overlap 0.5–0.75**. |
| **Demucs** | **Shifts 0** (fast) or 1 (quality), Overlap 0.25, split mode. | Shifts **0 or 2**, Overlap 0.25 or 0.75 max. |
| **Runtime assumption** | All ONNX (Roformer + Demucs). | ONNX for 2-stem; Demucs as PyTorch unless ONNX available. |

---

## 2. Scoring (1–5 per criterion)

### 2.1 Stability

| Criterion | Your plan | Recommendations plan |
|-----------|-----------|------------------------|
| Sequential processing (no parallel CPU overload) | 5 | 5 |
| Segment size 256 to avoid RAM spikes / freezing | 5 | 5 |
| Split/long-file handling (Demucs) | 5 (split mode) | 4 (not explicit) |
| Phase inversion (deterministic inst = orig − voc) | 5 (no 2nd pass, reproducible) | 3 (depends on model output) |
| Dependency on ONNX for Roformer | 4 if ONNX exists, **2 if only .ckpt** | 5 (uses MDX-Net ONNX only for Stage 1) |
| **Stability total** | **24** (or **21** if Roformer only .ckpt) | **22** |

- **Your plan** is more stable when phase inversion and split mode are used, and when BS-Roformer and htdemucs_ft are both available in ONNX. If Roformer is only `.ckpt` (PyTorch), CPU load and risk of OOM go up.
- **Recommendations plan** is more stable under “current reality”: MDX-Net ONNX (proven) + PyTorch Demucs (proven); no assumption of Roformer or Demucs ONNX.

### 2.2 Quality

| Criterion | Your plan | Recommendations plan |
|-----------|-----------|------------------------|
| Vocal isolation (SOTA / least phasing) | 5 (BS-Roformer when ONNX) | 4 (MDX23C/HQ_4 very good, not Roformer-tier) |
| Phase-perfect instrumental (inversion) | 5 | 3 |
| Phase-perfect “Other” (optional inversion) | 5 | 3 |
| Optional ensemble (e.g. Kim + Roformer) | 5 | 3 (not specified) |
| Optional denoise on vocals | 5 | 3 (not specified) |
| Demucs on clean instrumental (no vocal bleed) | 5 | 5 |
| **Quality total** | **30** | **21** |

- **Your plan** wins on quality: best vocal model, phase inversion, optional ensemble and denoise.
- **Recommendations plan** matches on “Demucs on instrumental”; loses on vocal choice, phase logic, and optional refinements.

### 2.3 Speed

| Criterion | Your plan | Recommendations plan |
|-----------|-----------|------------------------|
| Single vocal pass + inversion (no 2nd pass for inst) | 5 | 3 (or 5 if model outputs both in one go) |
| Demucs Shifts 0 | 5 | 4 (suggests 0 or 2) |
| Low overlap Stage 1 (Overlap 2 vs 0.5–0.75) | 5 | 3 |
| Fast fallback (Kim_Vocal_2 ~30–40% faster) | 5 | 4 (HQ_5 for speed) |
| All-ONNX pipeline | 5 if available | 4 (Demucs likely PyTorch) |
| **Speed total** | **25** | **19** |

- **Your plan** is faster: phase inversion, Shifts 0, lower overlap, explicit fast fallback, all-ONNX when available.
- **Recommendations plan** is still reasonable but more conservative on overlap and shifts.

---

## 3. Overall scores

| Plan | Stability | Quality | Speed | **Total** |
|------|-----------|--------|--------|-----------|
| **Your plan** | 24 (or 21*) | 30 | 25 | **79 (or 76*)** |
| **Recommendations plan** | 22 | 21 | 19 | **62** |

\* 21 if BS-Roformer is only .ckpt (no ONNX).

**Your plan scores higher** on quality and speed and ties or leads on stability (with phase inversion and split mode), assuming ONNX is available for Roformer and Demucs where you specified them.

---

## 4. Recommended choice: combined plan

Your plan wins on **quality** and **speed** and is strong on **stability**. The only real risk is **relying on ONNX for BS-Roformer and htdemucs_ft** when, in the repo today, Roformer is `.ckpt` and Demucs is typically PyTorch. A **combined plan** keeps your logic and adds fallbacks so stability stays high even when ONNX is missing.

### 4.1 Adopt from your plan (keep as-is)

- **Hybrid pipeline:** Stage 1 = vocal vs instrumental; Stage 2 = Demucs on instrumental only.
- **Phase inversion:** Instrumental = Original − Vocals (no second model pass; phase-perfect, faster).
- **Optional:** Other = inst_temp − (drums + bass) for phase-perfect “Other.”
- **CPU settings:** Segment size **256**; MDX overlap **2** (or equivalent low); Demucs **Shifts 0** (or 1 for quality), **Overlap 0.25**; **split mode** for long files.
- **Speed fallback:** If Stage 1 is too slow, use **Kim_Vocal_2 (ONNX)** instead of Roformer (~30–40% faster).
- **Quality options:** Optional ensemble (e.g. Kim_Vocal_2 + Stage 1 vocals, Avg/Avg); optional UVR-Denoise on vocals.
- **Config / inversion:** Use your JSON config and Python inversion logic (original − vocals → instrumental) in the app.

### 4.2 Add from recommendations plan (fallbacks and clarity)

- **Stage 1 model choice (in order of preference):**
  1. **BS-Roformer-Viperx-1297 (ONNX)** if present in `models/` (e.g. exported from model_bs_roformer_ep_317_sdr_12.9755.ckpt).
  2. Else **MDX23C-InstVoc HQ (ONNX)** if available.
  3. Else **MDX-Net HQ_4** then **HQ_5** (ONNX) for balance of quality/speed.
  4. **Kim_Vocal_2 (ONNX)** when prioritizing speed over maximum vocal quality.
- **Stage 2:** **htdemucs_ft** in **ONNX if available**, else **PyTorch** (current stem_splitter pattern). Same pipeline: run on the phase-inverted instrumental.
- **Stability:** If Roformer is only .ckpt, prefer MDX23C/HQ_4/HQ_5 (ONNX) for Stage 1 to avoid heavy PyTorch Roformer on CPU; keep your phase inversion and split mode either way.

### 4.3 Resulting combined workflow

1. **Stage 1:** Vocal extraction with BS-Roformer (ONNX) or fallback MDX23C/HQ_4/HQ_5/Kim_Vocal_2 (ONNX). Segment 256, Overlap 2 (or 0.5). Output: `vocal_stem`.
2. **Inversion:** `instrumental_temp = original − vocal_stem` (your Python logic). Clip and export for Stage 2.
3. **Stage 2:** Run `instrumental_temp` through **htdemucs_ft** (ONNX or PyTorch). Shifts 0 (or 1), Overlap 0.25, split mode. Outputs: drums, bass, other (and optionally discard Demucs “vocals”).
4. **Optional:** Other = `instrumental_temp − drums − bass`; ensemble vocals (e.g. Kim + Stage 1); denoise vocals.
5. **Delivery:** Vocals (Stage 1), Drums, Bass, Other (Stage 2 or inversion).

This keeps **your plan as the primary strategy** (highest quality and speed) and adds **explicit fallbacks** so stability stays high when Roformer/Demucs ONNX are not available.

---

## 5. Verdict

| Question | Answer |
|----------|--------|
| Which plan has the **highest probability** of being most stable? | **Your plan** (with phase inversion + split mode); **combined** is best if we add ONNX fallbacks for Stage 1. |
| Best quality? | **Your plan** (Roformer, phase inversion, optional ensemble/denoise). |
| Fastest? | **Your plan** (inversion, Shifts 0, Overlap 2, Kim_Vocal_2 fallback). |
| Single plan or combination? | **Combination:** Your plan as the core; add recommendations’ **model fallback order** and **PyTorch Demucs** when ONNX is not available. |

**Recommended doc to treat as canonical:** [model-strategy.md](model-strategy.md), with Stage 1 model selection and Stage 2 runtime behavior updated to match the combined plan above (and a short reference to this comparison for fallbacks).

**Model locations and imports:** See [combined-plan-model-inventory.md](combined-plan-model-inventory.md) for where each model lives in `BEATS-DAW2\models` and what was imported from `D:\DAW Collection\stem-models` / `all-uvr-models`.
