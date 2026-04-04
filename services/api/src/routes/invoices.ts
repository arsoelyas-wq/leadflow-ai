export {};
const express = require('express');
const { createClient } = require('@supabase/supabase-js');

const router = express.Router();
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

// Fatura oluştur
router.post('/create', async (req: any, res: any) => {
  try {
    const { leadId, items, dueDate, notes } = req.body;
    if (!leadId || !items?.length) return res.status(400).json({ error: 'leadId ve items zorunlu' });

    const { data: settings } = await supabase.from('user_settings').select('company_name, tax_rate').eq('user_id', req.userId).single();
    const { data: lead } = await supabase.from('leads').select('company_name, contact_name, phone, email').eq('id', leadId).single();

    // Fatura numarası
    const { data: lastInvoice } = await supabase.from('invoices').select('invoice_number').eq('user_id', req.userId).order('created_at', { ascending: false }).limit(1).single().catch(() => ({ data: null }));
    const lastNum = parseInt(lastInvoice?.invoice_number?.replace(/\D/g, '') || '0');
    const invoiceNumber = `INV-${String(lastNum + 1).padStart(4, '0')}`;

    const subtotal = items.reduce((s: number, i: any) => s + (i.price * i.qty), 0);
    const taxRate = settings?.tax_rate || 18;
    const tax = subtotal * taxRate / 100;
    const total = subtotal + tax;

    const { data: invoice } = await supabase.from('invoices').insert([{
      user_id: req.userId,
      lead_id: leadId,
      invoice_number: invoiceNumber,
      company_name: settings?.company_name,
      client_name: lead?.company_name,
      client_email: lead?.email,
      client_phone: lead?.phone,
      items: JSON.stringify(items),
      subtotal, tax, total,
      tax_rate: taxRate,
      due_date: dueDate,
      notes, status: 'draft',
      created_at: new Date().toISOString(),
    }]).select().single();

    res.json({ invoice, message: `Fatura ${invoiceNumber} oluşturuldu` });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// Fatura listesi
router.get('/list', async (req: any, res: any) => {
  try {
    const { data } = await supabase.from('invoices').select('*, leads(company_name)')
      .eq('user_id', req.userId).order('created_at', { ascending: false });
    res.json({ invoices: data || [] });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// Fatura durumu güncelle
router.patch('/:id/status', async (req: any, res: any) => {
  try {
    const { status } = req.body;
    await supabase.from('invoices').update({ status, updated_at: new Date().toISOString() })
      .eq('id', req.params.id).eq('user_id', req.userId);
    res.json({ message: `Fatura ${status} olarak güncellendi` });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// PDF HTML oluştur
router.get('/:id/html', async (req: any, res: any) => {
  try {
    const { data: inv } = await supabase.from('invoices').select('*').eq('id', req.params.id).eq('user_id', req.userId).single();
    if (!inv) return res.status(404).json({ error: 'Fatura bulunamadı' });

    const items = JSON.parse(inv.items || '[]');
    const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"><style>
body{font-family:Arial,sans-serif;padding:40px;color:#333}
.header{display:flex;justify-content:space-between;margin-bottom:30px}
h1{color:#1e40af}table{width:100%;border-collapse:collapse;margin:20px 0}
th{background:#1e40af;color:white;padding:10px;text-align:left}
td{padding:8px;border-bottom:1px solid #eee}.total{font-size:18px;font-weight:bold;color:#1e40af}
</style></head><body>
<div class="header"><div><h1>FATURA</h1><p>${inv.invoice_number}</p></div>
<div><h2>${inv.company_name || 'Şirket'}</h2></div></div>
<div><strong>Müşteri:</strong> ${inv.client_name}<br>
<strong>Tarih:</strong> ${new Date(inv.created_at).toLocaleDateString('tr-TR')}<br>
<strong>Vade:</strong> ${inv.due_date ? new Date(inv.due_date).toLocaleDateString('tr-TR') : '-'}</div>
<table><tr><th>Ürün/Hizmet</th><th>Adet</th><th>Birim Fiyat</th><th>Toplam</th></tr>
${items.map((i: any) => `<tr><td>${i.name}</td><td>${i.qty}</td><td>₺${i.price}</td><td>₺${i.price * i.qty}</td></tr>`).join('')}
</table>
<div style="text-align:right">
<p>Ara Toplam: ₺${inv.subtotal?.toFixed(2)}</p>
<p>KDV (%${inv.tax_rate}): ₺${inv.tax?.toFixed(2)}</p>
<p class="total">TOPLAM: ₺${inv.total?.toFixed(2)}</p>
</div>
${inv.notes ? `<p><strong>Notlar:</strong> ${inv.notes}</p>` : ''}
</body></html>`;

    res.setHeader('Content-Type', 'text/html');
    res.send(html);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// Stats
router.get('/stats', async (req: any, res: any) => {
  try {
    const { data } = await supabase.from('invoices').select('total, status').eq('user_id', req.userId);
    res.json({
      total: data?.length || 0,
      paid: data?.filter((i: any) => i.status === 'paid').length || 0,
      pending: data?.filter((i: any) => i.status === 'sent').length || 0,
      overdue: data?.filter((i: any) => i.status === 'overdue').length || 0,
      totalRevenue: data?.filter((i: any) => i.status === 'paid').reduce((s: number, i: any) => s + parseFloat(i.total || 0), 0) || 0,
      pendingRevenue: data?.filter((i: any) => i.status !== 'paid').reduce((s: number, i: any) => s + parseFloat(i.total || 0), 0) || 0,
    });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

module.exports = router;