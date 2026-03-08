# Models Investigation and Recommendations

**Date:** March 3, 2026  
**Scope:** Stem separation, mixer, and mastering — best models and usage for **CPU-only** server.  
**Conclusion:** ONNX models are the best fit for this project on CPU; use your existing MDX-Net ONNX models for 2-stem (vocals/instrumental) and optionally keep Demucs for 4-stem.

---

## 1. Executive Summary

| Area | Recommendation | Reason |
|------|----------------|--------|
| **Stem separation** | Prefer **ONNX (MDX-Net)** for 2-stem; **Demucs (PyTorch)** or ONNX multi-pass for 4-stem | ONNX Runtime is faster and lighter on CPU; you already have suitable ONNX models. Demucs gives 4 stems in one pass but is heavier. |
| **Mixer** | No model | DSP only (Web Audio API). |
| **Master** | No model | DSP only (LUFS, limiter, stereo width in `masteringEngine.ts`). |

For a **CPU-only** server, ONNX is the most efficient choice for stem separation: smaller dependency footprint, faster inference than PyTorch on CPU in typical benchmarks, and your `models/` folder already contains production-ready MDX-Net ONNX files.

---

## 2. Inventory of Models in `models/`

### 2.1 ONNX models (recommended for CPU)

All run with **ONNX Runtime** (`pip install onnxruntime`), CPU-only via `providers=['CPUExecutionProvider']`.

| Location | File | Size | Purpose |
|----------|------|------|---------|
| `models/mdxnet_models/` | Kim_Vocal_2.onnx | 63.7 MB | Vocals (2-stem) |
| | UVR-MDX-NET-Voc_FT.onnx | 63.7 MB | Vocals, fine-tuned (2-stem) |
| | UVR_MDXNET_KARA_2.onnx | 50.3 MB | Karaoke (vocals/instrumental) |
| | Reverb_HQ_By_FoxJoy.onnx | 63.7 MB | Reverb separation |
| `models/MDX_Net_Models/` | UVR-MDX-NET-Inst_HQ_5.onnx | 56.3 MB | Instrumental HQ (2-stem) |
| | UVR_MDXNET_1_9703.onnx | 28.3 MB | Vocals/Inst variant 1 |
| | UVR_MDXNET_2_9682.onnx | 28.3 MB | Vocals/Inst variant 2 |
| | UVR_MDXNET_3_9662.onnx | 28.3 MB | Vocals/Inst variant 3 |
| | UVR_MDXNET_KARA.onnx | 28.3 MB | Karaoke |

**Stem types:** Your ONNX set covers **Vocals**, **Instrumental**, and **Karaoke** (2-stem). It does **not** include dedicated Drums, Bass, or Other ONNX models in this repo; those exist as configs in `model_data` (e.g. for other checkpoints/versions).

**Research alignment:** The project has **every model mentioned** in [docs/summerized-model-research.md](summerized-model-research.md): Demucs 4 (`htdemucs_ft`), Demucs 6-stem (`htdemucs_6s`), KUIELab-MDXNET23C (4-stem ONNX), MDX-Net HQ_4 & HQ_5, and MDX23C-InstVoc HQ (in your repo as ONNX and/or .ckpt under `models/` and `models/MDX_Net_Models/`). The recommendations below use this full set.

### 2.2 Two MDX directories compared (both examined)

You have **two separate MDX model directories**. Both were examined; here is the difference.

| Aspect | `models/mdxnet_models/` | `models/MDX_Net_Models/` |
|--------|--------------------------|----------------------------|
| **ONNX files** | 4 files: Kim_Vocal_2.onnx, Reverb_HQ_By_FoxJoy.onnx, UVR-MDX-NET-Voc_FT.onnx, UVR_MDXNET_KARA_2.onnx | 5 files: UVR-MDX-NET-Inst_HQ_5.onnx, UVR_MDXNET_1_9703.onnx, UVR_MDXNET_2_9682.onnx, UVR_MDXNET_3_9662.onnx, UVR_MDXNET_KARA.onnx |
| **Config layout** | Single file: `model_data.json` only. **No YAML configs** in this folder. | Full layout: `model_data/model_data.json`, `model_data/model_name_mapper.json`, and `model_data/mdx_c_configs/*.yaml` (25+ YAMLs). |
| **model_data.json** | Hash → params (compensate, mdx_dim_f_set, primary_stem, etc.) plus some hash → `config_yaml` (e.g. model_2_stem_061321.yaml, model1/2/3, modelA/B, sndfx, model_2_stem_full_band). **Does not contain** `is_roformer`, `model_type`, or `is_karaoke`. | Same classic MDX hash→params, **plus** entries that have only `config_yaml` (model1/2/3, modelA/B, sndfx, model_2_stem_*, etc.), **plus** many extra keys: `is_roformer`, `model_type`, `is_karaoke`, and config_yaml for Roformer, SCNet, Bandit, MDX23C. |
| **YAML configs** | **None on disk.** References like `model_2_stem_061321.yaml` point to filenames that exist only under `MDX_Net_Models/model_data/mdx_c_configs/`. | All inference YAMLs present (chunk_size, n_fft, hop_length, dim_t, num_overlap, etc.). Required for correct chunking and FFT when running ONNX. |
| **Human-readable names** | No name mapper in this folder. | `model_name_mapper.json` maps file names to display names (e.g. "UVR_MDXNET_1_9703" → "UVR-MDX-NET 1"). |
| **Other assets** | None. | 2× Roformer `.ckpt` (~610 MB each), plus a `.tmp`; these are PyTorch, not ONNX. |

**Implications:**

- **mdxnet_models** is a **slim set**: four ONNX files and one JSON. To run these ONNX models you must either (a) use only the inline params in `model_data.json` (compensate, mdx_dim_f_set, mdx_dim_t_set, mdx_n_fft_scale_set) and derive chunk/FFT from them, or (b) load the YAML configs from `MDX_Net_Models/model_data/mdx_c_configs/` by config name (same filenames as in the JSON).
- **MDX_Net_Models** is **self-contained** for inference: all ONNX files, full `model_data.json`, name mapper, and every YAML config in `model_data/mdx_c_configs/`. The YAMLs define `audio.chunk_size`, `audio.n_fft`, `audio.hop_length`, `inference.dim_t`, `inference.num_overlap`, etc., which must match the ONNX model. Use this directory as the single source of truth for config when implementing the ONNX backend.
- **Overlap:** Vocals and karaoke appear in both (e.g. Kim_Vocal_2 / Voc_FT in mdxnet_models; UVR_MDXNET_1/2/3 and KARA in MDX_Net_Models). The smaller UVR_MDXNET_1/2/3 (28 MB) use different configs (e.g. model1/model2/model3.yaml with n_fft 8192) than the larger vocals ONNX in mdxnet_models (~64 MB, often n_fft 6144/7680). Choose by quality/speed trade-off and stick to the config from the same directory.

**Recommendation:** Implement the stem splitter ONNX backend against **`models/MDX_Net_Models/`** (and its `model_data/` subfolder) so that every ONNX file has a corresponding YAML and name mapping. If you want to use the four ONNX files in **mdxnet_models**, either copy their metadata into the same structure or resolve their `config_yaml` references to the YAMLs in `MDX_Net_Models/model_data/mdx_c_configs/`.

### 2.3 PyTorch / other (not ONNX)

| Location | File | Size | Notes |
|----------|------|------|--------|
| `models/` (root) | MDX23C-8KFFT-InstVoc_HQ.ckpt | — | MDX23C-InstVoc HQ (2-stem vocals/instrumental, 8K FFT). PyTorch. Config: `MDX_Net_Models/model_data/mdx_c_configs/` (MDX23C configs). |
| `models/` (root) | MDX23C_D1581.ckpt | — | MDX23C-InstVoc D1581. PyTorch. |
| `models/` (root) | model_bs_roformer_ep_937_sdr_10.5309.ckpt | — | BS-Roformer-Viperx-1053. PyTorch. Config: `model_bs_roformer_ep_937_sdr_10.5309.yaml` in `MDX_Net_Models/model_data/mdx_c_configs/`. |
| `models/MDX_Net_Models/` | model_bs_roformer_ep_317_sdr_12.9755.ckpt, model_bs_roformer_ep_368_sdr_12.9628.ckpt | ~610 MB each | BS-Roformer; PyTorch, large. |
| `models/v5_July_2021_5_Models/models/` | HP*.pth, Vocal_HP*.pth | ~121–525 MB | Legacy VR/HP architecture; PyTorch. |
| `models/` | silero_vad.jit | 1.4 MB | Silero VAD (TorchScript); optional for voice detection. |

These require PyTorch and are heavier and slower on CPU than ONNX for inference. Not recommended as primary path on a CPU-only server.

### 2.5 Recently added (UVR VIP package)

The following were added from the **UVR VIP package** and live at **`models/`** (repo root):

| File | Display name | Type | Use |
|------|--------------|------|-----|
| MDX23C-8KFFT-InstVoc_HQ.ckpt | MDX23C-InstVoc HQ | PyTorch (.ckpt) | 2-stem vocals/instrumental (8K FFT). |
| MDX23C_D1581.ckpt | MDX23C-InstVoc D1581 | PyTorch (.ckpt) | 2-stem vocals/instrumental. |
| model_bs_roformer_ep_937_sdr_10.5309.ckpt | BS-Roformer-Viperx-1053 | PyTorch (.ckpt) | BS-Roformer variant (SDR 10.53). |

- **Config:** Use `models/MDX_Net_Models/model_data/model_data.json` and `model_data/mdx_c_configs/*.yaml` for inference params (e.g. `model_bs_roformer_ep_937_sdr_10.5309.yaml`, MDX23C configs). Display names are in `model_data/model_name_mapper.json`.
- **CPU-only:** These are PyTorch checkpoints, so they run on CPU but are heavier than ONNX. For best CPU efficiency, prefer the ONNX models in `mdxnet_models/` and `MDX_Net_Models/`; use these VIP .ckpt models when you want these specific variants (e.g. MDX23C-InstVoc HQ or BS-Roformer-Viperx-1053).

### 2.6 Current project usage

- **Stem splitter:** `server/python_service/stem_splitter.py` uses **Demucs `htdemucs`** (PyTorch), loaded via `get_model("htdemucs")` from the internet at runtime. The **`models/`** directory is **not** used by the stem splitter today.

---

## 3. Why ONNX Is Best for This Project (CPU-Only)

### 3.1 Performance and deployment

- **Faster CPU inference:** In common benchmarks, ONNX Runtime on CPU is often 20–40% faster than PyTorch for the same model (e.g. 110 ms vs 165 ms in one YOLO-style comparison). For heavy audio models, this reduces time-to-result and improves throughput.
- **Lighter stack:** Deployment needs `onnxruntime` only for inference, not the full PyTorch/torchaudio/demucs stack. Fewer dependencies and smaller Docker/images.
- **Portability:** One ONNX file per model; no framework-specific checkpoint loading. Easier to version and ship.
- **Optimizations:** ONNX Runtime applies graph and CPU-specific optimizations; PyTorch is tuned more for flexibility and training.

### 3.2 Trade-offs

- **4-stem in one shot:** Demucs `htdemucs` outputs drums, bass, other, vocals in a single forward pass. With your current ONNX set you get **2-stem** (vocals/instrumental or karaoke) per model. To get 4-stem with ONNX you’d need either:
  - Multiple MDX-Net–style models (e.g. vocals, then instrumental split further), or
  - A single 4-stem ONNX model (e.g. Demucs exported to ONNX when that ecosystem matures).
- **Demucs ONNX:** Community work (e.g. `demucs.onnx`, `demucs-onnx-export`) and GSOC 2025 efforts are progressing; official Demucs v4 ONNX export is still evolving. So for now, “best CPU efficiency” points to **MDX-Net ONNX** for 2-stem.

---

## 4. Recommended Models and How to Use Them

### 4.1 For 2-stem (Vocals / Instrumental) — primary recommendation

Use **ONNX** with your existing files:

- **Vocals:** `UVR-MDX-NET-Voc_FT.onnx` or `Kim_Vocal_2.onnx` (both ~64 MB, vocals-focused).
- **Instrumental:** `UVR-MDX-NET-Inst_HQ_5.onnx` (56 MB, high-quality instrumental).

Typical flow: one run with a vocals model → vocals stem; same mix with an instrumental model → instrumental stem. Or use a single 2-stem model that outputs both masks in one pass (implementation depends on the exact MDX-Net inference code).

**Suggested layout:** Prefer **`models/MDX_Net_Models/`** as the single config source (it has all YAMLs and the name mapper). Use ONNX files from either folder: vocals from `mdxnet_models` (e.g. Kim_Vocal_2, Voc_FT) or from `MDX_Net_Models` (UVR_MDXNET_1/2/3), and instrumental from `MDX_Net_Models` (UVR-MDX-NET-Inst_HQ_5.onnx). Resolve config from `MDX_Net_Models/model_data/` so chunk/FFT match each model.

### 4.2 For 4-stem (Drums, Bass, Other, Vocals)

- **Option A — Keep Demucs:** Leave current Demucs `htdemucs` path as-is for 4-stem. Heavier on CPU but one pass, no extra ONNX models needed.
- **Option B — Hybrid:** Use ONNX for 2-stem (vocals/instrumental) as default; offer “4-stem (Demucs)” as an optional, slower mode.
- **Option C — Future:** When Demucs ONNX export is stable, replace PyTorch Demucs with an ONNX Demucs model for 4-stem on CPU.

### 4.3 Model config (MDX-Net)

Each ONNX model has an entry in `model_data.json` keyed by a hash of the filename (or similar). The payload includes:

- `primary_stem`: `"Vocals"`, `"Instrumental"`, `"Other"`, `"Reverb"`, etc.
- `mdx_dim_f_set`, `mdx_dim_t_set`, `mdx_n_fft_scale_set`: FFT/segment settings for inference.
- `compensate`: gain compensation factor.

Use the config that matches the ONNX file (via your existing mapper or by matching filename to hash) so that chunk size, n_fft, and overlap match the model.

### 4.4 Silero VAD (`silero_vad.jit`)

Optional: run Silero VAD before/after separation to detect voice segments or to gate non-vocal regions. Keeps dependency on TorchScript (PyTorch). Only add if you need VAD; it is not required for stem separation.

---

## 5. Mixer and Mastering — No Models

- **Mixer:** Implemented in the frontend and Web Audio API (faders, pan, mute/solo, EQ, compressor, sends). No AI models.
- **Mastering:** Implemented in `src/audio/masteringEngine.ts` (LUFS, limiter, stereo width, presets). No AI models.

No changes recommended here; no “model choice” to make.

---

## 6. Implementation Outline (Stem Splitter)

1. **Add ONNX path in `stem_splitter`**
   - Add a second backend (e.g. `backend="onnx"`) that:
     - Loads ONNX models from `models/mdxnet_models/` or `models/MDX_Net_Models/` using `onnxruntime.InferenceSession(..., providers=['CPUExecutionProvider'])`.
     - Uses the correct `model_data.json` (and optional `model_name_mapper.json`) to get `primary_stem`, `mdx_n_fft_scale_set`, `compensate`, etc.
   - Keep existing Demucs path for 4-stem or as fallback.

2. **Inference pipeline for MDX-Net ONNX**
   - Load audio; resample to 44.1 kHz if needed; stereo.
   - Split into chunks (e.g. per `model_data` chunk_size / overlap).
   - For each chunk: STFT → run ONNX session → apply mask → iSTFT → apply `compensate`.
   - Concatenate/overlap-add chunks; write stems (vocals and/or instrumental WAVs).

3. **Dependencies**
   - For ONNX: `onnxruntime` (CPU only: no `onnxruntime-gpu`).
   - For Demucs 4-stem: keep `demucs`, `torch`, `torchaudio`.

4. **Config**
   - Environment or config: `STEM_BACKEND=onnx` vs `demucs`; `STEM_ONNX_MODEL_DIR=models/mdxnet_models` (or `MDX_Net_Models`); optional `STEM_2STEM_MODEL` / `STEM_VOCALS_MODEL` / `STEM_INST_MODEL` for file names.

5. **API**
   - Same `/split` contract; optional query or body flag: `stem_mode=2` (ONNX 2-stem) vs `stem_mode=4` (Demucs 4-stem when backend is demucs).

Reference implementation pattern: [seanghay/uvr-mdx-infer](https://github.com/seanghay/uvr-mdx-infer) (CLI for UVR MDX-NET with ONNX).

---

## 7. Summary Table

| Goal | Best choice | Where it lives | Runtime |
|------|-------------|-----------------|--------|
| 2-stem (vocals/instrumental), CPU | ONNX (MDX-Net) | `models/mdxnet_models/`, `models/MDX_Net_Models/` | onnxruntime (CPU) |
| 4-stem (drums, bass, other, vocals), CPU | Demucs htdemucs (current) or future Demucs ONNX | Code / future export | PyTorch today |
| Karaoke 2-stem | ONNX (UVR_MDXNET_KARA / KARA_2) | Same folders | onnxruntime (CPU) |
| Reverb separation | ONNX (Reverb_HQ_By_FoxJoy) | `models/mdxnet_models/` | onnxruntime (CPU) |
| 2-stem VIP (MDX23C / BS-Roformer) | PyTorch .ckpt (UVR VIP) | `models/` root (MDX23C-*, model_bs_roformer_ep_937*) | PyTorch (CPU) |
| Mixer | — | N/A (DSP) | Web Audio API |
| Mastering | — | N/A (DSP) | TypeScript |

---

## 8. Best path forward (from research summary)

Based on [docs/summerized-model-research.md](summerized-model-research.md) and your full model set, this is the recommended path for a **CPU-only** server.

### 8.1 Model mapping (research → your repo)

| Research name | In your repo | Use for |
|---------------|--------------|--------|
| **MDX-Net HQ_4** | In `models/` (MDX_Net_Models / mdxnet_models) | 2-stem: cleaner instrumentals, fast CPU. |
| **MDX-Net HQ_5** | `UVR-MDX-NET-Inst_HQ_5.onnx` | 2-stem: faster, slightly muddier than HQ_4. |
| **MDX23C-InstVoc HQ** | `MDX23C-8KFFT-InstVoc_HQ.ckpt` and/or ONNX if present | 2-stem: best quality, full-band, minimal vocal bleed; slower. |
| **Demucs 4 (htdemucs_ft)** | Demucs fine-tuned 4-stem (load in stem_splitter) | 4-stem: best CPU-friendly drums/bass/other/vocals. |
| **Demucs 6-stem (htdemucs_6s)** | If present in Demucs_Models or loadable | 6-stem: experimental (piano, guitar); more bleed. |
| **KUIELab-MDXNET23C (4-stem)** | In `models/` (ONNX 4-stem) | 4-stem: faster than Demucs, slightly lower SDR; good drums. |

### 8.2 Recommended workflows

**2-stem (vocals / instrumental)**  
- **Best quality:** MDX23C-InstVoc HQ (your `.ckpt` or ONNX). Full-band, least vocal bleed.  
- **Best speed:** MDX-Net HQ_5 (`UVR-MDX-NET-Inst_HQ_5.onnx`) or HQ_4.  
- Use ONNX when available for CPU; use .ckpt only when you need this specific model and accept PyTorch on CPU.

**4-stem (drums, bass, other, vocals) — best quality on CPU (research-recommended)**  
1. **Step 1 — Vocals out first (ONNX):** Run the full track through **MDX23C-InstVoc HQ** or **MDX-Net HQ_4**. Save **vocals** and **instrumental**.  
2. **Step 2 — Split instrumental (Demucs):** Run the **instrumental** from step 1 through **Demucs 4 (`htdemucs_ft`)**. You get drums, bass, other (melody), and a clean instrumental; keep the vocals from step 1.  
3. *Why:* Demucs can leave vocal bleed on drums/bass. Stripping vocals first with ONNX gives Demucs a clean instrumental → better bass/drums/other.

**4-stem — single-pass (simpler, slower)**  
- **Option A:** Demucs 4 (`htdemucs_ft`) only on the full mix (one pass, no pre-vocal strip).  
- **Option B:** KUIELab-MDXNET23C 4-stem ONNX only (faster than Demucs, slightly less accurate).

**6-stem (experimental)**  
- Use **Demucs 6-stem (`htdemucs_6s`)** only when you need piano/guitar splits; expect more bleed.

### 8.3 CPU settings (from research)

Use these in your stem_splitter / inference code to avoid freezing and long runs:

| Architecture | Parameter | Value | Notes |
|--------------|-----------|--------|--------|
| **MDX-Net (ONNX)** | Segment size | **256** (or **512** if 16GB+ RAM) | Higher = more quality but more CPU/RAM. |
| | Overlap | **0.5 – 0.75** | Avoid 0.99; diminishing returns, much slower. |
| | Volume compensation | Auto | Use `compensate` from model_data. |
| **Demucs (4/6-stem)** | Shifts | **0 or 2** | 10–20 = best quality but hours on CPU. |
| | Overlap | **0.25** (default) or **0.75** max | |

### 8.4 Implementation order

1. **Phase 1:** Add ONNX backend for 2-stem using **HQ_5** and **HQ_4** (and MDX23C-InstVoc HQ if ONNX available), with config from `models/MDX_Net_Models/model_data/`. Apply segment size and overlap from the table above.  
2. **Phase 2:** Add 4-stem hybrid: same ONNX step for vocals/instrumental, then run instrumental through **Demucs 4 (`htdemucs_ft`)**; wire `stem_mode=4` to this two-step flow.  
3. **Phase 3 (optional):** Support KUIELab-MDXNET23C 4-stem ONNX as a single-pass 4-stem option; support `htdemucs_6s` for 6-stem.

---

## 9. References

- **Community stem-separation guide (local):** [docs/stem-models-doc.md](stem-models-doc.md) — full deton24 guide (UVR/MDX-Net/MDX23C/Demucs/BS-Roformer/Mel-Roformer/MSST/MVSEP etc.). Same content as the [Google Doc PDF](http://docs.google.com/document/d/17fjNvJzj8ZGSer7c7OFe_CNfUKbAxEh_OBv94ZdRG5c/export?format=pdf). Use for “best models” lists, chunk_size/phase notes, and model comparisons.
- ONNX Runtime Python API: [onnxruntime inference](https://onnxruntime.ai/docs/get-started/with-python.html).
- UVR-style MDX-NET ONNX inference: [seanghay/uvr-mdx-infer](https://github.com/seanghay/uvr-mdx-infer).
- Demucs: [facebookresearch/demucs](https://github.com/facebookresearch/demucs).
- Demucs ONNX / CPU: [sevagh/demucs.onnx](https://github.com/sevagh/demucs.onnx), [dhunstack/demucs-onnx-export](https://github.com/dhunstack/demucs-onnx-export); GSOC 2025 Demucs→ONNX (Mixxx blog).
- Project stem splitter: `server/python_service/stem_splitter.py`.
- Model metadata: `models/mdxnet_models/model_data.json` (params only; no YAMLs in that folder), `models/MDX_Net_Models/model_data/model_data.json` (full + Roformer/SCNet etc.), `models/MDX_Net_Models/model_data/model_name_mapper.json`. YAML configs: `models/MDX_Net_Models/model_data/mdx_c_configs/*.yaml`.
