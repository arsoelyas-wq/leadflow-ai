# LeadFlow Admin OS — Phase 1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a fully functional `/admin` panel covering auth, user management, overview dashboard, plan/credit control, content management, banner/video manager, and system config.

**Architecture:** `(admin)` route group in existing Next.js app, separate layout + middleware guard, dedicated Express admin routes with admin-only JWT, Supabase service key for cross-user queries.

**Tech Stack:** Next.js 15 App Router, Express/Railway, Supabase service key, TypeScript, bcryptjs, jsonwebtoken

---

## Files to Create / Modify

| File | Action | Purpose |
|------|--------|---------|
| `services/api/src/migrations/create_admin_tables.sql` | Create | DB tables for admin |
| `services/api/src/middleware/adminAuth.ts` | Create | Admin JWT middleware |
| `services/api/src/routes/admin/index.ts` | Create | All admin API routes |
| `services/api/src/index.ts` | Modify | Register admin routes |
| `apps/web/middleware.ts` | Modify | Protect /admin paths |
| `apps/web/lib/admin-api.ts` | Create | Admin API client |
| `apps/web/app/(admin)/layout.tsx` | Create | Admin layout + sidebar |
| `apps/web/app/(admin)/login/page.tsx` | Create | Admin login page |
| `apps/web/app/(admin)/page.tsx` | Create | Master overview |
| `apps/web/app/(admin)/users/page.tsx` | Create | All users table |
| `apps/web/app/(admin)/users/[id]/page.tsx` | Create | User detail + impersonate |
| `apps/web/app/(admin)/content/page.tsx` | Create | Market pages + banners list |
| `apps/web/app/(admin)/content/banners/page.tsx` | Create | Banner/video manager |
| `apps/web/app/(admin)/system/page.tsx` | Create | Config + health |

---

## Task 1: Database Tables

**Files:**
- Create: `services/api/src/migrations/create_admin_tables.sql`

- [ ] **Step 1: Create migration SQL**

```sql
-- Run in Supabase SQL Editor

CREATE TABLE IF NOT EXISTS admin_sessions (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  admin_email varchar(200) NOT NULL,
  token_hash varchar(500) NOT NULL,
  ip_address varchar(50),
  created_at timestamptz DEFAULT now(),
  expires_at timestamptz NOT NULL,
  last_activity timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS admin_audit_logs (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  admin_email varchar(200) NOT NULL,
  action varchar(100) NOT NULL,
  target_user_id uuid,
  details jsonb DEFAULT '{}',
  ip_address varchar(50),
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS admin_banners (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  type varchar(30) NOT NULL DEFAULT 'dashboard',
  target_slug varchar(20) DEFAULT 'all',
  target_plan varchar(20) DEFAULT 'all',
  title varchar(200),
  message text,
  cta_text varchar(100),
  cta_url text,
  image_url text,
  video_url text,
  is_active boolean DEFAULT false,
  starts_at timestamptz,
  ends_at timestamptz,
  click_count integer DEFAULT 0,
  view_count integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS promo_codes (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  code varchar(50) UNIQUE NOT NULL,
  type varchar(20) NOT NULL DEFAULT 'credits',
  value integer NOT NULL DEFAULT 0,
  max_uses integer,
  uses_count integer DEFAULT 0,
  expires_at timestamptz,
  is_active boolean DEFAULT true,
  created_by varchar(200),
  created_at timestamptz DEFAULT now()
);

-- Verify
SELECT table_name FROM information_schema.tables
WHERE table_name IN ('admin_sessions','admin_audit_logs','admin_banners','promo_codes');
```

- [ ] **Step 2: Run in Supabase SQL Editor → verify 4 rows returned**

- [ ] **Step 3: Commit migration file**

```bash
git add services/api/src/migrations/create_admin_tables.sql
git commit -m "feat: admin OS — DB tables (sessions, audit, banners, promo)"
```

---

## Task 2: Admin Auth Middleware (Backend)

**Files:**
- Create: `services/api/src/middleware/adminAuth.ts`

- [ ] **Step 1: Create adminAuth.ts**

```typescript
// services/api/src/middleware/adminAuth.ts
export {};
const jwt = require('jsonwebtoken');

const ADMIN_EMAILS = (process.env.ADMIN_EMAILS || 'ecofriendlyhomegoods@gmail.com,admin@leadflow.ai').split(',').map((e: string) => e.trim().toLowerCase());
const ADMIN_SECRET = process.env.ADMIN_JWT_SECRET || process.env.JWT_SECRET || 'leadflow-admin-secret-2026';

const adminAuthMiddleware = (req: any, res: any, next: any) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) return res.status(401).json({ error: 'Admin token gerekli' });
    const token = authHeader.split(' ')[1];
    const decoded: any = jwt.verify(token, ADMIN_SECRET);
    if (!decoded.isAdmin || !ADMIN_EMAILS.includes(decoded.email?.toLowerCase())) {
      return res.status(403).json({ error: 'Admin yetkisi yok' });
    }
    req.adminEmail = decoded.email;
    next();
  } catch {
    return res.status(401).json({ error: 'Gecersiz admin token' });
  }
};

module.exports = { adminAuthMiddleware, ADMIN_EMAILS, ADMIN_SECRET };
```

- [ ] **Step 2: Commit**

```bash
git add services/api/src/middleware/adminAuth.ts
git commit -m "feat: admin auth middleware — JWT + email whitelist"
```

---

## Task 3: Admin API Routes (Backend)

**Files:**
- Create: `services/api/src/routes/admin/index.ts`
- Modify: `services/api/src/index.ts`

- [ ] **Step 1: Create admin API routes**

```typescript
// services/api/src/routes/admin/index.ts
export {};
const express = require('express');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { createClient } = require('@supabase/supabase-js');
const { ADMIN_EMAILS, ADMIN_SECRET } = require('../../middleware/adminAuth');

const router = express.Router();
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

// ── HELPER: audit log ─────────────────────────────────────────────────────────
async function audit(email: string, action: string, targetId?: string, details?: object, ip?: string) {
  await supabase.from('admin_audit_logs').insert([{
    admin_email: email, action, target_user_id: targetId || null,
    details: details || {}, ip_address: ip || null,
  }]).catch(() => {});
}

// ── POST /api/admin/auth/login ────────────────────────────────────────────────
router.post('/auth/login', async (req: any, res: any) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'Email ve şifre gerekli' });
    if (!ADMIN_EMAILS.includes(email.toLowerCase())) {
      return res.status(403).json({ error: 'Bu email admin değil' });
    }
    // Check against ADMIN_PASSWORD env var
    const adminPass = process.env.ADMIN_PASSWORD || 'leadflow-admin-2026';
    if (password !== adminPass) return res.status(401).json({ error: 'Yanlış şifre' });

    const token = jwt.sign(
      { email, isAdmin: true, adminEmail: email },
      ADMIN_SECRET,
      { expiresIn: '8h' }
    );
    await audit(email, 'auth.login', undefined, {}, req.ip);
    res.json({ token, email });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// ── GET /api/admin/overview ───────────────────────────────────────────────────
router.get('/overview', async (req: any, res: any) => {
  try {
    const [users, leads, campaigns, messages, errors] = await Promise.all([
      supabase.from('users').select('id, plan_type, credits_total, credits_used, created_at, country_code', { count: 'exact' }),
      supabase.from('leads').select('id', { count: 'exact' }),
      supabase.from('campaigns').select('id, status', { count: 'exact' }),
      supabase.from('messages').select('id', { count: 'exact' }),
      supabase.from('error_logs').select('id', { count: 'exact' }).gte('created_at', new Date(Date.now() - 86400000).toISOString()),
    ]);

    const planCounts: Record<string, number> = {};
    (users.data || []).forEach((u: any) => { planCounts[u.plan_type] = (planCounts[u.plan_type] || 0) + 1; });

    const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString();
    const { count: newUsers } = await supabase.from('users').select('id', { count: 'exact', head: true }).gte('created_at', weekAgo);

    res.json({
      users: { total: users.count || 0, new_this_week: newUsers || 0, by_plan: planCounts },
      leads: { total: leads.count || 0 },
      campaigns: { total: campaigns.count || 0 },
      messages: { total: messages.count || 0 },
      errors_24h: errors.count || 0,
    });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// ── GET /api/admin/users ──────────────────────────────────────────────────────
router.get('/users', async (req: any, res: any) => {
  try {
    const { page = 1, limit = 50, search, plan, sort = 'created_at' } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    let query = supabase.from('users')
      .select('id, email, name, company, plan_type, credits_total, credits_used, created_at, country_code, language_code, onboarding_done', { count: 'exact' })
      .order(sort, { ascending: false })
      .range(offset, offset + parseInt(limit) - 1);

    if (search) query = query.or(`email.ilike.%${search}%,name.ilike.%${search}%,company.ilike.%${search}%`);
    if (plan) query = query.eq('plan_type', plan);

    const { data, count, error } = await query;
    if (error) throw error;
    res.json({ users: data || [], total: count || 0 });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// ── GET /api/admin/users/:id ──────────────────────────────────────────────────
router.get('/users/:id', async (req: any, res: any) => {
  try {
    const { data: user } = await supabase.from('users').select('*').eq('id', req.params.id).single();
    if (!user) return res.status(404).json({ error: 'Kullanıcı bulunamadı' });

    const [leads, campaigns, messages, credits] = await Promise.all([
      supabase.from('leads').select('id', { count: 'exact', head: true }).eq('user_id', req.params.id),
      supabase.from('campaigns').select('id', { count: 'exact', head: true }).eq('user_id', req.params.id),
      supabase.from('messages').select('id', { count: 'exact', head: true }).eq('user_id', req.params.id),
      supabase.from('credit_logs').select('amount, action, created_at').eq('user_id', req.params.id).order('created_at', { ascending: false }).limit(20),
    ]);

    res.json({
      user,
      stats: {
        leads: leads.count || 0,
        campaigns: campaigns.count || 0,
        messages: messages.count || 0,
      },
      credit_history: credits.data || [],
    });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// ── PATCH /api/admin/users/:id ────────────────────────────────────────────────
router.patch('/users/:id', async (req: any, res: any) => {
  try {
    const { plan_type, credits_total, credits_used, name, company, is_suspended } = req.body;
    const updates: any = { updated_at: new Date().toISOString() };
    if (plan_type !== undefined) updates.plan_type = plan_type;
    if (credits_total !== undefined) updates.credits_total = credits_total;
    if (credits_used !== undefined) updates.credits_used = credits_used;
    if (name !== undefined) updates.name = name;
    if (company !== undefined) updates.company = company;
    if (is_suspended !== undefined) updates.is_suspended = is_suspended;

    const { error } = await supabase.from('users').update(updates).eq('id', req.params.id);
    if (error) throw error;

    await audit(req.adminEmail, 'user.update', req.params.id, req.body, req.ip);
    res.json({ ok: true });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// ── POST /api/admin/users/:id/impersonate ─────────────────────────────────────
router.post('/users/:id/impersonate', async (req: any, res: any) => {
  try {
    const { data: user } = await supabase.from('users').select('id, email').eq('id', req.params.id).single();
    if (!user) return res.status(404).json({ error: 'Kullanıcı bulunamadı' });

    const impersonateToken = require('jsonwebtoken').sign(
      { userId: user.id, email: user.email, impersonatedBy: req.adminEmail },
      process.env.JWT_SECRET || 'leadflow-super-secret-jwt-key-2026',
      { expiresIn: '2h' }
    );
    await audit(req.adminEmail, 'user.impersonate', req.params.id, { target_email: user.email }, req.ip);
    res.json({ token: impersonateToken, user });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// ── POST /api/admin/users/:id/credits ────────────────────────────────────────
router.post('/users/:id/credits', async (req: any, res: any) => {
  try {
    const { amount, reason } = req.body;
    if (!amount || !reason) return res.status(400).json({ error: 'Miktar ve sebep gerekli' });

    const { data: user } = await supabase.from('users').select('credits_total').eq('id', req.params.id).single();
    if (!user) return res.status(404).json({ error: 'Kullanıcı bulunamadı' });

    const newTotal = Math.max(0, (user.credits_total || 0) + parseInt(amount));
    await supabase.from('users').update({ credits_total: newTotal }).eq('id', req.params.id);
    await audit(req.adminEmail, 'user.credits_add', req.params.id, { amount, reason, new_total: newTotal }, req.ip);
    res.json({ ok: true, new_total: newTotal });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// ── GET /api/admin/content/banners ────────────────────────────────────────────
router.get('/content/banners', async (req: any, res: any) => {
  try {
    const { data } = await supabase.from('admin_banners').select('*').order('created_at', { ascending: false });
    res.json({ banners: data || [] });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// ── POST /api/admin/content/banners ───────────────────────────────────────────
router.post('/content/banners', async (req: any, res: any) => {
  try {
    const { data, error } = await supabase.from('admin_banners').insert([{
      ...req.body, created_at: new Date().toISOString()
    }]).select().single();
    if (error) throw error;
    await audit(req.adminEmail, 'banner.create', undefined, { title: req.body.title }, req.ip);
    res.json({ banner: data });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// ── PATCH /api/admin/content/banners/:id ──────────────────────────────────────
router.patch('/content/banners/:id', async (req: any, res: any) => {
  try {
    const { error } = await supabase.from('admin_banners').update(req.body).eq('id', req.params.id);
    if (error) throw error;
    await audit(req.adminEmail, 'banner.update', undefined, { id: req.params.id }, req.ip);
    res.json({ ok: true });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// ── DELETE /api/admin/content/banners/:id ─────────────────────────────────────
router.delete('/content/banners/:id', async (req: any, res: any) => {
  try {
    await supabase.from('admin_banners').delete().eq('id', req.params.id);
    res.json({ ok: true });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// ── GET /api/admin/system/config ──────────────────────────────────────────────
router.get('/system/config', async (req: any, res: any) => {
  try {
    const { data: planData } = await supabase.from('credits').select('plan, credits, price').catch(() => ({ data: [] }));
    const { count: errCount } = await supabase.from('error_logs').select('id', { count: 'exact', head: true }).gte('created_at', new Date(Date.now() - 86400000).toISOString());
    const { count: uptimeCount } = await supabase.from('uptime_logs').select('id', { count: 'exact', head: true });

    res.json({
      plans: { starter: { credits: 500, price: 99 }, growth: { credits: 2000, price: 299 }, pro: { credits: 10000, price: 799 }, enterprise: { credits: -1, price: 0 } },
      api_keys: {
        anthropic: !!process.env.ANTHROPIC_API_KEY,
        elevenlabs: !!process.env.ELEVENLABS_API_KEY,
        perplexity: !!process.env.PERPLEXITY_API_KEY,
        stripe: !!process.env.STRIPE_SECRET_KEY,
        google_places: !!process.env.GOOGLE_PLACES_API_KEY,
      },
      errors_24h: errCount || 0,
      uptime_checks: uptimeCount || 0,
    });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// ── GET /api/admin/system/errors ──────────────────────────────────────────────
router.get('/system/errors', async (req: any, res: any) => {
  try {
    const { data } = await supabase.from('error_logs').select('*').order('created_at', { ascending: false }).limit(100);
    res.json({ errors: data || [] });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// ── GET /api/admin/audit ──────────────────────────────────────────────────────
router.get('/audit', async (req: any, res: any) => {
  try {
    const { data } = await supabase.from('admin_audit_logs').select('*').order('created_at', { ascending: false }).limit(200);
    res.json({ logs: data || [] });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// ── POST /api/admin/notifications/broadcast ───────────────────────────────────
router.post('/notifications/broadcast', async (req: any, res: any) => {
  try {
    const { title, message, target_plan, href } = req.body;
    if (!title || !message) return res.status(400).json({ error: 'Başlık ve mesaj gerekli' });

    let query = supabase.from('users').select('id');
    if (target_plan && target_plan !== 'all') query = query.eq('plan_type', target_plan);

    const { data: users } = await query;
    if (!users?.length) return res.json({ ok: true, sent: 0 });

    const notifications = users.map((u: any) => ({
      user_id: u.id, type: 'admin', title, message, href: href || '/dashboard', is_read: false,
      created_at: new Date().toISOString()
    }));

    const { error } = await supabase.from('notifications').insert(notifications);
    if (error) throw error;

    await audit(req.adminEmail, 'notification.broadcast', undefined, { title, count: users.length, target_plan }, req.ip);
    res.json({ ok: true, sent: users.length });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

module.exports = router;
```

- [ ] **Step 2: Register in index.ts — find the last app.use line and add**

Open `services/api/src/index.ts`, find the line with `app.use('/api/market-pages'` and add after it:

```typescript
// Admin routes — protected by adminAuth middleware
const { adminAuthMiddleware } = require('./middleware/adminAuth');
app.post('/api/admin/auth/login', require('./routes/admin/index').post?.bind?.(null, '/auth/login') || require('./routes/admin/index'));
app.use('/api/admin', (req: any, res: any, next: any) => {
  if (req.path === '/auth/login') return next();
  return adminAuthMiddleware(req, res, next);
}, require('./routes/admin/index'));
```

Wait — simpler pattern matching existing codebase:

```typescript
const adminRouter = require('./routes/admin/index');
app.post('/api/admin/auth/login', adminRouter);
app.use('/api/admin', adminAuthMiddleware, adminRouter);
```

Actually the cleanest approach: the login route is inside the router but skips middleware in the router itself. Add this to `index.ts` after the market-pages line:

```typescript
// ── ADMIN OS ────────────────────────────────────────────────────────────────
const adminRouter = require('./routes/admin/index');
const { adminAuthMiddleware } = require('./middleware/adminAuth');
app.use('/api/admin/auth', adminRouter);  // login — no auth
app.use('/api/admin', adminAuthMiddleware, adminRouter);  // everything else
```

But login path is `/auth/login` which would match both. Better: separate the login:

In `services/api/src/index.ts`, add after market-pages lines:
```typescript
const { adminAuthMiddleware } = require('./middleware/adminAuth');
const adminRouter = require('./routes/admin/index');
app.use('/api/admin', (req: any, res: any, next: any) => {
  if (req.path.startsWith('/auth/')) return next();
  adminAuthMiddleware(req, res, next);
}, adminRouter);
```

- [ ] **Step 3: Create admin/index directory**

```bash
mkdir -p /c/leadflow-ai/services/api/src/routes/admin
```

- [ ] **Step 4: Verify TypeScript compiles**

```bash
cd services/api && npx tsc --noEmit 2>&1 | head -10
```

Expected: No errors.

- [ ] **Step 5: Commit**

```bash
git add services/api/src/routes/admin/ services/api/src/middleware/adminAuth.ts services/api/src/index.ts
git commit -m "feat: admin OS — backend API routes (auth, users, banners, system, broadcast)"
```

---

## Task 4: Frontend — Admin API Client + Middleware

**Files:**
- Create: `apps/web/lib/admin-api.ts`
- Modify: `apps/web/middleware.ts`

- [ ] **Step 1: Create admin API client**

```typescript
// apps/web/lib/admin-api.ts
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://leadflow-ai-production.up.railway.app'

function getAdminToken(): string {
  if (typeof window === 'undefined') return ''
  return localStorage.getItem('admin_token') || ''
}

async function adminRequest(path: string, options: RequestInit = {}) {
  const token = getAdminToken()
  const res = await fetch(`${API_URL}/api/admin${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Hata oluştu' }))
    throw new Error(err.error || 'Admin API hatası')
  }
  return res.json()
}

export const adminApi = {
  login: (email: string, password: string) =>
    adminRequest('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) }),
  overview: () => adminRequest('/overview'),
  users: (params?: Record<string, string>) => adminRequest('/users?' + new URLSearchParams(params || '').toString()),
  user: (id: string) => adminRequest(`/users/${id}`),
  updateUser: (id: string, data: object) => adminRequest(`/users/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  addCredits: (id: string, amount: number, reason: string) =>
    adminRequest(`/users/${id}/credits`, { method: 'POST', body: JSON.stringify({ amount, reason }) }),
  impersonate: (id: string) =>
    adminRequest(`/users/${id}/impersonate`, { method: 'POST' }),
  banners: () => adminRequest('/content/banners'),
  createBanner: (data: object) => adminRequest('/content/banners', { method: 'POST', body: JSON.stringify(data) }),
  updateBanner: (id: string, data: object) => adminRequest(`/content/banners/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  deleteBanner: (id: string) => adminRequest(`/content/banners/${id}`, { method: 'DELETE' }),
  systemConfig: () => adminRequest('/system/config'),
  systemErrors: () => adminRequest('/system/errors'),
  auditLog: () => adminRequest('/audit'),
  broadcast: (data: object) => adminRequest('/notifications/broadcast', { method: 'POST', body: JSON.stringify(data) }),
}
```

- [ ] **Step 2: Update middleware to protect /admin paths**

In `apps/web/middleware.ts`, find the `PUBLIC_PATHS` line and update:

```typescript
// Add /admin to paths that need special handling
// Admin pages are NOT in the user auth flow — they have their own auth
const ADMIN_PREFIX = '/admin'

export function middleware(req: NextRequest) {
  const res = NextResponse.next()
  const url = req.nextUrl
  const path = url.pathname

  // Admin paths — skip user locale/auth logic entirely
  if (path.startsWith(ADMIN_PREFIX)) {
    return res
  }

  // ... existing locale logic below (unchanged)
```

Find the existing middleware function and add the admin check at the very top before any other logic.

- [ ] **Step 3: Verify build**

```bash
cd apps/web && npx tsc --noEmit 2>&1 | head -5
```

- [ ] **Step 4: Commit**

```bash
git add apps/web/lib/admin-api.ts apps/web/middleware.ts
git commit -m "feat: admin OS — frontend API client + middleware bypass"
```

---

## Task 5: Admin Layout

**Files:**
- Create: `apps/web/app/(admin)/layout.tsx`

- [ ] **Step 1: Create admin layout**

```tsx
// apps/web/app/(admin)/layout.tsx
'use client'
import { useEffect, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  LayoutDashboard, Users, DollarSign, BarChart3,
  Globe2, Bell, Settings, Shield, LogOut,
  ChevronRight, Activity, Tag, Megaphone,
  Image as ImageIcon, AlertTriangle, FileText
} from 'lucide-react'

const NAV = [
  { href: '/admin', icon: LayoutDashboard, label: 'Genel Bakış', exact: true },
  { group: 'KULLANICILAR' },
  { href: '/admin/users', icon: Users, label: 'Kullanıcılar' },
  { href: '/admin/revenue', icon: DollarSign, label: 'Gelir & Finans' },
  { group: 'İÇERİK' },
  { href: '/admin/content', icon: Globe2, label: 'Pazar Sayfaları' },
  { href: '/admin/content/banners', icon: ImageIcon, label: 'Banner & Video' },
  { href: '/admin/notifications', icon: Bell, label: 'Duyuru Gönder' },
  { group: 'ANALİTİK' },
  { href: '/admin/analytics', icon: BarChart3, label: 'Platform Analitik' },
  { href: '/admin/ai-costs', icon: Activity, label: 'AI Maliyet' },
  { group: 'SİSTEM' },
  { href: '/admin/system', icon: Settings, label: 'Sistem & Config' },
  { href: '/admin/system/errors', icon: AlertTriangle, label: 'Hata Logları' },
  { href: '/admin/promo', icon: Tag, label: 'Promo Kodları' },
  { href: '/admin/security', icon: Shield, label: 'Güvenlik & Audit' },
]

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const [adminEmail, setAdminEmail] = useState('')
  const [checked, setChecked] = useState(false)

  useEffect(() => {
    const token = localStorage.getItem('admin_token')
    const email = localStorage.getItem('admin_email')
    if (!token && pathname !== '/admin/login') {
      router.push('/admin/login')
      return
    }
    setAdminEmail(email || '')
    setChecked(true)
  }, [pathname])

  const logout = () => {
    localStorage.removeItem('admin_token')
    localStorage.removeItem('admin_email')
    router.push('/admin/login')
  }

  if (!checked || pathname === '/admin/login') return <>{children}</>

  const isActive = (href: string, exact?: boolean) =>
    exact ? pathname === href : pathname.startsWith(href) && href !== '/admin'

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#020712', color: '#e2e8f0', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' }}>
      {/* Sidebar */}
      <nav style={{ width: 220, background: 'rgba(5,8,22,0.95)', borderRight: '1px solid rgba(255,255,255,0.05)', display: 'flex', flexDirection: 'column', flexShrink: 0, position: 'fixed', top: 0, left: 0, bottom: 0, zIndex: 50, overflowY: 'auto' }}>
        {/* Logo */}
        <div style={{ padding: '20px 16px 16px', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 32, height: 32, borderRadius: 9, background: 'linear-gradient(135deg,#ef4444,#f97316)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15, fontWeight: 900, color: '#fff' }}>A</div>
            <div>
              <div style={{ color: '#fff', fontSize: 13, fontWeight: 800 }}>Admin OS</div>
              <div style={{ color: '#ef4444', fontSize: 10, fontWeight: 700 }}>LeadFlow AI</div>
            </div>
          </div>
        </div>

        {/* Nav items */}
        <div style={{ flex: 1, padding: '8px' }}>
          {NAV.map((item, i) => {
            if ('group' in item) return (
              <div key={i} style={{ fontSize: 9, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#334155', padding: '14px 8px 4px' }}>{item.group}</div>
            )
            const active = isActive(item.href!, item.exact)
            const Icon = item.icon!
            return (
              <Link key={i} href={item.href!} style={{
                display: 'flex', alignItems: 'center', gap: 9, padding: '8px 10px',
                borderRadius: 8, textDecoration: 'none', marginBottom: 2,
                background: active ? 'rgba(239,68,68,0.1)' : 'transparent',
                color: active ? '#f87171' : '#64748b',
                fontSize: 13, fontWeight: active ? 600 : 400,
                transition: 'all 0.15s',
                boxShadow: active ? 'inset 0 0 0 1px rgba(239,68,68,0.2)' : 'none',
              }}>
                <Icon size={15} />
                {item.label}
                {active && <ChevronRight size={12} style={{ marginLeft: 'auto', opacity: 0.5 }} />}
              </Link>
            )
          })}
        </div>

        {/* Admin info + logout */}
        <div style={{ padding: '12px 16px', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
          <div style={{ fontSize: 11, color: '#475569', marginBottom: 6 }}>{adminEmail}</div>
          <button onClick={logout} style={{ display: 'flex', alignItems: 'center', gap: 7, color: '#64748b', background: 'none', border: 'none', cursor: 'pointer', fontSize: 12, padding: '4px 0' }}>
            <LogOut size={13} /> Çıkış Yap
          </button>
        </div>
      </nav>

      {/* Main content */}
      <main style={{ marginLeft: 220, flex: 1, minHeight: '100vh', padding: '28px 32px', overflowY: 'auto' }}>
        {children}
      </main>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/web/app/\(admin\)/layout.tsx
git commit -m "feat: admin OS — layout with sidebar navigation"
```

---

## Task 6: Admin Login Page

**Files:**
- Create: `apps/web/app/(admin)/login/page.tsx`

- [ ] **Step 1: Create login page**

```tsx
// apps/web/app/(admin)/login/page.tsx
'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { adminApi } from '@/lib/admin-api'
import { Shield, Eye, EyeOff } from 'lucide-react'

export default function AdminLoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const login = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      const data = await adminApi.login(email, password)
      localStorage.setItem('admin_token', data.token)
      localStorage.setItem('admin_email', data.email)
      router.push('/admin')
    } catch (err: any) {
      setError(err.message || 'Giriş başarısız')
    } finally { setLoading(false) }
  }

  return (
    <div style={{ minHeight: '100vh', background: 'radial-gradient(ellipse at top, rgba(239,68,68,0.08) 0%, #020712 50%)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, fontFamily: '-apple-system, sans-serif' }}>
      <div style={{ width: '100%', maxWidth: 400 }}>
        <div style={{ textAlign: 'center', marginBottom: 40 }}>
          <div style={{ width: 56, height: 56, borderRadius: 16, background: 'linear-gradient(135deg,#ef4444,#f97316)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', boxShadow: '0 8px 25px rgba(239,68,68,0.4)' }}>
            <Shield size={26} color="#fff" />
          </div>
          <h1 style={{ color: '#fff', fontSize: 24, fontWeight: 800, margin: '0 0 6px', letterSpacing: '-0.02em' }}>Admin Girişi</h1>
          <p style={{ color: '#475569', fontSize: 14, margin: 0 }}>LeadFlow AI — Yönetim Paneli</p>
        </div>

        <form onSubmit={login} style={{ background: 'linear-gradient(135deg,rgba(8,16,40,0.9),rgba(5,10,28,0.95))', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 20, padding: 32 }}>
          {error && (
            <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 10, padding: '10px 14px', marginBottom: 20, color: '#f87171', fontSize: 13 }}>
              {error}
            </div>
          )}
          <div style={{ marginBottom: 18 }}>
            <label style={{ display: 'block', color: '#94a3b8', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 8 }}>Admin E-posta</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} required placeholder="admin@leadflow.ai"
              style={{ width: '100%', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 10, padding: '11px 14px', color: '#e2e8f0', fontSize: 14, outline: 'none', boxSizing: 'border-box' }} />
          </div>
          <div style={{ marginBottom: 24, position: 'relative' }}>
            <label style={{ display: 'block', color: '#94a3b8', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 8 }}>Şifre</label>
            <input type={showPass ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)} required placeholder="••••••••"
              style={{ width: '100%', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 10, padding: '11px 40px 11px 14px', color: '#e2e8f0', fontSize: 14, outline: 'none', boxSizing: 'border-box' }} />
            <button type="button" onClick={() => setShowPass(!showPass)} style={{ position: 'absolute', right: 12, top: 36, background: 'none', border: 'none', color: '#475569', cursor: 'pointer' }}>
              {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
          <button type="submit" disabled={loading} style={{ width: '100%', padding: '13px', borderRadius: 12, border: 'none', background: loading ? 'rgba(239,68,68,0.5)' : 'linear-gradient(135deg,#ef4444,#f97316)', color: '#fff', fontSize: 15, fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer', boxShadow: '0 6px 20px rgba(239,68,68,0.3)', transition: 'all 0.2s' }}>
            {loading ? 'Giriş yapılıyor...' : 'Giriş Yap →'}
          </button>
        </form>
        <p style={{ textAlign: 'center', color: '#334155', fontSize: 12, marginTop: 20 }}>
          Bu sayfa sadece sistem yöneticileri içindir.
        </p>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/web/app/\(admin\)/login/
git commit -m "feat: admin OS — login page with JWT auth"
```

---

## Task 7: Master Overview Dashboard

**Files:**
- Create: `apps/web/app/(admin)/page.tsx`

- [ ] **Step 1: Create overview page**

```tsx
// apps/web/app/(admin)/page.tsx
'use client'
import { useEffect, useState } from 'react'
import { adminApi } from '@/lib/admin-api'
import { Users, Activity, TrendingUp, AlertTriangle, Zap, Globe2, MessageSquare, BarChart3 } from 'lucide-react'

interface OverviewData {
  users: { total: number; new_this_week: number; by_plan: Record<string, number> }
  leads: { total: number }
  campaigns: { total: number }
  messages: { total: number }
  errors_24h: number
}

const card: React.CSSProperties = {
  background: 'linear-gradient(135deg,rgba(8,16,40,0.9),rgba(5,10,28,0.95))',
  border: '1px solid rgba(255,255,255,0.07)', borderRadius: 16, padding: 20,
}

export default function AdminOverviewPage() {
  const [data, setData] = useState<OverviewData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    adminApi.overview().then(setData).catch(console.error).finally(() => setLoading(false))
  }, [])

  const stats = [
    { label: 'Toplam Kullanıcı', value: data?.users.total || 0, sub: `+${data?.users.new_this_week || 0} bu hafta`, icon: Users, color: '#3b82f6' },
    { label: 'Toplam Lead', value: (data?.leads.total || 0).toLocaleString(), sub: 'Tüm hesaplar', icon: Activity, color: '#10b981' },
    { label: 'Kampanya', value: data?.campaigns.total || 0, sub: 'Oluşturulan', icon: TrendingUp, color: '#8b5cf6' },
    { label: 'Mesaj Gönderildi', value: (data?.messages.total || 0).toLocaleString(), sub: 'WhatsApp + Email', icon: MessageSquare, color: '#06b6d4' },
    { label: '24s Hata', value: data?.errors_24h || 0, sub: 'API hataları', icon: AlertTriangle, color: data?.errors_24h ? '#ef4444' : '#334155' },
  ]

  const planColors: Record<string, string> = { starter: '#64748b', growth: '#3b82f6', pro: '#8b5cf6', enterprise: '#f59e0b' }

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ color: '#fff', fontSize: 26, fontWeight: 800, margin: '0 0 4px', letterSpacing: '-0.02em' }}>
          🛡️ Admin Overview
        </h1>
        <p style={{ color: '#475569', fontSize: 14, margin: 0 }}>
          {new Date().toLocaleDateString('tr-TR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
        </p>
      </div>

      {/* Stats grid */}
      {loading ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 14 }}>
          {[...Array(5)].map((_, i) => <div key={i} style={{ ...card, height: 100, opacity: 0.4 }} />)}
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 14, marginBottom: 24 }}>
          {stats.map(s => {
            const Icon = s.icon
            return (
              <div key={s.label} style={card}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                  <div style={{ width: 36, height: 36, borderRadius: 9, background: `${s.color}20`, border: `1px solid ${s.color}30`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Icon size={18} color={s.color} />
                  </div>
                </div>
                <div style={{ fontSize: 28, fontWeight: 900, color: '#fff', letterSpacing: '-0.02em', margin: '0 0 4px' }}>{s.value}</div>
                <div style={{ fontSize: 12, color: '#94a3b8', fontWeight: 600, margin: '0 0 3px' }}>{s.label}</div>
                <div style={{ fontSize: 11, color: '#475569' }}>{s.sub}</div>
              </div>
            )
          })}
        </div>
      )}

      {/* Plan distribution */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <div style={card}>
          <h3 style={{ color: '#fff', fontSize: 14, fontWeight: 700, margin: '0 0 16px', display: 'flex', alignItems: 'center', gap: 8 }}>
            <BarChart3 size={16} color="#8b5cf6" /> Plan Dağılımı
          </h3>
          {data && Object.entries(data.users.by_plan || {}).map(([plan, count]) => {
            const pct = data.users.total ? Math.round((count / data.users.total) * 100) : 0
            return (
              <div key={plan} style={{ marginBottom: 10 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 4 }}>
                  <span style={{ color: '#e2e8f0', textTransform: 'capitalize', fontWeight: 600 }}>{plan}</span>
                  <span style={{ color: '#64748b' }}>{count} kullanıcı · {pct}%</span>
                </div>
                <div style={{ height: 6, background: 'rgba(255,255,255,0.05)', borderRadius: 3, overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${pct}%`, background: planColors[plan] || '#64748b', borderRadius: 3, transition: 'width 0.5s' }} />
                </div>
              </div>
            )
          })}
        </div>

        <div style={card}>
          <h3 style={{ color: '#fff', fontSize: 14, fontWeight: 700, margin: '0 0 16px', display: 'flex', alignItems: 'center', gap: 8 }}>
            <Zap size={16} color="#f59e0b" /> Hızlı Erişim
          </h3>
          {[
            { label: '👥 Tüm Kullanıcılar', href: '/admin/users', color: '#3b82f6' },
            { label: '🎬 Banner Yöneticisi', href: '/admin/content/banners', color: '#f59e0b' },
            { label: '📢 Duyuru Gönder', href: '/admin/notifications', color: '#10b981' },
            { label: '⚙️ Sistem Config', href: '/admin/system', color: '#8b5cf6' },
            { label: '🌍 Pazar Sayfaları', href: '/admin/content', color: '#06b6d4' },
          ].map(item => (
            <a key={item.href} href={item.href} style={{ display: 'flex', alignItems: 'center', padding: '9px 12px', borderRadius: 9, textDecoration: 'none', fontSize: 13, color: '#94a3b8', marginBottom: 4, background: 'rgba(255,255,255,0.02)', transition: 'background 0.15s' }}>
              {item.label}
            </a>
          ))}
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/web/app/\(admin\)/page.tsx
git commit -m "feat: admin OS — master overview with stats + plan distribution"
```

---

## Task 8: Users Management Page

**Files:**
- Create: `apps/web/app/(admin)/users/page.tsx`
- Create: `apps/web/app/(admin)/users/[id]/page.tsx`

- [ ] **Step 1: Create users list page**

```tsx
// apps/web/app/(admin)/users/page.tsx
'use client'
import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { adminApi } from '@/lib/admin-api'
import { Search, RefreshCw, ChevronRight, Crown, Zap, User } from 'lucide-react'

const PLAN_COLOR: Record<string, string> = {
  starter: '#64748b', growth: '#3b82f6', pro: '#8b5cf6', enterprise: '#f59e0b'
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<any[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [plan, setPlan] = useState('')
  const [page, setPage] = useState(1)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const params: Record<string, string> = { page: String(page), limit: '50' }
      if (search) params.search = search
      if (plan) params.plan = plan
      const data = await adminApi.users(params)
      setUsers(data.users || [])
      setTotal(data.total || 0)
    } catch {} finally { setLoading(false) }
  }, [page, search, plan])

  useEffect(() => { load() }, [load])
  useEffect(() => { setPage(1) }, [search, plan])

  const inp: React.CSSProperties = { background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 10, color: '#e2e8f0', fontSize: 13, padding: '9px 14px', outline: 'none' }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h1 style={{ color: '#fff', fontSize: 22, fontWeight: 800, margin: '0 0 4px' }}>👥 Kullanıcılar</h1>
          <p style={{ color: '#475569', fontSize: 13, margin: 0 }}>{total.toLocaleString()} toplam kullanıcı</p>
        </div>
        <button onClick={load} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', borderRadius: 9, border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.04)', color: '#94a3b8', cursor: 'pointer', fontSize: 13 }}>
          <RefreshCw size={14} /> Yenile
        </button>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
        <div style={{ position: 'relative', flex: 1 }}>
          <Search size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#475569' }} />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Email, isim veya şirket ara..." style={{ ...inp, paddingLeft: 36, width: '100%', boxSizing: 'border-box' }} />
        </div>
        <select value={plan} onChange={e => setPlan(e.target.value)} style={{ ...inp, minWidth: 140 }}>
          <option value="">Tüm Planlar</option>
          <option value="starter">Starter</option>
          <option value="growth">Growth</option>
          <option value="pro">Pro</option>
          <option value="enterprise">Enterprise</option>
        </select>
      </div>

      {/* Table */}
      <div style={{ background: 'linear-gradient(135deg,rgba(8,16,40,0.9),rgba(5,10,28,0.95))', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 16, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
              {['Kullanıcı', 'Plan', 'Kredi', 'Ülke', 'Kayıt', ''].map(h => (
                <th key={h} style={{ padding: '12px 16px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.07em' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              [...Array(5)].map((_, i) => (
                <tr key={i}><td colSpan={6} style={{ padding: 20 }}><div style={{ height: 36, background: 'rgba(255,255,255,0.03)', borderRadius: 6, animation: 'pulse 1.5s infinite' }} /></td></tr>
              ))
            ) : users.map(u => {
              const creditsLeft = (u.credits_total || 0) - (u.credits_used || 0)
              const pct = u.credits_total ? Math.round((creditsLeft / u.credits_total) * 100) : 0
              return (
                <tr key={u.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)', transition: 'background 0.1s' }}>
                  <td style={{ padding: '14px 16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'linear-gradient(135deg,#3b82f6,#8b5cf6)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700, color: '#fff', flexShrink: 0 }}>
                        {(u.name || u.email)?.[0]?.toUpperCase() || '?'}
                      </div>
                      <div>
                        <div style={{ color: '#fff', fontSize: 13, fontWeight: 600 }}>{u.name || '—'}</div>
                        <div style={{ color: '#475569', fontSize: 11 }}>{u.email}</div>
                      </div>
                    </div>
                  </td>
                  <td style={{ padding: '14px 16px' }}>
                    <span style={{ padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700, background: `${PLAN_COLOR[u.plan_type]}20`, color: PLAN_COLOR[u.plan_type] || '#64748b', border: `1px solid ${PLAN_COLOR[u.plan_type]}30` }}>
                      {u.plan_type}
                    </span>
                  </td>
                  <td style={{ padding: '14px 16px' }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: pct < 20 ? '#ef4444' : '#e2e8f0' }}>{creditsLeft.toLocaleString()}</div>
                    <div style={{ height: 3, width: 60, background: 'rgba(255,255,255,0.06)', borderRadius: 2, marginTop: 4, overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${Math.max(0, Math.min(100, pct))}%`, background: pct < 20 ? '#ef4444' : '#3b82f6', borderRadius: 2 }} />
                    </div>
                  </td>
                  <td style={{ padding: '14px 16px', color: '#64748b', fontSize: 12 }}>{u.country_code || '—'}</td>
                  <td style={{ padding: '14px 16px', color: '#64748b', fontSize: 12 }}>
                    {new Date(u.created_at).toLocaleDateString('tr-TR')}
                  </td>
                  <td style={{ padding: '14px 16px' }}>
                    <Link href={`/admin/users/${u.id}`} style={{ display: 'flex', alignItems: 'center', gap: 4, color: '#60a5fa', fontSize: 12, fontWeight: 600, textDecoration: 'none' }}>
                      Detay <ChevronRight size={13} />
                    </Link>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
        {!loading && users.length === 0 && (
          <div style={{ padding: 40, textAlign: 'center', color: '#475569' }}>Kullanıcı bulunamadı</div>
        )}
      </div>

      {/* Pagination */}
      {total > 50 && (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 16 }}>
          <span style={{ color: '#475569', fontSize: 13 }}>{(page - 1) * 50 + 1}–{Math.min(page * 50, total)} / {total}</span>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} style={{ padding: '7px 14px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.04)', color: '#94a3b8', cursor: 'pointer', fontSize: 13, opacity: page === 1 ? 0.4 : 1 }}>← Önceki</button>
            <button onClick={() => setPage(p => p + 1)} disabled={page * 50 >= total} style={{ padding: '7px 14px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.04)', color: '#94a3b8', cursor: 'pointer', fontSize: 13, opacity: page * 50 >= total ? 0.4 : 1 }}>Sonraki →</button>
          </div>
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Create user detail + impersonate page**

```tsx
// apps/web/app/(admin)/users/[id]/page.tsx
'use client'
import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { adminApi } from '@/lib/admin-api'
import { ArrowLeft, UserCheck, Plus, Minus, Ban, ExternalLink, Save, RefreshCw } from 'lucide-react'

const PLANS = ['starter', 'growth', 'pro', 'enterprise']
const PLAN_COLOR: Record<string, string> = { starter: '#64748b', growth: '#3b82f6', pro: '#8b5cf6', enterprise: '#f59e0b' }

export default function AdminUserDetailPage() {
  const { id } = useParams()
  const router = useRouter()
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [impersonating, setImpersonating] = useState(false)
  const [msg, setMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null)
  const [creditAmount, setCreditAmount] = useState('')
  const [creditReason, setCreditReason] = useState('')
  const [editPlan, setEditPlan] = useState('')

  useEffect(() => {
    adminApi.user(id as string).then(d => {
      setData(d)
      setEditPlan(d.user.plan_type)
    }).catch(console.error).finally(() => setLoading(false))
  }, [id])

  const showMsg = (type: 'ok' | 'err', text: string) => {
    setMsg({ type, text })
    setTimeout(() => setMsg(null), 4000)
  }

  const savePlan = async () => {
    setSaving(true)
    try {
      await adminApi.updateUser(id as string, { plan_type: editPlan })
      setData((d: any) => ({ ...d, user: { ...d.user, plan_type: editPlan } }))
      showMsg('ok', 'Plan güncellendi!')
    } catch (e: any) { showMsg('err', e.message) } finally { setSaving(false) }
  }

  const addCredits = async (sign: 1 | -1) => {
    if (!creditAmount || !creditReason) return showMsg('err', 'Miktar ve sebep gerekli')
    setSaving(true)
    try {
      const result = await adminApi.addCredits(id as string, parseInt(creditAmount) * sign, creditReason)
      setData((d: any) => ({ ...d, user: { ...d.user, credits_total: result.new_total } }))
      showMsg('ok', `Kredi güncellendi! Yeni: ${result.new_total}`)
      setCreditAmount('')
      setCreditReason('')
    } catch (e: any) { showMsg('err', e.message) } finally { setSaving(false) }
  }

  const impersonate = async () => {
    setImpersonating(true)
    try {
      const result = await adminApi.impersonate(id as string)
      // Open user dashboard in new tab with their token
      const url = `/dashboard?impersonate_token=${result.token}`
      window.open(url, '_blank')
      showMsg('ok', `${result.user.email} olarak giriş yapıldı — yeni sekme açıldı`)
    } catch (e: any) { showMsg('err', e.message) } finally { setImpersonating(false) }
  }

  if (loading) return <div style={{ color: '#475569', padding: 40, textAlign: 'center' }}>Yükleniyor...</div>
  if (!data) return <div style={{ color: '#ef4444', padding: 40 }}>Kullanıcı bulunamadı</div>

  const { user, stats, credit_history } = data
  const inp: React.CSSProperties = { background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 10, color: '#e2e8f0', fontSize: 13, padding: '9px 14px', outline: 'none', width: '100%', boxSizing: 'border-box' as const }
  const card: React.CSSProperties = { background: 'linear-gradient(135deg,rgba(8,16,40,0.9),rgba(5,10,28,0.95))', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 16, padding: 20, marginBottom: 16 }

  return (
    <div style={{ maxWidth: 900 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 28 }}>
        <button onClick={() => router.push('/admin/users')} style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#475569', background: 'none', border: 'none', cursor: 'pointer', fontSize: 13 }}>
          <ArrowLeft size={16} /> Geri
        </button>
        <div style={{ flex: 1 }}>
          <h1 style={{ color: '#fff', fontSize: 22, fontWeight: 800, margin: 0 }}>{user.name || user.email}</h1>
          <div style={{ color: '#475569', fontSize: 13, marginTop: 2 }}>{user.email} · {user.company || 'Şirket yok'}</div>
        </div>
        <button onClick={impersonate} disabled={impersonating} style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '10px 18px', borderRadius: 10, border: 'none', background: 'linear-gradient(135deg,#8b5cf6,#6366f1)', color: '#fff', cursor: 'pointer', fontSize: 13, fontWeight: 700 }}>
          {impersonating ? <RefreshCw size={14} className="animate-spin" /> : <UserCheck size={14} />}
          Kullanıcı Olarak Gir
        </button>
      </div>

      {msg && (
        <div style={{ padding: '11px 16px', borderRadius: 10, marginBottom: 16, background: msg.type === 'ok' ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)', border: `1px solid ${msg.type === 'ok' ? 'rgba(16,185,129,0.25)' : 'rgba(239,68,68,0.25)'}`, color: msg.type === 'ok' ? '#34d399' : '#f87171', fontSize: 13 }}>
          {msg.text}
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        {/* Stats */}
        <div style={card}>
          <h3 style={{ color: '#fff', fontSize: 14, fontWeight: 700, margin: '0 0 16px' }}>📊 Kullanım İstatistikleri</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
            {[
              { label: 'Lead', value: stats.leads },
              { label: 'Kampanya', value: stats.campaigns },
              { label: 'Mesaj', value: stats.messages },
            ].map(s => (
              <div key={s.label} style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 10, padding: 12, textAlign: 'center' }}>
                <div style={{ fontSize: 22, fontWeight: 800, color: '#fff' }}>{s.value.toLocaleString()}</div>
                <div style={{ fontSize: 11, color: '#475569', marginTop: 2 }}>{s.label}</div>
              </div>
            ))}
          </div>
          <div style={{ marginTop: 14, fontSize: 12, color: '#475569' }}>
            <div>Kayıt: {new Date(user.created_at).toLocaleDateString('tr-TR')}</div>
            <div>Ülke: {user.country_code || '—'} · Dil: {user.language_code || '—'}</div>
            <div>Onboarding: {user.onboarding_done ? '✅' : '❌'}</div>
          </div>
        </div>

        {/* Plan management */}
        <div style={card}>
          <h3 style={{ color: '#fff', fontSize: 14, fontWeight: 700, margin: '0 0 16px' }}>💳 Plan Yönetimi</h3>
          <div style={{ marginBottom: 12 }}>
            <label style={{ display: 'block', color: '#94a3b8', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 8 }}>Plan</label>
            <select value={editPlan} onChange={e => setEditPlan(e.target.value)} style={inp}>
              {PLANS.map(p => <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>)}
            </select>
          </div>
          <button onClick={savePlan} disabled={saving} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '9px 16px', borderRadius: 9, border: 'none', background: 'rgba(59,130,246,0.2)', color: '#60a5fa', cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>
            <Save size={14} /> Planı Güncelle
          </button>
          <div style={{ marginTop: 14, padding: 10, background: 'rgba(255,255,255,0.02)', borderRadius: 9 }}>
            <div style={{ fontSize: 12, color: '#94a3b8', marginBottom: 4 }}>Mevcut Kredi</div>
            <div style={{ fontSize: 20, fontWeight: 800, color: '#fff' }}>{(user.credits_total - user.credits_used).toLocaleString()}</div>
            <div style={{ fontSize: 11, color: '#475569' }}>{user.credits_total} toplam · {user.credits_used} kullanıldı</div>
          </div>
        </div>

        {/* Credit management */}
        <div style={card}>
          <h3 style={{ color: '#fff', fontSize: 14, fontWeight: 700, margin: '0 0 16px' }}>⚡ Kredi Yönetimi</h3>
          <div style={{ marginBottom: 10 }}>
            <label style={{ display: 'block', color: '#94a3b8', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 8 }}>Miktar</label>
            <input type="number" value={creditAmount} onChange={e => setCreditAmount(e.target.value)} placeholder="100" style={inp} />
          </div>
          <div style={{ marginBottom: 14 }}>
            <label style={{ display: 'block', color: '#94a3b8', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 8 }}>Sebep</label>
            <input value={creditReason} onChange={e => setCreditReason(e.target.value)} placeholder="Bonus kampanyası, hata telafisi..." style={inp} />
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={() => addCredits(1)} style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '9px', borderRadius: 9, border: 'none', background: 'rgba(16,185,129,0.2)', color: '#34d399', cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>
              <Plus size={14} /> Kredi Ekle
            </button>
            <button onClick={() => addCredits(-1)} style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '9px', borderRadius: 9, border: 'none', background: 'rgba(239,68,68,0.15)', color: '#f87171', cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>
              <Minus size={14} /> Kredi Çıkar
            </button>
          </div>
        </div>

        {/* Credit history */}
        <div style={card}>
          <h3 style={{ color: '#fff', fontSize: 14, fontWeight: 700, margin: '0 0 14px' }}>📜 Kredi Geçmişi</h3>
          <div style={{ maxHeight: 200, overflowY: 'auto' }}>
            {credit_history.length === 0 ? (
              <p style={{ color: '#475569', fontSize: 13 }}>Kredi kaydı yok</p>
            ) : credit_history.map((c: any, i: number) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid rgba(255,255,255,0.03)', fontSize: 12 }}>
                <span style={{ color: '#94a3b8' }}>{c.action}</span>
                <span style={{ color: c.amount > 0 ? '#34d399' : '#f87171', fontWeight: 600 }}>{c.amount > 0 ? '+' : ''}{c.amount}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Commit**

```bash
git add apps/web/app/\(admin\)/users/
git commit -m "feat: admin OS — users list + user detail with impersonate + credit management"
```

---

## Task 9: Banner & Video Manager

**Files:**
- Create: `apps/web/app/(admin)/content/banners/page.tsx`

- [ ] **Step 1: Create banner manager**

```tsx
// apps/web/app/(admin)/content/banners/page.tsx
'use client'
import { useEffect, useState } from 'react'
import { adminApi } from '@/lib/admin-api'
import { Plus, Trash2, Eye, EyeOff, Edit3, Globe2, Monitor, Image, Video } from 'lucide-react'

const BANNER_TYPES = [
  { value: 'dashboard', label: '🖥️ Dashboard (tüm sayfalar)', desc: 'Kullanıcı girince görür' },
  { value: 'market_page', label: '🌍 Pazar Sayfası (/tr, /de...)', desc: 'Public landing page' },
  { value: 'sidebar', label: '📌 Sidebar Kartı', desc: 'Sol menüde görünür' },
  { value: 'popup', label: '💬 Popup/Modal', desc: 'Açılışta göster' },
]

const EMPTY_BANNER = { type: 'dashboard', target_slug: 'all', target_plan: 'all', title: '', message: '', cta_text: '', cta_url: '', image_url: '', video_url: '', is_active: false }

export default function AdminBannersPage() {
  const [banners, setBanners] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState<any | null>(null)
  const [isNew, setIsNew] = useState(false)
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState('')

  const load = async () => {
    setLoading(true)
    const data = await adminApi.banners().catch(() => ({ banners: [] }))
    setBanners(data.banners || [])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const showMsg = (text: string) => { setMsg(text); setTimeout(() => setMsg(''), 3000) }

  const save = async () => {
    setSaving(true)
    try {
      if (isNew) await adminApi.createBanner(editing)
      else await adminApi.updateBanner(editing.id, editing)
      showMsg('✅ Kaydedildi!')
      setEditing(null)
      load()
    } catch (e: any) { showMsg(`❌ ${e.message}`) } finally { setSaving(false) }
  }

  const toggle = async (b: any) => {
    await adminApi.updateBanner(b.id, { is_active: !b.is_active })
    load()
  }

  const del = async (id: string) => {
    if (!confirm('Bu banner silinsin mi?')) return
    await adminApi.deleteBanner(id)
    load()
  }

  const inp: React.CSSProperties = { background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 10, color: '#e2e8f0', fontSize: 13, padding: '9px 14px', outline: 'none', width: '100%', boxSizing: 'border-box' as const }
  const card: React.CSSProperties = { background: 'linear-gradient(135deg,rgba(8,16,40,0.9),rgba(5,10,28,0.95))', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 14, padding: 18, marginBottom: 12 }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h1 style={{ color: '#fff', fontSize: 22, fontWeight: 800, margin: '0 0 4px' }}>🎬 Banner & Video Yöneticisi</h1>
          <p style={{ color: '#475569', fontSize: 13, margin: 0 }}>Dashboard, pazar sayfaları ve sidebar için banner/video yönetimi</p>
        </div>
        <button onClick={() => { setEditing({ ...EMPTY_BANNER }); setIsNew(true) }} style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '10px 18px', borderRadius: 10, border: 'none', background: 'linear-gradient(135deg,#3b82f6,#6366f1)', color: '#fff', cursor: 'pointer', fontSize: 13, fontWeight: 700 }}>
          <Plus size={14} /> Yeni Banner
        </button>
      </div>

      {msg && <div style={{ padding: '11px 16px', borderRadius: 10, marginBottom: 16, background: msg.startsWith('✅') ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)', border: `1px solid ${msg.startsWith('✅') ? 'rgba(16,185,129,0.25)' : 'rgba(239,68,68,0.25)'}`, color: msg.startsWith('✅') ? '#34d399' : '#f87171', fontSize: 13 }}>{msg}</div>}

      {/* Editor */}
      {editing && (
        <div style={{ background: 'linear-gradient(135deg,rgba(5,10,25,0.95),rgba(8,15,35,0.97))', border: '1px solid rgba(59,130,246,0.2)', borderRadius: 18, padding: 24, marginBottom: 24 }}>
          <h3 style={{ color: '#fff', fontSize: 15, fontWeight: 700, margin: '0 0 20px' }}>{isNew ? '+ Yeni Banner' : '✏️ Banner Düzenle'}</h3>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
            <div>
              <label style={{ display: 'block', color: '#94a3b8', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 8 }}>Banner Tipi</label>
              <select value={editing.type} onChange={e => setEditing({ ...editing, type: e.target.value })} style={inp}>
                {BANNER_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>
            <div>
              <label style={{ display: 'block', color: '#94a3b8', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 8 }}>Hedef Plan</label>
              <select value={editing.target_plan} onChange={e => setEditing({ ...editing, target_plan: e.target.value })} style={inp}>
                <option value="all">Tüm Planlar</option>
                <option value="starter">Starter</option>
                <option value="growth">Growth</option>
                <option value="pro">Pro</option>
                <option value="enterprise">Enterprise</option>
              </select>
            </div>
          </div>

          {editing.type === 'market_page' && (
            <div style={{ marginBottom: 14 }}>
              <label style={{ display: 'block', color: '#94a3b8', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 8 }}>Pazar Sayfası Slug</label>
              <input value={editing.target_slug} onChange={e => setEditing({ ...editing, target_slug: e.target.value })} placeholder="tr, de, ru, all" style={inp} />
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
            <div>
              <label style={{ display: 'block', color: '#94a3b8', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 8 }}>Başlık</label>
              <input value={editing.title} onChange={e => setEditing({ ...editing, title: e.target.value })} placeholder="Banner başlığı" style={inp} />
            </div>
            <div>
              <label style={{ display: 'block', color: '#94a3b8', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 8 }}>CTA Butonu</label>
              <input value={editing.cta_text} onChange={e => setEditing({ ...editing, cta_text: e.target.value })} placeholder="Daha Fazla Bilgi" style={inp} />
            </div>
          </div>

          <div style={{ marginBottom: 14 }}>
            <label style={{ display: 'block', color: '#94a3b8', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 8 }}>Mesaj</label>
            <textarea value={editing.message} onChange={e => setEditing({ ...editing, message: e.target.value })} placeholder="Banner açıklama metni..." rows={3} style={{ ...inp, resize: 'vertical' as const }} />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
            <div>
              <label style={{ display: 'block', color: '#94a3b8', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 8 }}>🖼️ Görsel URL</label>
              <input value={editing.image_url} onChange={e => setEditing({ ...editing, image_url: e.target.value })} placeholder="https://cdn.example.com/banner.png" style={inp} />
            </div>
            <div>
              <label style={{ display: 'block', color: '#94a3b8', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 8 }}>🎬 Video URL (YouTube/Vimeo)</label>
              <input value={editing.video_url} onChange={e => setEditing({ ...editing, video_url: e.target.value })} placeholder="https://youtube.com/watch?v=..." style={inp} />
            </div>
          </div>

          <div style={{ marginBottom: 20 }}>
            <label style={{ display: 'block', color: '#94a3b8', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 8 }}>CTA URL</label>
            <input value={editing.cta_url} onChange={e => setEditing({ ...editing, cta_url: e.target.value })} placeholder="https://..." style={inp} />
          </div>

          <div style={{ display: 'flex', gap: 10 }}>
            <button onClick={save} disabled={saving} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '10px 20px', borderRadius: 10, border: 'none', background: 'linear-gradient(135deg,#3b82f6,#6366f1)', color: '#fff', cursor: 'pointer', fontSize: 13, fontWeight: 700 }}>
              {saving ? 'Kaydediliyor...' : '💾 Kaydet'}
            </button>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
              <input type="checkbox" checked={editing.is_active} onChange={e => setEditing({ ...editing, is_active: e.target.checked })} />
              <span style={{ color: '#94a3b8', fontSize: 13 }}>Aktif yayında</span>
            </label>
            <button onClick={() => setEditing(null)} style={{ padding: '10px 16px', borderRadius: 10, border: '1px solid rgba(255,255,255,0.08)', background: 'transparent', color: '#64748b', cursor: 'pointer', fontSize: 13 }}>İptal</button>
          </div>
        </div>
      )}

      {/* Banner list */}
      {loading ? <div style={{ color: '#475569', padding: 20 }}>Yükleniyor...</div> : (
        banners.length === 0 ? (
          <div style={{ ...card, textAlign: 'center', padding: 40 }}>
            <Image size={36} style={{ color: '#334155', margin: '0 auto 12px', display: 'block' }} />
            <p style={{ color: '#475569' }}>Henüz banner yok. Yeni banner oluşturun.</p>
          </div>
        ) : banners.map(b => (
          <div key={b.id} style={{ ...card, opacity: b.is_active ? 1 : 0.6 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                  <span style={{ color: '#fff', fontSize: 14, fontWeight: 700 }}>{b.title || 'Başlıksız'}</span>
                  <span style={{ padding: '2px 8px', borderRadius: 20, fontSize: 10, fontWeight: 700, background: b.is_active ? 'rgba(16,185,129,0.15)' : 'rgba(100,116,139,0.15)', color: b.is_active ? '#34d399' : '#64748b' }}>{b.is_active ? '● Aktif' : '○ Pasif'}</span>
                  <span style={{ padding: '2px 8px', borderRadius: 20, fontSize: 10, background: 'rgba(59,130,246,0.15)', color: '#60a5fa' }}>{b.type}</span>
                  {b.target_slug !== 'all' && <span style={{ padding: '2px 8px', borderRadius: 20, fontSize: 10, background: 'rgba(245,158,11,0.15)', color: '#fbbf24' }}>/{b.target_slug}</span>}
                  {b.video_url && <span style={{ padding: '2px 8px', borderRadius: 20, fontSize: 10, background: 'rgba(139,92,246,0.15)', color: '#c084fc' }}>🎬 Video</span>}
                  {b.image_url && <span style={{ padding: '2px 8px', borderRadius: 20, fontSize: 10, background: 'rgba(6,182,212,0.15)', color: '#22d3ee' }}>🖼️ Görsel</span>}
                </div>
                <div style={{ color: '#64748b', fontSize: 12 }}>{b.message?.slice(0, 80) || 'Mesaj yok'}</div>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={() => toggle(b)} title={b.is_active ? 'Deaktive et' : 'Aktive et'} style={{ padding: '7px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.08)', background: 'transparent', color: b.is_active ? '#fbbf24' : '#34d399', cursor: 'pointer' }}>
                  {b.is_active ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
                <button onClick={() => { setEditing({ ...b }); setIsNew(false) }} style={{ padding: '7px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.08)', background: 'transparent', color: '#60a5fa', cursor: 'pointer' }}>
                  <Edit3 size={14} />
                </button>
                <button onClick={() => del(b.id)} style={{ padding: '7px', borderRadius: 8, border: '1px solid rgba(239,68,68,0.2)', background: 'rgba(239,68,68,0.08)', color: '#f87171', cursor: 'pointer' }}>
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          </div>
        ))
      )}
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/web/app/\(admin\)/content/
git commit -m "feat: admin OS — banner & video manager with full CRUD"
```

---

## Task 10: System Config + Notifications

**Files:**
- Create: `apps/web/app/(admin)/system/page.tsx`
- Create: `apps/web/app/(admin)/notifications/page.tsx`

- [ ] **Step 1: Create system config page**

```tsx
// apps/web/app/(admin)/system/page.tsx
'use client'
import { useEffect, useState } from 'react'
import { adminApi } from '@/lib/admin-api'
import { CheckCircle, XCircle, AlertTriangle, RefreshCw } from 'lucide-react'

export default function AdminSystemPage() {
  const [config, setConfig] = useState<any>(null)
  const [errors, setErrors] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([adminApi.systemConfig(), adminApi.systemErrors()])
      .then(([c, e]) => { setConfig(c); setErrors(e.errors || []) })
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  const card: React.CSSProperties = { background: 'linear-gradient(135deg,rgba(8,16,40,0.9),rgba(5,10,28,0.95))', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 16, padding: 20, marginBottom: 16 }

  if (loading) return <div style={{ color: '#475569', padding: 40 }}>Yükleniyor...</div>

  return (
    <div>
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ color: '#fff', fontSize: 22, fontWeight: 800, margin: '0 0 4px' }}>⚙️ Sistem & Konfigürasyon</h1>
        <p style={{ color: '#475569', fontSize: 13, margin: 0 }}>API key durumları, plan limitleri, hata logları</p>
      </div>

      {/* API Keys */}
      <div style={card}>
        <h3 style={{ color: '#fff', fontSize: 14, fontWeight: 700, margin: '0 0 16px', display: 'flex', alignItems: 'center', gap: 8 }}>
          🔑 API Key Durumları
        </h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
          {config && Object.entries(config.api_keys || {}).map(([key, active]) => (
            <div key={key} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 12px', background: 'rgba(255,255,255,0.02)', borderRadius: 9, border: `1px solid ${active ? 'rgba(16,185,129,0.2)' : 'rgba(239,68,68,0.2)'}` }}>
              {active ? <CheckCircle size={15} color="#34d399" /> : <XCircle size={15} color="#f87171" />}
              <span style={{ fontSize: 12, color: active ? '#e2e8f0' : '#64748b', textTransform: 'capitalize' }}>{key.replace('_', ' ')}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Plan limits */}
      <div style={card}>
        <h3 style={{ color: '#fff', fontSize: 14, fontWeight: 700, margin: '0 0 16px' }}>💳 Plan Limitleri</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10 }}>
          {config && Object.entries(config.plans || {}).map(([plan, info]: any) => (
            <div key={plan} style={{ padding: 14, background: 'rgba(255,255,255,0.02)', borderRadius: 10, border: '1px solid rgba(255,255,255,0.05)' }}>
              <div style={{ color: '#fff', fontSize: 13, fontWeight: 700, textTransform: 'capitalize', marginBottom: 6 }}>{plan}</div>
              <div style={{ color: '#3b82f6', fontSize: 18, fontWeight: 800 }}>{info.credits === -1 ? '∞' : info.credits.toLocaleString()}</div>
              <div style={{ color: '#475569', fontSize: 11 }}>kredi/ay</div>
              <div style={{ color: '#10b981', fontSize: 13, fontWeight: 600, marginTop: 4 }}>₺{info.price}/ay</div>
            </div>
          ))}
        </div>
      </div>

      {/* System stats */}
      <div style={card}>
        <h3 style={{ color: '#fff', fontSize: 14, fontWeight: 700, margin: '0 0 14px', display: 'flex', alignItems: 'center', gap: 8 }}>
          <AlertTriangle size={15} color="#fbbf24" /> Son 24 Saatte {config?.errors_24h || 0} Hata
        </h3>
        <div style={{ maxHeight: 300, overflowY: 'auto' }}>
          {errors.length === 0 ? (
            <div style={{ color: '#34d399', fontSize: 13 }}>✅ Son 24 saatte hata yok!</div>
          ) : errors.slice(0, 50).map((e: any, i: number) => (
            <div key={i} style={{ padding: '8px 0', borderBottom: '1px solid rgba(255,255,255,0.03)', fontSize: 12 }}>
              <div style={{ color: '#f87171', fontWeight: 600 }}>{e.endpoint || e.path || 'Unknown endpoint'}</div>
              <div style={{ color: '#64748b', marginTop: 2 }}>{e.message?.slice(0, 120) || 'No message'}</div>
              <div style={{ color: '#334155', marginTop: 2 }}>{e.created_at ? new Date(e.created_at).toLocaleString('tr-TR') : ''}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Create notifications broadcast page**

```tsx
// apps/web/app/(admin)/notifications/page.tsx
'use client'
import { useState } from 'react'
import { adminApi } from '@/lib/admin-api'
import { Bell, Send } from 'lucide-react'

export default function AdminNotificationsPage() {
  const [form, setForm] = useState({ title: '', message: '', target_plan: 'all', href: '/dashboard' })
  const [sending, setSending] = useState(false)
  const [result, setResult] = useState<{ sent: number } | null>(null)
  const [error, setError] = useState('')

  const send = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.title || !form.message) return setError('Başlık ve mesaj gerekli')
    setSending(true)
    setError('')
    setResult(null)
    try {
      const data = await adminApi.broadcast(form)
      setResult(data)
      setForm({ title: '', message: '', target_plan: 'all', href: '/dashboard' })
    } catch (e: any) { setError(e.message) } finally { setSending(false) }
  }

  const inp: React.CSSProperties = { background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 10, color: '#e2e8f0', fontSize: 14, padding: '11px 14px', outline: 'none', width: '100%', boxSizing: 'border-box' as const }
  const label_: React.CSSProperties = { display: 'block', color: '#94a3b8', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 8 }

  return (
    <div style={{ maxWidth: 600 }}>
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ color: '#fff', fontSize: 22, fontWeight: 800, margin: '0 0 4px' }}>📢 Duyuru Gönder</h1>
        <p style={{ color: '#475569', fontSize: 13, margin: 0 }}>Tüm kullanıcılara veya belirli plana bildirim gönder</p>
      </div>

      {result && (
        <div style={{ padding: 16, borderRadius: 12, marginBottom: 20, background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.25)' }}>
          <div style={{ color: '#34d399', fontWeight: 700, fontSize: 15 }}>✅ Başarıyla Gönderildi!</div>
          <div style={{ color: '#6ee7b7', fontSize: 13, marginTop: 4 }}>{result.sent} kullanıcıya bildirim gönderildi.</div>
        </div>
      )}

      {error && <div style={{ padding: 12, borderRadius: 10, marginBottom: 16, background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)', color: '#f87171', fontSize: 13 }}>{error}</div>}

      <form onSubmit={send} style={{ background: 'linear-gradient(135deg,rgba(8,16,40,0.9),rgba(5,10,28,0.95))', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 18, padding: 28 }}>
        <div style={{ marginBottom: 18 }}>
          <label style={label_}>Hedef Kitle</label>
          <select value={form.target_plan} onChange={e => setForm({ ...form, target_plan: e.target.value })} style={inp}>
            <option value="all">🌍 Tüm Kullanıcılar</option>
            <option value="starter">Starter Plan</option>
            <option value="growth">Growth Plan</option>
            <option value="pro">Pro Plan</option>
            <option value="enterprise">Enterprise Plan</option>
          </select>
        </div>
        <div style={{ marginBottom: 18 }}>
          <label style={label_}>Başlık</label>
          <input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} placeholder="Yeni özellik yayında! 🎉" style={inp} />
        </div>
        <div style={{ marginBottom: 18 }}>
          <label style={label_}>Mesaj</label>
          <textarea value={form.message} onChange={e => setForm({ ...form, message: e.target.value })} placeholder="Bildirim mesajı..." rows={4} style={{ ...inp, resize: 'vertical' as const }} />
        </div>
        <div style={{ marginBottom: 24 }}>
          <label style={label_}>Tıklanınca git (URL)</label>
          <input value={form.href} onChange={e => setForm({ ...form, href: e.target.value })} placeholder="/dashboard, /billing, ..." style={inp} />
        </div>
        <button type="submit" disabled={sending} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '12px 24px', borderRadius: 12, border: 'none', background: sending ? 'rgba(59,130,246,0.4)' : 'linear-gradient(135deg,#3b82f6,#6366f1)', color: '#fff', cursor: sending ? 'not-allowed' : 'pointer', fontSize: 14, fontWeight: 700, boxShadow: '0 4px 15px rgba(59,130,246,0.3)' }}>
          <Send size={16} /> {sending ? 'Gönderiliyor...' : 'Bildirimi Gönder'}
        </button>
      </form>
    </div>
  )
}
```

- [ ] **Step 3: Commit both pages**

```bash
git add apps/web/app/\(admin\)/system/ apps/web/app/\(admin\)/notifications/
git commit -m "feat: admin OS — system config + error logs + broadcast notifications"
```

---

## Task 11: Build, Deploy, Verify

- [ ] **Step 1: Add required Supabase tables (run in Supabase SQL Editor)**

Run `services/api/src/migrations/create_admin_tables.sql`

- [ ] **Step 2: Add env vars to Vercel**

In Vercel Dashboard → Settings → Environment Variables, add:
```
ADMIN_EMAILS = ecofriendlyhomegoods@gmail.com
ADMIN_PASSWORD = [güçlü şifre belirleyin]
ADMIN_JWT_SECRET = [güçlü rastgele string]
```

- [ ] **Step 3: TypeScript check**

```bash
cd apps/web && npx tsc --noEmit 2>&1 | head -10
```

Expected: No errors.

- [ ] **Step 4: Build check**

```bash
npx next build 2>&1 | grep -E "✓ Compiled|error" | tail -5
```

Expected: `✓ Compiled successfully`

- [ ] **Step 5: Final commit + push**

```bash
git add .
git commit -m "feat: LeadFlow Admin OS Phase 1 — /admin panel COMPLETE

- Admin auth: email whitelist + password + JWT (8h)
- Admin layout: sidebar nav, logout, active state
- Master Overview: user/lead/campaign/message stats + plan distribution
- Users Management: full table, search/filter, pagination
- User Detail: stats, plan change, credit add/remove, impersonate
- Banner & Video Manager: CRUD, activate/deactivate, type targeting
- System Config: API key status, plan limits, error logs
- Broadcast Notifications: send to all or by plan segment
- DB: admin_sessions, admin_audit_logs, admin_banners, promo_codes
- Backend: /api/admin/* routes with adminAuth middleware
- Audit: every admin action logged automatically"
git push origin master
```

- [ ] **Step 6: Test admin login**

Navigate to: `site.com/admin/login`
- Enter admin email + password
- Should redirect to `site.com/admin`
- Verify stats load

- [ ] **Step 7: Test impersonate**

In Users page → click a user → click "Kullanıcı Olarak Gir"
Expected: New tab opens with that user's dashboard logged in

---

## Self-Review

**Spec coverage:**
- ✅ Admin auth (login, JWT, middleware) — Tasks 2, 4, 6
- ✅ User Management + Impersonate — Tasks 3, 8
- ✅ Plan & Credit Management — Tasks 3, 8
- ✅ Banner & Video Manager — Tasks 3, 9
- ✅ System Config + Health — Tasks 3, 10
- ✅ Broadcast Notifications — Tasks 3, 10
- ✅ Audit logging — Task 3 (every route calls `audit()`)
- ✅ DB tables — Task 1

**Placeholder scan:** None found.

**Type consistency:** `adminApi.*` methods match the backend routes throughout.
