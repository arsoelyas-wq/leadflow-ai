export {};
const express = require('express');
const { createClient } = require('@supabase/supabase-js');
const axios = require('axios');

const router = express.Router();
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

// Google Sheets'e lead aktar
router.post('/export-leads', async (req: any, res: any) => {
  try {
    const { sheetId, sheetName } = req.body;
    if (!sheetId) return res.status(400).json({ error: 'Google Sheets ID zorunlu' });

    const { data: leads } = await supabase.from('leads').select('company_name, contact_name, phone, email, city, status, source, created_at')
      .eq('user_id', req.userId).order('created_at', { ascending: false }).limit(500);

    // Google Sheets API endpoint (service account veya API key ile)
    const SHEETS_KEY = process.env.GOOGLE_SHEETS_API_KEY || process.env.GOOGLE_CSE_API_KEY;

    // CSV formatı oluştur
    const header = ['Şirket', 'İletişim', 'Telefon', 'Email', 'Şehir', 'Durum', 'Kaynak', 'Tarih'];
    const rows = (leads || []).map((l: any) => [
      l.company_name, l.contact_name || '', l.phone || '', l.email || '',
      l.city || '', l.status, l.source || '', new Date(l.created_at).toLocaleDateString('tr-TR')
    ]);

    // Sheets API ile güncelle
    if (SHEETS_KEY) {
      try {
        const values = [header, ...rows];
        await axios.put(
          `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${sheetName || 'Leadler'}!A1?valueInputOption=RAW&key=${SHEETS_KEY}`,
          { values }
        );
        res.json({ exported: rows.length, message: `${rows.length} lead Google Sheets'e aktarıldı!` });
      } catch {
        // API key yoksa CSV döndür
        const csv = [header, ...rows].map(r => r.join(',')).join('\n');
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', 'attachment; filename=leads.csv');
        res.send(csv);
      }
    } else {
      const csv = [header, ...rows].map(r => r.join(',')).join('\n');
      res.json({ csv, exported: rows.length, message: 'CSV formatında hazır — Google Sheets\'e yapıştırın' });
    }
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// Sheets ID kaydet
router.post('/settings', async (req: any, res: any) => {
  try {
    const { sheetId, autoSync } = req.body;
    await supabase.from('sheets_settings').upsert([{
      user_id: req.userId, sheet_id: sheetId, auto_sync: autoSync,
      updated_at: new Date().toISOString(),
    }], { onConflict: 'user_id' });
    res.json({ message: 'Google Sheets ayarları kaydedildi' });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

router.get('/settings', async (req: any, res: any) => {
  try {
    const { data } = await supabase.from('sheets_settings').select('*').eq('user_id', req.userId).single();
    res.json({ settings: data || null });
  } catch { res.json({ settings: null }); }
});

module.exports = router;