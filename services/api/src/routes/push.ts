export {};
const express = require('express');
const { createClient } = require('@supabase/supabase-js');
const webpush = require('web-push');

const router = express.Router();
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

// VAPID keys - Railway'e ekle
const VAPID_PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY;
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY;

if (VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails('mailto:admin@leadflow.ai', VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
}

// POST /api/push/subscribe
router.post('/subscribe', async (req: any, res: any) => {
  try {
    const userId = req.userId;
    const { subscription } = req.body;
    if (!subscription) return res.status(400).json({ error: 'subscription zorunlu' });

    await supabase.from('push_subscriptions').upsert([{
      user_id: userId,
      subscription: JSON.stringify(subscription),
      updated_at: new Date().toISOString(),
    }], { onConflict: 'user_id' });

    res.json({ message: 'Push notification aktifleştirildi!' });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// POST /api/push/send — Bildirim gönder
router.post('/send', async (req: any, res: any) => {
  try {
    const userId = req.userId;
    const { title, body, url } = req.body;

    const { data: sub } = await supabase.from('push_subscriptions')
      .select('subscription').eq('user_id', userId).single();

    if (!sub?.subscription) return res.status(404).json({ error: 'Subscription bulunamadı' });

    const payload = JSON.stringify({ title, body, url: url || '/dashboard', icon: '/icons/icon-192x192.png' });
    await webpush.sendNotification(JSON.parse(sub.subscription), payload);

    res.json({ message: 'Bildirim gönderildi!' });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// GET /api/push/vapid-key — Public key
router.get('/vapid-key', (req: any, res: any) => {
  res.json({ publicKey: VAPID_PUBLIC_KEY });
});

// Sistem bildirimleri gönder (yeni lead, yeni cevap)
async function sendSystemNotification(userId: string, title: string, body: string, url: string) {
  try {
    const { data: sub } = await supabase.from('push_subscriptions')
      .select('subscription').eq('user_id', userId).single();
    if (!sub?.subscription) return;
    const payload = JSON.stringify({ title, body, url, icon: '/icons/icon-192x192.png' });
    await webpush.sendNotification(JSON.parse(sub.subscription), payload);
  } catch {}
}

module.exports = router;
module.exports.sendSystemNotification = sendSystemNotification;