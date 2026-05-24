# ─── LeadFlow AI — MuseTalk RunPod Worker ────────────────────────────────────
# GPU: RTX 4090 (24GB) recommended | A100 40GB for max quality
# Build: docker build -t YOUR_DOCKERHUB/leadflow-musetalk:latest .
# Push:  docker push YOUR_DOCKERHUB/leadflow-musetalk:latest

FROM pytorch/pytorch:2.1.0-cuda11.8-cudnn8-devel

ENV DEBIAN_FRONTEND=noninteractive
ENV TZ=UTC

WORKDIR /app

# ── System dependencies ────────────────────────────────────────────────────────
RUN apt-get update && apt-get install -y \
    git wget curl ffmpeg libsm6 libxext6 libglib2.0-0 \
    libgl1-mesa-glx build-essential tzdata \
    && rm -rf /var/lib/apt/lists/*

# ── Python base deps ───────────────────────────────────────────────────────────
RUN pip install --no-cache-dir \
    runpod==1.6.2 \
    requests \
    huggingface_hub \
    gdown

# ── MuseTalk ───────────────────────────────────────────────────────────────────
RUN git clone https://github.com/TMElyralab/MuseTalk.git /app/MuseTalk
WORKDIR /app/MuseTalk
RUN pip install --no-cache-dir -r requirements.txt
# mmcv needs separate install matching torch version
RUN pip install --no-cache-dir \
    mmengine \
    "mmcv==2.1.0" \
    mmdet \
    mmpose \
    --find-links https://download.openmmlab.com/mmcv/dist/cu118/torch2.1.0/index.html

# ── CodeFormer (face restoration) ─────────────────────────────────────────────
RUN git clone https://github.com/sczhou/CodeFormer.git /app/CodeFormer
WORKDIR /app/CodeFormer
RUN pip install --no-cache-dir -r requirements.txt

# ── Real-ESRGAN (4x upscaling) ────────────────────────────────────────────────
RUN git clone https://github.com/xinntao/Real-ESRGAN.git /app/Real-ESRGAN
WORKDIR /app/Real-ESRGAN
RUN pip install --no-cache-dir -r requirements.txt
RUN pip install --no-cache-dir basicsr facexlib

# ── Pin numpy <2.0 (numpy 2.x breaks OpenCV ABI) ─────────────────────────────
RUN pip install --no-cache-dir "numpy<2.0"

# ── Download MuseTalk model weights into the image ────────────────────────────
# Models are baked in so workers start instantly with no first-run download
WORKDIR /app/MuseTalk
RUN mkdir -p models/dwpose models/musetalk models/sd-vae-ft-mse models/whisper models/face-parse-bisent

# DWPose (pose estimation) — ~350 MB
RUN wget -q -O models/dwpose/dw-ll_ucoco_384.pth \
    "https://huggingface.co/yzd-v/DWPose/resolve/main/dw-ll_ucoco_384.pth" && \
    wget -q -O models/dwpose/dw-mm_ucoco.onnx \
    "https://huggingface.co/yzd-v/DWPose/resolve/main/dw-mm_ucoco.onnx"

# MuseTalk checkpoint — ~500 MB
RUN wget -q -O models/musetalk/musetalk.pth \
    "https://huggingface.co/TMElyralab/MuseTalk/resolve/main/models/musetalk/musetalk.pth"

# Whisper tiny (lip-sync timing) — ~70 MB
RUN wget -q -O models/whisper/tiny.pt \
    "https://openaipublic.azureedge.net/main/whisper/models/65147644a518d12f04e32d6f3b26facc3f8dd46e5390956a9424a650c0ce22b9/tiny.pt"

# SD VAE (image decoding) — ~320 MB
RUN python -c "\
from huggingface_hub import snapshot_download; \
snapshot_download('stabilityai/sd-vae-ft-mse', local_dir='models/sd-vae-ft-mse', local_dir_use_symlinks=False)"

# Face-parse-bisent — ~50 MB
RUN wget -q -O models/face-parse-bisent/79999_iter.pth \
    "https://huggingface.co/TMElyralab/MuseTalk/resolve/main/models/face-parse-bisent/79999_iter.pth" || true

# ── Handler ────────────────────────────────────────────────────────────────────
COPY handler.py /app/handler.py

WORKDIR /app

ENV WEIGHTS_DIR=/runpod-volume/weights
ENV MUSETALK_DIR=/app/MuseTalk
ENV CODEFORMER_DIR=/app/CodeFormer
ENV REALESRGAN_DIR=/app/Real-ESRGAN

CMD ["python", "-u", "handler.py"]
