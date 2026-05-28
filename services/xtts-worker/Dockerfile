# ─── Base: CUDA 12.1 + cuDNN 8 + Python 3.10 ───────────────────────────────
FROM nvidia/cuda:12.1.0-cudnn8-runtime-ubuntu22.04

ENV DEBIAN_FRONTEND=noninteractive \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    # Coqui TTS stores models here
    TTS_HOME=/root/.local/share/tts

# ─── System deps ────────────────────────────────────────────────────────────
RUN apt-get update && apt-get install -y --no-install-recommends \
        python3.10 python3.10-dev python3-pip \
        ffmpeg libsndfile1 libgomp1 \
        git wget curl ca-certificates \
    && rm -rf /var/lib/apt/lists/* \
    && ln -sf /usr/bin/python3.10 /usr/bin/python3 \
    && ln -sf /usr/bin/python3.10 /usr/bin/python

# ─── PyTorch with CUDA 12.1 ─────────────────────────────────────────────────
RUN pip install --upgrade pip && \
    pip install torch==2.2.2+cu121 torchaudio==2.2.2+cu121 \
        --index-url https://download.pytorch.org/whl/cu121

# ─── Coqui TTS + RunPod SDK ─────────────────────────────────────────────────
RUN pip install TTS==0.22.0 runpod==1.7.3 requests==2.31.0

# ─── Pre-download XTTS-v2 model weights (baked into image) ──────────────────
# Avoids cold-start weight downloads on every new worker container
RUN python3 -c " \
from TTS.api import TTS; \
import torch; \
TTS('tts_models/multilingual/multi-dataset/xtts_v2', progress_bar=True, gpu=False); \
print('[BUILD] XTTS-v2 weights baked in.') \
"

# ─── Handler ─────────────────────────────────────────────────────────────────
WORKDIR /app
COPY handler.py .

CMD ["python3", "handler.py"]
