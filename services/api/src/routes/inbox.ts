export {};
const express = require('express');
const { createClient } = require('@supabase/supabase-js');
const axios = require('axios');
const multer = require('multer');
const Anthropic = require('@anthropic-ai/sdk');
const nodemailer = require('nodemailer');

const router  = express.Router();
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY, maxRetries: 0 });
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 20 * 1024 * 1024 } });

// ─── GET /api/inbox/messages — Belirli lead için mesajlar ─────────────────────
// KRİTİK BUG DÜZELTMESİ: Önceden leadId filtresi yok sayılıyordu → tüm mesajlar geliyordu
router.get('/messages', async (req: any, res: any) => {
  try {
    const { leadId, channel, limit = 100 } = req.query;
    const userId = req.userId;

    let query = supabase
      .from('messages')
      .select('id, content, direction, channel, sent_at, read, status, media, reply_to_id, metadata')
      .eq('user_id', userId)
      .order('sent_at', { ascending: true })
      .limit(parseInt(limit as string));

    if (leadId) query = query.eq('lead_id', leadId);
    if (channel) query = query.eq('channel', channel);

    const { data, error } = await query;
    if (error) throw error;

    res.json({ messages: data || [] });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// ─── GET /api/inbox/conversations — Lead bazlı konuşmalar (N+1 DÜZELTİLDİ) ──
router.get('/conversations', async (req: any, res: any) => {
  try {
    const { limit = 200 } = req.query;
    const userId = req.userId;

    // 1. Tüm leadleri al
    const { data: leads, error: leadErr } = await supabase
      .from('leads')
      .select('id, company_name, contact_name, phone, email, source, status, score')
      .eq('user_id', userId)
      .order('updated_at', { ascending: false })
      .limit(parseInt(limit as string));
    if (leadErr) throw leadErr;
    if (!leads?.length) return res.json({ conversations: [] });

    const leadIds = leads.map((l: any) => l.id);

    // 2. Tüm leadler için son mesaj — TEK sorgu (N+1 kaldırıldı)
    const { data: lastMsgs } = await supabase
      .from('messages')
      .select('id, lead_id, content, direction, sent_at, channel, read')
      .eq('user_id', userId)
      .in('lead_id', leadIds)
      .order('sent_at', { ascending: false });

    // 3. Lead başına son mesajı ve okunmamış sayısını hesapla
    const lastMsgMap: Record<string, any>  = {};
    const unreadMap:  Record<string, number> = {};
    for (const m of (lastMsgs || [])) {
      if (!lastMsgMap[m.lead_id]) lastMsgMap[m.lead_id] = m;
      if (m.direction === 'in' && !m.read) {
        unreadMap[m.lead_id] = (unreadMap[m.lead_id] || 0) + 1;
      }
    }

    const conversations = leads
      .map((lead: any) => ({
        lead,
        lastMessage:  lastMsgMap[lead.id]  || null,
        unreadCount:  unreadMap[lead.id]   || 0,
      }))
      .filter((c: any) => c.lastMessage !== null); // Sadece mesajı olan leadler

    // 4. Önce okunmamış olanlar, sonra son mesaj tarihine göre
    conversations.sort((a: any, b: any) => {
      if (a.unreadCount > 0 && b.unreadCount === 0) return -1;
      if (b.unreadCount > 0 && a.unreadCount === 0) return 1;
      const ta = a.lastMessage ? new Date(a.lastMessage.sent_at).getTime() : 0;
      const tb = b.lastMessage ? new Date(b.lastMessage.sent_at).getTime() : 0;
      return tb - ta;
    });

    res.json({ conversations });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// ─── POST /api/inbox/send — Mesaj gönder ─────────────────────────────────────
router.post('/send', async (req: any, res: any) => {
  try {
    const { leadId, content, channel = 'whatsapp', replyToId } = req.body;
    if (!leadId || !content?.trim()) return res.status(400).json({ error: 'leadId ve content zorunlu' });

    const { data: lead } = await supabase.from('leads').select('*')
      .eq('id', leadId).eq('user_id', req.userId).single();
    if (!lead) return res.status(404).json({ error: 'Lead bulunamadı' });

    // Template değişkenlerini lead verileriyle doldur
    const firma  = lead.company_name || lead.contact_name || 'Sayın Yetkili';
    const isim   = lead.contact_name || lead.company_name || 'Yetkili';
    const sehir  = lead.city   || '';
    const sektor = lead.sector || '';
    const personalizedContent = content
      .replace(/\{\{firma\}\}/gi,   firma)
      .replace(/\{\{isim\}\}/gi,    isim)
      .replace(/\{\{sehir\}\}/gi,   sehir)
      .replace(/\{\{sektor\}\}/gi,  sektor)
      .replace(/\[FIRMA_ADI\]/g, firma)
      .replace(/\[SEHIR\]/g,     sehir)
      .replace(/\[SEKTOR\]/g,    sektor)
      .replace(/\[AD\]/g,        isim);

    if (channel === 'whatsapp') {
      if (!lead.phone) return res.status(400).json({ error: 'Telefon numarası yok' });
      const { sendWhatsAppMessage } = require('./settings');
      await sendWhatsAppMessage(req.userId, lead.phone, personalizedContent, true); // true = inbox manuel gönderim, saat sınırı yok
    } else if (channel === 'email') {
      if (!lead.email) return res.status(400).json({ error: 'Email adresi yok' });
      const { data: smtp } = await supabase.from('smtp_settings').select('*').eq('user_id', req.userId).single();
      if (!smtp?.smtp_host) return res.status(400).json({ error: 'SMTP ayarları eksik — Ayarlar sayfasından SMTP bilgilerini girin' });
      const transporter = nodemailer.createTransport({
        host: smtp.smtp_host, port: smtp.smtp_port || 587,
        secure: smtp.smtp_port === 465,
        auth: { user: smtp.smtp_user, pass: smtp.smtp_pass },
        tls: { rejectUnauthorized: false },
      });
      await transporter.sendMail({
        from: `${smtp.from_name} <${smtp.from_email}>`,
        to: lead.email,
        subject: `${lead.company_name} için mesaj`,
        text: personalizedContent,
      });
    }

    const now = new Date().toISOString();
    const { data: msg } = await supabase.from('messages').insert([{
      user_id: req.userId, lead_id: leadId,
      direction: 'out', content: personalizedContent.trim(), channel,
      sent_at: now, read: true,
      reply_to_id: replyToId || null,
    }]).select().single();

    await supabase.from('leads').update({ last_contacted_at: now, status: 'contacted' }).eq('id', leadId);
    res.json({ message: msg, success: true });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// ─── POST /api/inbox/send-media — Dosya/görsel gönder ────────────────────────
router.post('/send-media', upload.single('file'), async (req: any, res: any) => {
  try {
    const { leadId, channel = 'whatsapp', caption } = req.body;
    const file = req.file;
    if (!leadId || !file) return res.status(400).json({ error: 'leadId ve file zorunlu' });

    const { data: lead } = await supabase.from('leads').select('*')
      .eq('id', leadId).eq('user_id', req.userId).single();
    if (!lead) return res.status(404).json({ error: 'Lead bulunamadı' });

    // Supabase Storage'a yükle
    const ext  = file.originalname?.split('.').pop() || 'bin';
    const path = `message-media/${req.userId}/${leadId}/${Date.now()}.${ext}`;
    const { error: upErr } = await supabase.storage
      .from('message-media')
      .upload(path, file.buffer, { contentType: file.mimetype, upsert: false });
    if (upErr) throw new Error(upErr.message);

    const { data: { publicUrl } } = supabase.storage.from('message-media').getPublicUrl(path);

    // Medya tipini tespit et
    const mime = file.mimetype || '';
    const mediaType = mime.startsWith('image/') ? 'image'
                    : mime.startsWith('video/') ? 'video'
                    : mime.startsWith('audio/') ? 'audio'
                    : 'document';

    const media = {
      type:      mediaType,
      url:       publicUrl,
      name:      file.originalname,
      size:      file.size,
      mime_type: mime,
    };

    // WhatsApp'a medya gönder (mümkünse)
    if (channel === 'whatsapp' && lead.phone) {
      try {
        const { sendWhatsAppMessage } = require('./settings');
        const captionText = caption ? `${caption}\n${publicUrl}` : publicUrl;
        await sendWhatsAppMessage(req.userId, lead.phone, captionText, true); // inbox manuel, saat sınırı yok
      } catch { /* Medya linki gönder yeterli */ }
    }

    const { data: msg } = await supabase.from('messages').insert([{
      user_id: req.userId, lead_id: leadId,
      direction: 'out', content: caption || '', channel,
      sent_at: new Date().toISOString(), read: true,
      media,
    }]).select().single();

    res.json({ message: msg, mediaUrl: publicUrl, success: true });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// ─── GET /api/inbox/ai-suggest/:leadId — AI yanıt önerileri ──────────────────
router.get('/ai-suggest/:leadId', async (req: any, res: any) => {
  try {
    const { leadId } = req.params;

    const [{ data: messages }, { data: lead }, { data: profile }] = await Promise.all([
      supabase.from('messages').select('content,direction,sent_at').eq('lead_id', leadId)
        .eq('user_id', req.userId).order('sent_at', { ascending: false }).limit(10),
      supabase.from('leads').select('*').eq('id', leadId).eq('user_id', req.userId).single(),
      supabase.from('business_profiles').select('company,product').eq('user_id', req.userId).single(),
    ]);

    if (!messages?.length || !lead) return res.json({ suggestions: [] });

    const history = (messages || []).reverse();
    const lastIncoming = history.filter((m: any) => m.direction === 'in').pop();
    if (!lastIncoming) return res.json({ suggestions: [] });

    const convoText = history.slice(-6).map((m: any) =>
      `[${m.direction === 'out' ? 'BEN' : 'MÜŞTERİ'}]: ${m.content}`
    ).join('\n');

    const companyName = profile?.company?.name || 'Şirketimiz';
    const productDesc = profile?.product?.description || 'ürün ve hizmetlerimiz';

    const r = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 400,
      messages: [{
        role: 'user',
        content: `Satış temsilcisisin. ${companyName} adına ${lead.company_name} ile konuşuyorsun.
Sunduğun: ${productDesc}

Konuşma geçmişi:
${convoText}

MÜŞTERİ son mesajı: "${lastIncoming.content}"

3 farklı, kısa ve doğal Türkçe cevap seçeneği yaz.
FORMAT (sadece bu 3 satır, başka hiçbir şey ekleme):
1. [cevap 1]
2. [cevap 2]
3. [cevap 3]`,
      }],
    }, { timeout: 20000 });

    const text = (r.content[0] as any)?.text || '';
    const suggestions = text.split('\n')
      .filter((l: string) => /^\d+\./.test(l.trim()))
      .map((l: string) => l.replace(/^\d+\.\s*/, '').trim())
      .filter((l: string) => l.length > 3)
      .slice(0, 3);

    res.json({ suggestions });
  } catch { res.json({ suggestions: [] }); }
});

// ─── PATCH /api/inbox/read/:leadId — Okundu işaretle ─────────────────────────
router.patch('/read/:leadId', async (req: any, res: any) => {
  try {
    await supabase.from('messages').update({ read: true })
      .eq('lead_id', req.params.leadId).eq('user_id', req.userId).eq('direction', 'in');
    res.json({ success: true });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// ─── GET /api/inbox/stats ─────────────────────────────────────────────────────
router.get('/stats', async (req: any, res: any) => {
  try {
    const [unread, today, total] = await Promise.all([
      supabase.from('messages').select('id', { count: 'exact' })
        .eq('user_id', req.userId).eq('direction', 'in').eq('read', false),
      supabase.from('messages').select('id', { count: 'exact' })
        .eq('user_id', req.userId).gte('sent_at', new Date().toISOString().split('T')[0]),
      supabase.from('messages').select('id', { count: 'exact' }).eq('user_id', req.userId),
    ]);
    res.json({
      unread: (unread as any).count || 0,
      today:  (today  as any).count || 0,
      total:  (total  as any).count || 0,
    });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

module.exports = router;
