export {};
const express = require('express');
const { createClient } = require('@supabase/supabase-js');
const axios = require('axios');
const multer = require('multer');
const FormData = require('form-data');

const router = express.Router();
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

const HEYGEN_API_KEY = process.env.HEYGEN_API_KEY;
const HEYGEN_BASE = 'https://api.heygen.com';

function heygenHeaders(contentType = 'application/json') {
  return {
    'X-Api-Key': HEYGEN_API_KEY,
    'Content-Type': contentType,
  };
}

// Multer — memory storage
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 100 * 1024 * 1024 }, // 100MB
});

// ── AVATAR YÜKLE ──────────────────────────────────────────
// HeyGen Instant Avatar — video yükle
router.post('/upload-avatar', upload.single('video'), async (req: any, res: any) => {
  try {
    const userId = req.userId;
    if (!req.file) return res.status(400).json({ error: 'Video dosyası zorunlu' });

    // 1. HeyGen'e video yükle
    const formData = new FormData();
    formData.append('video', req.file.buffer, {
      filename: req.file.originalname || 'avatar_video.mp4',
      contentType: req.file.mimetype || 'video/mp4',
    });

    const uploadResponse = await axios.post(
      `${HEYGEN_BASE}/v1/avatar.create`,
      formData,
      {
        headers: {
          'X-Api-Key': HEYGEN_API_KEY,
          ...formData.getHeaders(),
        },
        timeout: 120000, // 2 dakika
      }
    );

    const avatarId = uploadResponse.data?.data?.avatar_id;
    const status = uploadResponse.data?.data?.status;

    if (!avatarId) throw new Error('Avatar ID alınamadı');

    // Kullanıcı ayarlarına kaydet
    await supabase.from('user_settings').upsert({
      user_id: userId,
      heygen_avatar_id: avatarId,
      heygen_avatar_status: status || 'processing',
      updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id' });

    res.json({
      avatarId,
      status,
      message: status === 'completed'
        ? 'Avatar başarıyla oluşturuldu!'
        : 'Avatar işleniyor (~5-10 dakika)',
    });
  } catch (e: any) {
    console.error('Avatar upload error:', e.response?.data || e.message);
    res.status(500).json({ error: e.response?.data?.message || e.message });
  }
});

// ── FOTOĞRAFTAN AVATAR ────────────────────────────────────
router.post('/upload-photo-avatar', upload.single('photo'), async (req: any, res: any) => {
  try {
    const userId = req.userId;
    if (!req.file) return res.status(400).json({ error: 'Fotoğraf zorunlu' });

    const formData = new FormData();
    formData.append('image', req.file.buffer, {
      filename: req.file.originalname || 'avatar_photo.jpg',
      contentType: req.file.mimetype || 'image/jpeg',
    });

    const uploadResponse = await axios.post(
      `${HEYGEN_BASE}/v1/photo_avatar/create`,
      formData,
      {
        headers: {
          'X-Api-Key': HEYGEN_API_KEY,
          ...formData.getHeaders(),
        },
        timeout: 60000,
      }
    );

    const avatarId = uploadResponse.data?.data?.photo_avatar_id ||
                     uploadResponse.data?.data?.avatar_id;

    if (!avatarId) throw new Error('Photo avatar ID alınamadı');

    await supabase.from('user_settings').upsert({
      user_id: userId,
      heygen_avatar_id: avatarId,
      heygen_avatar_type: 'photo',
      heygen_avatar_status: 'completed',
      updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id' });

    res.json({ avatarId, status: 'completed', message: 'Fotoğraf avatarı oluşturuldu!' });
  } catch (e: any) {
    console.error('Photo avatar error:', e.response?.data || e.message);
    res.status(500).json({ error: e.response?.data?.message || e.message });
  }
});

// ── SES KLONLAMA ──────────────────────────────────────────
router.post('/upload-voice', upload.single('audio'), async (req: any, res: any) => {
  try {
    const userId = req.userId;
    const { voiceName } = req.body;
    if (!req.file) return res.status(400).json({ error: 'Ses dosyası zorunlu' });

    const formData = new FormData();
    formData.append('audio', req.file.buffer, {
      filename: req.file.originalname || 'voice_sample.mp3',
      contentType: req.file.mimetype || 'audio/mp3',
    });
    if (voiceName) formData.append('name', voiceName);

    const response = await axios.post(
      `${HEYGEN_BASE}/v2/voice/clone`,
      formData,
      {
        headers: {
          'X-Api-Key': HEYGEN_API_KEY,
          ...formData.getHeaders(),
        },
        timeout: 60000,
      }
    );

    const voiceId = response.data?.data?.voice_id;
    if (!voiceId) throw new Error('Voice ID alınamadı');

    await supabase.from('user_settings').upsert({
      user_id: userId,
      heygen_voice_id: voiceId,
      heygen_voice_name: voiceName || 'Kişisel Ses',
      updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id' });

    res.json({ voiceId, message: 'Ses klonu oluşturuldu! 🎙️' });
  } catch (e: any) {
    console.error('Voice clone error:', e.response?.data || e.message);
    res.status(500).json({ error: e.response?.data?.message || e.message });
  }
});

// ── AVATAR DURUMU ─────────────────────────────────────────
router.get('/avatar-status', async (req: any, res: any) => {
  try {
    const userId = req.userId;
    const { data: settings } = await supabase
      .from('user_settings')
      .select('heygen_avatar_id, heygen_avatar_status, heygen_avatar_type, heygen_voice_id, heygen_voice_name')
      .eq('user_id', userId)
      .single();

    if (!settings?.heygen_avatar_id) {
      return res.json({ hasAvatar: false, hasVoice: false });
    }

    // HeyGen'den güncel durumu al
    let currentStatus = settings.heygen_avatar_status;
    if (currentStatus === 'processing') {
      try {
        const response = await axios.get(
          `${HEYGEN_BASE}/v2/avatars`,
          { headers: heygenHeaders(), timeout: 8000 }
        );
        const avatars = response.data?.data?.avatars || [];
        const myAvatar = avatars.find((a: any) => a.avatar_id === settings.heygen_avatar_id);
        if (myAvatar) {
          currentStatus = 'completed';
          await supabase.from('user_settings').upsert({
            user_id: userId,
            heygen_avatar_status: 'completed',
            updated_at: new Date().toISOString(),
          }, { onConflict: 'user_id' });
        }
      } catch {}
    }

    res.json({
      hasAvatar: true,
      avatarId: settings.heygen_avatar_id,
      avatarStatus: currentStatus,
      avatarType: settings.heygen_avatar_type || 'video',
      hasVoice: !!settings.heygen_voice_id,
      voiceId: settings.heygen_voice_id,
      voiceName: settings.heygen_voice_name,
    });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// ── AVATAR SİL ────────────────────────────────────────────
router.delete('/avatar', async (req: any, res: any) => {
  try {
    const userId = req.userId;
    await supabase.from('user_settings').upsert({
      user_id: userId,
      heygen_avatar_id: null,
      heygen_avatar_status: null,
      heygen_avatar_type: null,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id' });
    res.json({ message: 'Avatar silindi' });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;