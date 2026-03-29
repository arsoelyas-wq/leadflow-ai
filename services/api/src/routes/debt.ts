export {};
const express = require('express');
const { createClient } = require('@supabase/supabase-js');

const router = express.Router();
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

function sleep(ms: number) { return new Promise(r => setTimeout(r, ms)); }

// ── AI TAHSİLAT MESAJI ÜRET ───────────────────────────────
async function generateCollectionMessage(invoice: any, attempt: number): Promise<string> {
  try {
    const Anthropic = require('@anthropic-ai/sdk');
    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    const tone = attempt === 1 ? 'nazik' : attempt === 2 ? 'kararlı' : 'son uyarı';
    const resp = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 150,
      messages: [{
        role: 'user',
        content: `${tone} tonunda tahsilat mesajı yaz. SADECE mesaj metni.
Müşteri: ${invoice.customer_name}
Tutar: ${invoice.amount} ${invoice.currency || 'TL'}
Fatura: ${invoice.invoice_no}
Vade: ${invoice.due_date}
Gecikme: ${invoice.days_overdue} gün
Max 130 karakter.`
      }]
    });
    return resp.content[0]?.text?.trim() || `Sayın ${invoice.customer_name}, ${invoice.amount} TL tutarlı faturanız ${invoice.days_overdue} gün gecikmiştir.`;
  } catch {
    return `Sayın ${invoice.customer_name}, ${invoice.invoice_no} no'lu ${invoice.amount} TL faturanız için ödeme bekliyoruz.`;
  }
}

// ── VADESİ GEÇEN FATURALARI İŞLE ─────────────────────────
async function processOverdueInvoices(userId: string) {
  try {
    const now = new Date();
    const { data: invoices } = await supabase.from('invoices')
      .select('*, leads(phone, contact_name, company_name)')
      .eq('user_id', userId)
      .eq('status', 'overdue')
      .lt('collection_attempts', 3)
      .not('leads.phone', 'is', null)
      .limit(20);

    if (!invoices?.length) return;

    const { sendWhatsAppMessage } = require('./settings');

    for (const invoice of invoices) {
      try {
        const daysOverdue = Math.floor((now.getTime() - new Date(invoice.due_date).getTime()) / (1000 * 60 * 60 * 24));
        const phone = invoice.leads?.phone;
        if (!phone) continue;

        const invoiceData = { ...invoice, days_overdue: daysOverdue, customer_name: invoice.leads?.contact_name || invoice.leads?.company_name };
        const message = await generateCollectionMessage(invoiceData, (invoice.collection_attempts || 0) + 1);

        await sendWhatsAppMessage(userId, phone, message);

        await supabase.from('invoices').update({
          collection_attempts: (invoice.collection_attempts || 0) + 1,
          last_collection_at: now.toISOString(),
          status: invoice.collection_attempts >= 2 ? 'final_notice' : 'overdue',
        }).eq('id', invoice.id);

        await supabase.from('messages').insert([{
          user_id: userId, lead_id: invoice.lead_id,
          direction: 'out', content: message,
          channel: 'whatsapp', sent_at: now.toISOString(),
          metadata: JSON.stringify({ type: 'collection', invoice_id: invoice.id }),
        }]);

        await sleep(8000);
      } catch (e: any) {
        console.error(`Collection error for invoice ${invoice.id}:`, e.message);
      }
    }
  } catch (e: any) {
    console.error('Invoice collection error:', e.message);
  }
}

// ── ROUTES ────────────────────────────────────────────────

// GET /api/debt/invoices
router.get('/invoices', async (req: any, res: any) => {
  try {
    const { status } = req.query;
    let query = supabase.from('invoices')
      .select('*, leads(company_name, contact_name, phone)')
      .eq('user_id', req.userId)
      .order('due_date', { ascending: true });
    if (status) query = query.eq('status', status);

    const { data, error } = await query;
    if (error) throw error;
    res.json({ invoices: data || [] });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// POST /api/debt/invoices — Fatura ekle
router.post('/invoices', async (req: any, res: any) => {
  try {
    const { lead_id, invoice_no, amount, currency, due_date, description } = req.body;
    if (!lead_id || !amount || !due_date) return res.status(400).json({ error: 'lead_id, amount, due_date zorunlu' });

    const now = new Date();
    const dueDate = new Date(due_date);
    const status = dueDate < now ? 'overdue' : 'pending';

    const { data } = await supabase.from('invoices').insert([{
      user_id: req.userId, lead_id, invoice_no: invoice_no || `INV-${Date.now()}`,
      amount, currency: currency || 'TL', due_date, description,
      status, collection_attempts: 0,
    }]).select().single();

    res.json({ invoice: data, message: 'Fatura eklendi!' });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// PATCH /api/debt/invoices/:id/paid — Ödendi işaretle
router.patch('/invoices/:id/paid', async (req: any, res: any) => {
  try {
    await supabase.from('invoices').update({
      status: 'paid', paid_at: new Date().toISOString(),
    }).eq('id', req.params.id).eq('user_id', req.userId);
    res.json({ message: 'Fatura ödendi olarak işaretlendi' });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// POST /api/debt/collect-now — Manuel tahsilat başlat
router.post('/collect-now', async (req: any, res: any) => {
  try {
    const { invoiceId } = req.body;
    if (invoiceId) {
      const { data: invoice } = await supabase.from('invoices')
        .select('*, leads(phone, contact_name, company_name)')
        .eq('id', invoiceId).eq('user_id', req.userId).single();
      if (!invoice) return res.status(404).json({ error: 'Fatura bulunamadı' });

      const phone = invoice.leads?.phone;
      if (!phone) return res.status(400).json({ error: 'Telefon yok' });

      const daysOverdue = Math.floor((Date.now() - new Date(invoice.due_date).getTime()) / (1000 * 60 * 60 * 24));
      const message = await generateCollectionMessage({
        ...invoice, days_overdue: daysOverdue,
        customer_name: invoice.leads?.contact_name || invoice.leads?.company_name,
      }, (invoice.collection_attempts || 0) + 1);

      const { sendWhatsAppMessage } = require('./settings');
      await sendWhatsAppMessage(req.userId, phone, message);

      await supabase.from('invoices').update({
        collection_attempts: (invoice.collection_attempts || 0) + 1,
        last_collection_at: new Date().toISOString(),
      }).eq('id', invoiceId);

      res.json({ message: 'Tahsilat mesajı gönderildi!' });
    } else {
      res.json({ message: 'Toplu tahsilat başlatıldı' });
      processOverdueInvoices(req.userId);
    }
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// GET /api/debt/stats
router.get('/stats', async (req: any, res: any) => {
  try {
    const { data } = await supabase.from('invoices').select('status, amount').eq('user_id', req.userId);
    const stats = {
      total: data?.length || 0,
      pending: data?.filter((i: any) => i.status === 'pending').length || 0,
      overdue: data?.filter((i: any) => i.status === 'overdue').length || 0,
      paid: data?.filter((i: any) => i.status === 'paid').length || 0,
      totalAmount: data?.reduce((a: number, i: any) => a + (parseFloat(i.amount) || 0), 0) || 0,
      overdueAmount: data?.filter((i: any) => i.status === 'overdue').reduce((a: number, i: any) => a + (parseFloat(i.amount) || 0), 0) || 0,
      paidAmount: data?.filter((i: any) => i.status === 'paid').reduce((a: number, i: any) => a + (parseFloat(i.amount) || 0), 0) || 0,
    };
    res.json(stats);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// Her gün vadesi geçenleri kontrol et
setInterval(() => {
  supabase.from('leads').select('user_id').eq('status', 'won').limit(1)
    .then(({ data }: any) => {
      const userIds = [...new Set((data || []).map((d: any) => d.user_id))];
      userIds.forEach((uid: any) => processOverdueInvoices(uid));
    });
}, 24 * 60 * 60 * 1000);

module.exports = router;