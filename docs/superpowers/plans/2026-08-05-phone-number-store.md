# Phone Number Store Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a self-service phone number store where customers can browse, purchase, and manage Twilio phone numbers from any country — usable for both voice-call campaigns and WhatsApp messaging.

**Architecture:** Twilio's `availablePhoneNumbers` API provides the number catalog with country/capability filters; `incomingPhoneNumbers.create()` provisions a purchased number under our Twilio account; numbers are stored in a `user_phone_numbers` Supabase table. Monthly Stripe Subscription Items (one per number) handle recurring billing; a webhook cancels and releases the Twilio number when the subscription item is removed.

**Tech Stack:** Twilio REST API (availablePhoneNumbers, incomingPhoneNumbers, messaging services), Stripe (Subscription Items on existing customer subscriptions), Supabase (user_phone_numbers table), Express/TypeScript API, Next.js App Router (React frontend), existing `authMiddleware` + `getSupabase()` patterns.

## Global Constraints

- All new backend files follow the existing pattern: `export {};` at line 1, CommonJS `require()` (no ESM imports), `router.get/post/delete` exported as `module.exports = router`
- Supabase v2: never use `.catch()` on query builder — use `try/catch` with `await`
- No new npm packages without explicit necessity; Twilio and Stripe SDKs already installed
- Stripe customer IDs already stored in `users.stripe_customer_id` — reuse them
- All monetary amounts stored in USD cents (integer) in DB; display in frontend as `$X.XX/mo`
- Twilio numbers provisioned under LeadFlow's master Twilio account (`TWILIO_ACCOUNT_SID`) — we resell at markup
- WhatsApp-capable numbers require Meta Business verification (done separately); the system manages the Twilio side only
- Frontend follows existing Tailwind + shadcn/ui patterns; no new UI library
- Error messages to users in Turkish; code comments in English

---

## File Map

**New files to create:**
- `services/api/src/routes/phone-numbers.ts` — Number store backend (catalog search, purchase, list, release)
- `services/api/migrations/20260805_user_phone_numbers.sql` — DB schema
- `apps/web/app/(dashboard)/phone-numbers/page.tsx` — Number store + My Numbers page

**Files to modify:**
- `services/api/src/index.ts` — Register `/api/phone-numbers` route (line ~205, after wa-numbers)
- `services/api/src/routes/payments.ts` — Handle `phone_number` subscription item in webhook (around line 291)
- `apps/web/components/Sidebar.tsx` — Add "Telefon Numaraları" nav item
- `apps/web/app/(dashboard)/voice-outreach/page.tsx` — Add purchased numbers to CallerID dropdown
- `services/api/src/routes/caller-ids.ts` — Add `/from-purchased` endpoint that imports a `user_phone_numbers` entry as a caller ID

---

### Task 1: Database Migration — user_phone_numbers table

**Files:**
- Create: `services/api/migrations/20260805_user_phone_numbers.sql`

**Interfaces:**
- Produces: `user_phone_numbers` table — used by Tasks 2, 3, 4

- [ ] **Step 1: Write migration SQL**

```sql
-- services/api/migrations/20260805_user_phone_numbers.sql
-- LeadFlow Phone Number Store — purchased Twilio numbers per user

CREATE TABLE IF NOT EXISTS user_phone_numbers (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id               UUID NOT NULL,            -- references public.users (no FK, auth middleware guards)
  phone_number          TEXT NOT NULL,            -- E.164 e.g. +14155551234
  friendly_name         TEXT,                     -- user-provided label
  country_code          TEXT NOT NULL,            -- ISO-2 e.g. 'TR', 'US', 'GB'
  country_name          TEXT NOT NULL,            -- e.g. 'Turkey'
  capabilities_voice    BOOLEAN DEFAULT FALSE,
  capabilities_sms      BOOLEAN DEFAULT FALSE,
  capabilities_whatsapp BOOLEAN DEFAULT FALSE,    -- set true after WA registration
  twilio_sid            TEXT NOT NULL,            -- Twilio IncomingPhoneNumber SID e.g. PN...
  twilio_monthly_cost   INTEGER NOT NULL,         -- USD cents (Twilio's cost to us)
  our_monthly_price     INTEGER NOT NULL,         -- USD cents (what we charge customer)
  stripe_subscription_item_id TEXT,              -- Stripe SI id for recurring billing
  status                TEXT NOT NULL DEFAULT 'active'
                          CHECK (status IN ('active', 'releasing', 'released')),
  wa_registered         BOOLEAN DEFAULT FALSE,    -- true after Twilio WA sender registration
  wa_messaging_service_sid TEXT,                  -- Twilio Messaging Service SID if WA registered
  purchased_at          TIMESTAMPTZ DEFAULT NOW(),
  released_at           TIMESTAMPTZ,
  updated_at            TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_phone_numbers_user_id ON user_phone_numbers(user_id);
CREATE INDEX IF NOT EXISTS idx_user_phone_numbers_status  ON user_phone_numbers(status);
CREATE UNIQUE INDEX IF NOT EXISTS idx_user_phone_numbers_twilio_sid ON user_phone_numbers(twilio_sid);
```

- [ ] **Step 2: Apply in Supabase SQL editor**

Paste and run the SQL in Supabase Dashboard → SQL Editor. Verify:
```sql
SELECT column_name, data_type FROM information_schema.columns
WHERE table_name = 'user_phone_numbers' ORDER BY ordinal_position;
```
Expected: 17 rows with the columns above.

- [ ] **Step 3: Commit**

```bash
git add services/api/migrations/20260805_user_phone_numbers.sql
git commit -m "feat: add user_phone_numbers migration for phone number store"
```

---

### Task 2: Backend API — phone-numbers route

**Files:**
- Create: `services/api/src/routes/phone-numbers.ts`
- Modify: `services/api/src/index.ts` (add route registration ~line 205)

**Interfaces:**
- Consumes: `user_phone_numbers` table (Task 1), existing `authMiddleware`, existing `getTwilioClient()` pattern from `caller-ids.ts`
- Produces:
  - `GET /api/phone-numbers/catalog?country=TR&type=local&capabilities=voice,sms` → `{ numbers: CountryNumber[] }`
  - `GET /api/phone-numbers/countries` → `{ countries: { code, name, flag, localAvailable, tollFreeAvailable }[] }`
  - `POST /api/phone-numbers/purchase` body `{ phoneNumber, friendlyName }` → `{ ok, id, phoneNumber, monthlyPrice }`
  - `GET /api/phone-numbers/my` → `{ numbers: UserPhoneNumber[] }`
  - `POST /api/phone-numbers/:id/set-friendly-name` body `{ friendlyName }` → `{ ok }`
  - `DELETE /api/phone-numbers/:id` → `{ ok }` (releases Twilio number, marks status='releasing')
  - `POST /api/phone-numbers/:id/register-whatsapp` → `{ ok, messagingServiceSid }`

**Pricing logic:** We charge 3× Twilio's monthly cost (minimum $3.00/month). Twilio's `availablePhoneNumbers` list returns `monthlyRenewPrice`; if zero/missing, default to $1.00 cost → $3.00 our price.

- [ ] **Step 1: Create the route file**

```typescript
export {};
/**
 * LeadFlow — Phone Number Store
 * Customers browse and purchase Twilio numbers for voice calls and WhatsApp.
 *
 * Endpoints:
 *   GET  /countries          — supported countries with availability
 *   GET  /catalog            — available numbers in a country
 *   POST /purchase           — buy a number
 *   GET  /my                 — user's purchased numbers
 *   POST /:id/set-friendly-name
 *   DELETE /:id              — release number
 *   POST /:id/register-whatsapp
 */

const express = require('express');
const { createClient } = require('@supabase/supabase-js');

const router  = express.Router();
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

const MARKUP_MULTIPLIER = 3;   // charge 3× Twilio cost
const MIN_OUR_PRICE_CENTS = 300; // minimum $3.00/month

function getTwilioClient() {
  const sid   = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  if (!sid || !token) throw new Error('TWILIO_ACCOUNT_SID veya TWILIO_AUTH_TOKEN eksik');
  return require('twilio')(sid, token);
}

function calcOurPrice(twilioCostCents: number): number {
  return Math.max(MIN_OUR_PRICE_CENTS, Math.round(twilioCostCents * MARKUP_MULTIPLIER));
}

// Static supported country list — extend as needed
const SUPPORTED_COUNTRIES = [
  { code: 'TR', name: 'Türkiye',          flag: '🇹🇷' },
  { code: 'US', name: 'Amerika Birleşik Devletleri', flag: '🇺🇸' },
  { code: 'GB', name: 'Birleşik Krallık', flag: '🇬🇧' },
  { code: 'DE', name: 'Almanya',          flag: '🇩🇪' },
  { code: 'FR', name: 'Fransa',           flag: '🇫🇷' },
  { code: 'NL', name: 'Hollanda',         flag: '🇳🇱' },
  { code: 'SE', name: 'İsveç',            flag: '🇸🇪' },
  { code: 'NO', name: 'Norveç',           flag: '🇳🇴' },
  { code: 'AU', name: 'Avustralya',       flag: '🇦🇺' },
  { code: 'CA', name: 'Kanada',           flag: '🇨🇦' },
  { code: 'BR', name: 'Brezilya',         flag: '🇧🇷' },
  { code: 'IN', name: 'Hindistan',        flag: '🇮🇳' },
  { code: 'SG', name: 'Singapur',         flag: '🇸🇬' },
  { code: 'AE', name: 'BAE (Dubai)',      flag: '🇦🇪' },
  { code: 'SA', name: 'Suudi Arabistan',  flag: '🇸🇦' },
];

// ─── GET /api/phone-numbers/countries ────────────────────────────────────────
router.get('/countries', async (_req: any, res: any) => {
  res.json({ countries: SUPPORTED_COUNTRIES });
});

// ─── GET /api/phone-numbers/catalog ──────────────────────────────────────────
// Query params: country (ISO-2), type (local|toll_free|mobile), capabilities (voice,sms,mms)
router.get('/catalog', async (req: any, res: any) => {
  try {
    const country      = (req.query.country as string || 'US').toUpperCase();
    const type         = (req.query.type as string || 'local');
    const capsParam    = (req.query.capabilities as string || '');
    const wantsVoice   = capsParam.includes('voice');
    const wantsSms     = capsParam.includes('sms');

    const client = getTwilioClient();

    const searchParams: any = { limit: 20 };
    if (wantsVoice) searchParams.voiceEnabled   = true;
    if (wantsSms)   searchParams.smsEnabled      = true;

    let twNumbers: any[] = [];
    try {
      if (type === 'toll_free') {
        twNumbers = await client.availablePhoneNumbers(country).tollFree.list(searchParams);
      } else if (type === 'mobile') {
        twNumbers = await client.availablePhoneNumbers(country).mobile.list(searchParams);
      } else {
        twNumbers = await client.availablePhoneNumbers(country).local.list(searchParams);
      }
    } catch (e: any) {
      // Country/type combo not supported — return empty
      console.warn(`[PhoneNumbers] catalog ${country}/${type} not supported:`, e.message);
      return res.json({ numbers: [] });
    }

    const numbers = twNumbers.map((n: any) => {
      const twilioCostCents = Math.round((parseFloat(n.monthlyRenewPrice || '1.00')) * 100);
      return {
        phoneNumber:      n.phoneNumber,
        friendlyName:     n.friendlyName,
        region:           n.region || '',
        isoCountry:       n.isoCountry,
        capabilities: {
          voice:     !!n.capabilities?.voice,
          sms:       !!n.capabilities?.sms,
          mms:       !!n.capabilities?.mms,
        },
        twilioCostCents,
        ourPriceCents:    calcOurPrice(twilioCostCents),
      };
    });

    res.json({ numbers });
  } catch (e: any) {
    console.error('[PhoneNumbers] /catalog error:', e.message);
    res.status(500).json({ error: e.message });
  }
});

// ─── POST /api/phone-numbers/purchase ─────────────────────────────────────────
router.post('/purchase', async (req: any, res: any) => {
  try {
    const { phoneNumber, friendlyName } = req.body;
    if (!phoneNumber) return res.status(400).json({ error: 'phoneNumber zorunlu' });

    // Check if user already owns this number
    const { data: existing } = await supabase
      .from('user_phone_numbers')
      .select('id')
      .eq('user_id', req.userId)
      .eq('phone_number', phoneNumber)
      .neq('status', 'released')
      .maybeSingle();

    if (existing) return res.status(409).json({ error: 'Bu numara zaten hesabınızda kayıtlı' });

    // Determine country from E.164
    const country = await getCountryFromNumber(phoneNumber);
    const countryMeta = SUPPORTED_COUNTRIES.find(c => c.code === country) || { code: country, name: country, flag: '' };

    // Provision number in Twilio
    const client = getTwilioClient();
    let incomingNumber: any;
    try {
      incomingNumber = await client.incomingPhoneNumbers.create({
        phoneNumber,
        friendlyName: friendlyName || phoneNumber,
        voiceUrl:     process.env.TWILIO_VOICE_WEBHOOK_URL || '',
        smsUrl:       process.env.TWILIO_SMS_WEBHOOK_URL   || '',
      });
    } catch (e: any) {
      console.error('[PhoneNumbers] Twilio provision error:', e.message);
      return res.status(502).json({ error: `Numara satın alınamadı: ${e.message}` });
    }

    // Get Twilio pricing
    let twilioCostCents = 100; // default $1.00
    try {
      const pricing = await client.pricing.v1.phoneNumbers.countries(country).fetch();
      const localRate = pricing.phoneNumberPrices?.find((p: any) =>
        p.number_type === 'local' || p.number_type === 'national'
      );
      if (localRate?.current_price) twilioCostCents = Math.round(parseFloat(localRate.current_price) * 100);
    } catch (_e) { /* use default */ }

    const ourPriceCents = calcOurPrice(twilioCostCents);
    const now = new Date().toISOString();

    // Insert DB record
    const { data: row, error: insertErr } = await supabase
      .from('user_phone_numbers')
      .insert([{
        user_id:           req.userId,
        phone_number:      phoneNumber,
        friendly_name:     friendlyName || phoneNumber,
        country_code:      countryMeta.code,
        country_name:      countryMeta.name,
        capabilities_voice: incomingNumber.capabilities?.voice  ?? false,
        capabilities_sms:   incomingNumber.capabilities?.sms    ?? false,
        twilio_sid:        incomingNumber.sid,
        twilio_monthly_cost: twilioCostCents,
        our_monthly_price:  ourPriceCents,
        status:            'active',
        purchased_at:      now,
        updated_at:        now,
      }])
      .select('id')
      .single();

    if (insertErr) {
      // Rollback Twilio purchase
      try { await client.incomingPhoneNumbers(incomingNumber.sid).remove(); } catch (_e) {}
      return res.status(500).json({ error: `Kayıt hatası: ${insertErr.message}` });
    }

    // Create Stripe Subscription Item for recurring billing
    try {
      await createStripeSubscriptionItem(req.userId, row.id, phoneNumber, ourPriceCents);
    } catch (stripeErr: any) {
      console.error('[PhoneNumbers] Stripe SI creation failed (number still active):', stripeErr.message);
      // Non-fatal — number is provisioned; Stripe SI can be retried
    }

    console.log(`[PhoneNumbers] Purchased: ${phoneNumber} userId=${req.userId} sid=${incomingNumber.sid}`);
    res.json({
      ok:           true,
      id:           row.id,
      phoneNumber,
      monthlyPrice: ourPriceCents,
      message:      `${phoneNumber} numarası başarıyla satın alındı! Aylık $${(ourPriceCents / 100).toFixed(2)} ücretlendirileceksiniz.`,
    });
  } catch (e: any) {
    console.error('[PhoneNumbers] /purchase error:', e.message);
    res.status(500).json({ error: e.message });
  }
});

// ─── GET /api/phone-numbers/my ────────────────────────────────────────────────
router.get('/my', async (req: any, res: any) => {
  try {
    const { data, error } = await supabase
      .from('user_phone_numbers')
      .select('*')
      .eq('user_id', req.userId)
      .neq('status', 'released')
      .order('purchased_at', { ascending: false });

    if (error) throw new Error(error.message);
    res.json({ numbers: data || [] });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// ─── POST /api/phone-numbers/:id/set-friendly-name ───────────────────────────
router.post('/:id/set-friendly-name', async (req: any, res: any) => {
  try {
    const { friendlyName } = req.body;
    if (!friendlyName) return res.status(400).json({ error: 'friendlyName zorunlu' });

    const { data, error } = await supabase
      .from('user_phone_numbers')
      .update({ friendly_name: friendlyName, updated_at: new Date().toISOString() })
      .eq('id', req.params.id)
      .eq('user_id', req.userId)
      .eq('status', 'active')
      .select('twilio_sid')
      .single();

    if (error || !data) return res.status(404).json({ error: 'Numara bulunamadı' });

    // Sync friendly name to Twilio
    try {
      await getTwilioClient().incomingPhoneNumbers(data.twilio_sid).update({ friendlyName });
    } catch (_e) { /* non-fatal */ }

    res.json({ ok: true });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// ─── DELETE /api/phone-numbers/:id ───────────────────────────────────────────
router.delete('/:id', async (req: any, res: any) => {
  try {
    const { data: row, error } = await supabase
      .from('user_phone_numbers')
      .select('*')
      .eq('id', req.params.id)
      .eq('user_id', req.userId)
      .neq('status', 'released')
      .single();

    if (error || !row) return res.status(404).json({ error: 'Numara bulunamadı' });

    // Mark releasing first
    await supabase.from('user_phone_numbers')
      .update({ status: 'releasing', updated_at: new Date().toISOString() })
      .eq('id', row.id);

    // Cancel Stripe Subscription Item
    if (row.stripe_subscription_item_id) {
      try { await cancelStripeSubscriptionItem(row.stripe_subscription_item_id); } catch (_e) {}
    }

    // Release Twilio number
    try {
      await getTwilioClient().incomingPhoneNumbers(row.twilio_sid).remove();
    } catch (e: any) {
      console.error('[PhoneNumbers] Twilio release error:', e.message);
    }

    await supabase.from('user_phone_numbers')
      .update({ status: 'released', released_at: new Date().toISOString(), updated_at: new Date().toISOString() })
      .eq('id', row.id);

    res.json({ ok: true });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// ─── POST /api/phone-numbers/:id/register-whatsapp ───────────────────────────
// Creates a Twilio Messaging Service with the number for WhatsApp
router.post('/:id/register-whatsapp', async (req: any, res: any) => {
  try {
    const { data: row, error } = await supabase
      .from('user_phone_numbers')
      .select('*')
      .eq('id', req.params.id)
      .eq('user_id', req.userId)
      .eq('status', 'active')
      .single();

    if (error || !row) return res.status(404).json({ error: 'Numara bulunamadı' });
    if (row.wa_registered) return res.status(409).json({ error: 'Bu numara zaten WhatsApp için kayıtlı' });

    const client = getTwilioClient();

    // Create Messaging Service
    let messagingService: any;
    try {
      messagingService = await client.messaging.v1.services.create({
        friendlyName: `LeadFlow WA — ${row.phone_number}`,
        useInboundWebhookOnNumber: false,
      });
      await client.messaging.v1.services(messagingService.sid).phoneNumbers.create({
        phoneNumberSid: row.twilio_sid,
      });
    } catch (e: any) {
      return res.status(502).json({ error: `WhatsApp kayıt hatası: ${e.message}` });
    }

    await supabase.from('user_phone_numbers')
      .update({
        wa_registered:            true,
        wa_messaging_service_sid: messagingService.sid,
        capabilities_whatsapp:    true,
        updated_at:               new Date().toISOString(),
      })
      .eq('id', row.id);

    res.json({ ok: true, messagingServiceSid: messagingService.sid,
      message: 'Messaging Service oluşturuldu. Meta Business doğrulaması tamamlandıktan sonra WhatsApp kampanyaları için kullanabilirsiniz.' });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function getCountryFromNumber(e164: string): Promise<string> {
  // Simple prefix mapping — covers common cases
  const prefixes: Record<string, string> = {
    '+90': 'TR', '+1': 'US', '+44': 'GB', '+49': 'DE',
    '+33': 'FR', '+31': 'NL', '+46': 'SE', '+47': 'NO',
    '+61': 'AU', '+55': 'BR', '+91': 'IN', '+65': 'SG',
    '+971': 'AE', '+966': 'SA',
  };
  for (const [prefix, code] of Object.entries(prefixes)) {
    if (e164.startsWith(prefix)) return code;
  }
  return 'US';
}

async function createStripeSubscriptionItem(
  userId: string, numberId: string, phoneNumber: string, priceCents: number
) {
  const Stripe = require('stripe');
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

  const { data: user } = await supabase
    .from('users')
    .select('stripe_customer_id, stripe_subscription_id')
    .eq('id', userId)
    .single();

  if (!user?.stripe_subscription_id) {
    console.warn('[PhoneNumbers] No active subscription for user — SI skipped');
    return;
  }

  // Create a one-off price for this exact amount
  const price = await stripe.prices.create({
    unit_amount:  priceCents,
    currency:     'usd',
    recurring:    { interval: 'month' },
    product_data: { name: `Telefon Numarası: ${phoneNumber}` },
  });

  const si = await stripe.subscriptionItems.create({
    subscription: user.stripe_subscription_id,
    price:        price.id,
    quantity:     1,
    metadata:     { leadflow_number_id: numberId, phone_number: phoneNumber },
  });

  await supabase.from('user_phone_numbers')
    .update({ stripe_subscription_item_id: si.id })
    .eq('id', numberId);
}

async function cancelStripeSubscriptionItem(siId: string) {
  const Stripe = require('stripe');
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
  await stripe.subscriptionItems.del(siId, { proration_behavior: 'none' });
}

module.exports = router;
```

- [ ] **Step 2: Register route in index.ts**

In `services/api/src/index.ts`, after the wa-numbers route (around line 204), add:
```typescript
app.use('/api/phone-numbers', authMiddleware, require('./routes/phone-numbers'));
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
cd services/api && npx tsc --noEmit 2>&1 | head -20
```
Expected: no errors related to phone-numbers.ts

- [ ] **Step 4: Manual API smoke test**

```bash
# Replace TOKEN with a real JWT from Supabase
curl -H "Authorization: Bearer TOKEN" \
  "http://localhost:4000/api/phone-numbers/countries"
# Expected: { countries: [...15 countries] }

curl -H "Authorization: Bearer TOKEN" \
  "http://localhost:4000/api/phone-numbers/catalog?country=US&type=local"
# Expected: { numbers: [...up to 20 numbers with ourPriceCents] }
```

- [ ] **Step 5: Commit**

```bash
git add services/api/src/routes/phone-numbers.ts services/api/src/index.ts
git commit -m "feat: phone number store backend — catalog, purchase, my numbers, release, WA register"
```

---

### Task 3: Frontend — Phone Number Store page

**Files:**
- Create: `apps/web/app/(dashboard)/phone-numbers/page.tsx`
- Modify: `apps/web/components/Sidebar.tsx` (add nav item)

**Interfaces:**
- Consumes: all endpoints from Task 2
- Produces: fully functional store UI accessible at `/phone-numbers`

The page has two tabs:
1. **Mağaza** (Store): Country selector → type/capability filters → number grid → Buy button with price
2. **Numaralarım** (My Numbers): Purchased numbers list with status, capabilities, actions (rename, release, WA register)

- [ ] **Step 1: Create the page component**

```typescript
'use client';
import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';

// ── Types ──────────────────────────────────────────────────────────────────────
interface CatalogNumber {
  phoneNumber: string;
  friendlyName: string;
  region: string;
  isoCountry: string;
  capabilities: { voice: boolean; sms: boolean; mms: boolean };
  twilioCostCents: number;
  ourPriceCents: number;
}

interface MyNumber {
  id: string;
  phone_number: string;
  friendly_name: string;
  country_code: string;
  country_name: string;
  capabilities_voice: boolean;
  capabilities_sms: boolean;
  capabilities_whatsapp: boolean;
  our_monthly_price: number;
  wa_registered: boolean;
  status: string;
  purchased_at: string;
}

interface Country {
  code: string;
  name: string;
  flag: string;
}

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

async function apiFetch(path: string, opts: RequestInit = {}) {
  const token = typeof window !== 'undefined'
    ? (document.cookie.match(/sb-access-token=([^;]+)/)?.[1]
       || localStorage.getItem('sb-access-token')
       || '')
    : '';
  const res = await fetch(`${API}${path}`, {
    ...opts,
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}`, ...(opts.headers || {}) },
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'İstek başarısız');
  return data;
}

// ── Main Component ─────────────────────────────────────────────────────────────
export default function PhoneNumbersPage() {
  const [tab, setTab] = useState<'store' | 'my'>('store');
  const [countries, setCountries] = useState<Country[]>([]);
  const [selectedCountry, setSelectedCountry] = useState('US');
  const [numberType, setNumberType] = useState<'local' | 'toll_free' | 'mobile'>('local');
  const [catalogNumbers, setCatalogNumbers] = useState<CatalogNumber[]>([]);
  const [myNumbers, setMyNumbers] = useState<MyNumber[]>([]);
  const [catalogLoading, setCatalogLoading] = useState(false);
  const [buying, setBuying] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [waRegistering, setWaRegistering] = useState<string | null>(null);
  const [releasing, setReleasing] = useState<string | null>(null);

  useEffect(() => {
    apiFetch('/api/phone-numbers/countries')
      .then(d => setCountries(d.countries))
      .catch(() => {});
    loadMyNumbers();
  }, []);

  const loadCatalog = useCallback(async () => {
    setCatalogLoading(true);
    setError('');
    try {
      const data = await apiFetch(
        `/api/phone-numbers/catalog?country=${selectedCountry}&type=${numberType}`
      );
      setCatalogNumbers(data.numbers);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setCatalogLoading(false);
    }
  }, [selectedCountry, numberType]);

  useEffect(() => { loadCatalog(); }, [loadCatalog]);

  async function loadMyNumbers() {
    try {
      const data = await apiFetch('/api/phone-numbers/my');
      setMyNumbers(data.numbers);
    } catch (_e) {}
  }

  async function purchaseNumber(num: CatalogNumber) {
    setBuying(num.phoneNumber);
    setError('');
    setSuccess('');
    try {
      const data = await apiFetch('/api/phone-numbers/purchase', {
        method: 'POST',
        body: JSON.stringify({ phoneNumber: num.phoneNumber }),
      });
      setSuccess(data.message);
      await loadMyNumbers();
      setTab('my');
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBuying(null);
    }
  }

  async function releaseNumber(id: string) {
    if (!confirm('Bu numarayı bırakmak istediğinizden emin misiniz? Bu işlem geri alınamaz.')) return;
    setReleasing(id);
    try {
      await apiFetch(`/api/phone-numbers/${id}`, { method: 'DELETE' });
      await loadMyNumbers();
      setSuccess('Numara başarıyla bırakıldı.');
    } catch (e: any) {
      setError(e.message);
    } finally {
      setReleasing(null);
    }
  }

  async function registerWhatsapp(id: string) {
    setWaRegistering(id);
    setError('');
    try {
      const data = await apiFetch(`/api/phone-numbers/${id}/register-whatsapp`, { method: 'POST' });
      setSuccess(data.message);
      await loadMyNumbers();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setWaRegistering(null);
    }
  }

  const countryMeta = countries.find(c => c.code === selectedCountry);

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Telefon Numaraları</h1>
        <p className="text-gray-500 mt-1">Ses aramaları ve WhatsApp kampanyaları için dünyadan numara satın alın.</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 bg-gray-100 dark:bg-gray-800 p-1 rounded-lg w-fit">
        {(['store', 'my'] as const).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              tab === t
                ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
          >
            {t === 'store' ? '🛒 Numara Satın Al' : `📱 Numaralarım (${myNumbers.length})`}
          </button>
        ))}
      </div>

      {/* Alerts */}
      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
          {error}
        </div>
      )}
      {success && (
        <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm">
          {success}
        </div>
      )}

      {/* ── STORE TAB ── */}
      {tab === 'store' && (
        <div>
          {/* Filters */}
          <div className="flex flex-wrap gap-3 mb-6">
            <select
              value={selectedCountry}
              onChange={e => setSelectedCountry(e.target.value)}
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-sm"
            >
              {countries.map(c => (
                <option key={c.code} value={c.code}>{c.flag} {c.name}</option>
              ))}
            </select>

            <select
              value={numberType}
              onChange={e => setNumberType(e.target.value as any)}
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-sm"
            >
              <option value="local">Yerel Numara</option>
              <option value="toll_free">Ücretsiz Hat</option>
              <option value="mobile">Mobil</option>
            </select>
          </div>

          {/* Number Grid */}
          {catalogLoading ? (
            <div className="text-center py-16 text-gray-500">Numaralar yükleniyor...</div>
          ) : catalogNumbers.length === 0 ? (
            <div className="text-center py-16 text-gray-400">
              <div className="text-4xl mb-3">📞</div>
              <p>Bu ülke/tür için uygun numara bulunamadı.</p>
            </div>
          ) : (
            <div className="grid gap-3">
              {catalogNumbers.map(num => (
                <div
                  key={num.phoneNumber}
                  className="flex items-center justify-between p-4 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl"
                >
                  <div>
                    <div className="font-mono text-lg font-semibold text-gray-900 dark:text-white">
                      {num.phoneNumber}
                    </div>
                    <div className="text-sm text-gray-500 mt-1">
                      {countryMeta?.flag} {num.region || countryMeta?.name}
                      {' · '}
                      {num.capabilities.voice && '📞 Ses '}
                      {num.capabilities.sms && '💬 SMS'}
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <div className="text-lg font-bold text-gray-900 dark:text-white">
                        ${(num.ourPriceCents / 100).toFixed(2)}
                      </div>
                      <div className="text-xs text-gray-500">/ay</div>
                    </div>
                    <button
                      onClick={() => purchaseNumber(num)}
                      disabled={buying === num.phoneNumber}
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors"
                    >
                      {buying === num.phoneNumber ? 'Satın alınıyor...' : 'Satın Al'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── MY NUMBERS TAB ── */}
      {tab === 'my' && (
        <div>
          {myNumbers.length === 0 ? (
            <div className="text-center py-16 text-gray-400">
              <div className="text-4xl mb-3">📱</div>
              <p>Henüz numara satın almadınız.</p>
              <button
                onClick={() => setTab('store')}
                className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm"
              >
                Numara Satın Al
              </button>
            </div>
          ) : (
            <div className="grid gap-3">
              {myNumbers.map(num => (
                <div
                  key={num.id}
                  className="p-4 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="font-mono text-lg font-semibold text-gray-900 dark:text-white">
                        {num.phone_number}
                      </div>
                      <div className="text-sm text-gray-500 mt-1">
                        {num.country_name}
                        {' · $'}{(num.our_monthly_price / 100).toFixed(2)}/ay
                      </div>
                      <div className="flex flex-wrap gap-1 mt-2">
                        {num.capabilities_voice && (
                          <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs rounded-full">📞 Ses</span>
                        )}
                        {num.capabilities_sms && (
                          <span className="px-2 py-0.5 bg-gray-100 text-gray-700 text-xs rounded-full">💬 SMS</span>
                        )}
                        {num.wa_registered ? (
                          <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs rounded-full">✅ WhatsApp</span>
                        ) : (
                          <span className="px-2 py-0.5 bg-yellow-100 text-yellow-700 text-xs rounded-full">WhatsApp Kayıtsız</span>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      {!num.wa_registered && num.capabilities_sms && (
                        <button
                          onClick={() => registerWhatsapp(num.id)}
                          disabled={waRegistering === num.id}
                          className="px-3 py-1.5 text-xs bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white rounded-lg"
                        >
                          {waRegistering === num.id ? '...' : 'WhatsApp Kaydet'}
                        </button>
                      )}
                      <button
                        onClick={() => releaseNumber(num.id)}
                        disabled={releasing === num.id}
                        className="px-3 py-1.5 text-xs bg-red-100 hover:bg-red-200 text-red-700 rounded-lg disabled:opacity-50"
                      >
                        {releasing === num.id ? '...' : 'Bırak'}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Add Sidebar nav item**

In `apps/web/components/Sidebar.tsx`, find where the voice-outreach or wa-numbers nav item is declared. Add a new nav item for phone-numbers alongside it. The exact JSX depends on the sidebar's pattern — look for the array of nav items or the hardcoded list. Add:
```typescript
{ href: '/phone-numbers', label: 'Telefon Numaraları', icon: <PhoneIcon /> }
// or equivalent based on sidebar's existing pattern
```

- [ ] **Step 3: Test in browser**

Start the dev server (`cd apps/web && npm run dev`) and navigate to `/phone-numbers`. Verify:
- Country dropdown shows 15 countries
- Selecting a country + type loads numbers from API
- Each number shows price
- "Numaralarım" tab shows empty state when no numbers purchased

- [ ] **Step 4: Commit**

```bash
git add apps/web/app/(dashboard)/phone-numbers/page.tsx apps/web/components/Sidebar.tsx
git commit -m "feat: phone number store frontend — catalog browse, purchase, my numbers management"
```

---

### Task 4: Voice Outreach Integration — purchased numbers as caller IDs

**Files:**
- Modify: `services/api/src/routes/caller-ids.ts` — add `GET /from-purchased` endpoint
- Modify: `apps/web/app/(dashboard)/voice-outreach/page.tsx` — CallerIdPanel loads purchased numbers

The goal: when a user selects a caller ID in voice-outreach, they can choose from both manually added (Twilio Verified) numbers AND their purchased `user_phone_numbers`. Purchased numbers are already on our Twilio account, so no verification needed — they can be used as `from` immediately.

**Interfaces:**
- Consumes: `user_phone_numbers` table (Task 1), existing CallerIdPanel in voice-outreach page
- Produces: `GET /api/voice/caller-ids/from-purchased` → `{ numbers: PurchasedCallerIdOption[] }`

- [ ] **Step 1: Add /from-purchased endpoint to caller-ids.ts**

In `services/api/src/routes/caller-ids.ts`, before `module.exports = router`, add:

```typescript
// ─── GET /api/voice/caller-ids/from-purchased ─────────────────────────────────
// Returns user's purchased phone numbers that have voice capability.
// These are already on our Twilio account, so no verification needed.
router.get('/from-purchased', async (req: any, res: any) => {
  try {
    const { data, error } = await supabase
      .from('user_phone_numbers')
      .select('id, phone_number, friendly_name, country_code, country_name')
      .eq('user_id', req.userId)
      .eq('status', 'active')
      .eq('capabilities_voice', true)
      .order('purchased_at', { ascending: false });

    if (error) throw new Error(error.message);
    res.json({ numbers: (data || []).map((n: any) => ({
      id:           n.id,
      phoneNumber:  n.phone_number,
      friendlyName: n.friendly_name || n.phone_number,
      countryCode:  n.country_code,
      countryName:  n.country_name,
      source:       'purchased',
    })) });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});
```

- [ ] **Step 2: Update CallerIdPanel in voice-outreach page**

In `apps/web/app/(dashboard)/voice-outreach/page.tsx`, find the CallerIdPanel component (the section that loads and displays caller IDs). After loading `callerIds` from `/api/voice/caller-ids`, also fetch from `/api/voice/caller-ids/from-purchased` and merge the lists, labeling purchased numbers distinctly.

Find the existing `fetchCallerIds` or equivalent function and add:
```typescript
// After loading existing callerIds:
const purchasedRes = await fetch(`${API_URL}/api/voice/caller-ids/from-purchased`, { headers: authHeaders });
const purchasedData = await purchasedRes.json();
const purchasedNumbers = (purchasedData.numbers || []).map((n: any) => ({
  ...n,
  is_verified: true,           // purchased numbers are pre-verified
  is_default:  false,
  phone_number: n.phoneNumber,
  friendly_name: `${n.friendlyName} (Satın Alındı)`,
}));
// Merge — avoid duplicates by phone_number
const merged = [...existingCallerIds, ...purchasedNumbers.filter(
  (p: any) => !existingCallerIds.some((e: any) => e.phone_number === p.phoneNumber)
)];
setCallerIds(merged);
```

- [ ] **Step 3: Update makeCall to handle purchased number source**

In `services/api/src/routes/voice-outreach.ts`, the `makeCall` function receives `callerId` from the frontend. When the caller ID is a purchased number (already on our Twilio account), it should be used directly as the `from` number. This already works since we provision these numbers under our Twilio account — no extra changes needed in makeCall.

Verify by checking voice-outreach.ts call to callEngine.makeCall — confirm `callerId` is passed as `params.callerId` and used as `from`.

- [ ] **Step 4: Test**

Start a voice-outreach session. In the CallerID panel, verify that purchased numbers (with voice capability) appear in the list. Select one and initiate a test call — the call should use that number as the `from` number without requiring Twilio Verified Caller ID flow.

- [ ] **Step 5: Commit**

```bash
git add services/api/src/routes/caller-ids.ts apps/web/app/(dashboard)/voice-outreach/page.tsx
git commit -m "feat: expose purchased numbers as pre-verified caller IDs in voice-outreach"
```

---

### Task 5: WhatsApp Campaign Integration — purchased numbers in WA campaigns

**Files:**
- Modify: `apps/web/app/(dashboard)/wa-numbers/page.tsx` — show purchased WA-registered numbers
- Modify: `services/api/src/routes/messages.ts` (or campaigns.ts) — allow using WA messaging service SID from purchased number

**Goal:** After a user registers a purchased number for WhatsApp (Task 3's `/register-whatsapp` endpoint), they should be able to select that Messaging Service SID when sending WhatsApp campaigns, instead of only the Green API / WA Web approach.

**Note:** WhatsApp Business API via Twilio requires Meta Business verification (done outside our system). This task wires up the Twilio Messaging Service so it's available once the user completes Meta verification.

- [ ] **Step 1: Add purchased WA numbers to wa-numbers page**

In `apps/web/app/(dashboard)/wa-numbers/page.tsx`, add a section showing purchased numbers with WA registration status. This is informational — show a button to register for WhatsApp (calls the `/register-whatsapp` endpoint from Task 3) and a link to Phone Numbers page.

Find the JSX structure of the wa-numbers page and add at the end of the page (before closing div):

```tsx
{/* Purchased Numbers with WA capability */}
<div className="mt-8">
  <h3 className="text-lg font-semibold mb-3">Satın Alınan Numaralar (Twilio WhatsApp)</h3>
  <p className="text-sm text-gray-500 mb-4">
    Telefon mağazasından satın aldığınız numaraları Twilio WhatsApp Business API için kaydedin.
    Meta Business doğrulaması tamamlandıktan sonra kampanyalarda kullanabilirsiniz.
  </p>
  <PurchasedNumbersWASection />
</div>
```

Add `PurchasedNumbersWASection` component that fetches `/api/phone-numbers/my` and shows numbers with `capabilities_sms: true`, with a "WhatsApp Kaydet" button calling `/api/phone-numbers/:id/register-whatsapp`.

- [ ] **Step 2: Surface Messaging Service SID in campaign sending**

In the campaign messages route (check `services/api/src/routes/messages.ts` or `campaigns.ts`), if the campaign has a `wa_messaging_service_sid` set, use Twilio's messaging service for sending instead of Green API. Check if Twilio is already used for SMS — if yes, add a branch:

```typescript
if (params.twilioMessagingServiceSid) {
  // Send via Twilio WhatsApp Business API
  const client = getTwilioClient();
  await client.messages.create({
    messagingServiceSid: params.twilioMessagingServiceSid,
    to: `whatsapp:${toNumber}`,
    body: messageBody,
  });
} else {
  // Existing Green API path
}
```

- [ ] **Step 3: Test WA registration flow**

Purchase a US number with SMS capability. On the My Numbers tab, click "WhatsApp Kaydet". Verify:
- API creates a Twilio Messaging Service
- DB row has `wa_registered=true` and `wa_messaging_service_sid` set
- Number shows green "✅ WhatsApp" badge

- [ ] **Step 4: Commit**

```bash
git add apps/web/app/(dashboard)/wa-numbers/page.tsx services/api/src/routes/messages.ts
git commit -m "feat: purchased numbers WA registration UI and Twilio Messaging Service integration"
```

---

### Task 6: Admin Pricing & Monitoring (stretch)

**Files:**
- Modify: `services/api/src/routes/payments.ts` — handle Stripe `customer.subscription.updated` for number SI removals
- Modify: `services/api/src/config/plan-limits.ts` — optionally add per-plan number allowances

**Goal:** When a Stripe subscription item for a phone number is removed (e.g., payment fails), automatically release the Twilio number to prevent ongoing costs.

- [ ] **Step 1: Handle subscription item deletion in Stripe webhook**

In `services/api/src/routes/payments.ts`, in the webhook handler section (around line 354), add a new event handler:

```typescript
// Handle individual subscription item cancellation
if (event.type === 'customer.subscription_item.deleted') {
  const si = event.data.object;
  const numberId = si.metadata?.leadflow_number_id;
  if (numberId) {
    // Release the Twilio number
    const { data: numRow } = await supabase
      .from('user_phone_numbers')
      .select('twilio_sid')
      .eq('id', numberId)
      .single();
    if (numRow?.twilio_sid) {
      try {
        const twilio = require('twilio')(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
        await twilio.incomingPhoneNumbers(numRow.twilio_sid).remove();
      } catch (e: any) {
        console.error('[PhoneNumbers] webhook Twilio release error:', e.message);
      }
    }
    await supabase.from('user_phone_numbers')
      .update({ status: 'released', released_at: new Date().toISOString() })
      .eq('id', numberId);
  }
}
```

- [ ] **Step 2: Add Stripe webhook event type to Stripe dashboard**

In Stripe Dashboard → Webhooks → your LeadFlow endpoint → Edit, add `customer.subscription_item.deleted` to the list of listened events. (Manual step — document in env setup README.)

- [ ] **Step 3: Commit**

```bash
git add services/api/src/routes/payments.ts
git commit -m "feat: auto-release Twilio number on Stripe subscription item deletion"
```

---

## Environment Variables Required

Add these to Railway (production) and `.env.local` (development):

```bash
# Already should exist:
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...

# New (optional — for voice webhook on purchased numbers):
TWILIO_VOICE_WEBHOOK_URL=https://api.sovlo.io/api/voice/webhook/twilio
TWILIO_SMS_WEBHOOK_URL=https://api.sovlo.io/api/voice/webhook/twilio-sms
```

## Implementation Order

1. **Task 1** (DB migration) — apply immediately in Supabase SQL editor; no code change
2. **Task 2** (backend API) — deploy to Railway; test catalog + purchase endpoints
3. **Task 3** (frontend store page) — deploy to Vercel; user-facing store available
4. **Task 4** (voice integration) — purchased numbers appear as caller IDs; fixes the 480 error for customers using Turkish geographic numbers they purchase
5. **Task 5** (WA integration) — wires up WhatsApp Business API path
6. **Task 6** (Stripe auto-release) — operational safety net; add after Tasks 1-5 confirmed working

## Revenue Model

| Scenario | Twilio Cost | Our Price | Margin |
|----------|-------------|-----------|--------|
| Turkish geographic | ~$1.00/mo | $3.00/mo | $2.00 |
| US local | ~$1.15/mo | $3.45/mo | $2.30 |
| UK local | ~$1.00/mo | $3.00/mo | $2.00 |
| US toll-free | ~$2.00/mo | $6.00/mo | $4.00 |

Volume × markup → meaningful revenue stream on top of plan subscriptions.
