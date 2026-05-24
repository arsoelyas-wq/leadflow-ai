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

# ── Handler ────────────────────────────────────────────────────────────────────
COPY handler.py /app/handler.py

WORKDIR /app

# Weights will be downloaded to /app/weights on first run
# Mount a RunPod Network Volume at /app/weights to cache across runs
ENV WEIGHTS_DIR=/runpod-volume/weights
ENV MUSETALK_DIR=/app/MuseTalk
ENV CODEFORMER_DIR=/app/CodeFormer
ENV REALESRGAN_DIR=/app/Real-ESRGAN

CMD ["python", "-u", "handler.py"]
