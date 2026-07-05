export {};
/**
 * Security middleware bundle:
 *  1. Anomaly detection — bot scanning, rapid endpoint enumeration
 *  2. Request fingerprinting — suspicious User-Agent patterns
 *  3. Honeypot traps — silent attacker logging
 */
const { securityEvent } = require('../lib/security');

// ── Anomaly detection state ───────────────────────────────────────────────────
// Track unique paths per IP per minute window
const ipActivity = new Map<string, { paths: Set<string>; firstAt: number; flagged: boolean }>();
const ANOMALY_WINDOW_MS    = 60 * 1000;   // 1 minute window
const ANOMALY_PATH_LIMIT   = 30;           // >30 distinct paths in 1 min → anomaly

// Known malicious/scanner User-Agent substrings
const BLOCKED_UA_PATTERNS  = [
  'sqlmap', 'nikto', 'nmap', 'masscan', 'zgrab', 'nuclei',
  'dirbuster', 'gobuster', 'wfuzz', 'hydra', 'metasploit',
  'burpsuite', 'havij', 'acunetix', 'nessus', 'openvas',
  'python-requests/2.', 'go-http-client', 'libwww-perl',
];

// ── Anomaly detection middleware ──────────────────────────────────────────────
const anomalyDetection = async (req: any, res: any, next: any) => {
  const ip = (req.headers['x-forwarded-for'] as string || req.ip || '').split(',')[0].trim();
  const ua = (req.headers['user-agent'] || '').toLowerCase();
  const path = req.path;

  // 1. Block known scanner user-agents
  const maliciousUA = BLOCKED_UA_PATTERNS.find(p => ua.includes(p));
  if (maliciousUA) {
    await securityEvent({
      eventType: 'scanner_ua_blocked',
      ip,
      path,
      details: { ua: req.headers['user-agent'], pattern: maliciousUA },
      severity: 'high',
    });
    return res.status(403).json({ error: 'Forbidden' });
  }

  // 2. Path enumeration detection
  const now  = Date.now();
  const act  = ipActivity.get(ip);
  if (!act || now - act.firstAt > ANOMALY_WINDOW_MS) {
    ipActivity.set(ip, { paths: new Set([path]), firstAt: now, flagged: false });
  } else {
    act.paths.add(path);
    if (!act.flagged && act.paths.size > ANOMALY_PATH_LIMIT) {
      act.flagged = true;
      await securityEvent({
        eventType: 'path_enumeration',
        ip,
        path,
        details: { unique_paths: act.paths.size, window_ms: ANOMALY_WINDOW_MS },
        severity: 'high',
      });
    }
  }

  next();
};

// ── Honeypot routes (register BEFORE any real routes) ────────────────────────
// These paths should never receive legitimate traffic — only scanners/attackers hit them
const HONEYPOT_PATHS = [
  '/admin',
  '/wp-admin',
  '/wp-login.php',
  '/.env',
  '/config.php',
  '/phpinfo.php',
  '/api/v1/admin',
  '/api/internal',
  '/api/debug',
  '/api/config',
  '/api/keys',
  '/api/secrets',
  '/api/env',
  '/api/admin-keys',
  '/actuator',
  '/actuator/env',
  '/.git/config',
  '/api/graphql',     // we don't use GraphQL
];

function registerHoneypots(app: any): void {
  for (const path of HONEYPOT_PATHS) {
    app.all(path, async (req: any, res: any) => {
      const ip = (req.headers['x-forwarded-for'] as string || req.ip || '').split(',')[0].trim();
      await securityEvent({
        eventType: 'honeypot_triggered',
        ip,
        path: req.path,
        details: {
          method: req.method,
          ua: req.headers['user-agent'],
          referer: req.headers.referer,
        },
        severity: 'critical',
      });
      // Respond slowly to waste attacker's time, return ambiguous 404
      setTimeout(() => res.status(404).json({ error: 'Not found' }), 800);
    });
  }
}

module.exports = { anomalyDetection, registerHoneypots };
