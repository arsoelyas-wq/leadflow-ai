export {};
const express = require('express');
const { createClient } = require('@supabase/supabase-js');

const router = express.Router();
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

function sleep(ms: number) { return new Promise(r => setTimeout(r, ms)); }

// ── MESAJ ANALİZİ ─────────────────────────────────────────
async function analyzeLeadMessage(message: string, lead: any, history: any[]): Promise<any> {
  const Anthropic = require('@anthropic-ai/sdk');
  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  const response = await anthropic.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 400,
    messages: [{
      role: 'user',
      content: `Lead mesajını analiz et.

Şirket: ${lead.company_name}
Mesaj: "${message}"
Geçmiş (son 3): ${history.slice(-3).map((m: any) => `${m.direction}: ${m.content?.slice(0, 50)}`).join(' | ')}

JSON döndür:
{
  "intent": "fiyat_soruyor | teklif_istiyor | itiraz_ediyor | ilgili | olumsuz | toplanti_istiyor | pazarlik_yapiyor",
  "urgency": "yuksek | orta | dusuk",
  "sentiment": "pozitif | notr | negatif",
  "keyPoints": ["önemli nokta 1", "önemli nokta 2"],
  "suggestedAction": "teklif_gonder | pazarlik_yap | toplanti_ayarla | bilgi_ver | bekle",
  "response": "Türkçe cevap taslağı (max 100 karakter)"
}`
    }]
  });

  const text = response.content[0]?.text || '';
  const match = text.match(/\{[\s\S]*\}/);
  return match ? JSON.parse(match[0]) : null;
}

// ── PDF TEKLİF OLUŞTUR ────────────────────────────────────
async function generateProposalPDF(proposalData: any): Promise<Buffer> {
  const PDFDocument = require('pdfkit');
  const doc = new PDFDocument({ margin: 50, size: 'A4' });
  const chunks: Buffer[] = [];

  return new Promise((resolve, reject) => {
    doc.on('data', (chunk: Buffer) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    const { company, contact, items, totalPrice, validUntil, senderCompany, notes } = proposalData;

    // Header
    doc.rect(0, 0, doc.page.width, 120).fill('#0f172a');
    doc.fillColor('#ffffff').fontSize(24).font('Helvetica-Bold')
      .text(senderCompany || 'LeadFlow AI', 50, 35);
    doc.fontSize(11).font('Helvetica').fillColor('#94a3b8')
      .text('Profesyonel Teklif', 50, 65);
    doc.fillColor('#ffffff').fontSize(10)
      .text(`Teklif No: TKL-${Date.now().toString().slice(-6)}`, 400, 35, { align: 'right' })
      .text(`Tarih: ${new Date().toLocaleDateString('tr-TR')}`, 400, 50, { align: 'right' })
      .text(`Geçerlilik: ${validUntil || '30 gün'}`, 400, 65, { align: 'right' });

    // Müşteri bilgileri
    doc.moveDown(3);
    doc.fillColor('#1e293b').rect(50, 140, doc.page.width - 100, 80).fill('#f8fafc');
    doc.fillColor('#0f172a').fontSize(12).font('Helvetica-Bold').text('Sayın', 70, 155);
    doc.fontSize(16).text(contact || company, 70, 170);
    doc.fontSize(11).font('Helvetica').fillColor('#64748b').text(company, 70, 190);

    // Teklif kalemleri başlık
    doc.moveDown(4);
    doc.fillColor('#0f172a').rect(50, 240, doc.page.width - 100, 35).fill('#0f172a');
    doc.fillColor('#ffffff').fontSize(11).font('Helvetica-Bold')
      .text('Ürün/Hizmet', 70, 252)
      .text('Miktar', 300, 252)
      .text('Birim Fiyat', 380, 252)
      .text('Toplam', 460, 252);

    // Kalemler
    let y = 290;
    let total = 0;
    (items || []).forEach((item: any, i: number) => {
      const rowColor = i % 2 === 0 ? '#f8fafc' : '#ffffff';
      doc.rect(50, y - 5, doc.page.width - 100, 30).fill(rowColor);
      doc.fillColor('#1e293b').fontSize(10).font('Helvetica')
        .text(item.name || '', 70, y)
        .text(String(item.qty || 1), 310, y)
        .text(`₺${Number(item.price || 0).toLocaleString('tr-TR')}`, 380, y)
        .text(`₺${Number((item.qty || 1) * (item.price || 0)).toLocaleString('tr-TR')}`, 460, y);
      total += (item.qty || 1) * (item.price || 0);
      y += 30;
    });

    // Toplam
    y += 10;
    doc.rect(350, y, doc.page.width - 400, 35).fill('#0f172a');
    doc.fillColor('#ffffff').fontSize(13).font('Helvetica-Bold')
      .text('TOPLAM:', 360, y + 10)
      .text(`₺${(totalPrice || total).toLocaleString('tr-TR')}`, 430, y + 10);

    // Notlar
    if (notes) {
      y += 60;
      doc.fillColor('#64748b').fontSize(10).font('Helvetica-Oblique')
        .text('* ' + notes, 50, y, { width: doc.page.width - 100 });
    }

    // Footer
    doc.rect(0, doc.page.height - 60, doc.page.width, 60).fill('#0f172a');
    doc.fillColor('#94a3b8').fontSize(9).font('Helvetica')
      .text('Bu teklif ' + (senderCompany || 'şirketimiz') + ' tarafından hazırlanmıştır.', 50, doc.page.height - 40)
      .text('Powered by LeadFlow AI', doc.page.width - 150, doc.page.height - 40);

    doc.end();
  });
}

// ── PAZARLIK STRATEJİSİ ───────────────────────────────────
async function generateNegotiationResponse(
  lead: any, message: string, analysis: any, currentOffer: any
): Promise<any> {
  const Anthropic = require('@anthropic-ai/sdk');
  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  const response = await anthropic.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 400,
    messages: [{
      role: 'user',
      content: `B2B pazarlık yanıtı üret.

Şirket: ${lead.company_name}
Lead mesajı: "${message}"
Analiz: ${analysis?.intent} / ${analysis?.sentiment}
Mevcut teklif: ₺${currentOffer?.totalPrice || 0}
Min kabul fiyatı: ₺${currentOffer?.minPrice || currentOffer?.totalPrice * 0.85 || 0}

JSON döndür:
{
  "tactic": "değer_vurgula | indirim_ver | paket_öner | ödeme_vadesi | ücretsiz_ek | son_fiyat",
  "discountPercent": 0,
  "counterMessage": "Türkçe WhatsApp mesajı (max 150 karakter)",
  "newPrice": 0,
  "sendProposal": true
}`
    }]
  });

  const text = response.content[0]?.text || '';
  const match = text.match(/\{[\s\S]*\}/);
  return match ? JSON.parse(match[0]) : null;
}

// ── ROUTES ────────────────────────────────────────────────

// POST /api/proposals/analyze — Mesaj analiz et
router.post('/analyze', async (req: any, res: any) => {
  try {
    const { leadId, message } = req.body;
    const userId = req.userId;

    const { data: lead } = await supabase.from('leads').select('*').eq('id', leadId).eq('user_id', userId).single();
    if (!lead) return res.status(404).json({ error: 'Lead bulunamadı' });

    const { data: history } = await supabase.from('messages').select('*')
      .eq('lead_id', leadId).order('sent_at', { ascending: false }).limit(10);

    const analysis = await analyzeLeadMessage(message, lead, history || []);
    res.json({ analysis, lead });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// POST /api/proposals/create — Teklif oluştur
router.post('/create', async (req: any, res: any) => {
  try {
    const userId = req.userId;
    const { leadId, items, notes, validUntil, senderCompany } = req.body;

    const { data: lead } = await supabase.from('leads').select('*').eq('id', leadId).eq('user_id', userId).single();
    if (!lead) return res.status(404).json({ error: 'Lead bulunamadı' });

    const totalPrice = (items || []).reduce((sum: number, item: any) =>
      sum + (item.qty || 1) * (item.price || 0), 0);

    const proposalData = {
      company: lead.company_name,
      contact: lead.contact_name,
      items: items || [],
      totalPrice,
      minPrice: totalPrice * 0.85,
      validUntil: validUntil || '30 gün',
      senderCompany: senderCompany || 'Şirketimiz',
      notes,
    };

    // PDF üret
    const pdfBuffer = await generateProposalPDF(proposalData);
    const base64PDF = pdfBuffer.toString('base64');

    // DB'ye kaydet
    const { data: proposal } = await supabase.from('proposals').insert([{
      user_id: userId,
      lead_id: leadId,
      items: JSON.stringify(items),
      total_price: totalPrice,
      min_price: proposalData.minPrice,
      status: 'draft',
      valid_until: validUntil,
      notes,
    }]).select().single();

    res.json({
      proposalId: proposal?.id,
      totalPrice,
      pdfBase64: base64PDF,
      message: 'Teklif oluşturuldu!',
    });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// POST /api/proposals/negotiate — Pazarlık yanıtı
router.post('/negotiate', async (req: any, res: any) => {
  try {
    const userId = req.userId;
    const { leadId, message, proposalId } = req.body;

    const { data: lead } = await supabase.from('leads').select('*').eq('id', leadId).eq('user_id', userId).single();
    const { data: proposal } = await supabase.from('proposals').select('*').eq('id', proposalId).single();

    const { data: history } = await supabase.from('messages').select('*')
      .eq('lead_id', leadId).order('sent_at', { ascending: false }).limit(10);

    const analysis = await analyzeLeadMessage(message, lead, history || []);
    const negotiation = await generateNegotiationResponse(lead, message, analysis, proposal);

    // Fiyat güncelle
    if (negotiation?.newPrice && proposal) {
      await supabase.from('proposals').update({
        total_price: negotiation.newPrice,
        status: 'negotiating',
        discount_percent: negotiation.discountPercent,
      }).eq('id', proposalId);
    }

    res.json({ analysis, negotiation });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// POST /api/proposals/send — WhatsApp'tan gönder
router.post('/send/:proposalId', async (req: any, res: any) => {
  try {
    const userId = req.userId;
    const { message } = req.body;

    const { data: proposal } = await supabase.from('proposals')
      .select('*, leads(*)').eq('id', req.params.proposalId).eq('user_id', userId).single();
    if (!proposal) return res.status(404).json({ error: 'Teklif bulunamadı' });

    const phone = proposal.leads?.phone;
    if (!phone) return res.status(400).json({ error: 'Telefon numarası yok' });

    const { sendWhatsAppMessage } = require('./settings');
    const firstName = (proposal.leads.contact_name || proposal.leads.company_name).split(' ')[0];
    const finalMessage = message || `Merhaba ${firstName} Bey/Hanım! 👋\n\nSizin için hazırladığımız teklifimizi paylaşmak istiyoruz. Toplam: ₺${Number(proposal.total_price).toLocaleString('tr-TR')}\n\nDetayları görüşmek ister misiniz? 🤝`;

    await sendWhatsAppMessage(userId, phone, finalMessage);
    await supabase.from('proposals').update({ status: 'sent', sent_at: new Date().toISOString() }).eq('id', req.params.proposalId);
    await supabase.from('messages').insert([{
      user_id: userId, lead_id: proposal.lead_id,
      direction: 'out', content: finalMessage, channel: 'whatsapp',
      sent_at: new Date().toISOString(),
      metadata: JSON.stringify({ type: 'proposal', proposalId: proposal.id }),
    }]);

    res.json({ message: 'Teklif WhatsApp\'tan gönderildi! ✅' });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// GET /api/proposals/list
router.get('/list', async (req: any, res: any) => {
  try {
    const userId = req.userId;
    const { data, error } = await supabase.from('proposals')
      .select('*, leads(company_name, contact_name, phone)')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(50);
    if (error) throw error;
    res.json({ proposals: data || [] });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// GET /api/proposals/stats
router.get('/stats', async (req: any, res: any) => {
  try {
    const userId = req.userId;
    const { data } = await supabase.from('proposals').select('status, total_price').eq('user_id', userId);
    const stats = {
      total: data?.length || 0,
      sent: data?.filter((p: any) => p.status === 'sent').length || 0,
      accepted: data?.filter((p: any) => p.status === 'accepted').length || 0,
      totalValue: data?.reduce((sum: number, p: any) => sum + (p.total_price || 0), 0) || 0,
    };
    res.json(stats);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// PATCH /api/proposals/:id/status — Durum güncelle
router.patch('/:id/status', async (req: any, res: any) => {
  try {
    const { status } = req.body;
    await supabase.from('proposals').update({ status }).eq('id', req.params.id).eq('user_id', req.userId);
    res.json({ message: 'Durum güncellendi' });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;