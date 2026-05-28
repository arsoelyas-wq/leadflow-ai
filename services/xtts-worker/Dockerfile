FROM runpod/pytorch:2.2.0-py3.10-cuda12.1.1-devel-ubuntu22.04

ENV DEBIAN_FRONTEND=noninteractive
ENV PYTHONUNBUFFERED=1
ENV PIP_NO_CACHE_DIR=1
ENV TTS_HOME=/root/.local/share/tts
ENV COQUI_TOS_AGREED=1

RUN apt-get update && apt-get install -y --no-install-recommends \
        ffmpeg libsndfile1 \
    && rm -rf /var/lib/apt/lists/*

# Pin transformers BEFORE TTS — TTS 0.22.0 needs BeamSearchScorer (removed in 4.41+)
RUN pip install --upgrade pip && \
    pip install --ignore-installed blinker && \
    pip install "transformers>=4.33.0,<4.41.0" && \
    pip install TTS==0.22.0 runpod==1.7.3 requests==2.31.0

WORKDIR /app
COPY download_model.py .
RUN python3 download_model.py

COPY handler.py .
CMD ["python3", "handler.py"]
