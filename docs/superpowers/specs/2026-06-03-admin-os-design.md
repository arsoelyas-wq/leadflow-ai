# LeadFlow Admin OS — Design Spec

**Goal:** Comprehensive admin panel at `/admin` — full control over all users, revenue, AI costs, content, infrastructure, affiliate/white-label, and security.

**Architecture:** Next.js `(admin)` route group inside existing app, separate layout + middleware, Supabase service key for cross-user data access, dedicated admin API routes on Railway.

**Tech Stack:** Next.js 15 App Router, Supabase (service key), Express/Railway, TypeScript, Tailwind + inline styles (consistent with existing codebase)

**URL:** `site.com/admin` — protected by admin email + 2FA

---

## Security Model

- Only emails in `ADMIN_EMAILS` env var can access `/admin`
- Separate JWT secret for admin sessions (`ADMIN_JWT_SECRET`)
- 2FA required (TOTP via authenticator app)
- All admin actions logged to `admin_audit_logs` table
- Session expires after 30 minutes of inactivity
- IP whitelist optional (env var)

---

## Database Additions

```sql
-- Admin sessions
CREATE TABLE admin_sessions (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  admin_email varchar(200) NOT NULL,
  token_hash varchar(200) NOT NULL,
  ip_address varchar(50),
  created_at timestamptz DEFAULT now(),
  expires_at timestamptz NOT NULL,
  last_activity timestamptz DEFAULT now()
);

-- Audit log (every admin action)
CREATE TABLE admin_audit_logs (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  admin_email varchar(200) NOT NULL,
  action varchar(100) NOT NULL,  -- 'user.plan_change', 'user.impersonate', etc.
  target_id uuid,                 -- affected user_id
  details jsonb DEFAULT '{}',
  ip_address varchar(50),
  created_at timestamptz DEFAULT now()
);

-- Banners (dashboard + market page banners)
CREATE TABLE admin_banners (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  type varchar(30) NOT NULL,  -- 'dashboard', 'market_page', 'sidebar', 'popup'
  target_slug varchar(20),    -- 'tr', 'de', 'all', or null
  target_plan varchar(20),    -- 'starter', 'all', or null
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

-- Promo codes
CREATE TABLE promo_codes (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  code varchar(50) UNIQUE NOT NULL,
  type varchar(20) NOT NULL,  -- 'credits', 'discount_percent', 'plan_upgrade'
  value integer NOT NULL,
  max_uses integer,
  uses_count integer DEFAULT 0,
  target_plan varchar(20),
  expires_at timestamptz,
  is_active boolean DEFAULT true,
  created_by varchar(200),
  created_at timestamptz DEFAULT now()
);

-- Feature flags
CREATE TABLE feature_flags (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  flag_key varchar(100) UNIQUE NOT NULL,
  description text,
  is_enabled boolean DEFAULT false,
  enabled_for_plans jsonb DEFAULT '[]',  -- ['pro', 'enterprise']
  enabled_for_users jsonb DEFAULT '[]',  -- [user_id1, user_id2]
  rollout_percent integer DEFAULT 0,     -- 0-100
  updated_at timestamptz DEFAULT now()
);
```

---

## File Structure

```
apps/web/app/
├── (admin)/
│   ├── layout.tsx              ← Admin layout (sidebar, header, 2FA gate)
│   ├── login/
│   │   └── page.tsx            ← Admin login (separate from user login)
│   ├── page.tsx                ← Master Overview dashboard
│   ├── users/
│   │   ├── page.tsx            ← All users table with filters
│   │   └── [id]/
│   │       └── page.tsx        ← User detail + impersonate
│   ├── revenue/
│   │   └── page.tsx            ← MRR/ARR + churn + payments
│   ├── analytics/
│   │   └── page.tsx            ← Feature usage + geographic
│   ├── ai-costs/
│   │   └── page.tsx            ← AI API cost dashboard
│   ├── content/
│   │   ├── page.tsx            ← Market pages + banners list
│   │   ├── banners/
│   │   │   └── page.tsx        ← Banner/video manager
│   │   └── markets/
│   │       └── page.tsx        ← Market pages OS
│   ├── notifications/
│   │   └── page.tsx            ← Push + email + in-app broadcast
│   ├── partners/
│   │   ├── page.tsx            ← Affiliate + white-label overview
│   │   ├── affiliate/
│   │   │   └── page.tsx
│   │   └── whitelabel/
│   │       └── page.tsx
│   ├── system/
│   │   ├── page.tsx            ← Infrastructure health + config
│   │   ├── config/
│   │   │   └── page.tsx        ← Plan limits, prices, API keys
│   │   ├── flags/
│   │   │   └── page.tsx        ← Feature flags
│   │   └── promo/
│   │       └── page.tsx        ← Promo codes
│   ├── support/
│   │   └── page.tsx            ← Ticket management
│   └── security/
│       └── page.tsx            ← Audit logs + admin roles

apps/web/lib/
└── admin-api.ts                ← Admin API client (uses service key)

apps/web/middleware.ts          ← Add /admin protection

services/api/src/routes/
└── admin.ts                    ← All admin API endpoints
```

---

## Phase 1 (Week 1) — Launch Critical

1. Admin auth (login, 2FA, session, audit log)
2. Master Overview (realtime stats)
3. User Management (list, detail, edit, impersonate)
4. Plan & Credits management
5. Market Pages OS + Banner Manager
6. System Config (plan limits, prices)
7. Infrastructure Monitor (existing logs)

## Phase 2 (Week 2)

8. AI Cost Center (Claude + ElevenLabs tracking)
9. Revenue Dashboard (MRR/ARR/churn)
10. Notification Broadcast
11. Feature Usage Analytics
12. Geographic Analytics

## Phase 3 (Week 3)

13. Affiliate Management
14. White-label Management
15. Promo Codes
16. Feature Flags
17. Support Tickets
18. Reports & Export
