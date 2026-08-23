export {};
const { createClient } = require('@supabase/supabase-js');
const axios = require('axios');
const nodeCron = require('node-cron');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
const GRAPH = 'https://graph.facebook.com/v20.0';

async function syncSpendForUser(userId: string, token: string, adAccountId: string) {
  try {
    // 1. Get all campaigns for this ad account (paginated)
    let campaigns: any[] = [];
    let nextPage = true;
    let afterCursor = '';

    while (nextPage) {
      const params: any = {
        access_token: token,
        fields: 'id,name,status',
        limit: 50,
      };
      if (afterCursor) params.after = afterCursor;

      const resp = await axios.get(`${GRAPH}/${adAccountId}/campaigns`, { params, timeout: 15000 });
      campaigns = campaigns.concat(resp.data?.data || []);

      if (resp.data?.paging?.cursors?.after && resp.data?.paging?.next) {
        afterCursor = resp.data.paging.cursors.after;
      } else {
        nextPage = false;
      }
    }

    if (!campaigns.length) return;

    // 2. For each campaign, fetch 7-day insights
    const today = new Date().toISOString().split('T')[0];
    const sevenDaysAgo = new Date(Date.now() - 7 * 86400000).toISOString().split('T')[0];

    for (const campaign of campaigns) {
      try {
        const [insightsResp, todayResp] = await Promise.all([
          axios.get(`${GRAPH}/${campaign.id}/insights`, {
            params: {
              access_token: token,
              fields: 'spend,ctr,cpm,impressions,clicks,actions',
              time_range: JSON.stringify({ since: sevenDaysAgo, until: today }),
            },
            timeout: 10000,
          }),
          axios.get(`${GRAPH}/${campaign.id}/insights`, {
            params: {
              access_token: token,
              fields: 'spend',
              date_preset: 'today',
            },
            timeout: 10000,
          }),
        ]);

        const d = insightsResp.data?.data?.[0];
        const td = todayResp.data?.data?.[0];
        if (!d) continue;

        const spend7d = parseFloat(d.spend || '0');
        const spendToday = parseFloat(td?.spend || '0');
        const ctr = parseFloat(d.ctr || '0');
        const cpm = parseFloat(d.cpm || '0');
        const impressions7d = parseInt(d.impressions || '0');
        const clicks7d = parseInt(d.clicks || '0');

        // Count leads from CAPI events for this campaign over 7 days
        const { count: leads7d } = await supabase
          .from('leads')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', userId)
          .like('source', 'meta%')
          .gte('created_at', new Date(Date.now() - 7 * 86400000).toISOString());

        const cpl = spend7d > 0 && leads7d ? spend7d / leads7d : null;

        // Calculate ROAS from won leads in the same period
        // Try won_at first, fall back to updated_at if column doesn't exist
        const { data: wonLeads } = await supabase
          .from('leads')
          .select('deal_value')
          .eq('user_id', userId)
          .eq('status', 'won')
          .like('source', 'meta%')
          .gte('updated_at', new Date(Date.now() - 7 * 86400000).toISOString());

        const totalRevenue = (wonLeads || []).reduce((sum: number, l: any) => sum + (l.deal_value || 0), 0);
        const roas = spend7d > 0 ? totalRevenue / spend7d : null;

        // Update ad_campaigns (campaigns are created elsewhere; update only)
        await supabase.from('ad_campaigns')
          .update({
            spend_7d: spend7d,
            spend_today: spendToday,
            ctr,
            cpm,
            impressions_7d: impressions7d,
            clicks_7d: clicks7d,
            leads_7d: leads7d || 0,
            cpl,
            roas,
            status: campaign.status === 'ACTIVE' ? 'active' : campaign.status === 'PAUSED' ? 'paused' : campaign.status.toLowerCase(),
            last_synced_at: new Date().toISOString(),
          })
          .eq('user_id', userId)
          .eq('platform_campaign_id', campaign.id);

      } catch (err: any) {
        console.error(`[AdSpendSync] Campaign ${campaign.id} error:`, err.message);
      }
    }

    console.log(`[AdSpendSync] User ${userId}: ${campaigns.length} campaigns synced`);

  } catch (err: any) {
    console.error(`[AdSpendSync] User ${userId} error:`, err.message);
  }
}

export async function runAdSpendSync() {
  console.log('[AdSpendSync] Starting hourly sync...');
  try {
    const { data: connections } = await supabase
      .from('meta_connections')
      .select('user_id, access_token, ad_accounts')
      .not('access_token', 'is', null);

    for (const conn of connections || []) {
      try {
        const accs = JSON.parse(conn.ad_accounts || '[]');
        const adAccountId: string = accs[0]?.id || '';
        if (!adAccountId) continue;

        await syncSpendForUser(conn.user_id, conn.access_token, adAccountId);
        await new Promise(r => setTimeout(r, 1000)); // Rate limit between users
      } catch (err: any) { console.error('[AdSpendSync] User error:', err.message); }
    }
  } catch (err: any) {
    console.error('[AdSpendSync] Main error:', err.message);
  }
}

// ─── TOKEN EXPIRY PROACTIVE CHECK ─────────────────────────────────────────────

async function checkTokenExpiry() {
  console.log('[TokenExpiry] Checking Meta token expiry for all users...');
  try {
    const { data: connections } = await supabase
      .from('meta_connections')
      .select('user_id, meta_user_name, token_expires_at')
      .not('access_token', 'is', null);

    const now = Date.now();
    for (const conn of connections || []) {
      if (!conn.token_expires_at) continue;
      const expiresAt = new Date(conn.token_expires_at).getTime();
      const daysLeft = Math.max(0, Math.round((expiresAt - now) / (24 * 60 * 60 * 1000)));

      if (daysLeft <= 14) {
        const isExpired = daysLeft === 0;
        const title = isExpired
          ? 'Meta Bağlantısı Kesildi — Yeniden Bağlanın'
          : `Meta Token ${daysLeft} Gün İçinde Sona Eriyor`;
        const message = isExpired
          ? 'Meta reklam hesabı bağlantınız kesildi. CAPI ve kampanya senkronizasyonu durdu. Ayarlar > Meta Ads > Yeniden Bağlan.'
          : `Meta reklam hesabı token'ınız ${daysLeft} gün sonra sona erecek. Ayarlar > Meta Ads > Yeniden Bağlan.`;

        // Upsert notification (don't spam: one per expiry window)
        const notifKey = `meta_token_expiry_${conn.user_id}_${daysLeft <= 3 ? '3d' : '14d'}`;
        const { data: existing } = await supabase
          .from('notifications')
          .select('id')
          .eq('user_id', conn.user_id)
          .eq('type', 'meta_token_expiry')
          .gte('created_at', new Date(now - 24 * 60 * 60 * 1000).toISOString())
          .maybeSingle();

        if (!existing) {
          await supabase.from('notifications').insert([{
            user_id: conn.user_id,
            type: 'meta_token_expiry',
            title,
            message,
            severity: isExpired || daysLeft <= 3 ? 'error' : 'warning',
          }]);
          console.log(`[TokenExpiry] Notified user ${conn.user_id.slice(0, 8)}: ${daysLeft} days left`);
        }
      }
    }
  } catch (err: any) {
    console.error('[TokenExpiry] Error:', err.message);
  }
}

export function startAdSpendSync() {
  // Run after 2 min delay on startup (lets other services initialize)
  setTimeout(runAdSpendSync, 2 * 60 * 1000);
  // Then every hour at :00
  nodeCron.schedule('0 * * * *', runAdSpendSync);
  // Token expiry check: daily at 09:00
  nodeCron.schedule('0 9 * * *', checkTokenExpiry);
  console.log('[AdSpendSync] Hourly sync + daily token expiry check scheduled');
}
