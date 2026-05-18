export {};
const express = require('express');
const { createClient } = require('@supabase/supabase-js');
const Anthropic = require('@anthropic-ai/sdk');
const nodeCron = require('node-cron');

const router = express.Router();
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
const anthropic = new Anthropic.default({ apiKey: process.env.ANTHROPIC_API_KEY });

// ─── Types ───────────────────────────────────────────────────────────────────

interface WorkflowNode {
  id: string
  type: 'trigger' | 'message' | 'wait' | 'condition' | 'ab_split' | 'action' | 'end'
  label?: string
  config: {
    // message
    channel?: 'whatsapp' | 'email' | 'sms'
    template?: string
    useAI?: boolean
    subject?: string
    // ab_split
    abVariants?: { a: string; b: string }
    splitPct?: number       // % sent to variant A (default 50)
    // wait
    days?: number
    hours?: number
    useSmartTiming?: boolean
    // condition
    condField?: string
    condOperator?: 'eq' | 'not_eq' | 'gt' | 'lt' | 'gte' | 'lte' | 'contains' | 'is_null'
    condValue?: string
    // action
    actionType?: 'update_status' | 'add_tag' | 'update_score' | 'assign_owner' | 'create_task' | 'webhook'
    actionValue?: string
    webhookUrl?: string
    webhookMethod?: string
  }
  next?: string       // default next node id
  nextTrue?: string   // condition branch: true
  nextFalse?: string  // condition branch: false
  nextA?: string      // ab_split branch A
  nextB?: string      // ab_split branch B
}

// ─── Condition evaluator ──────────────────────────────────────────────────────

function evalCondition(lead: any, node: WorkflowNode): boolean {
  const { condField, condOperator, condValue } = node.config;
  if (!condField || !condOperator) return true;

  const raw = lead[condField];
  const val = condValue ?? '';

  switch (condOperator) {
    case 'eq':       return String(raw ?? '').toLowerCase() === val.toLowerCase();
    case 'not_eq':   return String(raw ?? '').toLowerCase() !== val.toLowerCase();
    case 'gt':       return Number(raw) > Number(val);
    case 'lt':       return Number(raw) < Number(val);
    case 'gte':      return Number(raw) >= Number(val);
    case 'lte':      return Number(raw) <= Number(val);
    case 'contains': return String(raw ?? '').toLowerCase().includes(val.toLowerCase());
    case 'is_null':  return raw == null || raw === '';
    default:         return true;
  }
}

// ─── Message sender ───────────────────────────────────────────────────────────

async function sendMessage(lead: any, node: WorkflowNode, userId: string, abVariant?: string): Promise<string> {
  const { channel, template, useAI, subject, abVariants } = node.config;

  let body = abVariant === 'B' ? (abVariants?.b || template || '') : (abVariants?.a || template || '');

  // AI personalisation
  if (useAI && body && process.env.ANTHROPIC_API_KEY) {
    try {
      const msg = await anthropic.messages.create({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 200,
        messages: [{
          role: 'user',
          content: `Kişiselleştir (Türkçe, max 2 cümle, doğal ve samimi):
Şablon: "${body}"
Firma: ${lead.company_name || ''}
Sektör: ${lead.sector || ''}
İsim: ${lead.contact_name || ''}
Şehir: ${lead.city || ''}
Sadece mesaj metnini döndür, başka bir şey yazma.`,
        }],
      });
      body = (msg.content[0] as any).text?.trim() || body;
    } catch {}
  }

  // Variable substitution
  body = body
    .replace(/\{\{firma\}\}/gi, lead.company_name || '')
    .replace(/\{\{isim\}\}/gi, lead.contact_name || '')
    .replace(/\{\{sehir\}\}/gi, lead.city || '')
    .replace(/\{\{sektor\}\}/gi, lead.sector || '');

  if (channel === 'whatsapp' && lead.phone) {
    try {
      const { data: waSettings } = await supabase
        .from('settings')
        .select('green_api_instance, green_api_token')
        .eq('user_id', userId)
        .single();

      if (waSettings?.green_api_instance && waSettings?.green_api_token) {
        const phone = lead.phone.replace(/\D/g, '');
        const chatId = `${phone}@c.us`;
        await fetch(
          `https://api.green-api.com/waInstance${waSettings.green_api_instance}/sendMessage/${waSettings.green_api_token}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ chatId, message: body }),
          }
        );
      }
    } catch {}
  } else if (channel === 'email' && lead.email) {
    try {
      const { data: emailSettings } = await supabase
        .from('settings')
        .select('smtp_host, smtp_port, smtp_user, smtp_pass, email_from_name')
        .eq('user_id', userId)
        .single();

      if (emailSettings?.smtp_host && emailSettings?.smtp_user) {
        const nodemailer = require('nodemailer');
        const transporter = nodemailer.createTransport({
          host: emailSettings.smtp_host,
          port: emailSettings.smtp_port || 587,
          auth: { user: emailSettings.smtp_user, pass: emailSettings.smtp_pass },
        });
        await transporter.sendMail({
          from: `"${emailSettings.email_from_name || 'LeadFlow'}" <${emailSettings.smtp_user}>`,
          to: lead.email,
          subject: subject || 'Mesajınız',
          text: body,
        });
      }
    } catch {}
  } else if (channel === 'sms' && lead.phone) {
    try {
      const { data: smsSettings } = await supabase
        .from('settings')
        .select('netgsm_user, netgsm_pass, netgsm_header')
        .eq('user_id', userId)
        .single();

      if (smsSettings?.netgsm_user) {
        const phone = lead.phone.replace(/\D/g, '');
        await fetch('https://api.netgsm.com.tr/sms/send/get', {
          method: 'GET',
          headers: {},
        });
        const url = `https://api.netgsm.com.tr/sms/send/get?usercode=${smsSettings.netgsm_user}&password=${smsSettings.netgsm_pass}&gsmno=${phone}&message=${encodeURIComponent(body)}&msgheader=${smsSettings.netgsm_header || 'LEADFLOW'}`;
        await fetch(url);
      }
    } catch {}
  }

  // Log activity
  try {
    await supabase.from('lead_activities').insert({
      lead_id: lead.id,
      user_id: userId,
      event_type: `workflow_${channel || 'message'}`,
      metadata: { channel, body: body.slice(0, 200), nodeId: node.id },
    });
  } catch {}

  return body;
}

// ─── Action executor ──────────────────────────────────────────────────────────

async function execAction(lead: any, node: WorkflowNode, userId: string): Promise<void> {
  const { actionType, actionValue, webhookUrl, webhookMethod } = node.config;

  switch (actionType) {
    case 'update_status':
      if (actionValue) {
        await supabase.from('leads').update({ status: actionValue, updated_at: new Date().toISOString() })
          .eq('id', lead.id).eq('user_id', userId);
      }
      break;

    case 'update_score':
      if (actionValue) {
        const delta = parseInt(actionValue, 10);
        await supabase.from('leads')
          .update({ score: Math.max(0, Math.min(100, (lead.score || 50) + delta)), updated_at: new Date().toISOString() })
          .eq('id', lead.id).eq('user_id', userId);
      }
      break;

    case 'add_tag':
      if (actionValue) {
        const current = lead.tags || [];
        if (!current.includes(actionValue)) {
          await supabase.from('leads').update({ tags: [...current, actionValue] })
            .eq('id', lead.id).eq('user_id', userId);
        }
      }
      break;

    case 'assign_owner':
      if (actionValue) {
        await supabase.from('leads').update({ assigned_to: actionValue })
          .eq('id', lead.id).eq('user_id', userId);
      }
      break;

    case 'webhook':
      if (webhookUrl) {
        await fetch(webhookUrl, {
          method: webhookMethod || 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ lead, trigger: 'workflow_action', userId }),
        }).catch(() => {});
      }
      break;
  }
}

// ─── Smart timing helper ──────────────────────────────────────────────────────

function smartNextTime(lead: any): Date {
  const SECTOR_HOURS: Record<string, number> = {
    'İnşaat': 10, 'Restoran': 14, 'Tekstil': 9,
    'Otomotiv': 10, 'Turizm': 11, 'Sağlık': 8,
    'Eğitim': 13, 'Teknoloji': 10, 'Perakende': 10,
  };
  const pref = SECTOR_HOURS[lead.sector || ''] || 10;
  const now = new Date();
  const next = new Date(now);
  next.setHours(pref, 0, 0, 0);

  // If that time is past or only 30 min away, push to next business day
  if (next.getTime() - now.getTime() < 30 * 60 * 1000) {
    next.setDate(next.getDate() + 1);
  }
  // Skip weekends for Turkish B2B
  while (next.getDay() === 0 || next.getDay() === 6) {
    next.setDate(next.getDate() + 1);
  }
  return next;
}

// ─── Core enrollment processor ────────────────────────────────────────────────

async function processEnrollment(enrollment: any): Promise<void> {
  const { id: enrollId, lead_id, user_id, workflow_def_id, current_node_id, ab_variant, variables, retry_count } = enrollment;

  // Load workflow definition
  const { data: wfDef, error: wfErr } = await supabase
    .from('workflow_definitions')
    .select('*')
    .eq('id', workflow_def_id)
    .single();

  if (wfErr || !wfDef) {
    await supabase.from('workflow_enrollments').update({ status: 'error', error_msg: 'Workflow definition not found' }).eq('id', enrollId);
    return;
  }

  const nodes: WorkflowNode[] = wfDef.nodes || [];
  const nodeMap: Record<string, WorkflowNode> = {};
  nodes.forEach((n: WorkflowNode) => { nodeMap[n.id] = n; });

  // Find current node (first non-trigger if null)
  let nodeId = current_node_id;
  if (!nodeId) {
    const first = nodes.find((n: WorkflowNode) => n.type !== 'trigger');
    nodeId = first?.id;
  }

  if (!nodeId || !nodeMap[nodeId]) {
    await supabase.from('workflow_enrollments').update({ status: 'completed' }).eq('id', enrollId);
    return;
  }

  const node = nodeMap[nodeId];

  // Load lead
  const { data: lead } = await supabase.from('leads').select('*').eq('id', lead_id).single();
  if (!lead) {
    await supabase.from('workflow_enrollments').update({ status: 'error', error_msg: 'Lead not found' }).eq('id', enrollId);
    return;
  }

  let nextNodeId: string | null = null;
  let logStatus = 'executed';
  let messageSent: string | undefined;
  let currentVariant = ab_variant;
  let nextStepAt: Date | null = null;
  let errorMsg: string | null = null;

  try {
    switch (node.type) {
      case 'message': {
        messageSent = await sendMessage(lead, node, user_id, currentVariant || undefined);
        nextNodeId = node.next || null;
        break;
      }

      case 'wait': {
        const { days = 0, hours = 0, useSmartTiming } = node.config;
        if (useSmartTiming) {
          nextStepAt = smartNextTime(lead);
        } else {
          nextStepAt = new Date(Date.now() + ((days * 24) + hours) * 3600 * 1000);
        }
        nextNodeId = node.next || null;
        logStatus = 'waiting';
        break;
      }

      case 'condition': {
        const result = evalCondition(lead, node);
        nextNodeId = result ? (node.nextTrue || node.next || null) : (node.nextFalse || null);
        logStatus = result ? 'executed' : 'skipped';
        break;
      }

      case 'ab_split': {
        const pct = node.config.splitPct ?? 50;
        if (!currentVariant) {
          currentVariant = Math.random() * 100 < pct ? 'A' : 'B';
        }
        nextNodeId = currentVariant === 'A' ? (node.nextA || node.next || null) : (node.nextB || node.next || null);
        break;
      }

      case 'action': {
        await execAction(lead, node, user_id);
        nextNodeId = node.next || null;
        break;
      }

      case 'end':
      default: {
        nextNodeId = null;
        break;
      }
    }
  } catch (err: any) {
    errorMsg = err.message || 'Node execution error';
    logStatus = 'error';

    if ((retry_count || 0) < 3) {
      await supabase.from('workflow_enrollments').update({
        retry_count: (retry_count || 0) + 1,
        next_step_at: new Date(Date.now() + 15 * 60 * 1000).toISOString(), // retry in 15 min
        error_msg: errorMsg,
      }).eq('id', enrollId);
      return;
    }
    nextNodeId = null;
  }

  // Log step
  await supabase.from('workflow_step_logs').insert({
    enrollment_id:   enrollId,
    workflow_def_id,
    lead_id,
    user_id,
    node_id:         nodeId,
    node_type:       node.type,
    status:          logStatus,
    ab_variant:      currentVariant,
    channel:         node.config.channel,
    message_sent:    messageSent?.slice(0, 500),
    error_msg:       errorMsg,
    metadata:        { label: node.label },
  }).catch(() => {});

  // Advance enrollment
  const updateData: any = {
    current_node_id: nextNodeId,
    ab_variant:      currentVariant,
    retry_count:     0,
    error_msg:       null,
    updated_at:      new Date().toISOString(),
  };

  if (nextNodeId === null || node.type === 'end') {
    updateData.status = 'completed';
    updateData.next_step_at = null;
    // Update workflow run count
    await supabase.from('workflow_definitions')
      .update({ run_count: (wfDef.run_count || 0) + 1, last_run_at: new Date().toISOString() })
      .eq('id', workflow_def_id);
  } else if (nextStepAt) {
    updateData.next_step_at = nextStepAt.toISOString();
  } else {
    // Process next node immediately (in next cron tick, set now)
    updateData.next_step_at = new Date().toISOString();
  }

  await supabase.from('workflow_enrollments').update(updateData).eq('id', enrollId);
}

// ─── Cron scheduler (every minute) ───────────────────────────────────────────

let cronStarted = false;

function startWorkflowScheduler(): void {
  if (cronStarted) return;
  cronStarted = true;

  nodeCron.schedule('* * * * *', async () => {
    try {
      const now = new Date().toISOString();
      const { data: pending } = await supabase
        .from('workflow_enrollments')
        .select('*')
        .eq('status', 'active')
        .not('workflow_def_id', 'is', null)
        .lte('next_step_at', now)
        .limit(50);

      if (!pending?.length) return;

      await Promise.allSettled(pending.map((e: any) => processEnrollment(e)));
    } catch {}
  });

  // Cron trigger type: check workflow_definitions with cron trigger
  nodeCron.schedule('* * * * *', async () => {
    try {
      const { data: cronWfs } = await supabase
        .from('workflow_definitions')
        .select('*')
        .eq('is_active', true)
        .eq('trigger_type', 'cron');

      if (!cronWfs?.length) return;

      const now = new Date();

      for (const wf of cronWfs) {
        const { cron: cronExpr, last_triggered } = wf.trigger_config || {};
        if (!cronExpr) continue;

        // Check if this cron should fire now using node-cron validation
        if (!nodeCron.validate(cronExpr)) continue;

        // Simple check: if last triggered was >55s ago and matches
        // (node-cron doesn't have a "does this match now" API, so we schedule them separately)
        // Instead enroll all leads that match
        if (last_triggered) {
          const lastMs = new Date(last_triggered).getTime();
          if (now.getTime() - lastMs < 55 * 1000) continue; // already ran this minute
        }

        // Get leads for this user
        const { data: leads } = await supabase
          .from('leads')
          .select('id')
          .eq('user_id', wf.user_id)
          .in('status', ['new', 'contacted', 'replied'])
          .limit(100);

        if (!leads?.length) continue;

        // Enroll leads that aren't already active in this workflow
        const { data: existing } = await supabase
          .from('workflow_enrollments')
          .select('lead_id')
          .eq('workflow_def_id', wf.id)
          .eq('status', 'active');

        const existingIds = new Set((existing || []).map((e: any) => e.lead_id));
        const toEnroll = leads.filter((l: any) => !existingIds.has(l.id));

        if (toEnroll.length > 0) {
          const enrollments = toEnroll.map((l: any) => ({
            user_id:        wf.user_id,
            lead_id:        l.id,
            workflow_def_id: wf.id,
            workflow_type:  'v2',
            current_node_id: null,
            current_step:   0,
            status:         'active',
            started_at:     now.toISOString(),
            next_step_at:   now.toISOString(),
          }));
          await supabase.from('workflow_enrollments').insert(enrollments).catch(() => {});
        }

        // Update last_triggered
        await supabase.from('workflow_definitions').update({
          trigger_config: { ...wf.trigger_config, last_triggered: now.toISOString() },
        }).eq('id', wf.id);
      }
    } catch {}
  });

  console.log('[WorkflowV2] Scheduler started');
}

// ─── Event trigger (called from other routes) ─────────────────────────────────

async function triggerWorkflowEvent(
  userId: string,
  leadId: string,
  eventType: 'lead_created' | 'stage_changed' | 'score_threshold' | 'email_opened',
  eventData: Record<string, any> = {}
): Promise<void> {
  const { data: wfs } = await supabase
    .from('workflow_definitions')
    .select('*')
    .eq('user_id', userId)
    .eq('is_active', true)
    .eq('trigger_type', eventType);

  if (!wfs?.length) return;

  for (const wf of wfs) {
    const tc = wf.trigger_config || {};

    // Check trigger conditions
    if (eventType === 'stage_changed') {
      if (tc.from && tc.from !== eventData.from) continue;
      if (tc.to   && tc.to   !== eventData.to)   continue;
    }
    if (eventType === 'score_threshold') {
      const threshold = tc.threshold || 70;
      const direction = tc.direction || 'above';
      const score = eventData.score || 0;
      if (direction === 'above' && score < threshold) continue;
      if (direction === 'below' && score > threshold) continue;
    }

    // Don't re-enroll if already active
    const { data: existing } = await supabase
      .from('workflow_enrollments')
      .select('id')
      .eq('workflow_def_id', wf.id)
      .eq('lead_id', leadId)
      .eq('status', 'active')
      .limit(1);

    if (existing?.length) continue;

    await supabase.from('workflow_enrollments').insert({
      user_id:         userId,
      lead_id:         leadId,
      workflow_def_id: wf.id,
      workflow_type:   'v2',
      current_node_id: null,
      current_step:    0,
      status:          'active',
      started_at:      new Date().toISOString(),
      next_step_at:    new Date().toISOString(),
    }).catch(() => {});
  }
}

// ─── CRUD Routes ──────────────────────────────────────────────────────────────

// List all workflows
router.get('/', async (req: any, res: any) => {
  try {
    const { data, error } = await supabase
      .from('workflow_definitions')
      .select('id, name, description, trigger_type, trigger_config, is_active, run_count, last_run_at, created_at, nodes')
      .eq('user_id', req.userId)
      .order('created_at', { ascending: false });

    if (error) throw error;

    // Attach enrollment counts
    const ids = (data || []).map((w: any) => w.id);
    let enrollCounts: Record<string, { active: number; completed: number; error: number }> = {};
    if (ids.length > 0) {
      const { data: counts } = await supabase
        .from('workflow_enrollments')
        .select('workflow_def_id, status')
        .in('workflow_def_id', ids);

      (counts || []).forEach((c: any) => {
        if (!enrollCounts[c.workflow_def_id]) enrollCounts[c.workflow_def_id] = { active: 0, completed: 0, error: 0 };
        if (c.status === 'active')    enrollCounts[c.workflow_def_id].active++;
        if (c.status === 'completed') enrollCounts[c.workflow_def_id].completed++;
        if (c.status === 'error')     enrollCounts[c.workflow_def_id].error++;
      });
    }

    const workflows = (data || []).map((w: any) => ({
      ...w,
      nodeCount:   (w.nodes || []).length,
      enrollments: enrollCounts[w.id] || { active: 0, completed: 0, error: 0 },
    }));

    res.json({ workflows });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// Get single workflow
router.get('/:id', async (req: any, res: any) => {
  try {
    const { data, error } = await supabase
      .from('workflow_definitions')
      .select('*')
      .eq('id', req.params.id)
      .eq('user_id', req.userId)
      .single();

    if (error || !data) return res.status(404).json({ error: 'Bulunamadı' });
    res.json({ workflow: data });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// Create workflow
router.post('/', async (req: any, res: any) => {
  try {
    const { name, description, trigger_type, trigger_config, nodes } = req.body;
    if (!name) return res.status(400).json({ error: 'name zorunlu' });

    const { data, error } = await supabase
      .from('workflow_definitions')
      .insert({
        user_id:        req.userId,
        name,
        description:    description || null,
        trigger_type:   trigger_type || 'manual',
        trigger_config: trigger_config || {},
        nodes:          nodes || [],
        is_active:      false,
      })
      .select()
      .single();

    if (error) throw error;
    res.json({ workflow: data });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// Update workflow (nodes / name / trigger)
router.patch('/:id', async (req: any, res: any) => {
  try {
    const allowed = ['name', 'description', 'trigger_type', 'trigger_config', 'nodes', 'is_active'];
    const update: any = { updated_at: new Date().toISOString() };
    allowed.forEach(k => { if (req.body[k] !== undefined) update[k] = req.body[k]; });

    const { data, error } = await supabase
      .from('workflow_definitions')
      .update(update)
      .eq('id', req.params.id)
      .eq('user_id', req.userId)
      .select()
      .single();

    if (error) throw error;
    res.json({ workflow: data });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// Delete workflow
router.delete('/:id', async (req: any, res: any) => {
  try {
    // Cancel active enrollments first
    await supabase.from('workflow_enrollments')
      .update({ status: 'cancelled' })
      .eq('workflow_def_id', req.params.id)
      .eq('user_id', req.userId)
      .eq('status', 'active');

    await supabase.from('workflow_definitions')
      .delete()
      .eq('id', req.params.id)
      .eq('user_id', req.userId);

    res.json({ success: true });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// Toggle active
router.post('/:id/toggle', async (req: any, res: any) => {
  try {
    const { data: wf } = await supabase
      .from('workflow_definitions')
      .select('is_active')
      .eq('id', req.params.id)
      .eq('user_id', req.userId)
      .single();

    if (!wf) return res.status(404).json({ error: 'Bulunamadı' });

    const { data } = await supabase
      .from('workflow_definitions')
      .update({ is_active: !wf.is_active, updated_at: new Date().toISOString() })
      .eq('id', req.params.id)
      .eq('user_id', req.userId)
      .select()
      .single();

    res.json({ workflow: data });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// Manual enroll a lead into a workflow
router.post('/:id/enroll', async (req: any, res: any) => {
  try {
    const { leadId } = req.body;
    if (!leadId) return res.status(400).json({ error: 'leadId zorunlu' });

    const { data: wf } = await supabase
      .from('workflow_definitions')
      .select('id, nodes')
      .eq('id', req.params.id)
      .eq('user_id', req.userId)
      .single();

    if (!wf) return res.status(404).json({ error: 'Workflow bulunamadı' });

    const { data, error } = await supabase.from('workflow_enrollments').insert({
      user_id:         req.userId,
      lead_id:         leadId,
      workflow_def_id: req.params.id,
      workflow_type:   'v2',
      current_node_id: null,
      current_step:    0,
      status:          'active',
      started_at:      new Date().toISOString(),
      next_step_at:    new Date().toISOString(),
    }).select().single();

    if (error) throw error;
    res.json({ enrollment: data });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// Bulk enroll leads into a workflow
router.post('/:id/enroll-bulk', async (req: any, res: any) => {
  try {
    const { leadIds } = req.body;
    if (!Array.isArray(leadIds) || !leadIds.length) return res.status(400).json({ error: 'leadIds zorunlu' });

    const { data: wf } = await supabase
      .from('workflow_definitions')
      .select('id')
      .eq('id', req.params.id)
      .eq('user_id', req.userId)
      .single();

    if (!wf) return res.status(404).json({ error: 'Workflow bulunamadı' });

    // Skip already enrolled
    const { data: existing } = await supabase
      .from('workflow_enrollments')
      .select('lead_id')
      .eq('workflow_def_id', req.params.id)
      .eq('status', 'active')
      .in('lead_id', leadIds.slice(0, 200));

    const existingIds = new Set((existing || []).map((e: any) => e.lead_id));
    const toEnroll = leadIds.filter((id: string) => !existingIds.has(id)).slice(0, 200);

    if (!toEnroll.length) return res.json({ enrolled: 0, skipped: leadIds.length });

    const now = new Date().toISOString();
    const rows = toEnroll.map((lid: string) => ({
      user_id:         req.userId,
      lead_id:         lid,
      workflow_def_id: req.params.id,
      workflow_type:   'v2',
      current_node_id: null,
      current_step:    0,
      status:          'active',
      started_at:      now,
      next_step_at:    now,
    }));

    const { error } = await supabase.from('workflow_enrollments').insert(rows);
    if (error) throw error;

    res.json({ enrolled: toEnroll.length, skipped: leadIds.length - toEnroll.length });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// Get enrollments for a workflow
router.get('/:id/enrollments', async (req: any, res: any) => {
  try {
    const { status, limit = 50 } = req.query;

    let q = supabase
      .from('workflow_enrollments')
      .select(`
        id, lead_id, status, current_node_id, ab_variant,
        started_at, next_step_at, retry_count, error_msg,
        leads!inner(company_name, contact_name, status, score)
      `)
      .eq('workflow_def_id', req.params.id)
      .eq('user_id', req.userId)
      .order('started_at', { ascending: false })
      .limit(Number(limit));

    if (status) q = q.eq('status', status);

    const { data, error } = await q;
    if (error) throw error;
    res.json({ enrollments: data || [] });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// Cancel an enrollment
router.delete('/enrollments/:enrollId', async (req: any, res: any) => {
  try {
    await supabase.from('workflow_enrollments')
      .update({ status: 'cancelled' })
      .eq('id', req.params.enrollId)
      .eq('user_id', req.userId);
    res.json({ success: true });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// Step logs for an enrollment
router.get('/enrollments/:enrollId/logs', async (req: any, res: any) => {
  try {
    const { data, error } = await supabase
      .from('workflow_step_logs')
      .select('*')
      .eq('enrollment_id', req.params.enrollId)
      .eq('user_id', req.userId)
      .order('executed_at', { ascending: true });

    if (error) throw error;
    res.json({ logs: data || [] });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// Analytics: per-node stats for a workflow
router.get('/:id/analytics', async (req: any, res: any) => {
  try {
    const { data: logs, error } = await supabase
      .from('workflow_step_logs')
      .select('node_id, node_type, status, ab_variant, channel')
      .eq('workflow_def_id', req.params.id)
      .eq('user_id', req.userId);

    if (error) throw error;

    const nodeStats: Record<string, any> = {};
    (logs || []).forEach((l: any) => {
      if (!nodeStats[l.node_id]) nodeStats[l.node_id] = { executed: 0, skipped: 0, error: 0, waiting: 0, variantA: 0, variantB: 0 };
      nodeStats[l.node_id][l.status] = (nodeStats[l.node_id][l.status] || 0) + 1;
      if (l.ab_variant === 'A') nodeStats[l.node_id].variantA++;
      if (l.ab_variant === 'B') nodeStats[l.node_id].variantB++;
    });

    // Enrollment summary
    const { data: enroll } = await supabase
      .from('workflow_enrollments')
      .select('status')
      .eq('workflow_def_id', req.params.id)
      .eq('user_id', req.userId);

    const summary = { active: 0, completed: 0, error: 0, cancelled: 0 };
    (enroll || []).forEach((e: any) => { if (summary[e.status as keyof typeof summary] !== undefined) summary[e.status as keyof typeof summary]++; });

    res.json({ nodeStats, summary, totalSteps: (logs || []).length });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// Workflow templates
router.get('/meta/templates', async (req: any, res: any) => {
  const templates = [
    {
      id: 'welcome_sequence',
      name: 'Hoş Geldin Serisi',
      description: 'Yeni lead için 3 günlük karşılama akışı',
      trigger_type: 'lead_created',
      trigger_config: {},
      nodes: [
        { id: 'n1', type: 'message', label: 'WhatsApp Karşılama', config: { channel: 'whatsapp', template: 'Merhaba {{isim}}! {{firma}} olarak sizi LeadFlow platformuna hoş geldiniz. Size nasıl yardımcı olabiliriz?' }, next: 'n2' },
        { id: 'n2', type: 'wait', label: '2 Gün Bekle', config: { days: 2, useSmartTiming: true }, next: 'n3' },
        { id: 'n3', type: 'message', label: 'Takip Mesajı', config: { channel: 'whatsapp', template: 'Merhaba {{isim}}, {{firma}} ile ilgili sorularınız var mı? Yardımcı olmaktan memnuniyet duyarım.', useAI: true }, next: 'n4' },
        { id: 'n4', type: 'wait', label: '3 Gün Bekle', config: { days: 3 }, next: 'n5' },
        { id: 'n5', type: 'condition', label: 'Sıcak mı?', config: { condField: 'hot_score', condOperator: 'gte', condValue: '30' }, nextTrue: 'n6', nextFalse: 'n7' },
        { id: 'n6', type: 'action', label: 'Arama Etiketi', config: { actionType: 'add_tag', actionValue: 'arama_planla' }, next: 'n8' },
        { id: 'n7', type: 'message', label: 'Veda Mesajı', config: { channel: 'email', subject: 'Size nasıl yardımcı olabiliriz?', template: 'Merhaba {{isim}}, ilerleyen günlerde bir fikir paylaşmak isteriz.' }, next: 'n8' },
        { id: 'n8', type: 'end', label: 'Bitti', config: {} },
      ],
    },
    {
      id: 'proposal_followup',
      name: 'Teklif Takip',
      description: 'Teklif gönderildikten sonra akıllı takip',
      trigger_type: 'stage_changed',
      trigger_config: { to: 'proposal' },
      nodes: [
        { id: 'n1', type: 'wait', label: '1 Gün Bekle', config: { days: 1, useSmartTiming: true }, next: 'n2' },
        { id: 'n2', type: 'message', label: 'Teklif Takip WA', config: { channel: 'whatsapp', template: 'Merhaba {{isim}}, teklifimizi inceleme fırsatı buldunuz mu? Sorularınız için buradayım.', useAI: true }, next: 'n3' },
        { id: 'n3', type: 'wait', label: '3 Gün Bekle', config: { days: 3 }, next: 'n4' },
        { id: 'n4', type: 'ab_split', label: 'A/B Test', config: { abVariants: { a: 'Teklifimiz hakkında bir güncelleme paylaşmak istedim.', b: 'Özel bir fırsat sunmak istiyorum, uygun musunuz?' }, splitPct: 50 }, nextA: 'n5', nextB: 'n5' },
        { id: 'n5', type: 'message', label: 'A/B Mesajı', config: { channel: 'whatsapp', useAI: true }, next: 'n6' },
        { id: 'n6', type: 'end', label: 'Bitti', config: {} },
      ],
    },
    {
      id: 'reactivation',
      name: 'Yeniden Aktivasyon',
      description: 'Soğumuş leadleri ısıtma akışı',
      trigger_type: 'manual',
      trigger_config: {},
      nodes: [
        { id: 'n1', type: 'condition', label: 'Eposta var mı?', config: { condField: 'email', condOperator: 'not_eq', condValue: '' }, nextTrue: 'n2', nextFalse: 'n3' },
        { id: 'n2', type: 'message', label: 'Yeniden Bağlan Email', config: { channel: 'email', subject: 'Sizi özledik {{isim}}!', template: 'Merhaba {{isim}}, bir süredir görüşemedik. {{firma}} ile yeni gelişmeler var, paylaşmak istedim.', useAI: true }, next: 'n4' },
        { id: 'n3', type: 'message', label: 'WhatsApp ile Dene', config: { channel: 'whatsapp', template: 'Merhaba {{isim}}! Uzun süredir görüşemedik, nasılsınız?', useAI: true }, next: 'n4' },
        { id: 'n4', type: 'wait', label: '5 Gün Bekle', config: { days: 5 }, next: 'n5' },
        { id: 'n5', type: 'action', label: 'Skoru Artır', config: { actionType: 'update_score', actionValue: '5' }, next: 'n6' },
        { id: 'n6', type: 'end', label: 'Bitti', config: {} },
      ],
    },
  ];

  res.json({ templates });
});

// Create from template
router.post('/from-template/:templateId', async (req: any, res: any) => {
  try {
    // Re-fetch templates via internal call
    const tplRes = await fetch(`http://localhost:${process.env.PORT || 3001}/api/workflow-v2/meta/templates`);
    const { templates } = await tplRes.json();
    const tpl = templates.find((t: any) => t.id === req.params.templateId);
    if (!tpl) return res.status(404).json({ error: 'Şablon bulunamadı' });

    const { data, error } = await supabase
      .from('workflow_definitions')
      .insert({
        user_id:        req.userId,
        name:           req.body.name || tpl.name,
        description:    tpl.description,
        trigger_type:   tpl.trigger_type,
        trigger_config: tpl.trigger_config,
        nodes:          tpl.nodes,
        is_active:      false,
      })
      .select()
      .single();

    if (error) throw error;
    res.json({ workflow: data });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// All leads for wizard enrollment picker (no pagination, minimal fields)
router.get('/meta/leads-all', async (req: any, res: any) => {
  try {
    const { search, status } = req.query;
    let q = supabase
      .from('leads')
      .select('id, company_name, contact_name, city, sector, status, score, phone, email')
      .eq('user_id', req.userId)
      .order('score', { ascending: false })
      .limit(5000);

    if (search) q = q.ilike('company_name', `%${search}%`);
    if (status) q = q.eq('status', status);

    const { data, error } = await q;
    if (error) throw error;
    res.json({ leads: data || [], total: (data || []).length });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// Start the scheduler when this module is first loaded
startWorkflowScheduler();

module.exports = { router, triggerWorkflowEvent };
