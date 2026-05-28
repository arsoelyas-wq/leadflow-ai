import runpod
import torch
import requests
import base64
import tempfile
import os

# ─── MODEL STARTUP ────────────────────────────────────────────────────────────
# Model container başladığında bir kez yüklenir, her istekte yeniden yüklenmez

print("[XTTS] Model yükleniyor...")
device = "cuda" if torch.cuda.is_available() else "cpu"

from TTS.api import TTS
tts_model = TTS("tts_models/multilingual/multi-dataset/xtts_v2").to(device)

print(f"[XTTS] Hazır — {device.upper()} kullanıyor")

# XTTS-v2 dil kodu eşlemesi
LANG_MAP = {
    "tr": "tr", "en": "en", "de": "de", "fr": "fr",
    "ar": "ar", "ru": "ru", "es": "es", "it": "it",
    "pt": "pt", "pl": "pl", "nl": "nl",
    "zh": "zh-cn", "zh-cn": "zh-cn",
    "ja": "ja", "ko": "ko", "hi": "hi",
}

# ─── HANDLER ──────────────────────────────────────────────────────────────────

def handler(job):
    inp = job.get("input", {})
    text         = inp.get("text", "").strip()
    speaker_url  = inp.get("speaker_wav_url", "").strip()
    language     = LANG_MAP.get(inp.get("language", "tr"), "tr")

    if not text:
        return {"error": "text zorunlu"}
    if not speaker_url:
        return {"error": "speaker_wav_url zorunlu"}

    ref_path = out_path = None
    try:
        # Referans ses dosyasını indir
        r = requests.get(speaker_url, timeout=30)
        r.raise_for_status()

        with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as f:
            f.write(r.content)
            ref_path = f.name

        # Çıktı dosyası
        out_fd, out_path = tempfile.mkstemp(suffix=".wav")
        os.close(out_fd)

        # Ses sentezi
        tts_model.tts_to_file(
            text=text,
            speaker_wav=ref_path,
            language=language,
            file_path=out_path,
        )

        with open(out_path, "rb") as f:
            audio_b64 = base64.b64encode(f.read()).decode()

        return {"audio_base64": audio_b64}

    except Exception as e:
        print(f"[XTTS] Hata: {e}")
        return {"error": str(e)}

    finally:
        for p in [ref_path, out_path]:
            if p and os.path.exists(p):
                try:
                    os.unlink(p)
                except Exception:
                    pass


runpod.serverless.start({"handler": handler})
