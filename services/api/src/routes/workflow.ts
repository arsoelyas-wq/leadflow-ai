export {};
const express = require('express');
const { createClient } = require('@supabase/supabase-js');

const router = express.Router();
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

function sleep(ms: number) { return new Promise(r => setTimeout(r, ms)); }

// ── WORKFLOW TIPLERI ──────────────────────────────────────
const WORKFLOW_TYPES: Record<string, any> = {
  cold_outreach: {
    name: 'Soğuk Erişim',
    steps: [
      { day: 0, type: 'whatsapp', template: 'cold_day0', description: 'İlk temas — kişisel mesaj' },
      { day: 3, type: 'whatsapp', template: 'cold_day3', description: 'İkinci temas — farklı açı' },
      { day: 7, type: 'video', template: 'cold_day7', description: 'AI video mesaj' },
      { day: 10, type: 'whatsapp', template: 'cold_day10', description: 'Teklif sun' },
      { day: 14, type: 'whatsapp', template: 'cold_day14', description: 'Son deneme' },
    ]
  },
  warm_followup: {
    name: 'Sıcak Takip',
    steps: [
      { day: 0, type: 'whatsapp', template: 'warm_day0', description: 'Cevap aldın, takip et' },
      { day: 2, type: 'whatsapp', template: 'warm_day2', description: 'Değer önerisi' },
      { day: 5, type: 'video', template: 'warm_day5', description: 'Demo video' },
      { day: 7, type: 'whatsapp', template: 'warm_day7', description: 'Teklif' },
    ]
  },
  proposal_sent: {
    name: 'Teklif Gönderildi',
    steps: [
      { day: 1, type: 'whatsapp', template: 'proposal_day1', description: 'Teklif ulaştı mı?' },
      { day: 3, type: 'whatsapp', template: 'proposal_day3', description: 'Soru var mı?' },
      { day: 7, type: 'whatsapp', template: 'proposal_day7', description: 'Karar aşaması' },
    ]
  },
  retargeting: {
    name: 'Retargeting',
    steps: [
      { day: 0, type: 'whatsapp', template: 'retarget_day0', description: 'Farklı açıdan yeniden temas' },
      { day: 5, type: 'video', template: 'retarget_day5', description: 'Yeni bir değer sun' },
      { day: 10, type: 'whatsapp', template: 'retarget_day10', description: 'Son şans' },
    ]
  },
  won_customer: {
    name: 'Kazanılan Müşteri',
    steps: [
      { day: 1, type: 'whatsapp', template: 'won_day1', description: 'Teşekkür mesajı' },
      { day: 15, type: 'whatsapp', template: 'won_day15', description: 'Memnuniyet sorusu' },
      { day: 30, type: 'whatsapp', template: 'won_day30', description: 'Referral isteği' },
      { day: 90, type: 'whatsapp', template: 'won_day90', description: 'Yeni ürün/hizmet tanıtımı' },
    ]
  },
};

// ── AI İLE WORKFLOW SEÇ ───────────────────────────────────
async function selectWorkflow(lead: any): Promise<string> {
  if (lead.status === 'won') return 'won_customer';
  if (lead.score >= 80) return 'warm_followup';
  if (lead.status === 'replied') return 'warm_followup';
  return 'cold_outreach';
}

// ── AI İLE MESAJ ÜRET ─────────────────────────────────────
async function generateStepMessage(lead: any, step: any, workflowType: string): Promise<string> {
  try {
    const Anthropic = require('@anthropic-ai/sdk');
    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

    const response = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 200,
      messages: [{
        role: 'user',
        content: `B2B WhatsApp mesajı yaz. SADECE mesaj metni yaz, başka hiçbir şey ekleme.

Şirket: ${lead.company_name}
Kişi: ${lead.contact_name || 'Yetkili'}
Sektör: ${lead.sector || 'genel'}
Şehir: ${lead.city || ''}
Adım: ${step.description}
Workflow: ${workflowType}
Gün: ${step.day}

Kısa, samimi, değer odaklı. Max 150 karakter.`
      }]
    });

    return response.content[0]?.text?.trim() || `Merhaba ${lead.contact_name || lead.company_name}, görüşmek ister misiniz?`;
  } catch {
    return `Merhaba ${lead.contact_name || lead.company_name}, size özel bir teklifimiz var. Görüşebilir miyiz?`;
  }
}

// ── WORKFLOW BAŞLAT ───────────────────────────────────────
router.post('/start', async (req: any, res: any) => {
  try {
    const userId = req.userId;
    const { leadId, workflowType } = req.body;

    const { data: lead } = await supabase.from('leads').select('*').eq('id', leadId).eq('user_id', userId).single();
    if (!lead) return res.status(404).json({ error: 'Lead bulunamadı' });
    if (!lead.phone) return res.status(400).json({ error: 'Lead telefon numarası yok' });

    // Aktif workflow var mı?
    const { data: existing } = await supabase.from('workflow_enrollments')
      .select('id').eq('lead_id', leadId).eq('status', 'active').maybeSingle();
    if (existing) return res.status(400).json({ error: 'Lead zaten aktif bir workflow\'da' });

    const type = workflowType || await selectWorkflow(lead);
    const workflow = WORKFLOW_TYPES[type];
    if (!workflow) return res.status(400).json({ error: 'Geçersiz workflow tipi' });

    const { data: enrollment } = await supabase.from('workflow_enrollments').insert([{
      user_id: userId,
      lead_id: leadId,
      workflow_type: type,
      current_step: 0,
      status: 'active',
      started_at: new Date().toISOString(),
      next_step_at: new Date().toISOString(),
    }]).select().single();

    res.json({
      enrollmentId: enrollment?.id,
      workflowType: type,
      workflowName: workflow.name,
      totalSteps: workflow.steps.length,
      message: `${workflow.name} workflow başlatıldı!`,
    });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// ── TOPLU WORKFLOW BAŞLAT ─────────────────────────────────
router.post('/start-batch', async (req: any, res: any) => {
  try {
    const userId = req.userId;
    const { leadIds, workflowType, filters } = req.body;

    let query = supabase.from('leads').select('*').eq('user_id', userId).not('phone', 'is', null);
    if (leadIds?.length) query = query.in('id', leadIds);
    else if (filters?.status) query = query.eq('status', filters.status);
    else query = query.eq('status', 'new');
    query = query.limit(100);

    const { data: leads } = await query;
    if (!leads?.length) return res.json({ message: 'Lead yok', started: 0 });

    res.json({ message: `${leads.length} lead için workflow başlatılıyor...`, total: leads.length });

    (async () => {
      let started = 0;
      for (const lead of leads) {
        try {
          const { data: existing } = await supabase.from('workflow_enrollments')
            .select('id').eq('lead_id', lead.id).eq('status', 'active').maybeSingle();
          if (existing) continue;

          const type = workflowType || await selectWorkflow(lead);
          await supabase.from('workflow_enrollments').insert([{
            user_id: userId,
            lead_id: lead.id,
            workflow_type: type,
            current_step: 0,
            status: 'active',
            started_at: new Date().toISOString(),
            next_step_at: new Date().toISOString(),
          }]);
          started++;
          await sleep(200);
        } catch {}
      }
      console.log(`Batch workflow started: ${started}/${leads.length}`);
    })();
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// ── WORKFLOW İŞLEMCİSİ ───────────────────────────────────
async function processWorkflows() {
  try {
    const now = new Date().toISOString();
    const { data: enrollments } = await supabase.from('workflow_enrollments')
      .select('*, leads(*)')
      .eq('status', 'active')
      .lte('next_step_at', now)
      .limit(20);

    if (!enrollments?.length) return;

    const { sendWhatsAppMessage } = require('./settings');

    for (const enrollment of enrollments) {
      try {
        const workflow = WORKFLOW_TYPES[enrollment.workflow_type];
        if (!workflow) continue;

        const step = workflow.steps[enrollment.current_step];
        if (!step) {
          await supabase.from('workflow_enrollments').update({ status: 'completed', completed_at: now }).eq('id', enrollment.id);
          continue;
        }

        const lead = enrollment.leads;
        if (!lead?.phone) continue;

        // Mesaj üret ve gönder
        const message = await generateStepMessage(lead, step, enrollment.workflow_type);

        if (step.type === 'whatsapp') {
          await sendWhatsAppMessage(enrollment.user_id, lead.phone, message);
          await supabase.from('messages').insert([{
            user_id: enrollment.user_id,
            lead_id: lead.id,
            direction: 'out',
            content: message,
            channel: 'whatsapp',
            sent_at: now,
            metadata: JSON.stringify({ workflowId: enrollment.id, step: enrollment.current_step }),
          }]);
        }

        // Sonraki adıma geç
        const nextStepIndex = enrollment.current_step + 1;
        const nextStep = workflow.steps[nextStepIndex];

        if (nextStep) {
          const nextStepAt = new Date();
          nextStepAt.setDate(nextStepAt.getDate() + (nextStep.day - step.day));
          await supabase.from('workflow_enrollments').update({
            current_step: nextStepIndex,
            next_step_at: nextStepAt.toISOString(),
            last_step_at: now,
          }).eq('id', enrollment.id);
        } else {
          await supabase.from('workflow_enrollments').update({
            status: 'completed',
            completed_at: now,
          }).eq('id', enrollment.id);
        }

        await supabase.from('leads').update({ last_contacted_at: now }).eq('id', lead.id);
        await sleep(3000);
      } catch (e: any) {
        console.error(`Workflow step error:`, e.message);
        await supabase.from('workflow_enrollments').update({ status: 'failed' }).eq('id', enrollment.id);
      }
    }
  } catch (e: any) {
    console.error('Workflow processor error:', e.message);
  }
}

// Her 10 dakikada bir workflow işle
setInterval(processWorkflows, 10 * 60 * 1000);
console.log('Workflow Engine başlatıldı (her 10 dakika)');

// GET /api/workflow/list
router.get('/list', async (req: any, res: any) => {
  try {
    const { data } = await supabase.from('workflow_enrollments')
      .select('*, leads(company_name, contact_name, phone, status)')
      .eq('user_id', req.userId)
      .order('created_at', { ascending: false })
      .limit(50);
    res.json({ enrollments: data || [] });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// GET /api/workflow/types
router.get('/types', (req: any, res: any) => {
  res.json({ types: Object.entries(WORKFLOW_TYPES).map(([key, val]: any) => ({
    key, name: val.name, steps: val.steps.length
  }))});
});

// GET /api/workflow/stats
router.get('/stats', async (req: any, res: any) => {
  try {
    const { data } = await supabase.from('workflow_enrollments').select('status, workflow_type').eq('user_id', req.userId);
    const stats = {
      active: data?.filter((e: any) => e.status === 'active').length || 0,
      completed: data?.filter((e: any) => e.status === 'completed').length || 0,
      failed: data?.filter((e: any) => e.status === 'failed').length || 0,
      total: data?.length || 0,
    };
    res.json(stats);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// DELETE /api/workflow/:id — Workflow durdur
router.delete('/:id', async (req: any, res: any) => {
  try {
    await supabase.from('workflow_enrollments')
      .update({ status: 'cancelled' })
      .eq('id', req.params.id)
      .eq('user_id', req.userId);
    res.json({ message: 'Workflow durduruldu' });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;