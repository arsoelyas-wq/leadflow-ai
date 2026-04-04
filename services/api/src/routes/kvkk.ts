export {};
const express = require('express');
const { createClient } = require('@supabase/supabase-js');

const router = express.Router();
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

// KVKK/GDPR uyumluluk durumu
router.get('/status', async (req: any, res: any) => {
  try {
    const { data } = await supabase.from('kvkk_settings').select('*').eq('user_id', req.userId).single();
    const { data: leads } = await supabase.from('leads').select('id, kvkk_consent').eq('user_id', req.userId);
    const { data: requests } = await supabase.from('kvkk_requests').select('status').eq('user_id', req.userId);

    const consentRate = leads?.length ? Math.round((leads.filter((l: any) => l.kvkk_consent).length / leads.length) * 100) : 0;

    res.json({
      settings: data || {},
      complianceScore: calculateScore(data, consentRate),
      consentRate,
      totalLeads: leads?.length || 0,
      consentedLeads: leads?.filter((l: any) => l.kvkk_consent).length || 0,
      pendingRequests: requests?.filter((r: any) => r.status === 'pending').length || 0,
      checklist: getChecklist(data),
    });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

function calculateScore(settings: any, consentRate: number): number {
  let score = 0;
  if (settings?.privacy_policy_url) score += 20;
  if (settings?.data_retention_days) score += 15;
  if (settings?.dpo_email) score += 15;
  if (settings?.encryption_enabled) score += 20;
  if (consentRate > 80) score += 30;
  else if (consentRate > 50) score += 15;
  return score;
}

function getChecklist(settings: any): any[] {
  return [
    { id: 1, title: 'Gizlilik Politikası', done: !!settings?.privacy_policy_url, required: true },
    { id: 2, title: 'Veri Saklama Süresi', done: !!settings?.data_retention_days, required: true },
    { id: 3, title: 'DPO/VERBİS Kaydı', done: !!settings?.dpo_email, required: true },
    { id: 4, title: 'Şifreleme Aktif', done: !!settings?.encryption_enabled, required: true },
    { id: 5, title: 'Açık Rıza Metni', done: !!settings?.consent_text, required: true },
    { id: 6, title: 'Veri İşleme Kaydı', done: !!settings?.processing_registry, required: false },
    { id: 7, title: 'Güvenlik Testi', done: !!settings?.security_tested, required: false },
  ];
}

// Ayarları kaydet
router.post('/settings', async (req: any, res: any) => {
  try {
    const { privacyPolicyUrl, dataRetentionDays, dpoEmail, consentText, encryptionEnabled, processingRegistry, securityTested } = req.body;
    await supabase.from('kvkk_settings').upsert([{
      user_id: req.userId,
      privacy_policy_url: privacyPolicyUrl,
      data_retention_days: dataRetentionDays,
      dpo_email: dpoEmail,
      consent_text: consentText,
      encryption_enabled: encryptionEnabled,
      processing_registry: processingRegistry,
      security_tested: securityTested,
      updated_at: new Date().toISOString(),
    }], { onConflict: 'user_id' });
    res.json({ message: 'KVKK ayarları kaydedildi' });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// Veri silme talebi
router.post('/delete-request', async (req: any, res: any) => {
  try {
    const { leadId, reason } = req.body;
    await supabase.from('kvkk_requests').insert([{
      user_id: req.userId, lead_id: leadId,
      type: 'delete', reason, status: 'pending',
      requested_at: new Date().toISOString(),
    }]);
    res.json({ message: 'Silme talebi alındı — 30 gün içinde işlenecek' });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// Talepleri listele
router.get('/requests', async (req: any, res: any) => {
  try {
    const { data } = await supabase.from('kvkk_requests').select('*, leads(company_name)')
      .eq('user_id', req.userId).order('requested_at', { ascending: false });
    res.json({ requests: data || [] });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// Veri dışa aktarma
router.get('/export/:leadId', async (req: any, res: any) => {
  try {
    const { data: lead } = await supabase.from('leads').select('*').eq('id', req.params.leadId).eq('user_id', req.userId).single();
    const { data: messages } = await supabase.from('messages').select('*').eq('lead_id', req.params.leadId);
    res.json({ lead, messages: messages || [], exportedAt: new Date().toISOString() });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

module.exports = router;