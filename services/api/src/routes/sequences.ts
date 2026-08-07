export {};
const express = require('express');
const { createClient } = require('@supabase/supabase-js');

const router = express.Router();
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

function sleep(ms: number) { return new Promise(r => setTimeout(r, ms)); }

// ── ADIM TİPLERİ ──────────────────────────────────────────
// step: {
//   type: 'message' | 'wait' | 'condition' | 'ai_reply'
//   delay_hours: number (kaç saat sonra)
//   channel: 'whatsapp' | 'email'
//   message: string (template)
//   condition: 'replied' | 'not_replied' | 'any'
//   ai_prompt: string (AI yanıt için prompt)
// }

// Mesajı kişiselleştir — hem {{firma}} hem [FIRMA_ADI] formatlarını destekle
function personalizeMessage(template: string, lead: any): string {
  const firma  = lead.company_name || lead.contact_name || 'Sayın Yetkili';
  const isim   = lead.contact_name || lead.company_name || 'Sayın Yetkili';
  const sehir  = lead.city    || '';
  const sektor = lead.sector  || '';
  const tel    = lead.phone   || '';
  return template
    .replace(/\{\{firma\}\}/gi,   firma)
    .replace(/\{\{isim\}\}/gi,    isim)
    .replace(/\{\{sehir\}\}/gi,   sehir)
    .replace(/\{\{sektor\}\}/gi,  sektor)
    .replace(/\{\{telefon\}\}/gi, tel)
    .replace(/\[FIRMA_ADI\]/g, firma)
    .replace(/\[AD\]/g,        isim)
    .replace(/\[SEHIR\]/g,     sehir)
    .replace(/\[SEKTOR\]/g,    sektor)
    .replace(/\[TELEFON\]/g,   tel);
}

// Adım çalıştır
async function executeStep(
  enrollment: any,
  step: any,
  lead: any,
  userId: string
): Promise<{ success: boolean; message?: string }> {
  try {
    if (step.type === 'message' || step.type === 'ai_reply') {
      let messageText = '';

      if (step.type === 'ai_reply') {
        // Konuşma geçmişini al
        const { data: history } = await supabase
          .from('messages')
          .select('direction, content')
          .eq('lead_id', lead.id)
          .eq('channel', step.channel || 'whatsapp')
          .order('sent_at', { ascending: false })
          .limit(10);

        const conversationHistory = (history || []).reverse().map((m: any) => ({
          role: m.direction === 'out' ? 'assistant' : 'user',
          content: m.content,
        }));

        // AI ile mesaj üret
        const Anthropic = require('@anthropic-ai/sdk');
        const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

        const response = await anthropic.messages.create({
          model: 'claude-sonnet-4-6',
          max_tokens: 300,
          system: step.ai_prompt || `Sen bir satış temsilcisisin. Müşteriye ${step.channel === 'whatsapp' ? 'WhatsApp' : 'email'} üzerinden takip mesajı yaz. Kısa, samimi, Türkçe. Max 3 cümle.`,
          messages: conversationHistory.length > 0 ? conversationHistory : [
            { role: 'user', content: `${lead.company_name} firmasına takip mesajı yaz.` }
          ],
        });

        const aiText = response.content[0]?.text?.trim() || '';
        // AI boş veya çok kısa döndürürse template'e düş (BUG #3 FIX)
        messageText = aiText.length >= 10 ? aiText : personalizeMessage(step.message || '', lead);
      } else {
        messageText = personalizeMessage(step.message || '', lead);
      }

      // Boş mesaj hiçbir zaman gönderilmesin
      if (!messageText?.trim()) return { success: false, message: 'Mesaj üretilemedi veya boş' };

      // Mesajı gönder
      if (step.channel === 'whatsapp' || !step.channel) {
        if (lead.phone) {
          const { sendWhatsAppMessage } = require('./settings');
          await sendWhatsAppMessage(userId, lead.phone, messageText);
        } else {
          return { success: false, message: 'Telefon numarası yok' };
        }
      } else if (step.channel === 'email') {
        if (lead.email) {
          const { sendEmail } = require('./settings');
          await sendEmail(userId, lead.email, 'Takip Mesajı', `<p>${messageText}</p>`);
        } else {
          return { success: false, message: 'Email yok' };
        }
      }

      // Mesajı kaydet
      await supabase.from('messages').insert([{
        lead_id: lead.id,
        user_id: userId,
        channel: step.channel || 'whatsapp',
        direction: 'out',
        content: messageText,
        status: 'sent',
        sent_at: new Date().toISOString(),
      }]);

      return { success: true, message: messageText };
    }

    return { success: true };
  } catch (e: any) {
    console.error('Step execution error:', e.message);
    return { success: false, message: e.message };
  }
}

// Koşul kontrolü
async function checkCondition(enrollment: any, step: any, lead: any): Promise<boolean> {
  if (!step.condition || step.condition === 'any') return true;

  const lastActionTime = new Date(enrollment.last_action_at).getTime();

  const { data: replyMessages } = await supabase
    .from('messages')
    .select('id')
    .eq('lead_id', lead.id)
    .eq('direction', 'in')
    .gte('sent_at', new Date(lastActionTime).toISOString())
    .limit(1);

  const hasReplied = (replyMessages?.length || 0) > 0;

  if (step.condition === 'replied') return hasReplied;
  if (step.condition === 'not_replied') return !hasReplied;
  return true;
}

// Tüm enrollment'ları işle (cron job)
async function processSequences() {
  try {
    const now = new Date();

    const { data: enrollments } = await supabase
      .from('sequence_enrollments')
      .select('*, sequences(*), leads(*)')
      .eq('status', 'active')
      .lt('last_action_at', new Date(now.getTime() - 5 * 60 * 1000).toISOString()) // 5 dakika önce (eski: 1 saat — ilk adım gecikmesi düzeltildi)
      .not('sequences', 'is', null); // Sequence silinmişse atla
    // NOT: sequences.status === 'paused' olan kayıtları da filtrelemeliyiz
    // Ama Supabase join filtresi için enrollments döndükten sonra filtrele:

    // Duraklatılmış sequence'ları filtrele (PAUSED BUG FIX)
    const activeEnrollments = (enrollments || []).filter((e: any) => e.sequences?.status !== 'paused');
    if (!activeEnrollments.length) return;

    console.log(`Processing ${activeEnrollments.length} sequence enrollments`);

    for (const enrollment of activeEnrollments) {
      try {
        const sequence = enrollment.sequences;
        const lead = enrollment.leads;
        const steps: any[] = sequence?.steps || [];
        const currentStep = enrollment.current_step || 0;

        if (currentStep >= steps.length) {
          // Tüm adımlar tamamlandı
          await supabase.from('sequence_enrollments')
            .update({ status: 'completed', completed_at: now.toISOString() })
            .eq('id', enrollment.id);
          continue;
        }

        const step = steps[currentStep];
        const delayHours = step.delay_hours || 0;
        const stepReadyTime = new Date(enrollment.last_action_at).getTime() + (delayHours * 60 * 60 * 1000);

        if (now.getTime() < stepReadyTime) continue; // Henüz zamanı gelmedi

        // Saat kontrolü (09:00-20:00 Türkiye UTC+3 — DST yok, yıl boyu +3)
        const turkeyHour = (now.getUTCHours() + 3) % 24;
        if (step.channel === 'whatsapp' && (turkeyHour < 9 || turkeyHour >= 20)) continue;

        // Koşul kontrolü — on_condition_fail undefined ise 'skip' varsayılır (BUG FIX)
        const conditionMet = await checkCondition(enrollment, step, lead);
        if (!conditionMet) {
          const failAction = step.on_condition_fail || 'skip'; // Artık varsayılan 'skip'
          if (failAction === 'stop') {
            await supabase.from('sequence_enrollments')
              .update({ status: 'stopped', last_action_at: now.toISOString() })
              .eq('id', enrollment.id);
          } else {
            // Koşullu dallanma: nextIfFalse belirtilmişse oraya git (BRANCHING FEATURE)
            const nextIdx = typeof step.nextIfFalse === 'number' ? step.nextIfFalse : currentStep + 1;
            const nextStepAt = steps[nextIdx]
              ? new Date(now.getTime() + ((steps[nextIdx].delay_hours || 0) * 3600000)).toISOString()
              : null;
            await supabase.from('sequence_enrollments')
              .update({ current_step: nextIdx, last_action_at: now.toISOString(), next_step_at: nextStepAt })
              .eq('id', enrollment.id);
          }
          continue;
        }

        // Adımı çalıştır
        const result = await executeStep(enrollment, step, lead, enrollment.user_id);

        if (result.success) {
          // Koşullu dallanma: koşul sağlandıysa nextIfTrue'a git (BRANCHING FEATURE)
          const nextIdx = typeof step.nextIfTrue === 'number' ? step.nextIfTrue : currentStep + 1;
          const nextStepDef = steps[nextIdx];
          const nextStepAt = nextStepDef
            ? new Date(now.getTime() + ((nextStepDef.delay_hours || 0) * 3600000)).toISOString()
            : null;

          await supabase.from('sequence_enrollments')
            .update({
              current_step: nextIdx,
              last_action_at: now.toISOString(),
              next_step_at: nextStepAt, // Canlı monitör için
            })
            .eq('id', enrollment.id);

          console.log(`[Seq] Step ${currentStep + 1} → ${nextIdx} for ${lead.company_name}`);
        } else {
          // Hata sayacını artır, 3 denemede durdur
          const errCount = (enrollment.error_count || 0) + 1;
          const shouldStop = errCount >= 3;
          await supabase.from('sequence_enrollments')
            .update({
              error_count: errCount,
              last_error: result.message,
              status: shouldStop ? 'stopped' : 'active',
            }).eq('id', enrollment.id);

          if (!result.message?.includes('bağlı') && !result.message?.includes('WhatsApp')) {
            console.error(`[Seq] Step failed (${errCount}/3) for ${lead.company_name}: ${result.message}`);
          }
        }

        await sleep(2000); // WhatsApp rate limit için
      } catch (e: any) {
        console.error(`Enrollment processing error:`, e.message);
      }
    }
  } catch (e: any) {
    console.error('Process sequences error:', e.message);
  }
}

// Her 30 dakikada sequence'ları işle
setInterval(processSequences, 30 * 60 * 1000);
console.log('Sequence processor started (every 30 min)');

// ── ROUTES ────────────────────────────────────────────────

// GET /api/sequences — Sequence listesi
router.get('/', async (req: any, res: any) => {
  try {
    const userId = req.userId;
    const { data, error } = await supabase
      .from('sequences')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    res.json({ sequences: data || [] });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// POST /api/sequences — Yeni sequence oluştur
router.post('/', async (req: any, res: any) => {
  try {
    const userId = req.userId;
    const { name, channel, steps } = req.body;

    if (!name || !steps?.length) {
      return res.status(400).json({ error: 'name ve steps zorunlu' });
    }

    const { data, error } = await supabase
      .from('sequences')
      .insert([{ user_id: userId, name, channel: channel || 'whatsapp', steps, status: 'active' }])
      .select()
      .single();

    if (error) throw error;
    res.json({ sequence: data, message: 'Sequence oluşturuldu!' });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// DELETE /api/sequences/:id
router.delete('/:id', async (req: any, res: any) => {
  try {
    const userId = req.userId;
    await supabase.from('sequences').delete().eq('id', req.params.id).eq('user_id', userId);
    res.json({ message: 'Sequence silindi' });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// POST /api/sequences/:id/enroll — Lead'leri sequence'a ekle
router.post('/:id/enroll', async (req: any, res: any) => {
  try {
    const userId = req.userId;
    const { leadIds } = req.body;

    if (!leadIds?.length) return res.status(400).json({ error: 'leadIds zorunlu' });

    const { data: sequence } = await supabase
      .from('sequences')
      .select('*')
      .eq('id', req.params.id)
      .eq('user_id', userId)
      .single();

    if (!sequence) return res.status(404).json({ error: 'Sequence bulunamadı' });

    const enrollments = leadIds.map((leadId: string) => ({
      sequence_id: req.params.id,
      lead_id: leadId,
      user_id: userId,
      current_step: 0,
      status: 'active',
      last_action_at: new Date().toISOString(),
    }));

    const { data, error } = await supabase
      .from('sequence_enrollments')
      .upsert(enrollments, { onConflict: 'sequence_id,lead_id', ignoreDuplicates: true })
      .select();

    if (error) throw error;

    res.json({ message: `${data?.length || 0} lead sequence'a eklendi`, enrolled: data?.length || 0 });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// GET /api/sequences/:id/enrollments — Sequence enrollment listesi
router.get('/:id/enrollments', async (req: any, res: any) => {
  try {
    const userId = req.userId;
    const { data, error } = await supabase
      .from('sequence_enrollments')
      .select('*, leads(company_name, phone, email, city)')
      .eq('sequence_id', req.params.id)
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    res.json({ enrollments: data || [] });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// POST /api/sequences/:id/pause — Sequence duraklat
router.post('/:id/pause', async (req: any, res: any) => {
  try {
    const userId = req.userId;
    await supabase.from('sequences').update({ status: 'paused' }).eq('id', req.params.id).eq('user_id', userId);
    await supabase.from('sequence_enrollments').update({ status: 'paused' }).eq('sequence_id', req.params.id).eq('user_id', userId);
    res.json({ message: 'Sequence duraklatıldı' });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// POST /api/sequences/:id/resume — Sequence devam ettir
router.post('/:id/resume', async (req: any, res: any) => {
  try {
    const userId = req.userId;
    const { data: seq } = await supabase.from('sequences').select('id').eq('id', req.params.id).eq('user_id', userId).single();
    if (!seq) return res.status(404).json({ error: 'Sequence bulunamadı' });
    await supabase.from('sequences').update({ status: 'active' }).eq('id', req.params.id).eq('user_id', userId);
    const { count } = await supabase.from('sequence_enrollments')
      .update({ status: 'active' })
      .eq('sequence_id', req.params.id)
      .eq('user_id', userId)
      .eq('status', 'paused')
      .select('id', { count: 'exact', head: true });
    res.json({ message: 'Sequence devam ettirildi', resumed: count || 0 });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// GET /api/sequences/stats
router.get('/stats/overview', async (req: any, res: any) => {
  try {
    const userId = req.userId;
    const [{ count: total }, { count: active }, { count: completed }] = await Promise.all([
      supabase.from('sequence_enrollments').select('id', { count: 'exact', head: true }).eq('user_id', userId),
      supabase.from('sequence_enrollments').select('id', { count: 'exact', head: true }).eq('user_id', userId).eq('status', 'active'),
      supabase.from('sequence_enrollments').select('id', { count: 'exact', head: true }).eq('user_id', userId).eq('status', 'completed'),
    ]);
    res.json({ total: total || 0, active: active || 0, completed: completed || 0 });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// POST /api/sequences/process — Manuel tetikle
router.post('/process/run', async (req: any, res: any) => {
  processSequences().catch(console.error);
  res.json({ message: 'Sequence processor tetiklendi' });
});

// GET /api/sequences/:id/live — Canlı monitör
router.get('/:id/live', async (req: any, res: any) => {
  try {
    const { data: enrollments } = await supabase
      .from('sequence_enrollments')
      .select('id, lead_id, current_step, status, last_action_at, next_step_at, error_count, last_error, leads(company_name, status)')
      .eq('sequence_id', req.params.id)
      .eq('user_id', req.userId)
      .order('last_action_at', { ascending: false })
      .limit(100);

    const now = Date.now();
    const enriched = (enrollments || []).map((e: any) => {
      const nextTime = e.next_step_at ? new Date(e.next_step_at).getTime() : 0;
      return {
        ...e,
        nextInMinutes: nextTime > now ? Math.round((nextTime - now) / 60000) : 0,
        isReadyNow: nextTime <= now && e.status === 'active',
        leadName: e.leads?.company_name,
        leadStatus: e.leads?.status,
      };
    });

    const summary = {
      total: enriched.length,
      active: enriched.filter((e: any) => e.status === 'active').length,
      readyNow: enriched.filter((e: any) => e.isReadyNow).length,
      next5min: enriched.filter((e: any) => e.nextInMinutes <= 5 && e.status === 'active').length,
      completed: enriched.filter((e: any) => e.status === 'completed').length,
      stopped: enriched.filter((e: any) => e.status === 'stopped').length,
      withErrors: enriched.filter((e: any) => (e.error_count || 0) > 0).length,
    };

    res.json({ enrollments: enriched, summary });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// GET /api/sequences/:id/analytics — Sekans performans analizi
router.get('/:id/analytics', async (req: any, res: any) => {
  try {
    const { data: seq } = await supabase.from('sequences').select('*')
      .eq('id', req.params.id).eq('user_id', req.userId).single();
    if (!seq) return res.status(404).json({ error: 'Bulunamadı' });

    const { data: enrollments } = await supabase.from('sequence_enrollments')
      .select('current_step, status').eq('sequence_id', req.params.id).eq('user_id', req.userId);

    const steps: any[] = seq.steps || [];
    const stepStats = steps.map((_: any, i: number) => ({
      step: i + 1,
      reached: (enrollments || []).filter((e: any) => (e.current_step || 0) >= i + 1).length,
      completed: (enrollments || []).filter((e: any) => e.current_step > i + 1 || e.status === 'completed').length,
    }));

    const total = enrollments?.length || 0;
    const completed = (enrollments || []).filter((e: any) => e.status === 'completed').length;

    res.json({
      total, completed,
      completionRate: total ? Math.round(completed / total * 100) : 0,
      stepStats,
    });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

module.exports = router;