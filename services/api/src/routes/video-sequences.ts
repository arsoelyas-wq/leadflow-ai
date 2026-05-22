export {};
const express    = require('express');
const { createClient } = require('@supabase/supabase-js');
const Anthropic  = require('@anthropic-ai/sdk');
const axios      = require('axios');

const router    = express.Router();
const supabase  = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// ─── SEQUENCE STEP DEFINITIONS ───────────────────────────────────────────────

interface SequenceStep {
  type: 'whatsapp' | 'voice';
  template: string;
  delayHours: number;
  scheduledAt?: string;
  executedAt?: string;
  skipped?: boolean;
}

// Steps to run if lead never viewed (days after send)
const NO_VIEW_STEPS: SequenceStep[] = [
  { type: 'whatsapp', template: 'reminder_soft',  delayHours: 24  },
  { type: 'whatsapp', template: 'reminder_final',  delayHours: 72  },
  { type: 'voice',    template: 'cold_check',      delayHours: 120 },
];

// Viewed 20-59%
const PARTIAL_VIEW_STEPS: SequenceStep[] = [
  { type: 'whatsapp', template: 'curious_followup', delayHours: 1  },
  { type: 'voice',    template: 'warm_call',         delayHours: 24 },
];

// Viewed 60-89%
const HIGH_VIEW_STEPS: SequenceStep[] = [
  { type: 'whatsapp', template: 'engaged_followup', delayHours: 0.5 },
  { type: 'voice',    template: 'hot_call',          delayHours: 3   },
];

// Viewed 90%+
const COMPLETED_VIEW_STEPS: SequenceStep[] = [
  { type: 'whatsapp', template: 'hot_followup',    delayHours: 0.08  }, // 5 min
  { type: 'voice',    template: 'immediate_call',   delayHours: 0.5   }, // 30 min
];

function stepsForTrigger(trigger: string): SequenceStep[] {
  if (trigger === 'completed_view') return COMPLETED_VIEW_STEPS;
  if (trigger === 'high_view')      return HIGH_VIEW_STEPS;
  if (trigger === 'partial_view')   return PARTIAL_VIEW_STEPS;
  return NO_VIEW_STEPS;
}

function scheduleSteps(steps: SequenceStep[], fromNow = new Date()): SequenceStep[] {
  return steps.map(s => ({
    ...s,
    scheduledAt: new Date(fromNow.getTime() + s.delayHours * 3600 * 1000).toISOString(),
    executedAt: undefined,
  }));
}

// ─── MESSAGE GENERATION ───────────────────────────────────────────────────────

async function generateSequenceMessage(
  template: string,
  ctx: { brandName: string; pain?: string; companyName?: string; product?: string }
): Promise<string> {
  const { brandName, pain, companyName, product } = ctx;
  const first = brandName.split(' ')[0];

  const templates: Record<string, string> = {
    reminder_soft:    `Merhaba ${first}! Geçen gün sizin için özel bir video hazırladık. İzleme fırsatı bulabildınız mı?`,
    reminder_final:   `Merhaba ${first}, tekrar merhaba! Hazırladığımız videoyu merak ediyorum — uygun bir zaman var mı?`,
    cold_check:       `Merhaba ${first}! ${companyName || 'Biz'} olarak sizinle bağlantı kurmak istedik. 2 dakikanız var mı?`,
    curious_followup: `Merhaba ${first}! Videoyu kısmen izlediğinizi gördüm.${pain ? ` "${pain}" konusu ilginizi çekti mi?` : ' Sorularınız var mı?'}`,
    engaged_followup: `Merhaba ${first}! Videoyu büyük bölümünü izlediğinizi gördüm. ${product || 'Çözümümüz'} hakkında detaylı konuşabilir miyiz?`,
    hot_followup:     `Merhaba ${first}! Videoyu baştan sona izlediğinizi gördüm, teşekkürler! Şu an aramak uygun mu?`,
    warm_call:        '',
    hot_call:         '',
    cold_check_voice: '',
    immediate_call:   '',
  };

  if (templates[template] !== undefined && templates[template]) {
    return templates[template];
  }

  // Claude Haiku for templates that need dynamic generation
  try {
    const templateDesc: Record<string, string> = {
      curious_followup: `Videoyu %${40} izledi, meraklı ama bitmedi. Kısa, nazik takip.`,
      engaged_followup: `Videoyu %${75} izledi, çok ilgili. Görüşme teklif et.`,
      hot_followup:     `Videoyu tamamladı. Acil, sıcak, arama teklifi.`,
      reminder_final:   `3 gündür izlemedi. Son nazik hatırlatma.`,
    };

    const r = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 120,
      messages: [{
        role: 'user',
        content: `Kısa WhatsApp mesajı yaz.
Alıcı: ${brandName}
Bağlam: ${templateDesc[template] || template}
${pain ? `Bilinen sorun: ${pain}` : ''}
${companyName ? `Gönderen şirket: ${companyName}` : ''}
1-2 cümle, samimi, link/emoji yok. Sadece mesaj metni.`,
      }],
    });
    return ((r.content[0] as any)?.text || '').trim();
  } catch {
    return `Merhaba ${first}! Size gönderdiğimiz videoyla ilgili görüşmek ister misiniz?`;
  }
}

// ─── VOICE CALL TRIGGER ───────────────────────────────────────────────────────

async function triggerVoiceCall(userId: string, phone: string, ctx: { brandName: string; product?: string; companyName?: string }) {
  try {
    const { data: vsettings } = await supabase.from('voice_settings').select('*').eq('user_id', userId).single();
    const agentName   = vsettings?.agent_name || 'Satış Temsilcisi';
    const companyName = ctx.companyName || 'Şirketimiz';
    const openingLine = `Merhaba! Ben ${agentName}, ${companyName}'dan arıyorum. Size özel gönderdiğimiz videoyu izlediğinizi gördük — uygun musunuz?`;

    await axios.post(
      'https://api.elevenlabs.io/v1/convai/twilio/outbound-call',
      {
        agent_id: process.env.ELEVENLABS_AGENT_ID,
        agent_phone_number_id: process.env.ELEVENLABS_PHONE_NUMBER_ID,
        to_number: phone,
        conversation_initiation_client_data: {
          dynamic_variables: {
            agent_name: agentName,
            company_name: companyName,
            product_description: ctx.product || '',
            opening_line: openingLine,
            language: 'tr',
          },
        },
      },
      { headers: { 'xi-api-key': process.env.ELEVENLABS_API_KEY, 'Content-Type': 'application/json' } }
    );
    console.log(`[Sequence] Sesli arama tetiklendi: ${phone}`);
  } catch (e: any) {
    console.error('[Sequence] Sesli arama hatası:', e.message);
  }
}

async function sendWhatsApp(userId: string, phone: string, message: string) {
  const { sendWhatsAppMessage } = require('./settings');
  await sendWhatsAppMessage(userId, phone, message);
}

// ─── CREATE SEQUENCE ──────────────────────────────────────────────────────────

async function createSequenceForSentVideo(
  videoId: string,
  userId: string,
  leadId: string,
  researchData: any,
  profile: any
): Promise<void> {
  try {
    const { data: lead } = await supabase.from('leads').select('phone, company_name').eq('id', leadId).single();
    if (!lead?.phone) return;

    const brandName  = researchData?.brandName || lead.company_name;
    const pain       = researchData?.pains?.[0] || '';

    const steps = scheduleSteps(NO_VIEW_STEPS);
    const nextAt = steps[0]?.scheduledAt || null;

    await supabase.from('video_sequences').insert([{
      user_id: userId,
      video_id: videoId,
      lead_id: leadId,
      status: 'active',
      trigger_type: 'sent',
      steps,
      current_step: 0,
      research_context: {
        brandName,
        pain,
        phone: lead.phone,
        companyName: profile?.company?.name,
        product: profile?.product?.description,
      },
      next_action_at: nextAt,
    }]);

    console.log(`[Sequence] Oluşturuldu: ${brandName} — ilk adım: ${nextAt}`);
  } catch (e: any) {
    console.error('[Sequence] Oluşturma hatası:', e.message);
  }
}

// ─── ADVANCE SEQUENCE ON WATCH ────────────────────────────────────────────────

async function advanceSequenceOnWatch(videoId: string, watchPercent: number): Promise<void> {
  try {
    const { data: seq } = await supabase
      .from('video_sequences')
      .select('*')
      .eq('video_id', videoId)
      .eq('status', 'active')
      .single();

    if (!seq) return;

    // Determine new trigger based on watch percent
    let newTrigger: string | null = null;
    if (watchPercent >= 90 && seq.last_watch_pct < 90) {
      newTrigger = 'completed_view';
    } else if (watchPercent >= 60 && seq.last_watch_pct < 60) {
      newTrigger = 'high_view';
    } else if (watchPercent >= 20 && seq.last_watch_pct < 20) {
      newTrigger = 'partial_view';
    }

    // Always update last_watch_pct
    const updates: any = { last_watch_pct: watchPercent };

    if (newTrigger) {
      // Replace remaining steps with new trigger's steps
      const newSteps = scheduleSteps(stepsForTrigger(newTrigger));
      const firstStepAt = newSteps[0]?.scheduledAt || null;

      console.log(`[Sequence] Watch threshold crossed: ${watchPercent}% → ${newTrigger}`);

      Object.assign(updates, {
        trigger_type: newTrigger,
        steps: newSteps,
        current_step: 0,
        next_action_at: firstStepAt,
      });
    }

    await supabase.from('video_sequences').update(updates).eq('id', seq.id);
  } catch {}
}

// ─── EXECUTE STEP ─────────────────────────────────────────────────────────────

async function executeStep(seq: any): Promise<void> {
  const steps: SequenceStep[] = seq.steps || [];
  const step = steps[seq.current_step];
  if (!step) return;

  const ctx = seq.research_context || {};
  const { brandName = '', pain = '', phone, companyName, product, userId } = ctx;
  const uid = userId || seq.user_id;

  try {
    if (step.type === 'whatsapp' && phone) {
      const message = await generateSequenceMessage(step.template, { brandName, pain, companyName, product });
      await sendWhatsApp(uid, phone, message);
      console.log(`[Sequence] WhatsApp gönderildi: ${brandName} (${step.template})`);
    } else if (step.type === 'voice' && phone) {
      await triggerVoiceCall(uid, phone, { brandName, companyName, product });
    }

    // Mark step executed and advance
    const updatedSteps = [...steps];
    updatedSteps[seq.current_step] = { ...step, executedAt: new Date().toISOString() };

    const nextStep = seq.current_step + 1;
    const hasMore  = nextStep < steps.length;
    const nextAt   = hasMore ? steps[nextStep]?.scheduledAt || null : null;

    await supabase.from('video_sequences').update({
      steps: updatedSteps,
      current_step: nextStep,
      next_action_at: nextAt,
      status: hasMore ? 'active' : 'completed',
      completed_at: hasMore ? null : new Date().toISOString(),
    }).eq('id', seq.id);

    // Log to performance matrix
    await supabase.from('video_performance_log').insert([{
      user_id: seq.user_id,
      video_id: seq.video_id,
      sector: ctx.sector || '',
      sequence_step_reached: nextStep,
    }]).catch(() => {});

  } catch (e: any) {
    console.error(`[Sequence] Step hatası (${seq.id}):`, e.message);
  }
}

// ─── CRON FUNCTION (exported for index.ts) ───────────────────────────────────

async function checkAndAdvanceSequences(): Promise<void> {
  try {
    const now = new Date().toISOString();
    const { data: dueSqeuences } = await supabase
      .from('video_sequences')
      .select('*')
      .eq('status', 'active')
      .lte('next_action_at', now)
      .limit(30);

    if (!dueSqeuences?.length) return;
    console.log(`[Sequence Cron] ${dueSqeuences.length} sıra işleniyor...`);

    for (const seq of dueSqeuences) {
      await executeStep(seq);
      await new Promise(r => setTimeout(r, 300));
    }
  } catch (e: any) {
    console.error('[Sequence Cron] Hata:', e.message);
  }
}

// ─── ROUTES ──────────────────────────────────────────────────────────────────

// GET /api/video-sequences — list user's active sequences
router.get('/', async (req: any, res: any) => {
  try {
    const { data } = await supabase
      .from('video_sequences')
      .select('*, video_outreach(leads(company_name))')
      .eq('user_id', req.userId)
      .order('created_at', { ascending: false })
      .limit(50);
    res.json({ sequences: data || [] });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// GET /api/video-sequences/stats
router.get('/stats', async (req: any, res: any) => {
  try {
    const { data } = await supabase
      .from('video_sequences')
      .select('status, trigger_type')
      .eq('user_id', req.userId);
    const seqs = data || [];
    res.json({
      active:          seqs.filter((s: any) => s.status === 'active').length,
      completed:       seqs.filter((s: any) => s.status === 'completed').length,
      opted_out:       seqs.filter((s: any) => s.status === 'opted_out').length,
      hot_leads:       seqs.filter((s: any) => s.trigger_type === 'completed_view').length,
      high_interest:   seqs.filter((s: any) => s.trigger_type === 'high_view').length,
    });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// POST /api/video-sequences/:id/pause
router.post('/:id/pause', async (req: any, res: any) => {
  try {
    await supabase.from('video_sequences').update({ status: 'paused' })
      .eq('id', req.params.id).eq('user_id', req.userId);
    res.json({ ok: true });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// POST /api/video-sequences/:id/resume
router.post('/:id/resume', async (req: any, res: any) => {
  try {
    await supabase.from('video_sequences').update({ status: 'active' })
      .eq('id', req.params.id).eq('user_id', req.userId);
    res.json({ ok: true });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// POST /api/video-sequences/opt-out/:leadId — lead asked to stop
router.post('/opt-out/:leadId', async (req: any, res: any) => {
  try {
    await supabase.from('video_sequences')
      .update({ status: 'opted_out', completed_at: new Date().toISOString() })
      .eq('lead_id', req.params.leadId)
      .eq('user_id', req.userId);
    res.json({ ok: true, message: 'Lead devre dışı bırakıldı' });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

module.exports = { router, checkAndAdvanceSequences, createSequenceForSentVideo, advanceSequenceOnWatch };
