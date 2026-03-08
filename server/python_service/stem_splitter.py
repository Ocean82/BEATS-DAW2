#!/usr/bin/env python3
"""
Stem Splitter Service: combined plan (Stage 1 ONNX vocal + phase inversion + Stage 2 Demucs)
or Demucs-only fallback. Runs as a Flask API for local development, ready for EC2 deployment.
"""

import logging
import os
import sys
import shutil
import uuid
from pathlib import Path

import numpy as np

# Validate torch/torchaudio before demucs (which uses torch.hub)
try:
    import torch
    import torchaudio
    if not getattr(torch, "__version__", None):
        raise RuntimeError("torch has no __version__ (possible shadowed import or broken install)")
    if not getattr(torch, "hub", None):
        raise RuntimeError("torch.hub not found; reinstall in WSL: pip install -r requirements-python.txt")
except Exception as e:
    print(f"FATAL: torch/torchaudio check failed: {e}", file=sys.stderr)
    print("In WSL, run from server/: source venv/bin/activate && pip install -r requirements-python.txt", file=sys.stderr)
    raise

from flask import Flask, request, jsonify, send_file
from flask_cors import CORS
from werkzeug.utils import secure_filename

from demucs.pretrained import get_model
from demucs.apply import apply_model

_BASE_DIR = Path(__file__).resolve().parent
UPLOAD_FOLDER = _BASE_DIR / "uploads"
OUTPUT_FOLDER = _BASE_DIR / "stems_output"
LOG_DIR = _BASE_DIR / "logs"
UPLOAD_FOLDER.mkdir(exist_ok=True)
OUTPUT_FOLDER.mkdir(exist_ok=True)
LOG_DIR.mkdir(exist_ok=True)

_LOG_FMT = "%(asctime)s [%(levelname)s] %(name)s: %(message)s"
logger = logging.getLogger("stem_splitter")
logger.setLevel(logging.INFO)
logger.handlers.clear()
_fh = logging.FileHandler(LOG_DIR / "stem_splitter.log", encoding="utf-8")
_fh.setFormatter(logging.Formatter(_LOG_FMT))
logger.addHandler(_fh)
_ch = logging.StreamHandler(sys.stderr)
_ch.setFormatter(logging.Formatter(_LOG_FMT))
logger.addHandler(_ch)

ALLOWED_EXTENSIONS = {"wav", "mp3", "flac", "ogg", "m4a", "aac"}
MAX_FILE_SIZE = 100 * 1024 * 1024  # 100MB

# CPU-first: default is "cpu"; set STEM_DEVICE=cuda only when GPU is available (see GET_STARTED.md).
DEVICE = os.environ.get("STEM_DEVICE", "cpu").lower()
if DEVICE != "cuda":
    DEVICE = "cpu"

# hybrid = Stage 1 ONNX vocal + phase inversion + Stage 2 Demucs on instrumental (4-stem)
# demucs_only = single-pass Demucs on full mix
STEM_BACKEND = os.environ.get("STEM_BACKEND", "hybrid").lower()
if STEM_BACKEND not in ("hybrid", "demucs_only"):
    STEM_BACKEND = "hybrid"

MODELS_ROOT = _BASE_DIR.parent.parent / "models"
HTDEMUCS_LOCAL = MODELS_ROOT / "htdemucs.pth"

logger.info("Loading Demucs model...")
_model = get_model("htdemucs")
if HTDEMUCS_LOCAL.exists():
    try:
        pkg = torch.load(HTDEMUCS_LOCAL, map_location="cpu", weights_only=False)
        state = pkg.get("state") or pkg.get("best_state") or pkg
        _model.load_state_dict(state, strict=False)
        logger.info("Loaded local Demucs weights from %s", HTDEMUCS_LOCAL)
    except Exception as e:
        logger.warning("Could not load local htdemucs.pth: %s; using pretrained", e)
_model.eval()
logger.info("Backend=%s, device=%s", STEM_BACKEND, DEVICE)

app = Flask(__name__)
CORS(app)


def allowed_file(filename):
    return "." in filename and filename.rsplit(".", 1)[1].lower() in ALLOWED_EXTENSIONS


def _phase_inversion(original: np.ndarray, stem: np.ndarray) -> np.ndarray:
    """Instrumental = original - vocals (phase-perfect). Shapes (channels, samples); lengths matched."""
    min_len = min(original.shape[1], stem.shape[1])
    orig = original[:, :min_len]
    st = stem[:, :min_len]
    out = np.clip(orig - st, -1.0, 1.0).astype(np.float32)
    return out


def _split_stems_demucs_only(audio_path, output_dir, job_id, stem_mode: str):
    """Single-pass Demucs on full mix. stem_mode '2' or '4'."""
    wav, sr = torchaudio.load(audio_path)
    if sr != 44100:
        resampler = torchaudio.transforms.Resample(sr, 44100)
        wav = resampler(wav)
        sr = 44100
    if wav.shape[0] == 1:
        wav = wav.repeat(2, 1)
    elif wav.shape[0] > 2:
        wav = wav[:2]

    with torch.no_grad():
        sources = apply_model(
            _model,
            wav[None],
            device=DEVICE,
            shifts=0,
            overlap=0.25,
            split=True,
        )[0]

    output_path = Path(output_dir) / job_id
    output_path.mkdir(parents=True, exist_ok=True)
    stem_paths = {}
    if stem_mode == "2":
        vocals = sources[3].cpu()
        instrumental = (sources[0] + sources[1] + sources[2]).cpu()
        torchaudio.save(str(output_path / "vocals.wav"), vocals, sr)
        torchaudio.save(str(output_path / "instrumental.wav"), instrumental, sr)
        stem_paths["vocals"] = str(output_path / "vocals.wav")
        stem_paths["instrumental"] = str(output_path / "instrumental.wav")
    else:
        for i, name in enumerate(["drums", "bass", "other", "vocals"]):
            stem_file = output_path / f"{name}.wav"
            torchaudio.save(str(stem_file), sources[i].cpu(), sr)
            stem_paths[name] = str(stem_file)
    return stem_paths


def _split_stems_hybrid_4(audio_path, output_dir, job_id):
    """Combined plan: Stage 1 ONNX vocals -> phase inversion -> Stage 2 Demucs on instrumental."""
    import soundfile as sf

    from mdx_onnx import extract_vocals, is_available

    if not is_available():
        logger.warning("Hybrid 4-stem requested but ONNX not available; falling back to Demucs-only")
        return _split_stems_demucs_only(audio_path, output_dir, job_id, "4")

    output_path = Path(output_dir) / job_id
    output_path.mkdir(parents=True, exist_ok=True)
    stem_paths = {}

    vocals_path = output_path / "_vocals_stage1.wav"
    instrumental_temp_path = output_path / "_instrumental_temp.wav"

    try:
        vocals_np, sr = extract_vocals(audio_path, output_vocals_path=str(vocals_path))
    except Exception as e:
        logger.warning("Stage 1 ONNX failed: %s; falling back to Demucs-only", e)
        return _split_stems_demucs_only(audio_path, output_dir, job_id, "4")

    wav_orig, sr_orig = torchaudio.load(audio_path)
    if sr_orig != 44100:
        resampler = torchaudio.transforms.Resample(sr_orig, 44100)
        wav_orig = resampler(wav_orig)
        sr_orig = 44100
    if wav_orig.shape[0] == 1:
        wav_orig = wav_orig.repeat(2, 1)
    wav_orig = wav_orig[:2].numpy()
    min_len = min(wav_orig.shape[1], vocals_np.shape[1])
    instrumental_np = _phase_inversion(
        wav_orig[:, :min_len],
        vocals_np[:, :min_len],
    )
    sf.write(instrumental_temp_path, instrumental_np.T, sr)

    torchaudio.save(str(output_path / "vocals.wav"), torch.from_numpy(vocals_np[:, :min_len]), sr)
    stem_paths["vocals"] = str(output_path / "vocals.wav")

    with torch.no_grad():
        inst_wav, _ = torchaudio.load(str(instrumental_temp_path))
        if inst_wav.shape[0] == 1:
            inst_wav = inst_wav.repeat(2, 1)
        inst_wav = inst_wav[:2]
        sources = apply_model(
            _model,
            inst_wav[None],
            device=DEVICE,
            shifts=0,
            overlap=0.25,
            split=True,
        )[0]

    torchaudio.save(str(output_path / "drums.wav"), sources[0].cpu(), sr)
    torchaudio.save(str(output_path / "bass.wav"), sources[1].cpu(), sr)

    use_phase_perfect_other = os.environ.get("STEM_PHASE_PERFECT_OTHER", "").lower() in ("1", "true", "yes")
    if use_phase_perfect_other:
        drums_np = sources[0].cpu().numpy()
        bass_np = sources[1].cpu().numpy()
        min_samp = min(instrumental_np.shape[1], drums_np.shape[1], bass_np.shape[1])
        other_np = np.clip(
            instrumental_np[:, :min_samp] - drums_np[:, :min_samp] - bass_np[:, :min_samp],
            -1.0,
            1.0,
        ).astype(np.float32)
        torchaudio.save(str(output_path / "other.wav"), torch.from_numpy(other_np), sr)
    else:
        torchaudio.save(str(output_path / "other.wav"), sources[2].cpu(), sr)

    stem_paths["drums"] = str(output_path / "drums.wav")
    stem_paths["bass"] = str(output_path / "bass.wav")
    stem_paths["other"] = str(output_path / "other.wav")

    instrumental_temp_path.unlink(missing_ok=True)
    vocals_path.unlink(missing_ok=True)
    return stem_paths


def _split_stems_hybrid_2(audio_path, output_dir, job_id):
    """Stage 1 ONNX vocals + phase inversion -> vocals and instrumental only."""
    import soundfile as sf

    from mdx_onnx import extract_vocals, is_available

    if not is_available():
        logger.warning("Hybrid 2-stem requested but ONNX not available; falling back to Demucs-only")
        return _split_stems_demucs_only(audio_path, output_dir, job_id, "2")

    output_path = Path(output_dir) / job_id
    output_path.mkdir(parents=True, exist_ok=True)
    stem_paths = {}

    try:
        vocals_np, sr = extract_vocals(audio_path, output_vocals_path=str(output_path / "vocals.wav"))
    except Exception as e:
        logger.warning("Stage 1 ONNX failed: %s; falling back to Demucs-only", e)
        return _split_stems_demucs_only(audio_path, output_dir, job_id, "2")

    wav_orig, sr_orig = torchaudio.load(audio_path)
    if sr_orig != 44100:
        resampler = torchaudio.transforms.Resample(sr_orig, 44100)
        wav_orig = resampler(wav_orig)
        sr_orig = 44100
    if wav_orig.shape[0] == 1:
        wav_orig = wav_orig.repeat(2, 1)
    wav_orig = wav_orig[:2].numpy()
    min_len = min(wav_orig.shape[1], vocals_np.shape[1])
    instrumental_np = _phase_inversion(wav_orig[:, :min_len], vocals_np[:, :min_len])
    sf.write(output_path / "instrumental.wav", instrumental_np.T, sr)

    stem_paths["vocals"] = str(output_path / "vocals.wav")
    stem_paths["instrumental"] = str(output_path / "instrumental.wav")
    return stem_paths


def split_stems(audio_path, output_dir, job_id, stem_mode="4"):
    """
    Split audio into stems. Uses combined plan (hybrid) when STEM_BACKEND=hybrid and ONNX available:
    - 4-stem: Stage 1 ONNX vocal -> phase inversion -> Stage 2 Demucs on instrumental.
    - 2-stem: Stage 1 ONNX vocal + phase inversion.
    Otherwise single-pass Demucs. stem_mode "2" or "4".
    """
    logger.info("Processing: %s (mode=%s, backend=%s)", audio_path, stem_mode, STEM_BACKEND)

    if STEM_BACKEND == "hybrid" and stem_mode == "4":
        return _split_stems_hybrid_4(audio_path, output_dir, job_id)
    if STEM_BACKEND == "hybrid" and stem_mode == "2":
        return _split_stems_hybrid_2(audio_path, output_dir, job_id)
    return _split_stems_demucs_only(audio_path, output_dir, job_id, stem_mode)


@app.route("/health", methods=["GET"])
def health():
    payload = {
        "status": "ok",
        "model": "htdemucs",
        "backend": STEM_BACKEND,
        "device": DEVICE,
    }
    try:
        from mdx_onnx import is_available
        payload["stage1_onnx_available"] = is_available()
    except Exception:
        payload["stage1_onnx_available"] = False
    return jsonify(payload)


@app.route("/split", methods=["POST"])
def split():
    """
    Upload audio file and split into stems
    Returns job_id and stem file paths
    """
    if "file" not in request.files:
        return jsonify({"error": "No file provided"}), 400

    file = request.files["file"]

    if file.filename == "":
        return jsonify({"error": "No file selected"}), 400

    if not allowed_file(file.filename):
        return (
            jsonify({"error": f"Invalid file type. Allowed: {ALLOWED_EXTENSIONS}"}),
            400,
        )

    try:
        job_id = str(uuid.uuid4())

        # Save uploaded file
        filename = secure_filename(file.filename)
        upload_path = UPLOAD_FOLDER / f"{job_id}_{filename}"
        file.save(upload_path)
        size_mb = upload_path.stat().st_size / 1024 / 1024
        logger.info("Job %s: File uploaded (%.1fMB)", job_id, size_mb)

        stem_mode = request.form.get("stems", "4")
        quality = request.form.get("quality", "high")
        if stem_mode not in ("2", "4"):
            stem_mode = "4"
        logger.info("Stem mode: %s, quality: %s", stem_mode, quality)

        # Split stems
        stem_paths = split_stems(upload_path, OUTPUT_FOLDER, job_id, stem_mode=stem_mode)

        # Clean up input file
        upload_path.unlink()

        # Return relative paths for download
        stems = []
        for name, path in stem_paths.items():
            stems.append(
                {
                    "name": name,
                    "path": f"/download/{job_id}/{name}.wav",
                    "size": Path(path).stat().st_size,
                }
            )

        return jsonify({"job_id": job_id, "status": "completed", "stems": stems})

    except Exception as e:
        logger.exception("Split failed: %s", e)
        return jsonify({"error": str(e)}), 500


@app.route("/download/<job_id>/<stem_name>", methods=["GET"])
def download(job_id, stem_name):
    """
    Download a specific stem file
    """
    stem_file = OUTPUT_FOLDER / job_id / stem_name

    if not stem_file.exists():
        logger.warning("Stem not found: job_id=%s stem_name=%s", job_id, stem_name)
        return jsonify({"error": "Stem not found"}), 404

    return send_file(stem_file, mimetype="audio/wav", as_attachment=True)


@app.route("/cleanup/<job_id>", methods=["DELETE"])
def cleanup(job_id):
    """
    Clean up stem files after download
    """
    job_dir = OUTPUT_FOLDER / job_id
    if job_dir.exists():
        shutil.rmtree(job_dir)
        return jsonify({"status": "cleaned"})
    return jsonify({"error": "Job not found"}), 404


if __name__ == "__main__":
    port = int(os.environ.get("PYTHON_SERVICE_PORT", 5000))
    logger.info("Stem Splitter Service running on http://localhost:%s", port)
    logger.info("Backend=%s, model=htdemucs (4-stem: drums, bass, vocals, other); device=%s", STEM_BACKEND, DEVICE)

    app.run(host="0.0.0.0", port=port, debug=False)
