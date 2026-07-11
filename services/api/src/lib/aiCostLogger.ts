export {};
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

// ── Pricing (USD) ─────────────────────────────────────────────────────────────
const PRICES = {
  anthropic: {
    'claude-sonnet-4-20250514':    { input: 3.00 / 1_000_000, output: 15.00 / 1_000_000 },
    'claude-opus-4-8':             { input: 15.00 / 1_000_000, output: 75.00 / 1_000_000 },
    'claude-haiku-4-5-20251001':   { input: 0.80 / 1_000_000, output: 4.00  / 1_000_000 },
    'default':                     { input: 3.00 / 1_000_000, output: 15.00 / 1_000_000 },
  },
  elevenlabs: {
    per_character: 0.30 / 1000,   // ~$0.30 per 1000 chars (~1 minute of speech)
  },
  google_places: {
    per_request: 0.017,            // Nearby Search $0.017/request
  },
  perplexity: {
    per_request: 0.005,            // Online model ~$0.005/search
  },
  smtp: {
    per_email: 0,                  // kendi SMTP sunucumuz — maliyet 0
  },
  stripe: {
    per_transaction: 0.30,         // fixed part, percentage excluded
  },
};

interface AnthropicUsage {
  input_tokens: number;
  output_tokens: number;
}

// ── Log an Anthropic call ─────────────────────────────────────────────────────
export async function logAnthropicCall(opts: {
  userId?: string;
  feature: string;
  model?: string;
  usage: AnthropicUsage;
  success?: boolean;
  metadata?: Record<string, any>;
}) {
  try {
    const model = opts.model || 'claude-sonnet-4-20250514';
    const pricing = (PRICES.anthropic as any)[model] || PRICES.anthropic['default'];
    const costUsd = (opts.usage.input_tokens * pricing.input) + (opts.usage.output_tokens * pricing.output);

    await supabase.from('ai_cost_logs').insert([{
      user_id:      opts.userId || null,
      service:      'anthropic',
      feature:      opts.feature,
      model,
      input_tokens:  opts.usage.input_tokens,
      output_tokens: opts.usage.output_tokens,
      units:         opts.usage.input_tokens + opts.usage.output_tokens,
      unit_type:     'tokens',
      cost_usd:      parseFloat(costUsd.toFixed(6)),
      success:       opts.success !== false,
      metadata:      opts.metadata || {},
    }]);
  } catch (e) {
    // Never block main flow
    console.error('[aiCostLogger] anthropic log error:', e);
  }
}

// ── Log an ElevenLabs call ────────────────────────────────────────────────────
export async function logElevenLabsCall(opts: {
  userId?: string;
  feature: string;
  characters: number;
  success?: boolean;
  metadata?: Record<string, any>;
}) {
  try {
    const costUsd = opts.characters * PRICES.elevenlabs.per_character;
    await supabase.from('ai_cost_logs').insert([{
      user_id:   opts.userId || null,
      service:   'elevenlabs',
      feature:   opts.feature,
      model:     'eleven_multilingual_v2',
      units:     opts.characters,
      unit_type: 'characters',
      cost_usd:  parseFloat(costUsd.toFixed(6)),
      success:   opts.success !== false,
      metadata:  opts.metadata || {},
    }]);
  } catch (e) {
    console.error('[aiCostLogger] elevenlabs log error:', e);
  }
}

// ── Log a Google Places call ──────────────────────────────────────────────────
export async function logGooglePlacesCall(opts: {
  userId?: string;
  feature: string;
  requests?: number;
  success?: boolean;
  metadata?: Record<string, any>;
}) {
  try {
    const requests = opts.requests || 1;
    const costUsd = requests * PRICES.google_places.per_request;
    await supabase.from('ai_cost_logs').insert([{
      user_id:   opts.userId || null,
      service:   'google_places',
      feature:   opts.feature,
      units:     requests,
      unit_type: 'requests',
      cost_usd:  parseFloat(costUsd.toFixed(6)),
      success:   opts.success !== false,
      metadata:  opts.metadata || {},
    }]);
  } catch (e) {
    console.error('[aiCostLogger] google_places log error:', e);
  }
}

// ── Log a Perplexity call ─────────────────────────────────────────────────────
export async function logPerplexityCall(opts: {
  userId?: string;
  feature: string;
  requests?: number;
  success?: boolean;
  metadata?: Record<string, any>;
}) {
  try {
    const requests = opts.requests || 1;
    const costUsd = requests * PRICES.perplexity.per_request;
    await supabase.from('ai_cost_logs').insert([{
      user_id:   opts.userId || null,
      service:   'perplexity',
      feature:   opts.feature,
      units:     requests,
      unit_type: 'requests',
      cost_usd:  parseFloat(costUsd.toFixed(6)),
      success:   opts.success !== false,
      metadata:  opts.metadata || {},
    }]);
  } catch (e) {
    console.error('[aiCostLogger] perplexity log error:', e);
  }
}


// ── Get cost summary for admin ────────────────────────────────────────────────
export async function getCostSummary(days = 30) {
  const since = new Date(Date.now() - days * 86_400_000).toISOString();
  const { data } = await supabase
    .from('ai_cost_logs')
    .select('service, feature, cost_usd, input_tokens, output_tokens, units, unit_type, user_id, created_at')
    .gte('created_at', since)
    .order('created_at', { ascending: false });
  return data || [];
}
