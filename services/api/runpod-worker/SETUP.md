# RunPod Kurulum Rehberi — LeadFlow MuseTalk Worker

## Kalite Karşılaştırması

| | LatentSync (eski) | MuseTalk (yeni) |
|--|--|--|
| Lip-sync | ✓ | ✓✓ |
| Göz kırpma | ✗ | ✓ |
| Baş hareketi | ✗ | ✓ |
| Yüz ifadesi | ✗ | ✓ |
| CodeFormer restore | ✗ | ✓ |
| 4x Upscale | ✗ | ✓ |
| **Kalite** | ⭐⭐⭐⭐ | **⭐⭐⭐⭐⭐** |

---

## Adım 1 — RunPod Hesabı Aç

1. https://runpod.io → "Sign Up" (GitHub veya Google ile)
2. Sol menü → **Billing** → Add Credits → $20 ekle (başlangıç için yeterli)
3. Sol menü → **Settings** → API Keys → "+ API Key" → Kopyala

---

## Adım 2 — Docker Hub Hesabı Aç (ücretsiz)

1. https://hub.docker.com → Sign Up
2. Repository oluştur: `leadflow-musetalk` (public)

---

## Adım 3 — Docker Image Build & Push

Bilgisayarına Docker Desktop kurulu olmalı (https://docker.com/products/docker-desktop).

```bash
# Bu klasörde çalıştır: services/api/runpod-worker/
cd services/api/runpod-worker

# Build (ilk seferde 10-15 dk sürer)
docker build -t SENIN_DOCKERHUB_KULLANICI_ADIN/leadflow-musetalk:latest .

# Push
docker login
docker push SENIN_DOCKERHUB_KULLANICI_ADIN/leadflow-musetalk:latest
```

---

## Adım 4 — RunPod Serverless Endpoint Oluştur

1. RunPod → **Serverless** → **+ New Endpoint**
2. Ayarlar:
   - **Name:** `leadflow-musetalk`
   - **Container Image:** `SENIN_DOCKERHUB_KULLANICI_ADIN/leadflow-musetalk:latest`
   - **GPU:** RTX 4090 (önerilen) veya A100 40GB
   - **Min Workers:** 0 (maliyet için sıfır tut)
   - **Max Workers:** 3
   - **Idle Timeout:** 60 saniye
3. **Environment Variables** ekle:
   ```
   SUPABASE_URL=https://XXXXX.supabase.co
   SUPABASE_SERVICE_KEY=eyJhbGci...
   ```
4. **Network Volume** oluştur (weights cache için):
   - RunPod → **Storage** → **+ Network Volume**
   - Name: `leadflow-weights`, Size: 50GB
   - Endpoint ayarlarına ekle → Mount Path: `/app/weights`
5. **Deploy** → Endpoint ID'yi kopyala (örn: `abc123xyz`)

---

## Adım 5 — Railway Env Vars Ekle

Railway → Servis → Variables:
```
RUNPOD_API_KEY=rpa_XXXXXXXXXX
RUNPOD_ENDPOINT_ID=abc123xyz
```

---

## Adım 6 — Test

Railway deploy tamamlandıktan sonra:
```bash
curl -X POST https://leadflow-ai-production.up.railway.app/api/replica/test-video \
  -H "Authorization: Bearer TOKEN" \
  -d '{"replicaId":"..."}'
```

---

## Maliyet Hesabı

| GPU | Inference/video | Training (1 seferlik) |
|-----|-----------------|----------------------|
| RTX 4090 | ~$0.15 | — (MuseTalk training gerektirmez) |
| A100 40GB | ~$0.25 | — |

**Not:** MuseTalk zero-shot çalışır — her kişi için training gerekmez!
Seed video yükle → direkt video üret.

---

## Sorun Giderme

**Cold start:** İlk çalışmada weights download eder (~5-10 dk). 
Network Volume bağlıysa sonraki çalışmalar anında başlar.

**OOM (Out of Memory):** RTX 4090 (24GB) önerilir. 
skip_enhance=true ile CodeFormer/ESRGAN'ı atlayarak bellek tasarrufu yapılabilir.
