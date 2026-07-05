export {};
/**
 * Central security helpers:
 *  - auditLog()       → admin & critical user action logging
 *  - securityEvent()  → suspicious activity recording
 *  - cleanBlocklist() → periodic cleanup of expired JWT entries
 */
const { createClient } = require('@supabase/supabase-js');

let _sb: any = null;
function getSb() {
  if (!_sb) _sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
  return _sb;
}

// ── Audit log ─────────────────────────────────────────────────────────────────
async function auditLog(opts: {
  adminEmail?: string;
  userId?: string;
  action: string;
  targetUserId?: string;
  details?: object;
  ip?: string;
  userAgent?: string;
}) {
  try {
    await getSb().from('admin_audit_logs').insert([{
      admin_email:    opts.adminEmail || null,
      user_id:        opts.userId || null,
      action:         opts.action,
      target_user_id: opts.targetUserId || null,
      details:        opts.details || {},
      ip_address:     opts.ip || null,
      user_agent:     opts.userAgent || null,
    }]);
  } catch { /* never block main flow */ }
}

// ── Security event ────────────────────────────────────────────────────────────
async function securityEvent(opts: {
  eventType: string;
  ip?: string;
  userId?: string;
  path?: string;
  details?: object;
  severity?: 'low' | 'medium' | 'high' | 'critical';
}) {
  try {
    await getSb().from('security_events').insert([{
      event_type: opts.eventType,
      ip_address: opts.ip || null,
      user_id:    opts.userId || null,
      path:       opts.path || null,
      details:    opts.details || {},
      severity:   opts.severity || 'medium',
    }]);
    if (opts.severity === 'critical' || opts.severity === 'high') {
      console.warn(`[Security:${opts.severity?.toUpperCase()}] ${opts.eventType} | IP:${opts.ip} | Path:${opts.path}`);
    }
  } catch { /* never block */ }
}

// ── Token blocklist cleanup (run periodically) ────────────────────────────────
async function cleanBlocklist() {
  try {
    await getSb().from('token_blocklist').delete().lt('expires_at', new Date().toISOString());
  } catch { /* ignore */ }
}

module.exports = { auditLog, securityEvent, cleanBlocklist };
