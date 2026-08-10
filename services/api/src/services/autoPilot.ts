export {};
const { createClient } = require('@supabase/supabase-js');
const axios = require('axios');
const nodeCron = require('node-cron');

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_KEY!);
const GRAPH = 'https://graph.facebook.com/v20.0';

interface CampaignResult {
  paused: number;
  increased: number;
  decreased: number;
}

async function processUserCampaigns(userId: string, token: string, adAccountId: string): Promise<CampaignResult> {
  let paused = 0;
  let increased = 0;
  let decreased = 0;

  try {
    // Fetch all campaigns with daily_budget
    const campaignsResp = await axios.get(`${GRAPH}/${adAccountId}/campaigns`, {
      params: {
        fields: 'id,name,status,daily_budget',
        access_token: token,
        limit: 50,
      },
      timeout: 15000,
    });

    const campaigns = campaignsResp.data?.data || [];

    for (const campaign of campaigns) {
      // Only process ACTIVE campaigns
      if (campaign.status !== 'ACTIVE') continue;

      try {
        const insightsResp = await axios.get(`${GRAPH}/${campaign.id}/insights`, {
          params: {
            fields: 'spend,ctr,cpm',
            date_preset: 'last_7d',
            access_token: token,
          },
          timeout: 10000,
        });

        const d = insightsResp.data?.data?.[0];
        if (!d) continue;

        const spend = parseFloat(d.spend || '0');
        const ctr = parseFloat(d.ctr || '0');
        const cpm = parseFloat(d.cpm || '0');
        const dailyBudgetCents = parseInt(campaign.daily_budget || '0');

        // ── AUTO-PAUSE: spend > $15 AND CTR = 0% (no clicks) ──────────────
        if (spend > 15 && ctr === 0) {
          try {
            await axios.post(`${GRAPH}/${campaign.id}`, {
              status: 'PAUSED',
              access_token: token,
            }, { timeout: 10000 });
            paused++;
            console.log(`[AutoPilot] Paused campaign ${campaign.id} (${campaign.name}): spend $${spend.toFixed(2)}, CTR 0%`);
          } catch (err: any) {
            console.error(`[AutoPilot] Failed to pause campaign ${campaign.id}:`, err.message);
          }
          continue; // skip budget changes for a campaign we just paused
        }

        if (dailyBudgetCents > 0) {
          // ── INCREASE BUDGET: CTR > 2% AND CPM < $15 ───────────────────────
          if (ctr > 2 && cpm < 15) {
            const newBudget = Math.round(dailyBudgetCents * 1.2);
            try {
              await axios.post(`${GRAPH}/${campaign.id}`, {
                daily_budget: newBudget,
                access_token: token,
              }, { timeout: 10000 });
              increased++;
              console.log(`[AutoPilot] Increased budget ${campaign.id} (${campaign.name}): ${dailyBudgetCents} → ${newBudget} cents (+20%)`);
            } catch (err: any) {
              console.error(`[AutoPilot] Failed to increase budget for campaign ${campaign.id}:`, err.message);
            }
          }
          // ── DECREASE BUDGET: CTR < 0.3% AND spend > $20 ──────────────────
          else if (ctr < 0.3 && spend > 20) {
            const newBudget = Math.round(dailyBudgetCents * 0.7);
            try {
              await axios.post(`${GRAPH}/${campaign.id}`, {
                daily_budget: newBudget,
                access_token: token,
              }, { timeout: 10000 });
              decreased++;
              console.log(`[AutoPilot] Decreased budget ${campaign.id} (${campaign.name}): ${dailyBudgetCents} → ${newBudget} cents (-30%)`);
            } catch (err: any) {
              console.error(`[AutoPilot] Failed to decrease budget for campaign ${campaign.id}:`, err.message);
            }
          }
        }
      } catch (err: any) {
        console.error(`[AutoPilot] Campaign ${campaign.id} error:`, err.message);
      }
    }
  } catch (err: any) {
    console.error(`[AutoPilot] processUserCampaigns user=${userId} error:`, err.message);
  }

  return { paused, increased, decreased };
}

async function runAutopilot() {
  console.log('[AutoPilot] Starting daily run...');

  try {
    const { data: connections } = await supabase
      .from('meta_connections')
      .select('user_id, access_token, ad_accounts')
      .not('access_token', 'is', null);

    for (const conn of (connections || [])) {
      try {
        let adAccountId = '';
        try {
          const accs = typeof conn.ad_accounts === 'string'
            ? JSON.parse(conn.ad_accounts)
            : conn.ad_accounts || [];
          adAccountId = accs[0]?.id || '';
        } catch {}

        if (!adAccountId) continue;

        const { paused, increased, decreased } = await processUserCampaigns(
          conn.user_id, conn.access_token, adAccountId
        );

        // Daily summary notification for this user
        await supabase.from('notifications').insert([{
          user_id: conn.user_id,
          type: 'autopilot_summary',
          title: 'AutoPilot Gunluk Ozet',
          message: `Durduruldu: ${paused}, Butce arttirildi: ${increased}, Butce azaltildi: ${decreased}`,
          created_at: new Date().toISOString(),
        }]);

        console.log(`[AutoPilot] User ${conn.user_id}: paused=${paused}, increased=${increased}, decreased=${decreased}`);

        await new Promise(r => setTimeout(r, 1000)); // Rate limit between users
      } catch (err: any) {
        console.error(`[AutoPilot] User ${conn.user_id} error:`, err.message);
      }
    }

    console.log('[AutoPilot] Daily run complete');
  } catch (err: any) {
    console.error('[AutoPilot] Main error:', err.message);
  }
}

function startAutopilot() {
  // Run once after a 3-minute startup delay
  setTimeout(runAutopilot, 3 * 60 * 1000);
  // Then daily at 06:00
  nodeCron.schedule('0 6 * * *', runAutopilot);
  console.log('[AutoPilot] Daily autopilot scheduled at 06:00');
}

module.exports = { runAutopilot, startAutopilot };
