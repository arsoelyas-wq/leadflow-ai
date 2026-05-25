"""
LeadFlow AI — RunPod Serverless Worker
Engine: MuseTalk (ByteDance) — zero-shot talking head, no training needed
Post-processing: CodeFormer face restore + Real-ESRGAN 4x upscale
GPU target: RTX 4090 (24GB) or A100 40GB
"""

import os
import sys
import json
import time
import tempfile
import subprocess
import traceback
from pathlib import Path

import requests
import runpod

# ── paths ──────────────────────────────────────────────────────────────────────
MUSETALK_DIR   = "/app/MuseTalk"
CODEFORMER_DIR = "/app/CodeFormer"
REALESRGAN_DIR = "/app/Real-ESRGAN"
WEIGHTS_DIR    = "/runpod-volume/weights"

SUPABASE_URL = os.environ.get("SUPABASE_URL", "")
SUPABASE_KEY = os.environ.get("SUPABASE_SERVICE_KEY", "")

# ── helpers ────────────────────────────────────────────────────────────────────

def log(msg: str):
    print(f"[LeadFlow] {msg}", flush=True)

def download(url: str, dest: str, timeout: int = 120):
    log(f"Downloading {url} → {dest}")
    r = requests.get(url, stream=True, timeout=timeout)
    r.raise_for_status()
    with open(dest, "wb") as f:
        for chunk in r.iter_content(chunk_size=65536):
            f.write(chunk)
    log(f"Downloaded {Path(dest).stat().st_size // 1024} KB")

def upload_to_supabase(local_path: str, remote_name: str) -> str:
    """Upload a file to Supabase Storage and return its public URL."""
    remote_path = f"generated/{remote_name}"
    with open(local_path, "rb") as f:
        res = requests.put(
            f"{SUPABASE_URL}/storage/v1/object/video-assets/{remote_path}",
            headers={
                "apikey": SUPABASE_KEY,
                "Authorization": f"Bearer {SUPABASE_KEY}",
                "Content-Type": "video/mp4",
                "x-upsert": "true",
            },
            data=f,
            timeout=180,
        )
    if res.status_code not in (200, 201):
        raise RuntimeError(f"Supabase upload failed {res.status_code}: {res.text}")
    return f"{SUPABASE_URL}/storage/v1/object/public/video-assets/{remote_path}"

def run_cmd(cmd: list, cwd: str = None, timeout: int = 300) -> str:
    """Run a shell command and return stdout. Raises on non-zero exit."""
    result = subprocess.run(
        cmd, cwd=cwd, capture_output=True, text=True, timeout=timeout
    )
    if result.returncode != 0:
        raise RuntimeError(f"Command failed: {' '.join(cmd)}\n{result.stderr[-2000:]}")
    if result.stderr:
        log(f"[stderr] {result.stderr[-1000:]}")
    return result.stdout

# ── model initialization (runs once per worker, cached in /app/weights volume) ─

def _link_models():
    """Symlink WEIGHTS_DIR/MuseTalk/models → /app/MuseTalk/models so scripts find them."""
    src = os.path.join(WEIGHTS_DIR, "MuseTalk", "models")
    dst = "/app/MuseTalk/models"
    if os.path.islink(dst) or os.path.exists(dst):
        return
    if os.path.isdir(src):
        os.symlink(src, dst)
        log(f"Symlinked {dst} → {src}")
    else:
        log(f"WARNING: {src} not found, models may be missing")


def ensure_models():
    """Verify model weights are present (baked into Docker image at /app/MuseTalk/models/)."""
    baked_marker = Path("/app/MuseTalk/models/musetalkV15/unet.pth")
    if baked_marker.exists():
        log(f"Baked-in models found at /app/MuseTalk/models/ — skipping download")
        return

    # Fallback: try volume-based cache (legacy path)
    marker = Path(WEIGHTS_DIR) / ".ready"
    if marker.exists():
        log("Models found in volume cache — skipping download")
        _link_models()
        return

    log("WARNING: Models not found at /app/MuseTalk/models/ — this should not happen with the baked-in image")
    log("Attempting fallback download (this will be slow)...")
    musetalk_weights = os.path.join(WEIGHTS_DIR, "MuseTalk")
    os.makedirs(musetalk_weights, exist_ok=True)

    run_cmd([
        "python", "-c",
        f"""
from huggingface_hub import snapshot_download
snapshot_download(
    'TMElyralab/MuseTalk',
    local_dir='{musetalk_weights}',
    local_dir_use_symlinks=False,
)
print('MuseTalk weights downloaded')
""",
    ], timeout=900)

    marker.touch()
    _link_models()
    log("All weights ready")

# ── stage 1: MuseTalk talking head generation ──────────────────────────────────

def run_museTalk(video_path: str, audio_path: str, output_path: str):
    """
    MuseTalk v1.5: seed video + audio → talking head video via OmegaConf config.
    CLI takes --inference_config YAML, not --video_path / --audio_path directly.
    """
    log("Stage 1: MuseTalk v1.5 inference")
    import shutil as _shutil

    with tempfile.TemporaryDirectory() as infer_tmp:
        # Write OmegaConf-compatible YAML config
        config_path = os.path.join(infer_tmp, "infer.yaml")
        with open(config_path, "w") as f:
            f.write(f'task_0:\n  video_path: "{video_path}"\n  audio_path: "{audio_path}"\n')

        result_dir = os.path.join(infer_tmp, "results")
        os.makedirs(result_dir, exist_ok=True)

        stdout = run_cmd([
            sys.executable, "-m", "scripts.inference",
            "--inference_config", config_path,
            "--result_dir",       result_dir,
            "--unet_model_path",  "models/musetalkV15/unet.pth",
            "--whisper_dir",      "models/whisper",
            "--use_float16",
            "--fps",              "25",
            "--version",          "v15",
        ], cwd=MUSETALK_DIR, timeout=900)
        log(f"MuseTalk stdout tail: {stdout[-500:] if stdout else '(empty)'}")

        # Log result dir contents for debugging
        all_files = []
        for root, dirs, files in os.walk(result_dir):
            for f in files:
                fp = os.path.join(root, f)
                all_files.append(f"{fp} ({os.path.getsize(fp)} bytes)")
        log(f"result_dir contents ({len(all_files)} files)")

        # Output: {result_dir}/v15/{video_stem}_{audio_stem}.mp4
        video_stem = Path(video_path).stem
        audio_stem = Path(audio_path).stem
        expected = Path(result_dir) / "v15" / f"{video_stem}_{audio_stem}.mp4"

        if not expected.exists():
            # MuseTalk generates frames but sometimes fails to assemble the MP4.
            # Fall back: assemble frames ourselves with ffmpeg.
            frames_dir = Path(result_dir) / "v15" / video_stem
            if frames_dir.is_dir():
                frame_files = sorted(frames_dir.glob("*.png"))
                log(f"MuseTalk left {len(frame_files)} frames; assembling MP4 with ffmpeg")
                run_cmd([
                    "/usr/bin/ffmpeg", "-y",
                    "-framerate", "25",
                    "-i", str(frames_dir / "%08d.png"),
                    "-i", audio_path,
                    "-c:v", "libx264", "-crf", "18", "-preset", "fast",
                    "-c:a", "aac", "-shortest",
                    str(expected),
                ], timeout=120)
                log(f"ffmpeg assembly done → {expected}")

        if not expected.exists():
            candidates = list(Path(result_dir).rglob("*.mp4"))
            if not candidates:
                raise RuntimeError(f"MuseTalk produced no output (expected {expected}). result_dir had: {all_files}")
            expected = candidates[0]

        _shutil.copy(str(expected), output_path)

    if not Path(output_path).exists():
        raise RuntimeError("MuseTalk produced no output after copy")
    log(f"MuseTalk done → {Path(output_path).stat().st_size // 1024} KB")

# ── stage 2: CodeFormer face restoration ──────────────────────────────────────

def run_codeformer(video_path: str, output_path: str, fidelity: float = 0.7):
    """
    CodeFormer: per-frame face restoration
    - Removes compression artifacts
    - Sharpens facial details (skin, eyes, teeth)
    - fidelity: 0 = max enhance, 1 = max identity preserve. 0.7 is balanced.
    Quality boost: ⭐⭐⭐⭐⭐ — eliminates uncanny valley effect
    """
    log("Stage 2: CodeFormer face restoration")
    with tempfile.TemporaryDirectory() as frames_dir:
        restored_dir = Path(frames_dir) / "restored"
        restored_dir.mkdir()

        run_cmd([
            sys.executable, "inference_codeformer.py",
            "--input_path",     video_path,
            "--output_path",    str(restored_dir),
            "--fidelity_weight", str(fidelity),
            "--face_upsample",
            "--bg_upsampler",   "realesrgan",
            "--detection_model", "retinaface_resnet50",
            "--model_path",     f"{WEIGHTS_DIR}/CodeFormer/codeformer.pth",
        ], cwd=CODEFORMER_DIR, timeout=600)

        # CodeFormer outputs to restored_dir/{input_filename}/
        result_candidates = list(restored_dir.rglob("*.mp4"))
        if not result_candidates:
            raise RuntimeError("CodeFormer produced no output")

        import shutil
        shutil.copy(str(result_candidates[0]), output_path)
    log(f"CodeFormer done → {Path(output_path).stat().st_size // 1024} KB")

# ── stage 3: Real-ESRGAN 4x upscaling ─────────────────────────────────────────

def run_esrgan(video_path: str, output_path: str, scale: int = 2):
    """
    Real-ESRGAN: neural network upscaling
    - 720p → 1440p (2x) or 720p → 2880p (4x)
    - Adds texture detail that generation models lose
    - scale=2 recommended for speed/quality balance
    Quality boost: ultra-sharp edges, natural skin texture
    """
    log(f"Stage 3: Real-ESRGAN {scale}x upscale")
    run_cmd([
        sys.executable, "inference_realesrgan_video.py",
        "--input",      video_path,
        "--output",     output_path,
        "--outscale",   str(scale),
        "--model_name", "RealESRGAN_x4plus",
        "--fp32",
    ], cwd=REALESRGAN_DIR, timeout=600)
    if not Path(output_path).exists():
        log("ESRGAN skipped or failed — using CodeFormer output")
        import shutil
        shutil.copy(video_path, output_path)
    else:
        log(f"ESRGAN done → {Path(output_path).stat().st_size // 1024} KB")

# ── main handler ───────────────────────────────────────────────────────────────

def handler(event: dict) -> dict:
    """
    Input:
      seed_video_url  — public MP4 URL of the person's face video
      audio_url       — public MP3 URL of the speech audio
      user_id         — for storage path
      skip_enhance    — bool, skip CodeFormer+ESRGAN for speed (default False)
      fidelity        — CodeFormer fidelity 0.0-1.0 (default 0.7)
      upscale         — int 1|2|4 (default 2)

    Output:
      video_url       — public URL of the generated HD video
      stages          — list of completed pipeline stages
      duration_s      — total generation time in seconds
    """
    t_start = time.time()
    inp = event.get("input", {})

    seed_video_url = inp.get("seed_video_url")
    audio_url      = inp.get("audio_url")
    user_id        = inp.get("user_id", "anon")
    skip_enhance   = inp.get("skip_enhance", False)
    fidelity       = float(inp.get("fidelity", 0.7))
    upscale        = int(inp.get("upscale", 2))

    if not seed_video_url or not audio_url:
        return {"error": "seed_video_url and audio_url are required"}

    try:
        ensure_models()
    except Exception as e:
        log(f"WARNING: model init failed: {e}")

    stages = []

    with tempfile.TemporaryDirectory() as tmp:
        try:
            ts = int(time.time() * 1000)
            video_in     = f"{tmp}/seed.mp4"
            audio_raw    = f"{tmp}/audio_raw"
            audio_in     = f"{tmp}/audio.wav"
            musetalk_out = f"{tmp}/stage1_musetalk.mp4"
            cf_out       = f"{tmp}/stage2_codeformer.mp4"
            final_out    = f"{tmp}/stage3_final.mp4"

            download(seed_video_url, video_in)
            download(audio_url, audio_raw)
            # Normalize audio to WAV so ffmpeg and MuseTalk always get a clean format
            run_cmd(["/usr/bin/ffmpeg", "-y", "-i", audio_raw, audio_in], timeout=60)

            # Stage 1: MuseTalk
            run_museTalk(video_in, audio_in, musetalk_out)
            stages.append("museTalk")

            current = musetalk_out

            if not skip_enhance:
                # Stage 2: CodeFormer
                try:
                    run_codeformer(current, cf_out, fidelity=fidelity)
                    current = cf_out
                    stages.append("codeformer")
                except Exception as e:
                    log(f"CodeFormer failed (skipping): {e}")

                # Stage 3: ESRGAN
                if upscale > 1:
                    try:
                        run_esrgan(current, final_out, scale=upscale)
                        current = final_out
                        stages.append(f"esrgan_{upscale}x")
                    except Exception as e:
                        log(f"ESRGAN failed (skipping): {e}")

            # Upload result
            remote_name = f"{user_id}_{ts}.mp4"
            video_url = upload_to_supabase(current, remote_name)

            duration_s = round(time.time() - t_start, 1)
            log(f"Pipeline complete in {duration_s}s — stages: {stages}")

            return {
                "video_url":  video_url,
                "stages":     stages,
                "duration_s": duration_s,
                "engine":     "museTalk",
            }

        except Exception as e:
            log(f"Handler error: {traceback.format_exc()}")
            return {"error": str(e)}


runpod.serverless.start({"handler": handler})
