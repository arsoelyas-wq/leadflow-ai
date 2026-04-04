export {};
const express = require('express');
const { createClient } = require('@supabase/supabase-js');
const webpush = require('web-push');

const router = express.Router();
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

if (process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails('mailto:admin@leadflow.ai', process.env.VAPID_PUBLIC_KEY, process.env.VAPID_PRIVATE_KEY);
}

// Push subscription kaydet
router.post('/subscribe', async (req: any, res: any) => {
  try {
    const { subscription } = req.body;
    await supabase.from('push_subscriptions').upsert([{
      user_id: req.userId,
      subscription: JSON.stringify(subscription),
      updated_at: new Date().toISOString(),
    }], { onConflict: 'user_id' });
    res.json({ message: 'Bildirimler aktif edildi' });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// Bildirim gönder
router.post('/send', async (req: any, res: any) => {
  try {
    const { title, body, icon, url } = req.body;
    const { data } = await supabase.from('push_subscriptions').select('subscription').eq('user_id', req.userId).single();
    if (!data) return res.status(404).json({ error: 'Subscription bulunamadı' });

    const payload = JSON.stringify({ title, body, icon: icon || '/icon.png', url: url || '/dashboard' });
    await webpush.sendNotification(JSON.parse(data.subscription), payload);

    // DB'ye kaydet
    await supabase.from('notifications').insert([{
      user_id: req.userId, title, body, url,
      sent_at: new Date().toISOString(),
    }]);

    res.json({ message: 'Bildirim gönderildi' });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// Bildirimleri listele
router.get('/list', async (req: any, res: any) => {
  try {
    const { data } = await supabase.from('notifications').select('*')
      .eq('user_id', req.userId).order('sent_at', { ascending: false }).limit(20);
    res.json({ notifications: data || [] });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// Okundu işaretle
router.patch('/read/:id', async (req: any, res: any) => {
  try {
    await supabase.from('notifications').update({ read: true }).eq('id', req.params.id).eq('user_id', req.userId);
    res.json({ message: 'Okundu' });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// Okunmamış sayısı
router.get('/unread-count', async (req: any, res: any) => {
  try {
    const { data } = await supabase.from('notifications').select('id').eq('user_id', req.userId).eq('read', false);
    res.json({ count: data?.length || 0 });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// VAPID public key
router.get('/vapid-key', (req: any, res: any) => {
  res.json({ publicKey: process.env.VAPID_PUBLIC_KEY || '' });
});

// Yeni lead geldiğinde bildirim gönder (iç kullanım)
async function sendLeadNotification(userId: string, leadName: string) {
  try {
    const { data } = await supabase.from('push_subscriptions').select('subscription').eq('user_id', userId).single();
    if (!data) return;
    const payload = JSON.stringify({ title: '🎯 Yeni Lead!', body: `${leadName} sisteme eklendi`, url: '/leads' });
    await webpush.sendNotification(JSON.parse(data.subscription), payload);
  } catch {}
}

module.exports = { router, sendLeadNotification };