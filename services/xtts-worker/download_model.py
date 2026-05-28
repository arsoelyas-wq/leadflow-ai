from TTS.api import TTS
TTS("tts_models/multilingual/multi-dataset/xtts_v2", progress_bar=True, gpu=False)
print("[BUILD] XTTS-v2 weights baked in.")
