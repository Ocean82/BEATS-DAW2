"""
Stage 1 vocal extraction using MDX-Net ONNX models.
Uses models from models/MDX_Net_Models/ or models/mdxnet_models/ with
model_data and mdx_c_configs for chunk/FFT settings.
CPU-only; segment size and overlap follow combined-plan guidelines.
"""

from __future__ import annotations

import hashlib
import json
import logging
import os
from pathlib import Path
from typing import Any

import numpy as np
import soundfile as sf
import yaml

logger = logging.getLogger("stem_splitter.mdx_onnx")

# Default models dir relative to repo root (resolve at runtime)
_REPO_ROOT = Path(__file__).resolve().parent.parent.parent
_MODELS_ROOT = _REPO_ROOT / "models"
_MDX_NET_MODELS = _MODELS_ROOT / "MDX_Net_Models"
_MDXNET_MODELS = _MODELS_ROOT / "mdxnet_models"
_MDX_CONFIG_DIR = _MDX_NET_MODELS / "model_data"
_MDX_YAML_DIR = _MDX_CONFIG_DIR / "mdx_c_configs"

# Stage 1 vocal model preference (ONNX only for CPU). First available is used.
VOCAL_MODEL_PATHS = [
    _MDXNET_MODELS / "Kim_Vocal_2.onnx",
    _MDXNET_MODELS / "UVR-MDX-NET-Voc_FT.onnx",
    _MDX_NET_MODELS / "UVR-MDX-NET-Inst_HQ_4.onnx",  # instrumental; we invert to get vocals
    _MDX_NET_MODELS / "UVR-MDX-NET-Inst_HQ_5.onnx",
    _MODELS_ROOT / "Kim_Vocal_2.onnx",
    _MODELS_ROOT / "UVR-MDX-NET-Inst_HQ_5.onnx",
]

SAMPLE_RATE = 44100


def _load_model_data_json() -> dict[str, Any]:
    path = _MDX_CONFIG_DIR / "model_data.json"
    if not path.exists():
        path = _MDXNET_MODELS / "model_data.json"
    if not path.exists():
        return {}
    with open(path, encoding="utf-8") as f:
        return json.load(f)


def _load_yaml_config(config_name: str) -> dict[str, Any] | None:
    yaml_path = _MDX_YAML_DIR / config_name
    if not yaml_path.exists():
        return None
    with open(yaml_path, encoding="utf-8") as f:
        return yaml.safe_load(f)


def _file_hash(path: Path) -> str:
    h = hashlib.md5()
    with open(path, "rb") as f:
        for chunk in iter(lambda: f.read(8192), b""):
            h.update(chunk)
    return h.hexdigest()


def _get_config_for_onnx(onnx_path: Path, model_data: dict[str, Any]) -> dict[str, Any]:
    """Resolve chunk_size, n_fft, hop_length, dim_t, num_overlap, compensate for an ONNX file."""
    file_hash = _file_hash(onnx_path)
    entry = model_data.get(file_hash)
    if entry is None:
        return _default_mdx_config()
    yaml_name = entry.get("config_yaml")
    if yaml_name:
        yaml_cfg = _load_yaml_config(yaml_name)
        if yaml_cfg:
            audio = yaml_cfg.get("audio", {})
            inference = yaml_cfg.get("inference", {})
            return {
                "chunk_size": audio.get("chunk_size", 260096),
                "n_fft": audio.get("n_fft", 8192),
                "hop_length": audio.get("hop_length", 1024),
                "dim_t": inference.get("dim_t", 256),
                "num_overlap": inference.get("num_overlap", 8),
                "compensate": entry.get("compensate", 1.0),
                "primary_stem": entry.get("primary_stem", "Vocals"),
            }
    return {
        "chunk_size": entry.get("chunk_size", 260096),
        "n_fft": entry.get("mdx_n_fft_scale_set", 8192),
        "hop_length": 1024,
        "dim_t": entry.get("mdx_dim_t_set", 8) * 32,
        "num_overlap": 8,
        "compensate": entry.get("compensate", 1.0),
        "primary_stem": entry.get("primary_stem", "Vocals"),
    }


def _default_mdx_config() -> dict[str, Any]:
    return {
        "chunk_size": min(260096, 32768 * 8),
        "n_fft": 8192,
        "hop_length": 1024,
        "dim_t": 256,
        "num_overlap": 8,
        "compensate": 1.0,
        "primary_stem": "Vocals",
    }


def _find_vocal_onnx_model() -> Path | None:
    for path in VOCAL_MODEL_PATHS:
        if path.exists():
            return path
    return None


def extract_vocals(audio_path: str | Path, output_vocals_path: str | Path | None = None) -> tuple[np.ndarray, int]:
    """
    Stage 1: Extract vocal stem using first available MDX-Net ONNX model.
    Returns (vocals_array, sample_rate). vocals_array shape (2, samples) for stereo.
    If output_vocals_path is set, also writes WAV there.
    """
    import onnxruntime as ort

    onnx_path = _find_vocal_onnx_model()
    if onnx_path is None:
        raise FileNotFoundError(
            "No MDX-Net ONNX vocal model found under models/. "
            "Expected one of: Kim_Vocal_2.onnx, UVR-MDX-NET-Voc_FT.onnx, UVR-MDX-NET-Inst_HQ_4/5.onnx"
        )

    model_data = _load_model_data_json()
    config = _get_config_for_onnx(onnx_path, model_data)
    chunk_size = int(os.environ.get("STEM_MDX_CHUNK_SAMPLES", config["chunk_size"]))
    n_fft = config["n_fft"]
    hop_length = config["hop_length"]
    dim_t = config["dim_t"]
    num_overlap = config["num_overlap"]
    compensate = config["compensate"]
    primary_stem = config["primary_stem"]

    logger.info("Stage 1 ONNX: %s (primary_stem=%s)", onnx_path.name, primary_stem)

    import librosa

    wav, sr = sf.read(audio_path, dtype="float32", always_2d=True)
    if wav.ndim == 1:
        wav = np.stack([wav, wav], axis=0).T
    else:
        wav = wav.T
    if wav.shape[0] == 1:
        wav = np.repeat(wav, 2, axis=0)
    wav = wav[:2]
    if sr != SAMPLE_RATE:
        wav = librosa.resample(wav, orig_sr=sr, target_sr=SAMPLE_RATE)
    sr = SAMPLE_RATE

    session = ort.InferenceSession(
        str(onnx_path),
        providers=["CPUExecutionProvider"],
    )
    input_info = session.get_inputs()[0]
    input_name = input_info.name
    output_names = [o.name for o in session.get_outputs()]
    n_fft_half = n_fft // 2 + 1
    num_channels = 2

    total_samples = wav.shape[1]
    chunk_samples = min(chunk_size, max(total_samples, hop_length * 64))

    vocals_acc = np.zeros((num_channels, total_samples), dtype=np.float32)
    weight_acc = np.zeros(total_samples, dtype=np.float32)
    step_samples = max(hop_length, int(chunk_samples * 0.5))

    pos = 0
    while pos < total_samples:
        end = min(pos + chunk_samples, total_samples)
        chunk = np.zeros((num_channels, chunk_samples), dtype=np.float32)
        chunk[:, : end - pos] = wav[:, pos:end]

        spec = librosa.stft(
            chunk,
            n_fft=n_fft,
            hop_length=hop_length,
            win_length=n_fft,
            window="hanning",
            center=False,
        )
        if spec.shape[1] != n_fft_half:
            spec = spec[:, :n_fft_half, :]
        mag = np.abs(spec).astype(np.float32)
        mag_batch = np.expand_dims(mag, axis=0)
        feed = {input_name: mag_batch}
        try:
            out_list = session.run(output_names, feed)
        except Exception:
            mag_mono = np.expand_dims(mag.mean(axis=0), axis=0)
            feed = {input_name: mag_mono}
            out_list = session.run(output_names, feed)

        mask = np.squeeze(out_list[0])
        if primary_stem == "Instrumental" and len(out_list) >= 2:
            mask = np.squeeze(out_list[1])
        elif primary_stem == "Instrumental":
            mask = 1.0 - mask
        if mask.ndim == 2:
            mask = np.stack([mask, mask], axis=0)
        mask = np.clip(mask, 0, 1).astype(np.complex64)
        if mask.shape[0] != num_channels:
            mask = np.broadcast_to(mask, (num_channels, n_fft_half, spec.shape[2]))
        stem_spec = spec * mask
        stem_wav_list = []
        for c in range(num_channels):
            ch = librosa.istft(
                stem_spec[c],
                hop_length=hop_length,
                win_length=n_fft,
                window="hanning",
                center=False,
            )
            stem_wav_list.append(ch)
        stem_wav = np.stack(stem_wav_list, axis=0).astype(np.float32) * compensate
        if primary_stem == "Instrumental":
            stem_wav = chunk[:, : stem_wav.shape[1]] - stem_wav
        seg_len = min(stem_wav.shape[1], total_samples - pos)
        vocals_acc[:, pos : pos + seg_len] += stem_wav[:, :seg_len]
        weight_acc[pos : pos + seg_len] += 1.0
        pos += step_samples

    weight_acc = np.maximum(weight_acc, 1e-8)
    vocals = (vocals_acc / weight_acc).astype(np.float32)
    vocals = np.clip(vocals, -1.0, 1.0)

    if output_vocals_path:
        sf.write(output_vocals_path, vocals.T, sr)

    return vocals, sr


def is_available() -> bool:
    return _find_vocal_onnx_model() is not None
