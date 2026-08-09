export {};
const express = require('express');
const { createClient } = require('@supabase/supabase-js');
const { authMiddleware } = require('../middleware/auth');
const { fireCapiEvent } = require('../services/meta-capi');
const { fireGoogleConversion } = require('../services/google-enhanced-conversions');
const { normalizePhone } = require('../lib/phoneUtils');

const router = express.Router();
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

// Business cache helper — her lead eklendiğinde global havuza upsert et (fire-and-forget)
function upsertToBusinessCache(leads: any[]) {
  const toCache = leads
    .filter(l => l.company_name?.trim())
    .map(l => ({
      external_id: l.maps_url
        ? 'maps_' + require('crypto').createHash('md5').update(l.maps_url.toLowerCase().trim()).digest('hex')
        : 'legacy_' + require('crypto').createHash('md5').update(
            (l.company_name || '').toLowerCase().trim() + '|' +
            (l.city || '').toLowerCase().trim() + '|' +
            (l.phone || '').toLowerCase().trim()
          ).digest('hex'),
      company_name:     l.company_name?.trim(),
      phone:            l.phone    || null,
      website:          l.website  || null,
      city:             l.city     || null,
      country:          'TR',
      sector_normalized: l.sector  || null,
      maps_url:         l.maps_url || null,
      opening_hours:    l.opening_hours || null,
      source:           l.source   || 'manuel',
      last_fetched_at:  new Date().toISOString(),
    }));

  if (!toCache.length) return;
  supabase
    .from('businesses')
    .upsert(toCache, { onConflict: 'external_id', ignoreDuplicates: false })
    .then(({ error }: any) => {
      if (error) console.error('[BusinessCache] Upsert error:', error.message?.slice(0, 100));
    });
}

// Audit log helper — her alan değişikliğini kaydeder
async function logFieldChange(leadId: string, userId: string, field: string, oldVal: any, newVal: any, action = 'update') {
  try {
    await supabase.from('lead_field_history').insert([{
      lead_id: leadId, user_id: userId,
      field_name: field,
      old_value: oldVal != null ? String(oldVal) : null,
      new_value: newVal != null ? String(newVal) : null,
      action,
    }]);
  } catch {} // Tablo yoksa sessiz geç
}

// GET /api/leads — Liste (filtre + sayfalama + soft delete)
router.get('/', authMiddleware, async (req: any, res: any) => {
  try {
    const { status, source, city, search, sector, grade, ids, list, page = 1, limit = 20, sortBy = 'created_at', sortDir = 'desc', trash, min_score, tag } = req.query;
    const offset = (Number(page) - 1) * Number(limit);
    const ALLOWED_SORT = ['created_at', 'score', 'company_name', 'status', 'city', 'sector', 'updated_at', 'hot_score'];
    const col = ALLOWED_SORT.includes(String(sortBy)) ? String(sortBy) : 'created_at';
    const asc = sortDir === 'asc';

    let query = supabase
      .from('leads')
      .select('*', { count: 'exact' })
      .eq('user_id', req.userId)
      .order(col, { ascending: asc })
      .range(offset, offset + Number(limit) - 1);

    // Soft delete filtresi
    if (trash === 'true') {
      query = query.not('deleted_at', 'is', null);
    } else {
      query = query.is('deleted_at', null);
    }

    if (status)    query = query.eq('status', status);
    if (source)    query = query.eq('source', source);
    if (city)      query = query.ilike('city', `%${city}%`);
    if (sector)    query = query.ilike('sector', `%${sector}%`);
    if (grade)     query = query.eq('ai_grade', grade);
    if (search)    query = query.or(`company_name.ilike.%${search}%,phone.ilike.%${search}%,contact_name.ilike.%${search}%`);
    if (min_score) query = query.gte('score', Number(min_score));
    if (tag)       query = query.contains('tags', [String(tag)]);
    if (ids) {
      const idList = String(ids).split(',').filter(Boolean);
      if (idList.length > 0) query = query.in('id', idList);
    }
    if (list) query = query.ilike('notes', `[📁 ${list}]%`);

    const { data, error, count } = await query;
    if (error) throw error;

    res.json({ leads: data || [], total: count || 0, page: Number(page), limit: Number(limit) });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// GET /api/leads/with-phone — All leads that have a phone number (paginated past Supabase 1000 default)
router.get('/with-phone', authMiddleware, async (req: any, res: any) => {
  try {
    const allLeads: any[] = [];
    let from = 0;
    const PAGE = 1000;
    while (true) {
      const { data, error } = await supabase
        .from('leads')
        .select('id, company_name, phone, city, country, score, sector')
        .eq('user_id', req.userId)
        .not('phone', 'is', null)
        .neq('phone', '')
        .not('phone', 'ilike', '%@%')
        .is('deleted_at', null)
        .order('company_name', { ascending: true })
        .range(from, from + PAGE - 1);
      if (error) throw error;
      if (!data || data.length === 0) break;
      allLeads.push(...data);
      if (data.length < PAGE) break;
      from += PAGE;
    }
    res.json({ leads: allLeads, total: allLeads.length });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// GET /api/leads/sectors — Distinct sector list for filter dropdown
router.get('/sectors', authMiddleware, async (req: any, res: any) => {
  try {
    const { data, error } = await supabase
      .from('leads')
      .select('sector')
      .eq('user_id', req.userId)
      .is('deleted_at', null)
      .not('sector', 'is', null);
    if (error) throw error;
    const sectors = [...new Set((data || []).map((r: any) => r.sector).filter(Boolean))].sort();
    res.json({ sectors });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// GET /api/leads/export — Excel/CSV download
router.get('/export', authMiddleware, async (req: any, res: any) => {
  try {
    const { status, sector, search, grade, ids, list } = req.query;

    let query = supabase
      .from('leads')
      .select('company_name,contact_name,phone,email,website,instagram,facebook,linkedin_url,youtube,twitter,city,sector,source,score,ai_grade,ai_priority,hot_score,deal_value,win_probability,tags,status,notes,created_at,updated_at')
      .eq('user_id', req.userId)
      .is('deleted_at', null)
      .order('created_at', { ascending: false })
      ;

    if (ids) {
      const idList = String(ids).split(',').filter(Boolean);
      if (idList.length > 0) query = query.in('id', idList);
    } else {
      if (status) query = query.eq('status', status);
      if (sector) query = query.ilike('sector', `%${sector}%`);
      if (grade)  query = query.eq('ai_grade', grade);
      if (search) query = query.ilike('company_name', `%${search}%`);
      if (list)   query = query.ilike('notes', `[📁 ${list}]%`);
    }

    const { data, error } = await query;
    if (error) throw error;

    const xlsx = require('xlsx');
    const colMap: Record<string, string> = {
      company_name: 'Firma Adı', contact_name: 'Karar Verici', phone: 'Telefon',
      email: 'E-posta', website: 'Web Sitesi',
      instagram: 'Instagram', facebook: 'Facebook',
      linkedin_url: 'LinkedIn', youtube: 'YouTube', twitter: 'Twitter',
      city: 'Şehir', sector: 'Sektör', source: 'Kaynak', score: 'Puan',
      ai_grade: 'AI Notu', ai_priority: 'Öncelik', hot_score: 'Sıcaklık',
      deal_value: 'Fırsat Değeri (₺)', win_probability: 'Kazanma İhtimali (%)',
      tags: 'Etiketler', status: 'Durum', notes: 'Notlar',
      created_at: 'Eklenme Tarihi', updated_at: 'Son Güncelleme',
    };
    const statusTR: Record<string, string> = {
      new: 'Yeni', contacted: 'İletişime Geçildi', qualified: 'Nitelikli',
      replied: 'Cevap Verdi', offered: 'Teklif Verildi', won: 'Kazanıldı', lost: 'Kaybedildi',
    };

    const rows = (data || []).map((l: any) => {
      const row: any = {};
      for (const [k, label] of Object.entries(colMap)) {
        let val = l[k];
        if (k === 'status') val = statusTR[val] || val;
        if (k === 'created_at' || k === 'updated_at') val = val ? new Date(val).toLocaleDateString('tr-TR') : '';
        if (k === 'tags' && Array.isArray(val)) val = val.join(', ');
        row[label] = val ?? '';
      }
      return row;
    });

    const ws = xlsx.utils.json_to_sheet(rows);
    const wb = xlsx.utils.book_new();
    xlsx.utils.book_append_sheet(wb, ws, 'Leadler');

    // Auto column widths
    const colWidths = Object.values(colMap).map((h: string) => ({ wch: Math.max(h.length + 2, 14) }));
    ws['!cols'] = colWidths;

    const buf = xlsx.write(wb, { type: 'buffer', bookType: 'xlsx' });
    const filename = `sovlo-leads-${new Date().toISOString().slice(0,10)}.xlsx`;
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(buf);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// GET /api/leads/lists — Distinct named list names parsed from notes field
router.get('/lists', authMiddleware, async (req: any, res: any) => {
  try {
    const { data, error } = await supabase
      .from('leads')
      .select('notes')
      .eq('user_id', req.userId)
      .ilike('notes', '[📁%')
      ;
    if (error) throw error;

    const listSet = new Set<string>();
    const re = /^\[📁 (.+?)\]/;
    for (const row of data || []) {
      const m = (row.notes || '').match(re);
      if (m) listSet.add(m[1]);
    }
    res.json({ lists: [...listSet].sort() });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// GET /api/leads/segments — Kayıtlı segmentler (/:id'den ÖNCE olmalı!)
router.get('/segments', authMiddleware, async (req: any, res: any) => {
  try {
    const { data } = await supabase.from('smart_segments').select('*').eq('user_id', req.userId).order('is_pinned', { ascending: false }).order('created_at');
    res.json({ segments: data || [] });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// GET /api/leads/custom-fields — Özel alan tanımları (/:id'den ÖNCE olmalı!)
router.get('/custom-fields', authMiddleware, async (req: any, res: any) => {
  try {
    const { data } = await supabase.from('lead_custom_field_defs').select('*').eq('user_id', req.userId).order('sort_order');
    res.json({ fields: data || [] });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// GET /api/leads/:id — Tek lead detayı
router.get('/:id', authMiddleware, async (req: any, res: any) => {
  try {
    const { data: lead, error } = await supabase
      .from('leads')
      .select('*')
      .eq('id', req.params.id)
      .eq('user_id', req.userId)
      .single();

    if (error || !lead) return res.status(404).json({ error: 'Lead bulunamadi' });
    res.json({ lead });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// PATCH /api/leads/:id — Güncelle + Audit Log
router.patch('/:id', authMiddleware, async (req: any, res: any) => {
  try {
    const allowed = ['status','notes','score','contact_name','phone','email',
      'deal_value','win_probability','tags','city','sector','website','next_action','next_action_at'];
    const updates: any = {};
    allowed.forEach(f => { if (req.body[f] !== undefined) updates[f] = req.body[f]; });
    // Telefon normalize et
    if (updates.phone) updates.phone = normalizePhone(updates.phone) || updates.phone;
    updates.updated_at = new Date().toISOString();
    if (updates.status === 'won') updates.won_at = new Date().toISOString();

    // Mevcut değerleri al (audit için)
    const { data: before } = await supabase.from('leads').select(allowed.join(',')).eq('id', req.params.id).single();

    const { data, error } = await supabase
      .from('leads')
      .update(updates)
      .eq('id', req.params.id)
      .eq('user_id', req.userId)
      .select()
      .single();

    if (error) throw error;

    // Audit Log — değişen alanları kaydet
    if (before) {
      for (const field of Object.keys(updates).filter(k => k !== 'updated_at')) {
        const oldVal = (before as any)[field];
        const newVal = updates[field];
        if (String(oldVal ?? '') !== String(newVal ?? '')) {
          await logFieldChange(req.params.id, req.userId, field, oldVal, newVal);
        }
      }
    }

    // Meta CAPI — fire on status transitions
    if (data && updates.status) {
      try {
        if (updates.status === 'won') {
          await fireCapiEvent(supabase, req.userId, data, 'Purchase', { value: data.deal_value || 0, orderId: `won-${data.id}` });
          await fireGoogleConversion(supabase, req.userId, data, 'Purchase', { value: data.deal_value || 0 });
        } else if (updates.status === 'contacted' || updates.status === 'replied') {
          await fireCapiEvent(supabase, req.userId, data, 'Contact');
          await fireGoogleConversion(supabase, req.userId, data, 'LeadFormSubmit');
        } else if (updates.status === 'proposal') {
          await fireCapiEvent(supabase, req.userId, data, 'InitiateCheckout');
        } else if (updates.status === 'lost') {
          await fireCapiEvent(supabase, req.userId, data, 'ViewContent');
        }
      } catch {}
    }

    res.json({ lead: data });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// POST /api/leads — Manuel lead oluştur (duplicate detection + audit log)
router.post('/', authMiddleware, async (req: any, res: any) => {
  try {
    const {
      company_name, contact_name, phone, email, website,
      city, sector, source, notes, score, status,
      deal_value, win_probability, tags,
      utm_source, utm_medium, utm_campaign, utm_content, utm_term,
      fbc, fbp, force = false,
    } = req.body;

    if (!company_name) return res.status(400).json({ error: 'company_name zorunlu' });
    if (!phone) return res.status(400).json({ error: 'Telefon numarası zorunlu' });

    const normalizedPhoneVal = normalizePhone(phone) || phone;

    // Duplicate Detection — normalize edilmiş telefon ile kontrol et
    if (!force) {
      const dupChecks: any[] = [];
      if (normalizedPhoneVal) dupChecks.push(supabase.from('leads').select('id,company_name,phone').eq('user_id', req.userId).eq('phone', normalizedPhoneVal).is('deleted_at', null).maybeSingle());
      dupChecks.push(supabase.from('leads').select('id,company_name').eq('user_id', req.userId).ilike('company_name', company_name.trim()).is('deleted_at', null).maybeSingle());
      const results = await Promise.allSettled(dupChecks);
      const dupLead = results.map(r => r.status === 'fulfilled' ? r.value.data : null).find(Boolean);
      if (dupLead) {
        return res.status(409).json({
          error: 'duplicate',
          message: `Benzer lead zaten var: "${dupLead.company_name}"`,
          existing: dupLead,
        });
      }
    }

    const now = new Date().toISOString();
    const { data, error } = await supabase.from('leads').insert([{
      user_id: req.userId,
      company_name: company_name.trim(), contact_name, phone: normalizedPhoneVal, email, website,
      city, sector, source: source || 'Manuel',
      status: status || 'new', score: score || 50, notes,
      deal_value, win_probability, tags: tags || [],
      utm_source, utm_medium, utm_campaign, utm_content, utm_term,
      fbc, fbp,
      created_at: now, updated_at: now,
    }]).select().single();

    if (error) throw error;

    // Audit log — yeni kayıt
    await logFieldChange(data.id, req.userId, 'status', null, data.status, 'create');

    upsertToBusinessCache([data]);

    try { await fireCapiEvent(supabase, req.userId, data, 'Lead'); } catch {}
    res.json({ lead: data });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// DELETE /api/leads/:id — SOFT DELETE (geri alınabilir)
router.delete('/:id', authMiddleware, async (req: any, res: any) => {
  try {
    const { data: lead } = await supabase.from('leads').select('company_name,status').eq('id', req.params.id).eq('user_id', req.userId).single();
    const { error } = await supabase.from('leads').update({
      deleted_at: new Date().toISOString(),
      deleted_by: req.userId,
    }).eq('id', req.params.id).eq('user_id', req.userId);

    if (error) throw error;
    // Audit log
    if (lead) await logFieldChange(req.params.id, req.userId, 'deleted_at', null, new Date().toISOString(), 'delete');
    res.json({ success: true });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// POST /api/leads/bulk-status — Toplu durum güncelle
router.post('/bulk-status', authMiddleware, async (req: any, res: any) => {
  try {
    const { ids, status } = req.body;
    if (!ids?.length || !status) return res.status(400).json({ error: 'ids ve status gerekli' });

    const { error } = await supabase
      .from('leads')
      .update({ status, updated_at: new Date().toISOString() })
      .in('id', ids)
      .eq('user_id', req.userId);

    if (error) throw error;
    res.json({ success: true, updated: ids.length });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// POST /api/leads/import — Excel / CSV toplu import
const multer = require('multer');
const XLSX   = require('xlsx');
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

// Kolon isim normalize (türkçe → ingilizce field)
const COL_MAP: Record<string, string> = {
  'firma':          'company_name', 'firma adi':       'company_name', 'firma adı':      'company_name', 'company':        'company_name', 'company name':   'company_name', 'şirket':         'company_name', 'sirket':         'company_name',
  'ilgili kisi':    'contact_name', 'ilgili kişi':     'contact_name', 'kisi':           'contact_name', 'kişi':           'contact_name', 'contact':        'contact_name', 'isim':           'contact_name', 'ad':             'contact_name', 'yetkili':        'contact_name',
  'telefon':        'phone',        'tel':             'phone',        'gsm':            'phone',        'mobil':          'phone',        'phone':          'phone',
  'eposta':         'email',        'e-posta':         'email',        'email':          'email',        'mail':           'email',
  'website':        'website',      'web':             'website',      'url':            'website',      'site':           'website',
  'sehir':          'city',         'şehir':           'city',         'city':           'city',         'il':             'city',
  'sektor':         'sector',       'sektör':          'sector',       'sector':         'sector',       'endüstri':       'sector',
  'kaynak':         'source',       'source':          'source',       'kanal':          'source',
  'not':            'notes',        'notlar':          'notes',        'notes':          'notes',        'açıklama':       'notes',        'aciklama':       'notes',
  'puan':           'score',        'skor':            'score',        'score':          'score',
  'durum':          'status',       'status':          'status',
  'instagram':      'instagram',
  'linkedin':       'linkedin_url',  'linkedin url':   'linkedin_url',
  'facebook':       'facebook',
  'website maps':   'maps_url',     'harita':         'maps_url',
};

function normalizeColName(raw: string): string {
  return raw.toString().toLowerCase().trim().replace(/\s+/g, ' ');
}

router.post('/import', authMiddleware, upload.single('file'), async (req: any, res: any) => {
  try {
    const file = req.file;
    if (!file) return res.status(400).json({ error: 'Dosya yüklenmedi' });

    const isCSV = file.originalname?.endsWith('.csv') || file.mimetype === 'text/csv';
    let rows: any[] = [];

    if (isCSV) {
      // CSV parse
      const text = file.buffer.toString('utf8');
      const lines = text.split('\n').filter(l => l.trim());
      const sep = lines[0].includes('\t') ? '\t' : ',';
      const headers = lines[0].split(sep).map((h: string) => h.trim().replace(/^"|"$/g, ''));
      for (let i = 1; i < lines.length; i++) {
        const vals = lines[i].split(sep).map((v: string) => v.trim().replace(/^"|"$/g, ''));
        const row: Record<string, string> = {};
        headers.forEach((h: string, idx: number) => { row[h] = vals[idx] || '' });
        rows.push(row);
      }
    } else {
      // Excel parse
      const wb = XLSX.read(file.buffer, { type: 'buffer', cellText: true, cellDates: false });
      const ws = wb.Sheets[wb.SheetNames[0]];
      rows = XLSX.utils.sheet_to_json(ws, { defval: '', raw: false });
    }

    if (!rows.length) return res.status(400).json({ error: 'Dosyada veri bulunamadı' });
    if (rows.length > 2000) return res.status(400).json({ error: 'Tek seferde maksimum 2.000 lead yüklenebilir' });

    // Kolon mapping: her satırın key'lerini normalize et → lead field
    const now = new Date().toISOString();
    const toInsert: any[] = [];
    const errors: { row: number; reason: string }[] = [];

    for (let i = 0; i < rows.length; i++) {
      const raw = rows[i];
      const lead: any = { user_id: req.userId, source: 'Excel Import', status: 'new', score: 50, created_at: now, updated_at: now };

      for (const [rawKey, rawVal] of Object.entries(raw)) {
        const normKey = normalizeColName(rawKey);
        const field = COL_MAP[normKey];
        if (field && rawVal != null && String(rawVal).trim()) {
          const v = String(rawVal).trim();
          if (field === 'score') {
            const s = parseInt(v);
            if (!isNaN(s)) lead.score = Math.max(0, Math.min(100, s));
          } else {
            lead[field] = v;
          }
        }
      }

      if (!lead.company_name?.trim()) {
        errors.push({ row: i + 2, reason: 'Firma adı boş' });
        continue;
      }

      // Telefon dedup kontrolü (same user)
      toInsert.push(lead);
    }

    if (!toInsert.length) {
      return res.status(400).json({ error: 'Yüklenebilecek geçerli satır yok', errors: errors.slice(0, 20) });
    }

    // Toplu insert — 100'er batch
    let inserted = 0;
    const BATCH = 100;
    for (let b = 0; b < toInsert.length; b += BATCH) {
      const batch = toInsert.slice(b, b + BATCH);
      const { error: insErr } = await supabase.from('leads').insert(batch);
      if (!insErr) inserted += batch.length;
      else console.warn('[Import] Batch error:', insErr.message?.slice(0, 80));
    }

    upsertToBusinessCache(toInsert);

    res.json({ ok: true, inserted, skipped: errors.length, total: rows.length, errors: errors.slice(0, 10) });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// GET /api/leads/import/template — Şablon Excel indir
router.get('/import/template', authMiddleware, (_req: any, res: any) => {
  const XLSX2 = require('xlsx');
  const ws = XLSX2.utils.aoa_to_sheet([
    ['Firma Adı','İlgili Kişi','Telefon','E-posta','Website','Şehir','Sektör','Kaynak','Notlar','Puan'],
    ['Acme Teknoloji A.Ş.','Ahmet Yılmaz','05321234567','ahmet@acme.com','https://acme.com','İstanbul','Teknoloji','Referans','Öncelikli müşteri',75],
    ['Beta İnşaat','Fatma Kaya','05559876543','','','Ankara','İnşaat','Soğuk Arama','',50],
  ]);
  ws['!cols'] = [20,18,15,25,25,12,15,15,25,8].map(w => ({ wch: w }));
  const wb = XLSX2.utils.book_new();
  XLSX2.utils.book_append_sheet(wb, ws, 'Leads');
  const buf = XLSX2.write(wb, { type: 'buffer', bookType: 'xlsx' });
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', 'attachment; filename="sovlo_lead_sablonu.xlsx"');
  res.send(buf);
});

// POST /api/leads/restore/:id — Soft delete'ten geri al
router.post('/restore/:id', authMiddleware, async (req: any, res: any) => {
  try {
    const { error } = await supabase.from('leads').update({
      deleted_at: null, deleted_by: null, restored_at: new Date().toISOString(),
    }).eq('id', req.params.id).eq('user_id', req.userId);
    if (error) throw error;
    await logFieldChange(req.params.id, req.userId, 'deleted_at', new Date().toISOString(), null, 'restore');
    res.json({ success: true });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// POST /api/leads/trash/empty — Çöp kutusunu tamamen boşalt (seçili, kalıcı)
router.post('/trash/empty', authMiddleware, async (req: any, res: any) => {
  try {
    const { ids } = req.body;
    if (!ids?.length) return res.status(400).json({ error: 'ids gerekli' });
    const { error } = await supabase.from('leads').delete()
      .in('id', ids).eq('user_id', req.userId).not('deleted_at', 'is', null);
    if (error) throw error;
    res.json({ success: true, deleted: ids.length });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// GET /api/leads/:id/history — Audit log
router.get('/:id/history', authMiddleware, async (req: any, res: any) => {
  try {
    const { data, error } = await supabase.from('lead_field_history')
      .select('*').eq('lead_id', req.params.id).eq('user_id', req.userId)
      .order('changed_at', { ascending: false }).limit(100);
    if (error) throw error;
    res.json({ history: data || [] });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// GET /api/leads/:id/next-action — AI önerilen sonraki adım
router.get('/:id/next-action', authMiddleware, async (req: any, res: any) => {
  try {
    const [{ data: lead }, { data: history }] = await Promise.all([
      supabase.from('leads').select('*').eq('id', req.params.id).eq('user_id', req.userId).single(),
      supabase.from('lead_field_history').select('field_name,new_value,changed_at').eq('lead_id', req.params.id).order('changed_at', { ascending: false }).limit(10),
    ]);
    if (!lead) return res.status(404).json({ error: 'Bulunamadı' });

    const Anthropic = require('@anthropic-ai/sdk');
    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY, maxRetries: 0 });

    const r = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 300,
      messages: [{
        role: 'user',
        content: `Sen bir B2B satış danışmanısın. Bu lead için EN ÖNEMLİ sonraki adımı söyle.

Lead: ${lead.company_name} | Sektör: ${lead.sector || '?'} | Şehir: ${lead.city || '?'}
Durum: ${lead.status} | Puan: ${lead.score} | Sıcaklık: ${lead.hot_score || 0}
Son aktiviteler: ${(history || []).slice(0,3).map((h: any) => `${h.field_name}: ${h.new_value}`).join(', ')}

Türkçe, net 1 cümle öner. Format:
EYLEM: [Ne yapılmalı]
ZAMAN: [Ne zaman: bugün/yarın/3 gün içinde/bu hafta]
NEDEN: [1 cümle neden]`
      }],
    }, { timeout: 15000 });

    const text = (r.content[0] as any)?.text || '';
    const eylem = text.match(/EYLEM:\s*(.+)/)?.[1]?.trim() || text.split('\n')[0]?.trim();
    const zaman = text.match(/ZAMAN:\s*(.+)/)?.[1]?.trim() || 'Bugün';
    const neden = text.match(/NEDEN:\s*(.+)/)?.[1]?.trim() || '';

    // Veritabanına kaydet
    try {
      await supabase.from('leads').update({ next_action: eylem, next_action_at: new Date().toISOString() })
        .eq('id', req.params.id);
    } catch {}

    res.json({ action: eylem, timing: zaman, reason: neden, raw: text });
  } catch { res.json({ action: 'Müşteriyi ara veya WhatsApp mesajı gönder', timing: 'Bugün', reason: 'AI analizi geçici olarak kullanılamıyor' }); }
});

// GET /api/leads/pipeline-stats — Pipeline hız analizi
router.get('/pipeline/stats', authMiddleware, async (req: any, res: any) => {
  try {
    const { data: leads } = await supabase.from('leads').select('status,score,hot_score,deal_value,created_at,updated_at,won_at,source,sector')
      .eq('user_id', req.userId).is('deleted_at', null);

    const all = leads || [];
    const byStatus: Record<string, number> = {};
    let totalValue = 0, wonValue = 0, wonCount = 0;

    for (const l of all) {
      byStatus[l.status] = (byStatus[l.status] || 0) + 1;
      if (l.deal_value) totalValue += Number(l.deal_value);
      if (l.status === 'won') { wonValue += Number(l.deal_value || 0); wonCount++; }
    }

    const avgScore = all.length ? Math.round(all.reduce((s, l) => s + (l.score || 0), 0) / all.length) : 0;
    const hotLeads = all.filter(l => (l.hot_score || 0) >= 30).length;
    const conversionRate = all.length ? ((wonCount / all.length) * 100).toFixed(1) : '0';

    // Kaynak bazlı dönüşüm
    const bySource: Record<string, { total: number; won: number }> = {};
    for (const l of all) {
      const s = l.source || 'Diğer';
      if (!bySource[s]) bySource[s] = { total: 0, won: 0 };
      bySource[s].total++;
      if (l.status === 'won') bySource[s].won++;
    }

    res.json({
      byStatus, totalValue, wonValue, wonCount,
      avgScore, hotLeads, conversionRate: parseFloat(conversionRate),
      total: all.length,
      bySource: Object.entries(bySource)
        .map(([source, d]) => ({ source, ...d, rate: d.total ? +(d.won / d.total * 100).toFixed(1) : 0 }))
        .sort((a, b) => b.rate - a.rate).slice(0, 10),
    });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// POST /api/leads/bulk-enrich — Toplu zenginleştirme
router.post('/bulk-enrich', authMiddleware, async (req: any, res: any) => {
  try {
    const { ids } = req.body;
    if (!ids?.length) return res.status(400).json({ error: 'ids gerekli' });
    if (ids.length > 100) return res.status(400).json({ error: 'Tek seferde max 100 lead zenginleştirilebilir' });

    res.json({ ok: true, total: ids.length, message: `${ids.length} lead için zenginleştirme başlatıldı` });

    // Arka planda işle
    setImmediate(async () => {
      for (const id of ids) {
        try {
          const { data: lead } = await supabase.from('leads').select('*').eq('id', id).eq('user_id', req.userId).single();
          if (!lead) continue;
          const { triggerEnrichment } = require('./enrichment');
          if (typeof triggerEnrichment === 'function') await triggerEnrichment(supabase, lead, req.userId);
          else {
            await supabase.from('leads').update({ enrichment_status: 'pending', updated_at: new Date().toISOString() }).eq('id', id);
          }
        } catch {}
      }
    });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// POST /api/leads/check-duplicate — Duplicate kontrolü
router.post('/check-duplicate', authMiddleware, async (req: any, res: any) => {
  try {
    const { company_name, phone } = req.body;
    const checks: any[] = [];
    if (phone) checks.push(supabase.from('leads').select('id,company_name,phone,status').eq('user_id', req.userId).eq('phone', phone).is('deleted_at', null).limit(1));
    if (company_name) checks.push(supabase.from('leads').select('id,company_name,phone,status').eq('user_id', req.userId).ilike('company_name', company_name.trim()).is('deleted_at', null).limit(1));
    const results = await Promise.allSettled(checks);
    const duplicates = results.flatMap(r => r.status === 'fulfilled' ? (r.value.data || []) : []);
    res.json({ duplicates, hasDuplicate: duplicates.length > 0 });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// ─── SMART SEGMENTS ────────────────────────────────────────────────────────────
// GET /segments yukarıda /:id'den ÖNCE tanımlandı (route sıralaması kritik)
router.post('/segments', authMiddleware, async (req: any, res: any) => {
  try {
    const { name, filters, icon, color, description } = req.body;
    if (!name?.trim()) return res.status(400).json({ error: 'name zorunlu' });
    const { data, error } = await supabase.from('smart_segments').insert([{ user_id: req.userId, name: name.trim(), filters: filters || {}, icon, color, description }]).select().single();
    if (error) throw error;
    res.json({ segment: data });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});
router.delete('/segments/:id', authMiddleware, async (req: any, res: any) => {
  try {
    await supabase.from('smart_segments').delete().eq('id', req.params.id).eq('user_id', req.userId);
    res.json({ success: true });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// ─── CUSTOM FIELDS ─────────────────────────────────────────────────────────────
// GET /custom-fields yukarıda /:id'den ÖNCE tanımlandı (route sıralaması kritik)
router.post('/custom-fields', authMiddleware, async (req: any, res: any) => {
  try {
    const { field_key, field_label, field_type = 'text', options, placeholder, required } = req.body;
    if (!field_key || !field_label) return res.status(400).json({ error: 'field_key ve field_label zorunlu' });
    const { data, error } = await supabase.from('lead_custom_field_defs').insert([{ user_id: req.userId, field_key, field_label, field_type, options, placeholder, required }]).select().single();
    if (error) throw error;
    res.json({ field: data });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});
router.get('/:id/custom-values', authMiddleware, async (req: any, res: any) => {
  try {
    const { data } = await supabase.from('lead_custom_values').select('*').eq('lead_id', req.params.id);
    const vals: Record<string, string> = {};
    (data || []).forEach((r: any) => { vals[r.field_key] = r.value; });
    res.json({ values: vals });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});
router.patch('/:id/custom-values', authMiddleware, async (req: any, res: any) => {
  try {
    const { values } = req.body; // { field_key: value, ... }
    const upserts = Object.entries(values || {}).map(([field_key, value]) => ({
      lead_id: req.params.id, user_id: req.userId, field_key, value: String(value), updated_at: new Date().toISOString(),
    }));
    if (upserts.length) await supabase.from('lead_custom_values').upsert(upserts, { onConflict: 'lead_id,field_key' });
    res.json({ success: true });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

module.exports = router;