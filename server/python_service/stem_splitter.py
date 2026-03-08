#!/usr/bin/env python3
"""
Flask service for stem separation using Demucs.
Run: python stem_splitter.py
"""

import os
import uuid
import shutil
import subprocess
from pathlib import Path
from flask import Flask, request, jsonify, send_file, abort
from flask_cors import CORS

app = Flask(__name__)
CORS(app)

# Use pathlib for proper path handling across Windows/WSL
SCRIPT_DIR = Path(__file__).resolve().parent.parent
STEMS_OUTPUT_DIR = str((SCRIPT_DIR / "stems_output").resolve())
os.makedirs(STEMS_OUTPUT_DIR, exist_ok=True)

DEMUCS_MODEL = "htdemucs"
DEMUCS_DEVICE = "cpu"


@app.route("/health", methods=["GET"])
def health():
    return jsonify(
        {
            "status": "ok",
            "model": DEMUCS_MODEL,
            "device": DEMUCS_DEVICE,
            "backend": "demucs",
            "output_dir": STEMS_OUTPUT_DIR,
        }
    )


@app.route("/split", methods=["POST"])
def split():
    if "file" not in request.files:
        return jsonify({"error": "No file provided"}), 400

    file = request.files["file"]
    if file.filename == "":
        return jsonify({"error": "Empty filename"}), 400

    job_id = str(uuid.uuid4())
    job_dir = os.path.join(STEMS_OUTPUT_DIR, job_id)
    os.makedirs(job_dir, exist_ok=True)

    input_path = os.path.join(job_dir, "input.wav")
    file.save(input_path)

    try:
        cmd = [
            "demucs",
            "-n",
            DEMUCS_MODEL,
            "-d",
            DEMUCS_DEVICE,
            "-o",
            job_dir,
            input_path,
        ]

        result = subprocess.run(cmd, capture_output=True, text=True)

        if result.returncode != 0:
            raise Exception(f"Demucs error: {result.stderr}")

        stems = []
        stem_names = ["drums", "bass", "vocals", "other"]

        for name in stem_names:
            # Demucs outputs to: {model}/input/{stem}.wav
            stem_path = os.path.join(job_dir, DEMUCS_MODEL, "input", f"{name}.wav")

            if os.path.exists(stem_path):
                size = os.path.getsize(stem_path)
                stems.append({"name": name, "size": size})

        return jsonify({"job_id": job_id, "status": "completed", "stems": stems})

    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/debug/<job_id>", methods=["GET"])
def debug_path(job_id):
    base_path = Path(STEMS_OUTPUT_DIR)
    stem_path = base_path / job_id / DEMUCS_MODEL / "input" / "vocals.wav"
    return jsonify(
        {
            "STEMS_OUTPUT_DIR": STEMS_OUTPUT_DIR,
            "job_id": job_id,
            "path_constructed": str(stem_path),
            "exists": stem_path.exists(),
            "glob_results": [str(p) for p in (base_path / job_id).rglob("*.wav")],
        }
    )


@app.route("/download/<job_id>/<stem_name>", methods=["GET"])
def download(job_id, stem_name):
    base_path = Path(STEMS_OUTPUT_DIR)

    # Handle both "vocals" and "vocals.wav" formats
    if not stem_name.endswith(".wav"):
        stem_name = f"{stem_name}.wav"

    stem_path = base_path / job_id / DEMUCS_MODEL / "input" / stem_name

    app.logger.info(f"Download request: {stem_path}, exists: {stem_path.exists()}")

    if not stem_path.exists():
        abort(404)

    return send_file(str(stem_path.resolve()), mimetype="audio/wav", as_attachment=True)


@app.route("/cleanup/<job_id>", methods=["DELETE"])
def cleanup(job_id):
    job_dir = os.path.join(STEMS_OUTPUT_DIR, job_id)

    if os.path.exists(job_dir):
        shutil.rmtree(job_dir)
        return jsonify({"status": "deleted", "job_id": job_id})

    return jsonify({"error": "Job not found"}), 404


if __name__ == "__main__":
    print(f"Starting Stem Splitter service (Demucs {DEMUCS_MODEL})...")
    print(f"Output directory: {STEMS_OUTPUT_DIR}")
    app.run(host="0.0.0.0", port=5000, debug=False)
