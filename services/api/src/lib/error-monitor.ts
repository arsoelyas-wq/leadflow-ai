export {};
/**
 * Lightweight error monitoring — Sentry SDK yoksa Supabase error_logs tablosuna yazar.
 * SENTRY_DSN set edilmişse @sentry/node kullanır (npm i @sentry/node gerekli).
 * Set edilmemişse Supabase'e yazar + console.error.
 */

const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

let sentryInit = false;
let Sentry: any = null;

export async function initMonitoring(app?: any) {
  if (process.env.SENTRY_DSN) {
    try {
      Sentry = require('@sentry/node');
      Sentry.init({
        dsn: process.env.SENTRY_DSN,
        environment: process.env.NODE_ENV || 'production',
        tracesSampleRate: 0.1,
      });
      if (app) Sentry.setupExpressErrorHandler(app);
      sentryInit = true;
      console.log('[Monitor] Sentry aktif');
    } catch {
      console.warn('[Monitor] @sentry/node paketi yok — Supabase loglama kullanılıyor. npm i @sentry/node ile ekleyin.');
    }
  } else {
    console.log('[Monitor] SENTRY_DSN ayarlanmamış — Supabase error_logs kullanılıyor');
  }

  // Global uncaught exception handler
  process.on('uncaughtException', (err) => {
    captureError(err, { type: 'uncaughtException' });
    console.error('[UNCAUGHT EXCEPTION]', err);
  });

  process.on('unhandledRejection', (reason) => {
    captureError(reason instanceof Error ? reason : new Error(String(reason)), { type: 'unhandledRejection' });
    console.error('[UNHANDLED REJECTION]', reason);
  });
}

export function captureError(err: Error | any, context?: Record<string, any>) {
  if (sentryInit && Sentry) {
    Sentry.captureException(err, { extra: context });
    return;
  }
  // Supabase fallback — fire and forget
  const message = err?.message || String(err);
  const stack = err?.stack?.slice(0, 2000) || '';
  supabase.from('error_logs').insert([{
    message,
    stack,
    context: context ? JSON.stringify(context) : null,
    created_at: new Date().toISOString(),
  }]).then().catch(() => {});
}

export function captureMessage(msg: string, level: 'info' | 'warning' | 'error' = 'info') {
  if (sentryInit && Sentry) {
    Sentry.captureMessage(msg, level);
    return;
  }
  console[level === 'error' ? 'error' : level === 'warning' ? 'warn' : 'log'](`[Monitor] ${msg}`);
}

module.exports = { initMonitoring, captureError, captureMessage };
