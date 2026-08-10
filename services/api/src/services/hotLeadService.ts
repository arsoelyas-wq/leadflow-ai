async function markHotLead(supabase: any, userId: string, lead: any): Promise<void> {
  const AnthropicSDK = require('@anthropic-ai/sdk');
  const anthropic = new AnthropicSDK({ apiKey: process.env.ANTHROPIC_API_KEY });
  try {
    // A lead is "hot" if created within 5 minutes
    const createdAt = new Date(lead.created_at || Date.now());
    const ageMinutes = (Date.now() - createdAt.getTime()) / 60000;
    if (ageMinutes > 5) return; // Not hot — polling found an old lead

    // Fetch business profile for personalization (graceful fallback if table missing)
    let companyName = 'Şirketimiz';
    let productDesc = 'ürünümüz';
    try {
      const { data: profile } = await supabase
        .from('business_profiles')
        .select('company, product')
        .eq('user_id', userId)
        .maybeSingle();
      if (profile) {
        companyName = profile.company?.name || companyName;
        productDesc = profile.product?.description || productDesc;
      }
    } catch {}

    const leadName = lead.contact_name || lead.company_name || '';

    // Generate personalized opening message with Claude
    let openingMessage = '';
    try {
      const r = await anthropic.messages.create({
        model: 'claude-sonnet-4-6',
        max_tokens: 200,
        messages: [{
          role: 'user',
          content: `Write a warm, friendly Turkish WhatsApp opening message for a fresh lead.
Lead name: ${leadName || 'Değerli Müşteri'}
Our company: ${companyName}
Our product/service: ${productDesc}
Context: They just filled our Meta Ad lead form seconds ago.

Rules:
- Max 2 sentences
- Conversational Turkish (sen/siz both ok, prefer sen)
- Mention they just showed interest
- End with a soft question
- NO emojis
- NO generic templates — sound human

Return ONLY the message text, nothing else.`,
        }],
      });
      openingMessage = r.content[0]?.text?.trim() || '';
    } catch {
      openingMessage = `Merhaba ${leadName}! Reklamımıza ilgi gösterdiğiniz için teşekkürler. Size nasıl yardımcı olabiliriz?`;
    }

    // Mark lead as hot in DB
    await supabase.from('leads').update({
      is_hot: true,
      hot_until: new Date(Date.now() + 30 * 60 * 1000).toISOString(), // Hot for 30 min
      ai_opening_message: openingMessage,
    }).eq('id', lead.id);

    // Hot lead notification
    await supabase.from('notifications').insert([{
      user_id: userId,
      type: 'hot_lead',
      title: 'Sıcak Lead!',
      message: `${leadName || 'Yeni lead'} — az önce formu doldurdu, hemen ara!`,
      data: JSON.stringify({ leadId: lead.id, openingMessage }),
    }]);

    console.log(`[HotLead] ${lead.id} marked hot — opening: ${openingMessage.slice(0, 60)}...`);
  } catch (err: any) {
    console.error('[HotLead] Error:', err.message);
  }
}

module.exports = { markHotLead };
