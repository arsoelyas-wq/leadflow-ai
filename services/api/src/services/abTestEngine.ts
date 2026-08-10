const { createClient } = require('@supabase/supabase-js');
const axios = require('axios');
const Anthropic = require('@anthropic-ai/sdk');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const GRAPH = 'https://graph.facebook.com/v20.0';

async function metaGet(path: string, token: string, params: any = {}) {
  const r = await axios.get(`${GRAPH}${path}`, { params: { ...params, access_token: token }, timeout: 15000 });
  return r.data;
}

async function metaPost(path: string, token: string, data: any = {}) {
  const r = await axios.post(`${GRAPH}${path}`, { ...data, access_token: token }, { timeout: 15000 });
  return r.data;
}

async function generateVariant(headline: string, body: string, productDesc: string): Promise<{ headline: string; body: string }> {
  const r = await anthropic.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 300,
    messages: [{
      role: 'user',
      content: `You are a top Turkish copywriter for Meta ads. Generate ONE improved variant of this ad.

Original headline: ${headline}
Original body: ${body}
Product: ${productDesc}

Rules:
- Keep same intent but vary approach (urgency, social proof, or curiosity)
- Headline: max 40 chars, Turkish
- Body: max 125 chars, Turkish
- NO emojis unless original had them
- Must be meaningfully different from original

Return ONLY valid JSON: {"headline": "...", "body": "..."}`,
    }],
  });
  const match = (r.content[0] as any)?.text?.match(/\{[\s\S]*?\}/);
  if (!match) throw new Error('AI returned invalid JSON');
  return JSON.parse(match[0]);
}

async function evaluateTest(test: any, token: string) {
  try {
    let winner: string | null = null;
    let originalCtr = 0;
    let variantCtr = 0;

    // Get original ad performance
    if (test.original_ad_id) {
      const ins = await metaGet(`/${test.original_ad_id}/insights`, token, {
        fields: 'ctr,spend,impressions',
        date_preset: 'last_2d',
      });
      originalCtr = parseFloat(ins.data?.[0]?.ctr || '0');
    }

    // Get variant ad performance (if it was launched)
    if (test.variant_ad_id) {
      const ins = await metaGet(`/${test.variant_ad_id}/insights`, token, {
        fields: 'ctr,spend,impressions',
        date_preset: 'last_2d',
      });
      variantCtr = parseFloat(ins.data?.[0]?.ctr || '0');

      // Declare winner if > 20% difference
      if (variantCtr > originalCtr * 1.2) {
        winner = 'variant';
        // Pause original, keep variant running
        await metaPost(`/${test.original_ad_id}`, token, { status: 'PAUSED' });
      } else if (originalCtr > variantCtr * 1.2) {
        winner = 'original';
        // Pause variant
        await metaPost(`/${test.variant_ad_id}`, token, { status: 'PAUSED' });
      } else {
        winner = 'tie';
      }
    }

    await supabase.from('ad_ab_tests').update({
      status: 'completed',
      winner,
      original_ctr: originalCtr,
      variant_ctr: variantCtr,
      completed_at: new Date().toISOString(),
    }).eq('id', test.id);

    console.log(`[ABTest] Test ${test.id} completed — winner: ${winner}`);
  } catch (err: any) {
    console.error('[ABTest] Evaluate error:', err.message);
  }
}

async function runAbTestCycleForUser(userId: string) {
  try {
    const { data: conn } = await supabase
      .from('meta_connections')
      .select('access_token, ad_accounts')
      .eq('user_id', userId)
      .maybeSingle();

    if (!conn?.access_token) return;
    const token = conn.access_token;
    const accs = JSON.parse(conn.ad_accounts || '[]');
    const adAccountId = accs[0]?.id;
    if (!adAccountId) return;

    // 1. Check running tests — evaluate those past 48h
    const { data: runningTests } = await supabase
      .from('ad_ab_tests')
      .select('*')
      .eq('user_id', userId)
      .eq('status', 'running')
      .lt('started_at', new Date(Date.now() - 48 * 3600 * 1000).toISOString());

    for (const test of runningTests || []) {
      await evaluateTest(test, token);
    }

    // 2. Find fatigued ads to test (frequency > 3.5 or CTR < 0.5% with spend > $10)
    const adsResp = await metaGet(`/${adAccountId}/ads`, token, {
      fields: 'id,name,status,creative{title,body}',
      filtering: '[{"field":"effective_status","operator":"IN","value":["ACTIVE"]}]',
      limit: 20,
    });

    for (const ad of adsResp.data || []) {
      try {
        // Skip if test already exists for this ad
        const { data: existingTest } = await supabase
          .from('ad_ab_tests')
          .select('id')
          .eq('user_id', userId)
          .eq('original_ad_id', ad.id)
          .in('status', ['pending', 'running'])
          .maybeSingle();
        if (existingTest) continue;

        const insightsResp = await metaGet(`/${ad.id}/insights`, token, {
          fields: 'ctr,frequency,spend,impressions',
          date_preset: 'last_7d',
        });
        const ins = insightsResp.data?.[0];
        if (!ins) continue;

        const ctr = parseFloat(ins.ctr || '0');
        const freq = parseFloat(ins.frequency || '0');
        const spend = parseFloat(ins.spend || '0');

        const isFatigued = (freq > 3.5 && spend > 5) || (ctr < 0.5 && spend > 10);
        if (!isFatigued) continue;

        // Need copy to generate a variant
        const headline = ad.creative?.title || '';
        const body = ad.creative?.body || '';
        if (!headline && !body) continue;

        const { data: profile } = await supabase
          .from('business_profiles')
          .select('product')
          .eq('user_id', userId)
          .maybeSingle();

        const variant = await generateVariant(headline, body, profile?.product?.description || '');

        // Save test record (variant ad creation is manual — Meta requires creative + ad_creative setup)
        await supabase.from('ad_ab_tests').insert([{
          user_id: userId,
          original_ad_id: ad.id,
          original_headline: headline,
          original_body: body,
          variant_headline: variant.headline,
          variant_body: variant.body,
          status: 'pending',
          created_at: new Date().toISOString(),
        }]);

        // Alert user to review and launch
        await supabase.from('ad_alerts').insert([{
          user_id: userId,
          campaign_id: ad.id,
          alert_type: 'ab_test_ready',
          severity: 'info',
          message: `A/B testi hazır: "${ad.name}" için yeni metin önerildi`,
          recommendation: JSON.stringify({ variantHeadline: variant.headline, variantBody: variant.body }),
          is_read: false,
          created_at: new Date().toISOString(),
        }]);

        console.log(`[ABTest] New test queued for ad ${ad.id}`);
        break; // Max 1 new test per user per run
      } catch (innerErr: any) {
        console.error(`[ABTest] Ad ${ad.id} error:`, innerErr.message);
      }
    }
  } catch (err: any) {
    console.error(`[ABTest] User ${userId} error:`, err.message);
  }
}

async function runAbTestCycleAll() {
  const { data: connections } = await supabase
    .from('meta_connections')
    .select('user_id')
    .not('access_token', 'is', null);

  for (const conn of connections || []) {
    await runAbTestCycleForUser(conn.user_id);
    await new Promise(r => setTimeout(r, 2000));
  }
}

module.exports = { runAbTestCycleForUser, runAbTestCycleAll };
