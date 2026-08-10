async function scoreLead(supabase: any, userId: string, lead: any): Promise<number> {
  const AnthropicSDK = require('@anthropic-ai/sdk');
  const anthropicClient = new AnthropicSDK({ apiKey: process.env.ANTHROPIC_API_KEY });
  try {
    // Fetch business profile for context
    let targetAudience = 'SMEs in Turkey';
    let productDesc = '';
    try {
      const { data: profile } = await supabase
        .from('business_profiles')
        .select('product, target_audience')
        .eq('user_id', userId)
        .maybeSingle();
      if (profile) {
        productDesc = profile.product?.description || '';
        targetAudience = profile.target_audience || targetAudience;
      }
    } catch {}

    const prompt = `You are a B2B sales qualification expert. Score this lead 1-10 based on purchase intent.

Business context:
- Product: ${productDesc || 'Unknown'}
- Target audience: ${targetAudience}

Lead data:
- Name: ${lead.contact_name || 'Unknown'}
- Company: ${lead.company_name || 'Unknown'}
- Email: ${lead.email ? 'provided' : 'missing'}
- Phone: ${lead.phone ? 'provided' : 'missing'}
- Source: ${lead.source || 'Unknown'}
- Notes: ${lead.notes || 'None'}

Scoring criteria:
- 9-10: Phone + email + company + business context matches product
- 7-8: Phone + email + some company info
- 5-6: Phone or email only, some info
- 3-4: Missing contact info, unclear intent
- 1-2: Incomplete, spam-likely, no contact info

Return ONLY valid JSON (no markdown):
{"score": <integer 1-10>, "reason": "<one sentence in Turkish explaining the score>"}`;

    const r = await anthropicClient.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 150,
      messages: [{ role: 'user', content: prompt }],
    });

    const text = r.content[0]?.text || '';
    const match = text.match(/\{[\s\S]*?\}/);
    if (!match) throw new Error('Invalid AI response');
    const result = JSON.parse(match[0]);
    const score = Math.min(10, Math.max(1, parseInt(result.score) || 5));

    await supabase.from('leads').update({
      ai_quality_score: score,
      ai_quality_reason: result.reason || '',
      ai_scored_at: new Date().toISOString(),
    }).eq('id', lead.id);

    console.log(`[LeadQuality] Lead ${lead.id}: score=${score}`);
    return score;
  } catch (err: any) {
    console.error('[LeadQuality] Error:', err.message);
    // Rule-based fallback
    let score = 3;
    if (lead.phone) score += 2;
    if (lead.email) score += 2;
    if (lead.company_name) score += 1;
    if (lead.source === 'meta_lead_form') score += 1;
    return Math.min(10, score);
  }
}

module.exports = { scoreLead };
