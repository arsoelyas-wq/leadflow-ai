"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express = require('express');
const Anthropic = require('@anthropic-ai/sdk');
const { createClient } = require('@supabase/supabase-js');
const router = express.Router();
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
const { authMiddleware } = require('../middleware/auth');
// ─── System Prompts ───────────────────────────────────────────────────────────
const PUBLIC_SYSTEM_PROMPT = `Sen Sovlo AI'nın müşteri destek asistanısın. Türkçe konuşuyorsun.
Platform: B2B lead scraping ve satış otomasyon (Google Maps lead toplama, WhatsApp kampanya, AI mesaj kişiselleştirme, Pipeline CRM).
Fiyatlandırma: Starter ₺199/ay, Growth ₺399/ay, Pro ₺799/ay.

Görevin:
- Ziyaretçilerin satış öncesi sorularını yanıtla
- Platform özelliklerini net açıkla
- Teknik sorulara rehberlik et
- Kayıt için /register adresine yönlendir

Her yanıtı SADECE JSON formatında ver:
{
  "message": "Türkçe, samimi ve profesyonel yanıt",
  "quickReplies": ["Hızlı yanıt 1", "Hızlı yanıt 2"],
  "needsEscalation": false
}

Kurallar:
- quickReplies maksimum 3 öneri
- Ücret veya fatura sorunlarında: needsEscalation: true
- Her zaman yardımcı, pozitif ve çözüm odaklı ol`;
function buildDashboardSystemPrompt(user, pageContext) {
    return `Sen Sovlo AI'nın müşteri destek asistanısın. Türkçe konuşuyorsun.

Kullanıcı Bilgileri:
- Ad: ${user.name || 'Kullanıcı'}
- Plan: ${user.planType || 'starter'}
- Şirket: ${user.company || 'Belirtilmedi'}
- Sektör: ${user.sector || 'Belirtilmedi'}
${pageContext ? `- Bulunduğu Sayfa: ${pageContext}` : ''}

Platform: B2B lead scraping ve satış otomasyon.
Özellikler: Google Maps Lead Scraper, WhatsApp Kampanya, AI Mesaj Kişiselleştirme, Pipeline CRM, Lead Hunter, Karar Verici Bulucu.

Görevin:
- Kullanıcının sorununu net adımlarla çöz
- Platformu detaylıca açıkla
- Plan kısıtlamaları varsa bildir (${user.planType || 'starter'} plan)
- Fatura/ödeme sorunları için destek@sovlo.io'ya yönlendir
- 3 mesaj sonra çözülemeyen sorunlarda insan desteği öner

Her yanıtı SADECE JSON formatında ver:
{
  "message": "Türkçe, detaylı ve çözüm odaklı yanıt",
  "quickReplies": ["Hızlı yanıt 1", "Hızlı yanıt 2"],
  "needsEscalation": false
}

Kurallar:
- quickReplies maksimum 3 bağlamsal öneri
- needsEscalation: true → insan desteğine aktar
- Yanıtlar kısa ama eksiksiz olsun`;
}
// ─── Helper ───────────────────────────────────────────────────────────────────
async function callClaude(systemPrompt, messages) {
    const response = await anthropic.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1024,
        system: systemPrompt,
        messages: messages.map((m) => ({ role: m.role, content: m.content })),
    });
    const rawText = response.content[0].text;
    const jsonMatch = rawText.match(/\{[\s\S]*\}/);
    if (!jsonMatch)
        throw new Error('AI yanıt formatı hatalı');
    const parsed = JSON.parse(jsonMatch[0]);
    return {
        message: parsed.message || '',
        quickReplies: Array.isArray(parsed.quickReplies) ? parsed.quickReplies.slice(0, 3) : [],
        needsEscalation: !!parsed.needsEscalation,
    };
}
// ─── PUBLIC ENDPOINT (landing page — no auth) ─────────────────────────────────
router.post('/public/chat', async (req, res) => {
    try {
        const { messages, userEmail, pageContext } = req.body;
        if (!messages || !Array.isArray(messages) || messages.length === 0) {
            return res.status(400).json({ error: 'Mesajlar eksik' });
        }
        let systemPrompt = PUBLIC_SYSTEM_PROMPT;
        if (pageContext)
            systemPrompt += `\n\nZiyaretçinin bulunduğu sayfa/bölüm: ${pageContext}`;
        if (userEmail)
            systemPrompt += `\n\nZiyaretçi email'i: ${userEmail}`;
        const result = await callClaude(systemPrompt, messages);
        res.json(result);
    }
    catch (error) {
        console.error('Support public chat error:', error.message);
        res.status(500).json({ error: 'Destek servisi hatası' });
    }
});
// ─── AUTHENTICATED ENDPOINTS ──────────────────────────────────────────────────
// All routes below require auth
router.use(authMiddleware);
// GET /api/support/conversations — list user's conversations
router.get('/conversations', async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('support_conversations')
            .select('id, title, status, category, message_count, created_at, updated_at, satisfaction_rating')
            .eq('user_id', req.userId)
            .order('updated_at', { ascending: false })
            .limit(50);
        if (error)
            throw error;
        res.json({ conversations: data || [] });
    }
    catch (error) {
        console.error('Support conversations error:', error.message);
        res.status(500).json({ error: error.message });
    }
});
// POST /api/support/conversations — start new conversation
router.post('/conversations', async (req, res) => {
    try {
        const { title, category } = req.body;
        const { data, error } = await supabase
            .from('support_conversations')
            .insert({
            user_id: req.userId,
            title: title || 'Yeni Destek Talebi',
            category: category || null,
            status: 'open',
            message_count: 0,
        })
            .select()
            .single();
        if (error)
            throw error;
        res.json({ conversation: data });
    }
    catch (error) {
        console.error('Support create conv error:', error.message);
        res.status(500).json({ error: error.message });
    }
});
// GET /api/support/conversations/:id/messages
router.get('/conversations/:id/messages', async (req, res) => {
    try {
        const { id } = req.params;
        // Verify ownership
        const { data: conv } = await supabase
            .from('support_conversations')
            .select('id')
            .eq('id', id)
            .eq('user_id', req.userId)
            .single();
        if (!conv)
            return res.status(404).json({ error: 'Konuşma bulunamadı' });
        const { data, error } = await supabase
            .from('support_messages')
            .select('id, role, content, quick_replies, created_at')
            .eq('conversation_id', id)
            .order('created_at', { ascending: true });
        if (error)
            throw error;
        res.json({ messages: data || [] });
    }
    catch (error) {
        console.error('Support messages error:', error.message);
        res.status(500).json({ error: error.message });
    }
});
// POST /api/support/conversations/:id/messages — send message + get AI reply
router.post('/conversations/:id/messages', async (req, res) => {
    try {
        const { id } = req.params;
        const { content, pageContext, userProfile } = req.body;
        if (!content?.trim())
            return res.status(400).json({ error: 'Mesaj içeriği boş' });
        // Verify ownership
        const { data: conv } = await supabase
            .from('support_conversations')
            .select('*')
            .eq('id', id)
            .eq('user_id', req.userId)
            .single();
        if (!conv)
            return res.status(404).json({ error: 'Konuşma bulunamadı' });
        // Save user message
        const { data: userMsg, error: insertErr } = await supabase
            .from('support_messages')
            .insert({
            conversation_id: id,
            user_id: req.userId,
            role: 'user',
            content: content.trim(),
            quick_replies: [],
        })
            .select()
            .single();
        if (insertErr)
            throw insertErr;
        // Get conversation history for context
        const { data: history } = await supabase
            .from('support_messages')
            .select('role, content')
            .eq('conversation_id', id)
            .order('created_at', { ascending: true })
            .limit(20);
        // Build AI messages array
        const aiMessages = (history || []).map((m) => ({
            role: m.role === 'assistant' ? 'assistant' : 'user',
            content: m.content,
        }));
        // Build system prompt with user context
        const systemPrompt = buildDashboardSystemPrompt(userProfile || { planType: 'starter' }, pageContext);
        // Call Claude
        const aiResult = await callClaude(systemPrompt, aiMessages);
        // Save AI reply
        const { data: aiMsg, error: aiInsertErr } = await supabase
            .from('support_messages')
            .insert({
            conversation_id: id,
            user_id: req.userId,
            role: 'assistant',
            content: aiResult.message,
            quick_replies: aiResult.quickReplies,
        })
            .select()
            .single();
        if (aiInsertErr)
            throw aiInsertErr;
        // Update conversation metadata
        const updateData = {
            message_count: (conv.message_count || 0) + 2,
            updated_at: new Date().toISOString(),
        };
        // Auto-set title from first user message
        if (!conv.title || conv.title === 'Yeni Destek Talebi') {
            updateData.title = content.trim().slice(0, 60) + (content.length > 60 ? '...' : '');
        }
        if (aiResult.needsEscalation) {
            updateData.status = 'escalated';
        }
        await supabase
            .from('support_conversations')
            .update(updateData)
            .eq('id', id);
        res.json({
            userMessage: userMsg,
            aiMessage: aiMsg,
            needsEscalation: aiResult.needsEscalation,
        });
    }
    catch (error) {
        console.error('Support send message error:', error.message);
        res.status(500).json({ error: error.message });
    }
});
// PATCH /api/support/conversations/:id — update status or rating
router.patch('/conversations/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { status, satisfaction_rating } = req.body;
        const updateData = { updated_at: new Date().toISOString() };
        if (status)
            updateData.status = status;
        if (satisfaction_rating) {
            updateData.satisfaction_rating = satisfaction_rating;
            if (status === 'resolved')
                updateData.resolved_at = new Date().toISOString();
        }
        if (status === 'resolved' && !updateData.resolved_at) {
            updateData.resolved_at = new Date().toISOString();
        }
        const { data, error } = await supabase
            .from('support_conversations')
            .update(updateData)
            .eq('id', id)
            .eq('user_id', req.userId)
            .select()
            .single();
        if (error)
            throw error;
        res.json({ conversation: data });
    }
    catch (error) {
        console.error('Support update conv error:', error.message);
        res.status(500).json({ error: error.message });
    }
});
module.exports = router;
