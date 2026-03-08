# Model Implementation Status

**Date:** March 4, 2026  
**Purpose:** Single reference for latest model strategy vs current code. Use with [MODELS_INVESTIGATION_AND_RECOMMENDATIONS.md](MODELS_INVESTIGATION_AND_RECOMMENDATIONS.md), [model-strategy-comparison.md](model-strategy-comparison.md), and [combined-plan-model-inventory.md](combined-plan-model-inventory.md).

---

## 1. Canonical strategy (from docs)

The **combined plan** ([model-strategy-comparison.md](model-strategy-comparison.md)) is the agreed approach:

| Step | Action | Models / logic |
|------|--------|----------------|
| **Stage 1** | Vocal vs instrumental | Prefer: BS-Roformer (ONNX) → MDX23C-InstVoc HQ → HQ_4 → HQ_5 → Kim_Vocal_2 (ONNX). Config: `models/MDX_Net_Models/model_data/`. CPU: Segment 256, Overlap 2 (or 0.5). |
| **Phase inversion** | Instrumental source | `instrumental_temp = original − vocal_stem` (numpy/librosa). No second model pass. |
| **Stage 2** | 4-stem on instrumental | Demucs `htdemucs_ft` (or `htdemucs`) on `instrumental_temp`. ONNX if available, else PyTorch. Shifts 0 (or 1), Overlap 0.25, split mode. |
| **Optional** | Other stem | `other = instrumental_temp − drums − bass` (phase-perfect). Optional ensemble/denoise on vocals. |

- **Mixer / Mastering:** No models; DSP only (Web Audio API, `masteringEngine.ts`). No change.
- **Config source for ONNX/MDX:** `models/MDX_Net_Models/model_data/` (model_data.json, model_name_mapper.json, mdx_c_configs/*.yaml).

---

## 2. Models on disk (verified)

| Location | Contents |
|----------|----------|
| `models/` (root) | Kim_Vocal_2.onnx, UVR-MDX-NET-Inst_HQ_5.onnx, MDX23C-*.ckpt, model_bs_roformer_ep_937*.ckpt, htdemucs.pth, silero_vad.jit, BS-Roformer-Viperx-1297 (no ext) |
| `models/mdxnet_models/` | Kim_Vocal_2.onnx, Reverb_HQ_By_FoxJoy.onnx, UVR-MDX-NET-Voc_FT.onnx, UVR_MDXNET_KARA_2.onnx, model_data.json |
| `models/MDX_Net_Models/` | UVR-MDX-NET-Inst_HQ_4.onnx, UVR-MDX-NET-Inst_HQ_5.onnx, UVR_MDXNET_1/2/3_*.onnx, UVR_MDXNET_KARA.onnx, Roformer .ckpt, full model_data/ + mdx_c_configs/ |
| `models/v5_July_2021_5_Models/` | Legacy VR/HP .pth (PyTorch) |

All combined-plan Stage 1 and Stage 2 assets are present; config and YAMLs are under `MDX_Net_Models/model_data/`.

---

## 3. Current implementation vs strategy

| Doc requirement | Implemented? | Where / note |
|-----------------|--------------|--------------|
| Stage 1 vocal extraction (ONNX/MDX) | **Yes** | `mdx_onnx.extract_vocals()`; model order: Kim_Vocal_2, Voc_FT, HQ_4, HQ_5. |
| Stage 1 model fallback order | **Yes** | `mdx_onnx.VOCAL_MODEL_PATHS`; first existing file used. |
| Stage 1 CPU settings (chunk / overlap) | **Yes** | From model_data + YAML; override `STEM_MDX_CHUNK_SAMPLES`. |
| Phase inversion (original − vocals → instrumental) | **Yes** | `_phase_inversion()` in stem_splitter; used before Stage 2. |
| Stage 2 Demucs on instrumental only | **Yes** | `_split_stems_hybrid_4()` runs Demucs on instrumental_temp only. |
| Local htdemucs.pth | **Yes** | Loaded from `models/htdemucs.pth` if present. |
| Stage 2 Shifts 0 / Overlap 0.25 / split | **Yes** | `apply_model(..., shifts=0, overlap=0.25, split=True)`. |
| ONNX backend / onnxruntime | **Yes** | `mdx_onnx.py`; `requirements-python.txt` includes onnxruntime. |
| 2-stem mode | **Yes** | Hybrid 2-stem: Stage 1 + inversion; else Demucs sum. |
| 4-stem mode | **Yes** | Hybrid 4-stem when `STEM_BACKEND=hybrid` and ONNX available. |
| Optional phase-perfect Other | **Yes** | `STEM_PHASE_PERFECT_OTHER=1` → other = inst_temp − drums − bass. |
| Resolve model_data.json / YAML per ONNX | **Yes** | `_get_config_for_onnx()` by file hash; YAML from mdx_c_configs. |

**Summary:** The **combined plan** is implemented. Default `STEM_BACKEND=hybrid` uses Stage 1 ONNX → phase inversion → Stage 2 Demucs for 4-stem; 2-stem uses Stage 1 + inversion. Set `STEM_BACKEND=demucs_only` for single-pass Demucs.

---

## 4. Guideline alignment

- **STEM_GUIDES_AND_PROJECT_REVIEW.md:** “Model selection (Fast vs High Quality): Missing” — still accurate.
- **combined-plan-model-inventory.md §5 Implementation checklist:** All items unchecked — still accurate.
- **START_HERE.md / README_STEM_SPLITTER.md:** Describe Demucs 4-stem only; no mention of ONNX or hybrid pipeline — consistent with current code.

No doc contradicts the above; the gap is between **documented strategy** and **code**, not between docs.

---

## 5. Recommended implementation order

1. **Phase 1 — ONNX 2-stem (fast path)**  
   Add `STEM_BACKEND=onnx` (or equivalent): load one ONNX model from `models/MDX_Net_Models/` (e.g. UVR-MDX-NET-Inst_HQ_5.onnx or Kim_Vocal_2.onnx), use `model_data` + mdx_c_configs for chunk/FFT, run STFT → ONNX → iSTFT. Expose 2-stem via existing `stem_mode=2` or a dedicated endpoint. Add `onnxruntime` to requirements.

2. **Phase 2 — Hybrid 4-stem (combined plan)**  
   Implement Stage 1 (vocal extraction with ONNX fallback order) → phase inversion (original − vocals) → Stage 2 (Demucs on instrumental). Use local `htdemucs.pth` if present, else `get_model("htdemucs")` or `htdemucs_ft`. Apply Shifts 0, Overlap 0.25, and segment/split for long files.

3. **Phase 3 — Config and UX**  
   Env or config for backend (onnx vs demucs), model choice (e.g. quality/speed), and optional phase-perfect “Other” (inst_temp − drums − bass). Optional: ensemble/denoise for vocals.

---

## 6. References

- [MODELS_INVESTIGATION_AND_RECOMMENDATIONS.md](MODELS_INVESTIGATION_AND_RECOMMENDATIONS.md) — model inventory, ONNX vs PyTorch, implementation outline.
- [model-strategy.md](model-strategy.md) — hybrid pipeline, phase inversion, JSON config.
- [model-strategy-comparison.md](model-strategy-comparison.md) — combined plan and fallbacks.
- [combined-plan-model-inventory.md](combined-plan-model-inventory.md) — paths and checklist.
- [summerized-model-research.md](summerized-model-research.md) — best ONNX/CPU models and workflows.
- Implementation: `server/python_service/stem_splitter.py`, `server/requirements-python.txt`.
