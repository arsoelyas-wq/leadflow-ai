'use client'
import { useEffect, useState, useCallback } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { api } from '@/lib/api'
import type { MarketPage } from '@/lib/market-pages'
import { MARKET_SLUGS } from '@/lib/market-pages'
import {
  Save, Globe2, Plus, Trash2, ExternalLink,
  CheckCircle, AlertCircle, ArrowLeft, Eye
} from 'lucide-react'

// ── Style constants ────────────────────────────────────────────────────────────
const S = {
  inp: {
    background: 'rgba(255,255,255,0.04)',
    border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: 10, color: '#e2e8f0', fontSize: 14,
    padding: '10px 14px', outline: 'none', width: '100%',
    fontFamily: 'inherit', boxSizing: 'border-box' as const,
    transition: 'border-color 0.15s',
  } as React.CSSProperties,
  label: {
    color: '#94a3b8', fontSize: 11, fontWeight: 700,
    textTransform: 'uppercase' as const, letterSpacing: '0.07em',
    marginBottom: 6, display: 'block',
  } as React.CSSProperties,
  card: {
    background: 'linear-gradient(135deg,rgba(5,10,25,0.95),rgba(8,15,35,0.97))',
    border: '1px solid rgba(255,255,255,0.06)',
    borderRadius: 16, padding: 24, marginBottom: 20,
  } as React.CSSProperties,
}

// ── Reusable form atoms ───────────────────────────────────────────────────────
function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <label style={S.label}>{label}</label>
      {hint && <p style={{ color: '#475569', fontSize: 12, margin: '-2px 0 8px' }}>{hint}</p>}
      {children}
    </div>
  )
}

function Inp({ value, onChange, placeholder, multiline }: { value: string; onChange: (v: string) => void; placeholder?: string; multiline?: boolean }) {
  const style: React.CSSProperties = { ...S.inp, resize: multiline ? 'vertical' : 'none', minHeight: multiline ? 90 : undefined }
  return multiline
    ? <textarea style={style} value={value || ''} onChange={e => onChange(e.target.value)} placeholder={placeholder} rows={3} />
    : <input style={style} value={value || ''} onChange={e => onChange(e.target.value)} placeholder={placeholder} />
}

function Row({ children }: { children: React.ReactNode }) {
  return <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>{children}</div>
}

function Section({ title, emoji, children }: { title: string; emoji: string; children: React.ReactNode }) {
  return (
    <div style={S.card}>
      <h3 style={{ color: '#fff', fontSize: 15, fontWeight: 700, margin: '0 0 20px', display: 'flex', alignItems: 'center', gap: 9 }}>
        <span style={{ fontSize: 20 }}>{emoji}</span> {title}
      </h3>
      {children}
    </div>
  )
}

// ── JSON array editor (for stats, features, testimonials) ────────────────────
type JItem = Record<string, string>
function JsonEditor({
  value, onChange, fields, addLabel,
}: {
  value: JItem[]; onChange: (v: JItem[]) => void
  fields: { key: string; label: string; multiline?: boolean }[]
  addLabel: string
}) {
  const items = Array.isArray(value) ? value : []
  const add = () => onChange([...items, Object.fromEntries(fields.map(f => [f.key, '']))])
  const remove = (i: number) => onChange(items.filter((_, idx) => idx !== i))
  const update = (i: number, key: string, v: string) => {
    const next = [...items]; next[i] = { ...next[i], [key]: v }; onChange(next)
  }
  const move = (from: number, to: number) => {
    const next = [...items]
    const [item] = next.splice(from, 1)
    next.splice(to, 0, item)
    onChange(next)
  }

  return (
    <div>
      {items.map((item, i) => (
        <div key={i} style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 12, padding: '16px 16px 10px', marginBottom: 10 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <span style={{ color: '#475569', fontSize: 12, fontWeight: 600 }}>#{i + 1}</span>
            <div style={{ display: 'flex', gap: 6 }}>
              {i > 0 && <button onClick={() => move(i, i-1)} style={{ background: 'none', border: 'none', color: '#475569', cursor: 'pointer', fontSize: 14 }}>↑</button>}
              {i < items.length-1 && <button onClick={() => move(i, i+1)} style={{ background: 'none', border: 'none', color: '#475569', cursor: 'pointer', fontSize: 14 }}>↓</button>}
              <button onClick={() => remove(i)} style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 7, color: '#f87171', cursor: 'pointer', padding: '3px 10px', fontSize: 12, display: 'flex', alignItems: 'center', gap: 4 }}>
                <Trash2 size={12} /> Kaldır
              </button>
            </div>
          </div>
          <div style={{
            display: 'grid',
            gridTemplateColumns: fields.length >= 3
              ? fields.some(f => f.multiline) ? '1fr 1fr' : `repeat(${Math.min(fields.length, 3)}, 1fr)`
              : fields.map(f => f.multiline ? '2fr' : '1fr').join(' '),
            gap: 12,
          }}>
            {fields.map(f => (
              <div key={f.key} style={f.multiline ? { gridColumn: '1 / -1' } : {}}>
                <label style={S.label}>{f.label}</label>
                {f.multiline
                  ? <textarea style={{ ...S.inp, resize: 'vertical', minHeight: 80 } as React.CSSProperties} value={item[f.key] || ''} onChange={e => update(i, f.key, e.target.value)} rows={3} />
                  : <input style={S.inp} value={item[f.key] || ''} onChange={e => update(i, f.key, e.target.value)} />
                }
              </div>
            ))}
          </div>
        </div>
      ))}
      <button onClick={add} style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '9px 18px', borderRadius: 9, border: '1px dashed rgba(255,255,255,0.12)', background: 'transparent', color: '#60a5fa', fontSize: 13, cursor: 'pointer', fontWeight: 600, marginTop: 4 }}>
        <Plus size={14} /> {addLabel}
      </button>
    </div>
  )
}

// String list editor (for price features)
function StringList({ value, onChange, placeholder }: { value: string[]; onChange: (v: string[]) => void; placeholder?: string }) {
  const items = Array.isArray(value) ? value : []
  const add = () => onChange([...items, ''])
  const remove = (i: number) => onChange(items.filter((_, idx) => idx !== i))
  const update = (i: number, v: string) => { const n = [...items]; n[i] = v; onChange(n) }
  return (
    <div>
      {items.map((item, i) => (
        <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
          <input style={{ ...S.inp, flex: 1 }} value={item} onChange={e => update(i, e.target.value)} placeholder={placeholder} />
          <button onClick={() => remove(i)} style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.15)', borderRadius: 9, color: '#f87171', cursor: 'pointer', padding: '0 13px' }}>
            <Trash2 size={13} />
          </button>
        </div>
      ))}
      <button onClick={add} style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '8px 16px', borderRadius: 9, border: '1px dashed rgba(255,255,255,0.12)', background: 'transparent', color: '#60a5fa', fontSize: 13, cursor: 'pointer', fontWeight: 600 }}>
        <Plus size={14} /> Özellik Ekle
      </button>
    </div>
  )
}

// ── Main editor page ──────────────────────────────────────────────────────────
export default function MarketEditorPage() {
  const params = useParams()
  const slug = params.locale as string
  const market = MARKET_SLUGS[slug]

  const [page, setPage] = useState<Partial<MarketPage>>({
    slug,
    locale: market?.locale || slug,
    is_published: false,
    stats: [], features: [], testimonials: [], logos: [], price_features: [],
    currency: market?.currency || 'TRY',
    currency_symbol: market?.symbol || '₺',
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null)

  const load = useCallback(async () => {
    try {
      const data = await api.get(`/api/market-pages/${slug}`)
      if (data.page) setPage(data.page)
    } catch {} finally { setLoading(false) }
  }, [slug])

  useEffect(() => { load() }, [load])

  const set = (field: string, value: unknown) =>
    setPage(p => ({ ...p, [field]: value }))

  const save = async (publish?: boolean) => {
    setSaving(true)
    setMsg(null)
    try {
      const payload: Record<string, unknown> = { ...page }
      if (publish !== undefined) payload.is_published = publish
      await api.patch(`/api/market-pages/${slug}`, payload)
      setPage(p => ({ ...p, is_published: publish ?? p.is_published }))
      setMsg({ type: 'ok', text: publish ? '🎉 Yayınlandı! Sayfa artık erişilebilir.' : '✓ Değişiklikler kaydedildi' })
    } catch (e: unknown) {
      setMsg({ type: 'err', text: e instanceof Error ? e.message : 'Hata' })
    } finally {
      setSaving(false)
      setTimeout(() => setMsg(null), 4000)
    }
  }

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 200 }}>
        <div style={{ color: '#475569', fontSize: 14 }}>Yükleniyor...</div>
      </div>
    )
  }

  return (
    <div style={{ maxWidth: 820 }}>
      {/* ── Top header ── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 28, flexWrap: 'wrap', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <Link href="/market-pages" style={{ color: '#475569', display: 'flex', alignItems: 'center', gap: 6, textDecoration: 'none', fontSize: 13, fontWeight: 500, padding: '6px 0' }}>
            <ArrowLeft size={15} /> Geri
          </Link>
          <span style={{ fontSize: 36 }}>{market?.flag || '🌍'}</span>
          <div>
            <h1 style={{ color: '#fff', fontSize: 22, fontWeight: 800, margin: 0, letterSpacing: '-0.015em' }}>
              {market?.name || slug.toUpperCase()} Pazar Sayfası
            </h1>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 5 }}>
              <code style={{ color: '#475569', fontSize: 12, fontFamily: 'monospace', background: 'rgba(255,255,255,0.04)', padding: '2px 8px', borderRadius: 6 }}>
                leadflow.ai/{slug}
              </code>
              <span style={{
                padding: '3px 10px', borderRadius: 100, fontSize: 11, fontWeight: 700,
                background: page.is_published ? 'rgba(16,185,129,0.12)' : 'rgba(71,85,105,0.3)',
                color: page.is_published ? '#34d399' : '#64748b',
                border: page.is_published ? '1px solid rgba(16,185,129,0.25)' : 'none',
              }}>
                {page.is_published ? '● Yayında' : '○ Taslak'}
              </span>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 10 }}>
          {page.is_published && (
            <a href={`/${slug}`} target="_blank" rel="noreferrer" style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '10px 16px', borderRadius: 10, border: '1px solid rgba(255,255,255,0.08)', background: 'transparent', color: '#94a3b8', fontSize: 13, textDecoration: 'none', fontWeight: 600 }}>
              <Eye size={14} /> Görüntüle
            </a>
          )}
          <button onClick={() => save()} disabled={saving} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '10px 18px', borderRadius: 10, border: '1px solid rgba(255,255,255,0.09)', background: 'rgba(255,255,255,0.05)', color: '#e2e8f0', fontSize: 13, cursor: 'pointer', fontWeight: 600 }}>
            <Save size={14} /> {saving ? 'Kaydediliyor...' : 'Kaydet'}
          </button>
          <button onClick={() => save(true)} disabled={saving} style={{
            display: 'flex', alignItems: 'center', gap: 6,
            padding: '10px 22px', borderRadius: 10, border: 'none',
            background: page.is_published
              ? 'linear-gradient(135deg,rgba(16,185,129,0.25),rgba(5,150,105,0.2))'
              : 'linear-gradient(135deg,#3b82f6,#6366f1)',
            color: page.is_published ? '#34d399' : '#fff',
            fontSize: 13, cursor: 'pointer', fontWeight: 700,
            boxShadow: page.is_published ? 'none' : '0 4px 15px rgba(59,130,246,0.35)',
          }}>
            <Globe2 size={14} />
            {page.is_published ? 'Güncelle & Yayınla' : '🚀 Yayınla'}
          </button>
        </div>
      </div>

      {/* Status toast */}
      {msg && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 10,
          padding: '13px 18px', borderRadius: 12, marginBottom: 22,
          background: msg.type === 'ok' ? 'rgba(16,185,129,0.08)' : 'rgba(239,68,68,0.08)',
          border: `1px solid ${msg.type === 'ok' ? 'rgba(16,185,129,0.25)' : 'rgba(239,68,68,0.25)'}`,
          color: msg.type === 'ok' ? '#34d399' : '#f87171',
          fontSize: 14,
        }}>
          {msg.type === 'ok' ? <CheckCircle size={17} /> : <AlertCircle size={17} />}
          {msg.text}
        </div>
      )}

      {/* ── HERO ── */}
      <Section title="Hero Bölümü" emoji="🦸">
        <Field label="Badge (üst etiket)" hint="Kısa dikkat çekici rozet. Ör: 🇹🇷 Türkiye'ye Özel Platform">
          <Inp value={page.hero_badge || ''} onChange={v => set('hero_badge', v)} placeholder="🇹🇷 Türkiye'ye Özel Platform" />
        </Field>
        <Field label="Ana Başlık" hint="En önemli mesajınız. 6-12 kelime ideal.">
          <Inp value={page.hero_headline || ''} onChange={v => set('hero_headline', v)} placeholder="B2B Satışlarınızı Yapay Zeka ile Otomatikleştirin" multiline />
        </Field>
        <Field label="Alt Başlık">
          <Inp value={page.hero_subheadline || ''} onChange={v => set('hero_subheadline', v)} placeholder="LeadFlow AI ile günde 500+ potansiyel müşteriyle iletişim kurun..." multiline />
        </Field>
        <Row>
          <Field label="Birincil CTA — Buton Metni">
            <Inp value={page.hero_cta_primary_text || ''} onChange={v => set('hero_cta_primary_text', v)} placeholder="🚀 Ücretsiz Deneyin — 14 Gün" />
          </Field>
          <Field label="Birincil CTA — Hedef URL">
            <Inp value={page.hero_cta_primary_url || ''} onChange={v => set('hero_cta_primary_url', v)} placeholder="https://...app.vercel.app/register" />
          </Field>
          <Field label="İkincil CTA — Buton Metni">
            <Inp value={page.hero_cta_secondary_text || ''} onChange={v => set('hero_cta_secondary_text', v)} placeholder="▶ Demo İzle" />
          </Field>
          <Field label="İkincil CTA — Hedef URL">
            <Inp value={page.hero_cta_secondary_url || ''} onChange={v => set('hero_cta_secondary_url', v)} placeholder="https://calendly.com/..." />
          </Field>
        </Row>
        <Row>
          <Field label="Kapak Görseli URL" hint="PNG/JPG, maks 2MB">
            <Inp value={page.hero_image_url || ''} onChange={v => set('hero_image_url', v)} placeholder="https://cdn.example.com/hero.png" />
          </Field>
          <Field label="Tanıtım Videosu URL" hint="YouTube/Vimeo. Görsel varsa video önceliklidir.">
            <Inp value={page.hero_video_url || ''} onChange={v => set('hero_video_url', v)} placeholder="https://youtube.com/watch?v=..." />
          </Field>
        </Row>
      </Section>

      {/* ── STATS ── */}
      <Section title="Sosyal Kanıt — İstatistikler" emoji="📊">
        <JsonEditor
          value={(page.stats || []) as unknown as JItem[]}
          onChange={v => set('stats', v)}
          fields={[
            { key: 'value', label: 'Değer (ör: 2.500+)' },
            { key: 'label', label: 'Etiket (ör: Aktif Kullanıcı)' },
          ]}
          addLabel="İstatistik Ekle"
        />
      </Section>

      {/* ── FEATURES ── */}
      <Section title="Özellikler / Avantajlar" emoji="🎯">
        <JsonEditor
          value={(page.features || []) as unknown as JItem[]}
          onChange={v => set('features', v)}
          fields={[
            { key: 'icon', label: 'Emoji İkon' },
            { key: 'title', label: 'Başlık' },
            { key: 'desc', label: 'Açıklama', multiline: true },
          ]}
          addLabel="Özellik Ekle"
        />
      </Section>

      {/* ── TESTIMONIALS ── */}
      <Section title="Müşteri Referansları" emoji="💬">
        <JsonEditor
          value={(page.testimonials || []) as unknown as JItem[]}
          onChange={v => set('testimonials', v)}
          fields={[
            { key: 'name', label: 'İsim' },
            { key: 'company', label: 'Şirket' },
            { key: 'role', label: 'Unvan' },
            { key: 'text', label: 'Yorum (tam cümle)', multiline: true },
          ]}
          addLabel="Referans Ekle"
        />
      </Section>

      {/* ── PRICING ── */}
      <Section title="Fiyatlandırma" emoji="💰">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 14, marginBottom: 16 }}>
          {[
            { f: 'currency', l: 'Para Birimi', p: 'TRY / EUR / USD' },
            { f: 'currency_symbol', l: 'Sembol', p: '₺ / € / $' },
            { f: 'price_monthly', l: 'Aylık Fiyat', p: '2990' },
            { f: 'price_annual', l: 'Yıllık Fiyat/ay', p: '1990' },
          ].map(({ f, l, p }) => (
            <Field key={f} label={l}>
              <input
                style={S.inp}
                value={String((page as Record<string, unknown>)[f] || '')}
                onChange={e => set(f, f.startsWith('price_') ? (Number(e.target.value) || 0) : e.target.value)}
                placeholder={p}
              />
            </Field>
          ))}
        </div>
        <Field label="CTA Butonu Metni">
          <Inp value={page.price_cta || ''} onChange={v => set('price_cta', v)} placeholder="🚀 14 Gün Ücretsiz Deneyin" />
        </Field>
        <Field label="Pakete Dahil Özellikler (her satır bir madde)">
          <StringList
            value={(page.price_features as string[]) || []}
            onChange={v => set('price_features', v)}
            placeholder="ör: Sınırsız lead toplama"
          />
        </Field>
      </Section>

      {/* ── CONTACT ── */}
      <Section title="İletişim & Destek" emoji="📞">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
          <Field label="WhatsApp Numarası">
            <Inp value={page.whatsapp_number || ''} onChange={v => set('whatsapp_number', v)} placeholder="+90 555 000 00 00" />
          </Field>
          <Field label="E-posta">
            <Inp value={page.email_contact || ''} onChange={v => set('email_contact', v)} placeholder="destek@leadflow.ai" />
          </Field>
          <Field label="Calendly / Demo Rezervasyon URL" hint="İkincil CTA için kullanılır">
            <Inp value={page.calendly_url || ''} onChange={v => set('calendly_url', v)} placeholder="https://calendly.com/leadflow/demo" />
          </Field>
        </div>
      </Section>

      {/* ── SEO ── */}
      <Section title="SEO & Sosyal Medya Meta" emoji="🔍">
        <Field label="Meta Başlık" hint="Google'da görünen başlık. Maks 60 karakter.">
          <Inp value={page.meta_title || ''} onChange={v => set('meta_title', v)} placeholder="LeadFlow AI — Türkiye'nin #1 B2B Satış Platformu" />
          <span style={{ color: '#334155', fontSize: 11, marginTop: 5, display: 'block' }}>{(page.meta_title || '').length}/60 karakter</span>
        </Field>
        <Field label="Meta Açıklama" hint="Google'da görünen kısa açıklama. 120-160 karakter ideal.">
          <Inp value={page.meta_description || ''} onChange={v => set('meta_description', v)} placeholder="AI destekli B2B satış otomasyonu. WhatsApp, e-posta..." multiline />
          <span style={{ color: '#334155', fontSize: 11, marginTop: 5, display: 'block' }}>{(page.meta_description || '').length}/160 karakter</span>
        </Field>
        <Field label="OG Görsel URL" hint="WhatsApp/Twitter/LinkedIn'de paylaşıldığında çıkan görsel (1200×630px)">
          <Inp value={page.og_image_url || ''} onChange={v => set('og_image_url', v)} placeholder="https://cdn.example.com/og-tr.png" />
        </Field>
      </Section>

      {/* ── Sticky bottom save bar ── */}
      <div style={{
        position: 'sticky', bottom: 20,
        background: 'rgba(5,10,25,0.97)', backdropFilter: 'blur(24px)',
        border: '1px solid rgba(255,255,255,0.07)',
        borderRadius: 16, padding: '14px 22px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        boxShadow: '0 20px 60px rgba(0,0,0,0.8)',
        marginTop: 8,
      }}>
        <div>
          {page.is_published ? (
            <span style={{ color: '#34d399', fontSize: 13, fontWeight: 600 }}>
              ✅ Yayında — <code style={{ fontFamily: 'monospace' }}>/{slug}</code>
            </span>
          ) : (
            <span style={{ color: '#475569', fontSize: 13 }}>⚪ Taslak — henüz yayınlanmadı</span>
          )}
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={() => save()} disabled={saving} style={{ padding: '10px 20px', borderRadius: 10, border: '1px solid rgba(255,255,255,0.09)', background: 'rgba(255,255,255,0.05)', color: '#e2e8f0', fontSize: 13, cursor: 'pointer', fontWeight: 600 }}>
            {saving ? '...' : 'Kaydet'}
          </button>
          <button onClick={() => save(true)} disabled={saving} style={{ padding: '10px 26px', borderRadius: 10, background: 'linear-gradient(135deg,#3b82f6,#6366f1)', border: 'none', color: '#fff', fontSize: 13, cursor: 'pointer', fontWeight: 700, boxShadow: '0 4px 15px rgba(59,130,246,0.35)' }}>
            {page.is_published ? '🔄 Güncelle & Yayınla' : '🚀 Yayınla'}
          </button>
        </div>
      </div>
    </div>
  )
}
