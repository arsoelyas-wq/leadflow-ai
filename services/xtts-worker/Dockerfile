FROM nvidia/cuda:12.1.0-cudnn8-runtime-ubuntu22.04

ENV DEBIAN_FRONTEND=noninteractive
ENV PYTHONUNBUFFERED=1
ENV PIP_NO_CACHE_DIR=1
ENV TTS_HOME=/root/.local/share/tts
ENV COQUI_TOS_AGREED=1

RUN apt-get update && apt-get install -y --no-install-recommends \
        python3.10 python3.10-dev python3-pip \
        ffmpeg libsndfile1 libgomp1 \
        git wget curl ca-certificates \
    && rm -rf /var/lib/apt/lists/* \
    && ln -sf /usr/bin/python3.10 /usr/bin/python3 \
    && ln -sf /usr/bin/python3.10 /usr/bin/python

RUN pip install --upgrade pip && \
    pip install torch==2.2.2+cu121 torchaudio==2.2.2+cu121 \
        --index-url https://download.pytorch.org/whl/cu121

RUN pip install TTS==0.22.0 runpod==1.7.3 requests==2.31.0

WORKDIR /app
COPY download_model.py .
RUN python3 download_model.py

COPY handler.py .
CMD ["python3", "handler.py"]
