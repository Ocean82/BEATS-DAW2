# Combined plan model inventory

**Date:** March 5, 2026  
**Purpose:** Single source of truth for where each model lives for the [combined plan](model-strategy-comparison.md) (Stage 1: vocal extraction → Phase inversion → Stage 2: Demucs on instrumental).

**Primary location (runtime):** `BEATS-DAW2\models` — all paths used by the app resolve under the repo. See [AGENT-models-and-implementation.md](AGENT-models-and-implementation.md) for no-external-links policy.  
**External bank (copy source only, never link):** `D:\DAW Collection\stem-models` and `D:\DAW Collection\stem-models\all-uvr-models`. Copy required files into `BEATS-DAW2\models`; do not use symlinks/junctions so server deploy remains self-contained.

---

## 1. What was imported into BEATS-DAW2

The following were **copied** (real files, no symlinks) from the external bank into BEATS so the combined plan has everything in one place:

| Model / file | Copied from | Destination in BEATS |
|--------------|-------------|----------------------|
| **UVR-MDX-NET-Inst_HQ_4.onnx** | `stem-models\all-uvr-models\` | `models\MDX_Net_Models\UVR-MDX-NET-Inst_HQ_4.onnx` |
| **BS-Roformer-Viperx-1297** (no extension) | `stem-models\all-uvr-models\` | `models\BS-Roformer-Viperx-1297` |
| **model_bs_roformer_ep_368_sdr_12.9628.ckpt** | `stem-models\MDX_Net_Models\` | `models\MDX_Net_Models\model_bs_roformer_ep_368_sdr_12.9628.ckpt` |

All other combined-plan models were already present under `BEATS-DAW2\models` (see below).

---

## 2. Combined plan model locations (BEATS-DAW2\models)

Use these paths in the stem_splitter / config.

### Stage 1 — Vocal extraction (pick one in order of preference)

| Preference | Model | Path in BEATS | Format | Note |
|------------|--------|----------------|--------|------|
| 1 | BS-Roformer-Viperx-1297 | `models\BS-Roformer-Viperx-1297` | File (no ext) | Best quality; may be ONNX or custom. |
| 1b | model_bs_roformer_ep_317_sdr_12.9755.ckpt | `models\MDX_Net_Models\` | .ckpt (PyTorch) | Same model as Viperx-1297; use if BS-Roformer-Viperx-1297 not loadable. |
| 2 | MDX23C-InstVoc HQ | `models\MDX23C-8KFFT-InstVoc_HQ.ckpt` | .ckpt | Full-band, minimal vocal bleed; slower. |
| 3 | MDX-Net HQ_4 | `models\MDX_Net_Models\UVR-MDX-NET-Inst_HQ_4.onnx` | ONNX | Cleaner instrumentals; CPU-friendly. |
| 4 | MDX-Net HQ_5 | `models\MDX_Net_Models\UVR-MDX-NET-Inst_HQ_5.onnx` | ONNX | Faster, slightly muddier than HQ_4. |
| 5 (speed) | Kim_Vocal_2 | `models\mdxnet_models\Kim_Vocal_2.onnx` | ONNX | ~30–40% faster fallback. |

Config for MDX/Roformer: `models\MDX_Net_Models\model_data\model_data.json` and `model_data\mdx_c_configs\*.yaml`. Display names: `model_data\model_name_mapper.json`.

### Phase inversion

No model. Use: **instrumental = original − vocals** (see [model-strategy.md](model-strategy.md)). Implement in Python (e.g. numpy/librosa) in the stem_splitter.

### Stage 2 — 4-stem split (Demucs on instrumental)

| Model | Path in BEATS | Format | Note |
|--------|----------------|--------|------|
| htdemucs (default) | Loaded via `demucs.pretrained.get_model("htdemucs")` (or local weight) | PyTorch | Current stem_splitter default. |
| htdemucs.pth | `models\htdemucs.pth` | .pth | Local Demucs weights; use if stem_splitter is updated to load from path. |
| htdemucs_ft | Demucs pretrained name `htdemucs_ft` if available, or local | PyTorch / ONNX | Best 4-stem quality; use when available. |

Config: Demucs Shifts 0 (or 1), Overlap 0.25, split mode for long files.

### Optional — Other stem by inversion

**other = instrumental_temp − drums − bass** (no extra model). Implement in stem_splitter if you want phase-perfect “Other”.

---

## 3. Server deployment: copies only, no symlinks or reparse points

**All assets under `models\` must be real files inside the project.** No symlinks, junctions, or reparse points pointing outside `BEATS-DAW2`. This keeps the models directory self-contained for server deploy (e.g. Ubuntu) and avoids breaks from linked items.

- **Do not** create symlinks or junctions from `BEATS-DAW2\models` to `D:\DAW Collection` or `stem-models`. Always **copy** required files into the repo.
- **Before deploy:** Ensure any new or updated models are **copied** into `models\` (or the correct subfolder). Verify no reparse points:
  - **PowerShell:** `Get-ChildItem .\models -Recurse -Force | Where-Object { $_.Attributes -band [System.IO.FileAttributes]::ReparsePoint }` (should return nothing).
  - **Bash/WSL:** `find models -type l` (should return nothing).

---

## 4. External bank quick reference

If something is missing or you need another variant:

| Source | Contents (summary) |
|--------|--------------------|
| **D:\DAW Collection\stem-models** | htdemucs.pth, Kim_Vocal_2.onnx, UVR-MDX-NET-Inst_HQ_5.onnx, silero_vad.jit, v5_July_2021_5_Models, MDX_Net_Models (with full model_data + mdx_c_configs). |
| **D:\DAW Collection\stem-models\all-uvr-models** | BS-Roformer-Viperx-1297, UVR-MDX-NET-Inst_HQ_4.onnx, UVR-MDX-NET-Inst_HQ_5.onnx, MDX23C-*.ckpt, model_bs_roformer_ep_*.ckpt, mdxnet_models-onnx/, MDX_Net_Models-onnx/, various zips and UVR installers. |

Copy any needed file into the corresponding folder under `BEATS-DAW2\models` (e.g. ONNX → `models\MDX_Net_Models\` or `models\mdxnet_models\`, configs → `models\MDX_Net_Models\model_data\mdx_c_configs\`). **Never link;** copying preserves server compatibility.

---

## 5. Required-for-server checklist (all must be real files under BEATS-DAW2\models)

| Item | Location in repo | If missing, copy from |
|------|------------------|------------------------|
| htdemucs.pth | `models\htdemucs.pth` | stem-models\htdemucs.pth |
| At least one ONNX vocal model | See Stage 1 table above (e.g. `models\mdxnet_models\Kim_Vocal_2.onnx`) | stem-models or all-uvr-models |
| model_data.json (MDX config) | `models\MDX_Net_Models\model_data\model_data.json` or `models\mdxnet_models\model_data.json` | stem-models\MDX_Net_Models\model_data\ |

---

## 6. Implementation checklist

**Current status (March 5, 2026):** Combined plan implemented in `server/python_service/stem_splitter.py` and `mdx_onnx.py`. Use `STEM_BACKEND=hybrid` (default) for Stage 1 ONNX → phase inversion → Stage 2 Demucs; `STEM_BACKEND=demucs_only` for single-pass Demucs.

- [x] Stage 1: Wire vocal model selection (Kim_Vocal_2, Voc_FT, HQ_4, HQ_5) and load from paths above (see `mdx_onnx.VOCAL_MODEL_PATHS`).
- [x] Stage 1: Apply CPU settings (chunk_size from YAML; override via `STEM_MDX_CHUNK_SAMPLES`).
- [x] Phase inversion: Implement original − vocals → instrumental; output to Stage 2.
- [x] Stage 2: Run Demucs (htdemucs; local `models/htdemucs.pth` if present) on instrumental only; Shifts 0, Overlap 0.25, split=True.
- [x] Optional: Other = inst_temp − drums − bass when `STEM_PHASE_PERFECT_OTHER=1`.
- [x] Config: Resolve model_data.json / YAML by file hash in `mdx_onnx._get_config_for_onnx`.
