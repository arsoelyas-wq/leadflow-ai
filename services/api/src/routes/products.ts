export {};
const express = require('express');
const { createClient } = require('@supabase/supabase-js');
const multer = require('multer');
const XLSX = require('xlsx');

const router = express.Router();
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 20 * 1024 * 1024 } });

// ── Ürün AI Context (diğer route'lar tarafından kullanılır) ────────────────────
async function getProductContext(userId: string): Promise<string> {
  try {
    const { data } = await supabase.from('products')
      .select('name, description, price, category, specs')
      .eq('user_id', userId)
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .limit(30);
    if (!data || data.length === 0) return '';
    const lines = data.map((p: any) =>
      `• ${p.name}${p.price ? ` — ${p.price}` : ''}${p.category ? ` [${p.category}]` : ''}${p.description ? `: ${p.description}` : ''}${p.specs ? ` | Özellikler: ${p.specs}` : ''}`
    );
    return `\n\nSATIŞ YAPTIĞIN ÜRÜN KATALOĞU (${data.length} ürün):\n${lines.join('\n')}\n\nBu ürünleri her fırsatta öner, fiyat pazarlıklarında bu kataloğu kullan, teklifleri bu ürünlere göre yap.`;
  } catch { return ''; }
}

module.exports.getProductContext = getProductContext;

// ── GET /api/products/list ─────────────────────────────────────────────────────
router.get('/list', async (req: any, res: any) => {
  try {
    const { data } = await supabase.from('products')
      .select('*')
      .eq('user_id', req.userId)
      .order('created_at', { ascending: false });
    res.json({ products: data || [] });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// ── POST /api/products/create (multipart: fields + up to 2 images) ─────────────
router.post('/create', upload.fields([
  { name: 'image_0', maxCount: 1 },
  { name: 'image_1', maxCount: 1 },
]), async (req: any, res: any) => {
  try {
    const { name, description, price, category, specs } = req.body;
    if (!name) return res.status(400).json({ error: 'Ürün adı zorunlu' });

    const images: string[] = [];
    for (const field of ['image_0', 'image_1']) {
      const file = req.files?.[field]?.[0];
      if (file) {
        const ext = file.mimetype.split('/')[1] || 'jpg';
        const path = `${req.userId}/${Date.now()}-${field}.${ext}`;
        const { error } = await supabase.storage.from('products').upload(path, file.buffer, { contentType: file.mimetype, upsert: true });
        if (!error) {
          const { data: { publicUrl } } = supabase.storage.from('products').getPublicUrl(path);
          images.push(publicUrl);
        }
      }
    }

    const { data } = await supabase.from('products').insert([{
      user_id: req.userId, name, description: description || '', price: price || '',
      category: category || '', specs: specs || '', images, is_active: true,
    }]).select().single();

    res.json({ product: data, message: 'Ürün eklendi!' });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// ── PUT /api/products/:id ──────────────────────────────────────────────────────
router.put('/:id', upload.fields([
  { name: 'image_0', maxCount: 1 },
  { name: 'image_1', maxCount: 1 },
]), async (req: any, res: any) => {
  try {
    const { name, description, price, category, specs, existingImages } = req.body;

    const images: string[] = existingImages ? (Array.isArray(existingImages) ? existingImages : [existingImages]) : [];
    for (const field of ['image_0', 'image_1']) {
      const file = req.files?.[field]?.[0];
      if (file) {
        const ext = file.mimetype.split('/')[1] || 'jpg';
        const path = `${req.userId}/${Date.now()}-${field}.${ext}`;
        const { error } = await supabase.storage.from('products').upload(path, file.buffer, { contentType: file.mimetype, upsert: true });
        if (!error) {
          const { data: { publicUrl } } = supabase.storage.from('products').getPublicUrl(path);
          images.push(publicUrl);
        }
      }
    }

    await supabase.from('products').update({
      name, description, price, category, specs, images, updated_at: new Date().toISOString(),
    }).eq('id', req.params.id).eq('user_id', req.userId);

    res.json({ message: 'Ürün güncellendi' });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// ── DELETE /api/products/:id ───────────────────────────────────────────────────
router.delete('/:id', async (req: any, res: any) => {
  try {
    await supabase.from('products').delete().eq('id', req.params.id).eq('user_id', req.userId);
    res.json({ message: 'Ürün silindi' });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// ── PATCH /api/products/:id/toggle ────────────────────────────────────────────
router.patch('/:id/toggle', async (req: any, res: any) => {
  try {
    const { data: p } = await supabase.from('products').select('is_active').eq('id', req.params.id).eq('user_id', req.userId).single();
    if (!p) return res.status(404).json({ error: 'Bulunamadı' });
    await supabase.from('products').update({ is_active: !p.is_active }).eq('id', req.params.id);
    res.json({ is_active: !p.is_active });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// ── POST /api/products/bulk-excel ──────────────────────────────────────────────
router.post('/bulk-excel', upload.single('file'), async (req: any, res: any) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'Excel dosyası gerekli' });
    const wb = XLSX.read(req.file.buffer, { type: 'buffer' });
    const ws = wb.Sheets[wb.SheetNames[0]];
    const rows: any[] = XLSX.utils.sheet_to_json(ws, { defval: '' });

    if (rows.length === 0) return res.status(400).json({ error: 'Excel boş' });
    if (rows.length > 500) return res.status(400).json({ error: 'Maksimum 500 ürün' });

    const products = rows.map(row => ({
      user_id: req.userId,
      name: String(row['Ürün Adı'] || row['name'] || row['Name'] || row['AD'] || '').trim(),
      description: String(row['Açıklama'] || row['description'] || row['Description'] || row['AÇIKLAMA'] || '').trim(),
      price: String(row['Fiyat'] || row['price'] || row['Price'] || row['FİYAT'] || '').trim(),
      category: String(row['Kategori'] || row['category'] || row['Category'] || row['KATEGORİ'] || '').trim(),
      specs: String(row['Özellikler'] || row['specs'] || row['Specs'] || '').trim(),
      images: [],
      is_active: true,
    })).filter(p => p.name.length > 0);

    if (products.length === 0) return res.status(400).json({ error: 'Geçerli ürün bulunamadı. Sütun adlarını kontrol edin.' });

    const { data, error } = await supabase.from('products').insert(products).select();
    if (error) throw error;

    res.json({ message: `${data?.length || 0} ürün eklendi!`, count: data?.length || 0 });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// ── GET /api/products/excel-template — Sabit Excel şablonu indir ──────────────
router.get('/excel-template', (_req: any, res: any) => {
  try {
    const wb = XLSX.utils.book_new();
    const header = [['Ürün Adı', 'Fiyat', 'Açıklama', 'Kategori', 'Özellikler']];
    const examples = [
      ['Modern LED Masa Lambası', '₺450', 'Dokunmatik kontrollü, 3 renk sıcaklığı', 'Aydınlatma', '40W, 220V, IP20, 3000-6500K'],
      ['Ergonomik Ofis Koltuğu', '₺2.800', 'Bel desteği, yükseklik ayarlı, mesh kumaş', 'Ofis', 'Yük kapasitesi: 130kg, Yükseklik: 45-55cm'],
      ['',  '', '', '', ''],
      ['← Örnek satırları silebilirsiniz. Maksimum 500 ürün.', '', '', '', ''],
    ];
    const ws = XLSX.utils.aoa_to_sheet([...header, ...examples]);

    // Kolon genişlikleri
    ws['!cols'] = [{ wch: 30 }, { wch: 15 }, { wch: 50 }, { wch: 18 }, { wch: 40 }];

    XLSX.utils.book_append_sheet(wb, ws, 'Ürünler');
    const buf: Buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

    res.setHeader('Content-Disposition', 'attachment; filename="leadflow-urun-sablonu.xlsx"');
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.send(buf);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// ── GET /api/products/ai-context ──────────────────────────────────────────────
router.get('/ai-context', async (req: any, res: any) => {
  try {
    const context = await getProductContext(req.userId);
    const { data: count } = await supabase.from('products').select('id', { count: 'exact', head: true }).eq('user_id', req.userId).eq('is_active', true);
    res.json({ context, productCount: (count as any)?.count || 0 });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

module.exports = router;
module.exports.getProductContext = getProductContext;
