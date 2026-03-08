# Agent model alignment and implementation

**Last updated:** 2026-03-05  
**Purpose:** Align [AGENT-Knowledge-Block](AGENT-Knowledge-Block.md), [AGENT-decision-knowledge-context](AGENT-decision-knowledge-context.md) with the stem splitter implementation. Ensure models live **only** under the project; no links to external paths.

---

## 1. Policy: no external links

- **Runtime and deployment:** All model paths used by the app must resolve to files **inside** `BEATS-DAW2` (repo root). No symlinks, junctions, or reparse points from `models/` to `D:\DAW Collection` or `D:\DAW Collection\stem-models`.
- **Agent bank as copy source only:**  
  `D:\DAW Collection` and `D:\DAW Collection\stem-models` (and `stem-models\all-uvr-models`) are **import sources only**. When a file is needed, **copy** it into `BEATS-DAW2\models` (or the correct subfolder). Never reference these paths from code or config.
- **Server compatibility:** A clone/copy of the repo with a full `models/` directory must run on any server (e.g. Ubuntu) without access to Windows paths or the agent bank.

---

## 2. Where models are resolved in code

| Component | Root used | Path |
|-----------|-----------|------|
| **stem_splitter.py** | `Path(__file__).resolve().parent.parent` = repo root | `models/`, `models/htdemucs.pth` |
| **mdx_onnx.py** | `Path(__file__).resolve().parent.parent.parent` = repo root | `models/MDX_Net_Models/`, `models/mdxnet_models/`, `models/*.onnx` |

No hardcoded `D:\` or `stem-models` in code. All paths are relative to the repo.

---

## 3. Agent capability → implementation mapping

Agent docs describe **capabilities** and a **model registry** (e.g. high_vocal_fullness, instrumental_bleedless). The **current implementation** does not route by those names; it uses fixed pipelines with CPU-suitable models:

| Agent pipeline / capability | Implementation | Models used |
|-----------------------------|----------------|-------------|
| **karaoke_high_quality** (isolate_vocals → instrumental_bleedless) | Hybrid: Stage 1 ONNX vocal + phase inversion + Stage 2 Demucs | MDX-Net ONNX (Kim_Vocal_2, Voc_FT, Inst_HQ_4/5) + htdemucs |
| **mastering_safe_instrumental** (instrumental_fullness) | Demucs 4-stem on full mix or on Stage 1 instrumental | htdemucs (`models/htdemucs.pth` or pretrained) |
| **stem_expansion** (4-stem) | Demucs only or hybrid Stage 2 | htdemucs |

The agent **model registry** (bs_roformer_2025_07, mel_roformer_fv7, hyperace_v2, karaoke_bs_anvuew) is **decision context** for a future agent layer. Those entries are GPU-heavy or PyTorch-only. The current server uses **ONNX (Stage 1) + Demucs (Stage 2)** to satisfy the same capabilities on **CPU-only** without depending on Roformer/ckpt models.

---

## 4. Models required inside the project (no links)

Minimum set so that `STEM_BACKEND=hybrid` and `STEM_BACKEND=demucs_only` both work:

- **Demucs:** `models/htdemucs.pth` (optional; if missing, Demucs uses pretrained download).
- **Stage 1 ONNX (at least one):**  
  One of: `models/mdxnet_models/Kim_Vocal_2.onnx`, `models/mdxnet_models/UVR-MDX-NET-Voc_FT.onnx`, `models/MDX_Net_Models/UVR-MDX-NET-Inst_HQ_4.onnx`, `models/MDX_Net_Models/UVR-MDX-NET-Inst_HQ_5.onnx`, or `models/Kim_Vocal_2.onnx`, `models/UVR-MDX-NET-Inst_HQ_5.onnx` (see `mdx_onnx.VOCAL_MODEL_PATHS`).
- **MDX config (for ONNX):**  
  `models/MDX_Net_Models/model_data/model_data.json` and, when referenced by hash, YAMLs under `models/MDX_Net_Models/model_data/mdx_c_configs/`. Fallback: `models/mdxnet_models/model_data.json`.

All of these must be **real files** under `BEATS-DAW2\models`. If you add or refresh from the agent bank, **copy** the files; do not link. See [combined-plan-model-inventory.md](combined-plan-model-inventory.md) for exact paths and copy sources.

---

## 5. Verifying no reparse points

Before deploy or when adding models, confirm nothing in `models/` is a link:

**PowerShell (Windows):**
```powershell
Get-ChildItem .\models -Recurse -Force | Where-Object { $_.Attributes -band [System.IO.FileAttributes]::ReparsePoint }
```
(Should return nothing.)

**Bash (WSL/Linux):**
```bash
find models -type l
```
(Should return nothing; if you use copies only, there will be no symlinks.)

---

## 6. Models and stem-count FAQ

### Are other models in `models/` more appropriate for this project?

- **Current choice is appropriate for CPU-only:** Stage 1 ONNX (Kim_Vocal_2, Voc_FT, Inst_HQ_4/5) + Stage 2 Demucs (htdemucs) is the right stack for no-GPU deployment.
- **Other files in `models/`:** Roformer (BS-Roformer-Viperx-1297, model_bs_roformer_ep_937_sdr_10.5309.ckpt), MDX23C ckpts, and silero_vad are either GPU-heavy or need different loaders. They are not wired in; keeping CPU-only means staying with ONNX + Demucs unless product direction changes.

### Should any models be added for efficiency or quality?

- **Optional improvements (not required):**
  - **htdemucs_ft:** For 4-stem, a fine-tuned Demucs variant can improve quality when available; would need to be added to the loader and `models/`.
  - **Stage 1 preference:** Allow choosing Stage 1 ONNX by speed vs quality (e.g. env `STEM_VOCAL_PREFER=quality|speed` to prefer Inst_HQ vs Kim_Vocal_2). Not implemented yet.

### Can the project split by user preference (e.g. 2 vs 4 stems)?

- **Yes.** The backend and API already support it:
  - **2 stems:** vocals + instrumental (Demucs sum or hybrid phase inversion).
  - **4 stems:** vocals, drums, bass, other (Demucs).
- **API:** `POST /api/stems/split` accepts form field `stems` = `"2"` or `"4"` (default `"4"`). Optional `quality` is forwarded to the Python service.
- **UI:** The Stem Split panel now exposes a stem-count control (2 or 4) and calls the split API; returned stems are added to the timeline (one stem per track, in order).

---

## 7. Required models – locations on D:\

Searched under `D:\` (limited to `D:\DAW Collection` for speed). Use these as **copy sources** into `BEATS-DAW2\models`; do not reference them from code.

| Required asset | Locations found on D:\ |
|----------------|------------------------|
| **htdemucs.pth** | `D:\DAW Collection\BEATS-DAW2\models` · `D:\DAW Collection\stem-models` |
| **Kim_Vocal_2.onnx** | `BEATS-DAW2\models` · `BEATS-DAW2\models\mdxnet_models` · `stem-models` · `stem-models\all-uvr-models` · `stem-models\all-uvr-models\mdxnet_models-onnx` · `DAW1\models\mdxnet` |
| **UVR-MDX-NET-Voc_FT.onnx** | `BEATS-DAW2\models\mdxnet_models` · `stem-models\all-uvr-models\mdxnet_models-onnx` · `DAW1\models\mdxnet` |
| **UVR-MDX-NET-Inst_HQ_4.onnx** | `BEATS-DAW2\models\MDX_Net_Models` · `stem-models\all-uvr-models` |
| **UVR-MDX-NET-Inst_HQ_5.onnx** | `BEATS-DAW2\models` · `BEATS-DAW2\models\MDX_Net_Models` · `stem-models` · `stem-models\MDX_Net_Models` · `stem-models\all-uvr-models` |
| **model_data.json** | `BEATS-DAW2\models\mdxnet_models` · `BEATS-DAW2\models\MDX_Net_Models\model_data` · `stem-models\all-uvr-models\mdxnet_models-onnx` · `stem-models\MDX_Net_Models\model_data` |

- **htdemucs_ft:** Not found on D:\. Only standard `htdemucs.pth` and Demucs package configs (e.g. `htdemucs_ft.yaml` in venv) exist.
- Paths above are under `D:\DAW Collection` unless noted. No search was run over the entire D:\ drive (too slow); other copies may exist elsewhere.
