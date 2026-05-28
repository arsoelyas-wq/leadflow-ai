# Photo-to-3D Model Generation — Design Spec
Date: 2026-05-28

## Overview
Users who don't have a `.glb` file can upload 1-6 product photos and have Tripo3D AI generate a high-quality 3D model automatically. The feature integrates into the existing AR Experience page as a sub-tab within "Model Yükle".

## Architecture

```
Frontend (ar-experience/page.tsx)
  └── "Model Yükle" tab
        ├── Sub-tab A: "📁 Dosya Yükle"  (existing)
        └── Sub-tab B: "✨ AI ile Oluştur" (new)
              ├── 6-slot photo grid (drag-drop, 1 required, up to 6)
              ├── Product name + category (shared fields)
              ├── "Oluştur" button → calls POST /api/ar/generate-3d
              ├── Progress animation (4 stages, polling every 3s)
              ├── Inline model-viewer preview on completion
              └── "Kaydet & Kullan" → saves to ar_models

Backend (ar-integration.ts)
  ├── POST /api/ar/generate-3d
  │     - Accepts multipart: up to 6 images + productName + category + description
  │     - Uploads each image to Tripo3D /upload → gets file_token per image
  │     - Creates Tripo3D task:
  │         1 image  → type: "image_to_model"
  │         2+ images → type: "multiview_to_model"
  │     - Returns { taskId }
  │
  └── GET /api/ar/generate-3d/status/:taskId
        - Polls Tripo3D GET /task/{taskId}
        - States: queued → running → success / failed
        - On success:
            1. Downloads .glb from result.model.url
            2. Uploads to Supabase ar-models bucket
            3. Creates ar_models record with ar_viewer_url + qr_url
            4. Returns { status: "success", model: { id, arViewerUrl, qrUrl } }

External: Tripo3D API (api.tripo3d.ai/v2/openapi)
  - Auth: Bearer TRIPO3D_API_KEY (new env var)
  - POST /upload  → file_token
  - POST /task    → task_id
  - GET  /task/{id} → status + result.model.url

Storage: Supabase ar-models bucket (existing)
```

## UI Flow (AI sub-tab)

1. **Upload stage**: 6-slot grid. Slot 1 = primary (required, "Ön Cephe"). Slots 2-6 optional. Each slot drag-droppable or click-to-pick. Thumbnails shown on selection. Remove button per slot.

2. **Tips panel** (right column): Shown while uploading photos.
   - Beyaz/açık arka plan kullan
   - Ürünü ortaya al, kesme yok
   - Farklı açılardan çek (ön/yan/arka)
   - İyi aydınlatma — gölge az olsun
   - Min 512×512 px

3. **Generation stage**: After clicking "Oluştur":
   - Button disables, spinner shows
   - 4-stage progress bar animates:
     1. 📤 Fotoğraflar yükleniyor
     2. 🔍 AI analiz ediyor
     3. 🔨 3D mesh oluşturuluyor
     4. 🎨 Texture ekleniyor
   - Polling every 3s via GET /api/ar/generate-3d/status/:taskId
   - Estimated time shown: "~45 saniye"
   - On failure: error message + "Tekrar Dene" button

4. **Preview stage**: When complete:
   - Inline `<model-viewer>` shows the generated model (360° rotatable)
   - "Kaydet & Kullan" button → saves, switches to Modellerim tab
   - "Yeniden Oluştur" → back to upload stage

## Environment Variables (new)
- `TRIPO3D_API_KEY` — API key from tripo3d.ai

## Error Handling
- Tripo3D API timeout (>120s): return 504, show retry
- Image too small (<100×100): frontend validation, show error
- Unsupported image format: frontend validation (jpg/png/webp only)
- Tripo3D task failure: show error message from API

## Cost
~$0.04 per generation. No credit metering built into this version — usage tied to the user's Tripo3D account balance.

## Files to Create/Modify
- `services/api/src/routes/ar-integration.ts` — add 2 new endpoints
- `apps/web/app/(dashboard)/ar-experience/page.tsx` — add AI sub-tab UI
- `services/api/.env` — add TRIPO3D_API_KEY
