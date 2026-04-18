'use client';
import { useState, useEffect, useRef } from 'react';
import {
  Users, Phone, MessageSquare, BarChart2, TrendingUp, TrendingDown,
  Plus, Trash2, Edit2, ChevronRight, RefreshCw, Star, AlertTriangle,
  CheckCircle, Target, Clock, Award, X, Save, PhoneCall, Wifi,
  ArrowUpRight, ArrowDownRight, Minus, Eye, Activity
} from 'lucide-react';

const API = process.env.NEXT_PUBLIC_API_URL || 'https://leadflow-ai-production.up.railway.app';
function getToken() { return typeof window !== 'undefined' ? localStorage.getItem('token') || '' : ''; }
function headers(json = true) {
  const h: any = { Authorization: `Bearer ${getToken()}` };
  if (json) h['Content-Type'] = 'application/json';
  return h;
}

function ScorePill({ score }: { score: number | null }) {
  if (score === null || score === undefined) return <span className="text-xs text-gray-500">—</span>;
  const color = score >= 80 ? 'bg-emerald-500/15 text-emerald-400 ring-1 ring-emerald-500/30'
    : score >= 60 ? 'bg-amber-500/15 text-amber-400 ring-1 ring-amber-500/30'
    : score >= 40 ? 'bg-orange-500/15 text-orange-400 ring-1 ring-orange-500/30'
    : 'bg-red-500/15 text-red-400 ring-1 ring-red-500/30';
  return <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${color}`}>{score}</span>;
}

function ScoreBar({ label, score }: { label: string; score: number }) {
  const color = score >= 80 ? 'bg-emerald-500' : score >= 60 ? 'bg-amber-500' : score >= 40 ? 'bg-orange-500' : 'bg-red-500';
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs">
        <span className="text-gray-400">{label}</span>
        <span className="font-semibold text-white">{score}</span>
      </div>
      <div className="h-1.5 bg-white/8 rounded-full overflow-hidden">
        <div className={`h-full ${color} rounded-full`} style={{ width: `${score}%`, transition: 'width 0.8s ease' }} />
      </div>
    </div>
  );
}

function Avatar({ name, size = 'md' }: { name: string; size?: 'sm' | 'md' | 'lg' }) {
  const sizes = { sm: 'w-7 h-7 text-xs', md: 'w-9 h-9 text-sm', lg: 'w-12 h-12 text-base' };
  const colors = ['bg-purple-600', 'bg-teal-600', 'bg-blue-600', 'bg-rose-600', 'bg-amber-600', 'bg-indigo-600'];
  const color = colors[name.charCodeAt(0) % colors.length];
  return (
    <div className={`${sizes[size]} ${color} rounded-full flex items-center justify-center font-bold text-white shrink-0`}>
      {name.charAt(0).toUpperCase()}
    </div>
  );
}

export default function TeamIntelligencePage() {
  const [tab, setTab] = useState<'dashboard' | 'team' | 'analyses' | 'report'>('dashboard');
  const [dashboard, setDashboard] = useState<any>(null);
  const [members, setMembers] = useState<any[]>([]);
  const [analyses, setAnalyses] = useState<any[]>([]);
  const [selectedMember, setSelectedMember] = useState<any>(null);
  const [memberReport, setMemberReport] = useState<any>(null);
  const [selectedAnalysis, setSelectedAnalysis] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [days, setDays] = useState(30);
  const [showAddMember, setShowAddMember] = useState(false);
  const [showAddLine, setShowAddLine] = useState<string | null>(null);
  const [editMember, setEditMember] = useState<any>(null);
  const [newMember, setNewMember] = useState({ name: '', email: '', role: 'Satış Temsilcisi', wa_phone: '', notes: '' });
  const [newLine, setNewLine] = useState({ number: '', type: 'whatsapp' });
  const [filterChannel, setFilterChannel] = useState('');

  useEffect(() => { loadDashboard(); loadMembers(); loadAnalyses(); }, [days]);

  async function loadDashboard() {
    setLoading(true);
    try {
      const r = await fetch(`${API}/api/team-intelligence/dashboard?days=${days}`, { headers: headers() });
      setDashboard(await r.json());
    } catch {}
    setLoading(false);
  }

  async function loadMembers() {
    const r = await fetch(`${API}/api/team-intelligence/members`, { headers: headers() });
    const d = await r.json();
    setMembers(d.members || []);
  }

  async function loadAnalyses() {
    const params = new URLSearchParams({ limit: '100' });
    if (filterChannel) params.set('channel', filterChannel);
    const r = await fetch(`${API}/api/team-intelligence/analyses?${params}`, { headers: headers() });
    const d = await r.json();
    setAnalyses(d.analyses || []);
  }

  async function addMember() {
    if (!newMember.name) return;
    setLoading(true);
    await fetch(`${API}/api/team-intelligence/members`, {
      method: 'POST', headers: headers(), body: JSON.stringify(newMember)
    });
    setNewMember({ name: '', email: '', role: 'Satış Temsilcisi', wa_phone: '', notes: '' });
    setShowAddMember(false);
    loadMembers(); loadDashboard();
    setLoading(false);
  }

  async function deleteMember(id: string) {
    if (!confirm('Üyeyi silmek istediğinize emin misiniz?')) return;
    await fetch(`${API}/api/team-intelligence/members/${id}`, { method: 'DELETE', headers: headers() });
    loadMembers(); loadDashboard();
  }

  async function addLine(memberId: string) {
    if (!newLine.number) return;
    await fetch(`${API}/api/team-intelligence/members/${memberId}/lines`, {
      method: 'POST', headers: headers(), body: JSON.stringify(newLine)
    });
    setNewLine({ number: '', type: 'whatsapp' });
    setShowAddLine(null);
    loadMembers();
  }

  async function deleteLine(memberId: string, lineId: string) {
    await fetch(`${API}/api/team-intelligence/members/${memberId}/lines/${lineId}`, { method: 'DELETE', headers: headers() });
    loadMembers();
  }

  async function analyzeWhatsapp(memberId: string) {
    setAnalyzing(true);
    try {
      const r = await fetch(`${API}/api/team-intelligence/analyze-whatsapp`, {
        method: 'POST', headers: headers(),
        body: JSON.stringify({ memberId, days })
      });
      const d = await r.json();
      alert(d.message || `${d.analyzed} konuşma analiz edildi`);
      loadAnalyses(); loadDashboard();
    } catch (e: any) { alert(e.message); }
    setAnalyzing(false);
  }

  async function loadMemberReport(member: any) {
    setSelectedMember(member);
    const r = await fetch(`${API}/api/team-intelligence/member-report/${member.id}?days=${days}`, { headers: headers() });
    setMemberReport(await r.json());
    setTab('report');
  }

  const tabCls = (t: string) => `px-4 py-2 text-sm font-medium rounded-lg transition-all ${tab === t ? 'bg-purple-600 text-white shadow-lg' : 'text-gray-400 hover:text-white hover:bg-white/5'}`;

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white p-6 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2.5">
            <div className="w-8 h-8 bg-purple-600 rounded-lg flex items-center justify-center">
              <Activity className="w-4 h-4"/>
            </div>
            Ekip Zekası
          </h1>
          <p className="text-gray-500 text-sm mt-1">WhatsApp ve telefon konuşmalarını AI ile analiz et</p>
        </div>
        <div className="flex items-center gap-2">
          <select value={days} onChange={e => setDays(Number(e.target.value))}
            className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white">
            <option value={7}>Son 7 gün</option>
            <option value={30}>Son 30 gün</option>
            <option value={90}>Son 90 gün</option>
          </select>
          <button onClick={() => { loadDashboard(); loadMembers(); loadAnalyses(); }}
            className="p-2 bg-white/5 border border-white/10 rounded-lg hover:bg-white/10">
            <RefreshCw className="w-4 h-4"/>
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1.5 bg-white/3 border border-white/8 p-1 rounded-xl w-fit">
        {[['dashboard','Dashboard'],['team','Ekip'],['analyses','Analizler'],['report','Rapor']].map(([t,l]) => (
          <button key={t} onClick={() => setTab(t as any)} className={tabCls(t)}>{l}</button>
        ))}
      </div>

      {/* ── DASHBOARD ── */}
      {tab === 'dashboard' && (
        <div className="space-y-6">
          {loading ? (
            <div className="flex items-center justify-center h-40 text-gray-500">
              <RefreshCw className="w-5 h-5 animate-spin mr-2"/> Yükleniyor...
            </div>
          ) : dashboard ? (
            <>
              {/* Stat kartlar */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                  { label: 'Ekip Üyesi', value: dashboard.total_members, icon: Users, color: 'text-purple-400', bg: 'bg-purple-500/10' },
                  { label: 'Toplam Analiz', value: dashboard.total_analyses, icon: BarChart2, color: 'text-blue-400', bg: 'bg-blue-500/10' },
                  { label: 'WhatsApp', value: dashboard.whatsapp_analyses, icon: MessageSquare, color: 'text-teal-400', bg: 'bg-teal-500/10' },
                  { label: 'Telefon', value: dashboard.phone_analyses, icon: PhoneCall, color: 'text-amber-400', bg: 'bg-amber-500/10' },
                ].map(({ label, value, icon: Icon, color, bg }) => (
                  <div key={label} className="bg-white/3 border border-white/8 rounded-2xl p-4">
                    <div className={`w-9 h-9 ${bg} rounded-xl flex items-center justify-center mb-3`}>
                      <Icon className={`w-4 h-4 ${color}`}/>
                    </div>
                    <div className="text-2xl font-bold">{value}</div>
                    <div className="text-xs text-gray-500 mt-0.5">{label}</div>
                  </div>
                ))}
              </div>

              {/* Ekip Performans */}
              {dashboard.member_summary?.length > 0 && (
                <div className="bg-white/3 border border-white/8 rounded-2xl overflow-hidden">
                  <div className="px-5 py-4 border-b border-white/8 flex items-center justify-between">
                    <h3 className="font-semibold flex items-center gap-2">
                      <Users className="w-4 h-4 text-purple-400"/> Ekip Performansı
                    </h3>
                    <span className="text-xs text-gray-500">Son {days} gün</span>
                  </div>
                  <div className="divide-y divide-white/5">
                    {dashboard.member_summary.map((m: any, i: number) => (
                      <div key={m.id} className="px-5 py-4 flex items-center gap-4 hover:bg-white/3 cursor-pointer"
                        onClick={() => { const mem = members.find(x => x.id === m.id); if (mem) loadMemberReport(mem); }}>
                        <div className="w-7 h-7 rounded-full bg-white/8 flex items-center justify-center text-xs font-bold text-gray-400">
                          {i + 1}
                        </div>
                        <Avatar name={m.name} size="sm"/>
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-sm truncate">{m.name}</div>
                          <div className="text-xs text-gray-500">{m.role}</div>
                        </div>
                        <div className="hidden md:flex items-center gap-4 text-xs text-gray-400">
                          <span className="flex items-center gap-1"><MessageSquare className="w-3 h-3"/> {m.whatsapp}</span>
                          <span className="flex items-center gap-1"><PhoneCall className="w-3 h-3"/> {m.phone}</span>
                        </div>
                        <ScorePill score={m.avg_score}/>
                        <ChevronRight className="w-4 h-4 text-gray-600"/>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* En iyi / En kötü */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="bg-white/3 border border-white/8 rounded-2xl p-4">
                  <h3 className="font-semibold text-sm text-emerald-400 flex items-center gap-2 mb-3">
                    <TrendingUp className="w-4 h-4"/> En İyi Konuşmalar
                  </h3>
                  <div className="space-y-2">
                    {dashboard.best?.map((c: any) => (
                      <div key={c.id} className="flex items-center gap-3 p-2.5 bg-white/3 rounded-xl cursor-pointer hover:bg-white/6"
                        onClick={() => { setSelectedAnalysis(c); setTab('analyses'); }}>
                        <div className="flex-1 min-w-0">
                          <div className="text-xs font-medium truncate">{c.member_name}</div>
                          <div className="text-xs text-gray-500 truncate">{c.customer_phone}</div>
                        </div>
                        <div className="flex items-center gap-1.5">
                          {c.channel === 'whatsapp' ? <MessageSquare className="w-3 h-3 text-teal-400"/> : <PhoneCall className="w-3 h-3 text-amber-400"/>}
                          <ScorePill score={c.score}/>
                        </div>
                      </div>
                    ))}
                    {!dashboard.best?.length && <p className="text-xs text-gray-600 text-center py-4">Henüz analiz yok</p>}
                  </div>
                </div>

                <div className="bg-white/3 border border-white/8 rounded-2xl p-4">
                  <h3 className="font-semibold text-sm text-red-400 flex items-center gap-2 mb-3">
                    <TrendingDown className="w-4 h-4"/> İyileştirme Gereken
                  </h3>
                  <div className="space-y-2">
                    {dashboard.worst?.filter((c: any) => c.score).map((c: any) => (
                      <div key={c.id} className="flex items-center gap-3 p-2.5 bg-white/3 rounded-xl cursor-pointer hover:bg-white/6"
                        onClick={() => { setSelectedAnalysis(c); setTab('analyses'); }}>
                        <div className="flex-1 min-w-0">
                          <div className="text-xs font-medium truncate">{c.member_name}</div>
                          <div className="text-xs text-gray-500 truncate">{c.customer_phone}</div>
                        </div>
                        <div className="flex items-center gap-1.5">
                          {c.channel === 'whatsapp' ? <MessageSquare className="w-3 h-3 text-teal-400"/> : <PhoneCall className="w-3 h-3 text-amber-400"/>}
                          <ScorePill score={c.score}/>
                        </div>
                      </div>
                    ))}
                    {!dashboard.worst?.filter((c: any) => c.score).length && <p className="text-xs text-gray-600 text-center py-4">Henüz analiz yok</p>}
                  </div>
                </div>
              </div>

              {/* Zayıf yönler */}
              {dashboard.top_weaknesses?.length > 0 && (
                <div className="bg-white/3 border border-white/8 rounded-2xl p-4">
                  <h3 className="font-semibold text-sm flex items-center gap-2 mb-4">
                    <AlertTriangle className="w-4 h-4 text-amber-400"/> Ekip Genelinde Zayıf Yönler
                  </h3>
                  <div className="space-y-2.5">
                    {dashboard.top_weaknesses.map((w: any) => (
                      <div key={w.text} className="flex items-center gap-3">
                        <div className="flex-1 text-sm text-gray-300">{w.text}</div>
                        <span className="text-xs text-amber-400 font-medium shrink-0">{w.count}x</span>
                        <div className="w-20 h-1.5 bg-white/8 rounded-full overflow-hidden shrink-0">
                          <div className="h-full bg-amber-500 rounded-full"
                            style={{ width: `${(w.count / (dashboard.top_weaknesses[0]?.count || 1)) * 100}%` }}/>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="text-center py-20 text-gray-600">
              <Activity className="w-12 h-12 mx-auto mb-3 opacity-30"/>
              <p className="text-sm">Önce ekip üyesi ekle ve analiz başlat</p>
            </div>
          )}
        </div>
      )}

      {/* ── TEAM ── */}
      {tab === 'team' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold">Ekip Üyeleri ({members.length})</h2>
            <button onClick={() => setShowAddMember(true)}
              className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-500 rounded-xl text-sm font-medium">
              <Plus className="w-4 h-4"/> Üye Ekle
            </button>
          </div>

          {/* Üye Ekle Formu */}
          {showAddMember && (
            <div className="bg-white/3 border border-purple-500/30 rounded-2xl p-5 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-medium text-purple-300">Yeni Ekip Üyesi</h3>
                <button onClick={() => setShowAddMember(false)}><X className="w-4 h-4 text-gray-400"/></button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <input value={newMember.name} onChange={e => setNewMember({...newMember, name: e.target.value})}
                  placeholder="Ad Soyad *" className="bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-purple-500"/>
                <input value={newMember.email} onChange={e => setNewMember({...newMember, email: e.target.value})}
                  placeholder="Email" className="bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-purple-500"/>
                <input value={newMember.wa_phone} onChange={e => setNewMember({...newMember, wa_phone: e.target.value})}
                  placeholder="WhatsApp numarası (905551234567)" className="bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-purple-500"/>
                <select value={newMember.role} onChange={e => setNewMember({...newMember, role: e.target.value})}
                  className="bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-purple-500">
                  <option>Satış Temsilcisi</option>
                  <option>Kıdemli Satış Temsilcisi</option>
                  <option>Satış Müdürü</option>
                  <option>Müşteri Hizmetleri</option>
                </select>
              </div>
              <div className="flex justify-end gap-2">
                <button onClick={() => setShowAddMember(false)} className="px-4 py-2 text-sm text-gray-400 hover:text-white">İptal</button>
                <button onClick={addMember} disabled={loading}
                  className="px-5 py-2 bg-purple-600 hover:bg-purple-500 rounded-xl text-sm font-medium">
                  {loading ? <RefreshCw className="w-4 h-4 animate-spin"/> : 'Ekle'}
                </button>
              </div>
            </div>
          )}

          {/* Üye listesi */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {members.map(m => (
              <div key={m.id} className="bg-white/3 border border-white/8 rounded-2xl p-4 space-y-4">
                {/* Üye başlık */}
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <Avatar name={m.name}/>
                    <div>
                      <div className="font-semibold text-sm">{m.name}</div>
                      <div className="text-xs text-gray-500">{m.role}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5">
                    {m.avg_score !== null && <ScorePill score={m.avg_score}/>}
                    <button onClick={() => analyzeWhatsapp(m.id)} disabled={analyzing}
                      className="px-2.5 py-1.5 text-xs bg-teal-600/20 text-teal-400 border border-teal-500/30 rounded-lg hover:bg-teal-600/30 flex items-center gap-1">
                      {analyzing ? <RefreshCw className="w-3 h-3 animate-spin"/> : <MessageSquare className="w-3 h-3"/>}
                      Analiz
                    </button>
                    <button onClick={() => loadMemberReport(m)}
                      className="p-1.5 text-gray-400 hover:text-purple-400 bg-white/5 rounded-lg">
                      <Eye className="w-3.5 h-3.5"/>
                    </button>
                    <button onClick={() => deleteMember(m.id)}
                      className="p-1.5 text-gray-400 hover:text-red-400 bg-white/5 rounded-lg">
                      <Trash2 className="w-3.5 h-3.5"/>
                    </button>
                  </div>
                </div>

                {/* İletişim bilgileri */}
                <div className="space-y-1.5">
                  {m.email && (
                    <div className="text-xs text-gray-500 flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-gray-600 shrink-0"/>
                      {m.email}
                    </div>
                  )}
                  {m.wa_phone && (
                    <div className="text-xs text-teal-400 flex items-center gap-2">
                      <MessageSquare className="w-3 h-3 shrink-0"/>
                      WhatsApp: {m.wa_phone}
                    </div>
                  )}
                </div>

                {/* Hatlar */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-500 font-medium">Bağlı Hatlar</span>
                    <button onClick={() => setShowAddLine(showAddLine === m.id ? null : m.id)}
                      className="text-xs text-purple-400 hover:text-purple-300 flex items-center gap-1">
                      <Plus className="w-3 h-3"/> Hat Ekle
                    </button>
                  </div>

                  {showAddLine === m.id && (
                    <div className="flex gap-2 p-3 bg-white/5 rounded-xl">
                      <input value={newLine.number} onChange={e => setNewLine({...newLine, number: e.target.value})}
                        placeholder="Numara" className="flex-1 bg-white/5 border border-white/10 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none"/>
                      <select value={newLine.type} onChange={e => setNewLine({...newLine, type: e.target.value})}
                        className="bg-white/5 border border-white/10 rounded-lg px-2 py-1.5 text-xs focus:outline-none">
                        <option value="whatsapp">WhatsApp</option>
                        <option value="phone">Telefon</option>
                      </select>
                      <button onClick={() => addLine(m.id)}
                        className="px-2.5 py-1.5 bg-purple-600 hover:bg-purple-500 rounded-lg text-xs">
                        <Save className="w-3 h-3"/>
                      </button>
                    </div>
                  )}

                  {m.phone_lines?.filter((l: any) => l.is_active).map((line: any) => (
                    <div key={line.id} className="flex items-center justify-between p-2.5 bg-white/3 rounded-xl">
                      <div className="flex items-center gap-2">
                        {line.type === 'whatsapp'
                          ? <MessageSquare className="w-3.5 h-3.5 text-teal-400"/>
                          : <PhoneCall className="w-3.5 h-3.5 text-amber-400"/>}
                        <span className="text-xs font-mono text-gray-300">{line.number}</span>
                        <span className={`text-xs px-1.5 py-0.5 rounded-full ${line.type === 'whatsapp' ? 'bg-teal-500/15 text-teal-400' : 'bg-amber-500/15 text-amber-400'}`}>
                          {line.type === 'whatsapp' ? 'WhatsApp' : 'Telefon'}
                        </span>
                      </div>
                      <button onClick={() => deleteLine(m.id, line.id)}
                        className="text-gray-600 hover:text-red-400"><X className="w-3.5 h-3.5"/></button>
                    </div>
                  ))}

                  {(!m.phone_lines || m.phone_lines.filter((l: any) => l.is_active).length === 0) && showAddLine !== m.id && (
                    <div className="text-xs text-gray-600 text-center py-2">Hat eklenmemiş</div>
                  )}
                </div>

                {/* Özet stat */}
                {m.total_analyses > 0 && (
                  <div className="flex items-center justify-between pt-2 border-t border-white/5 text-xs text-gray-500">
                    <span>{m.total_analyses} analiz</span>
                    <span>Ort. <span className="text-white font-medium">{m.avg_score || '—'}</span></span>
                  </div>
                )}
              </div>
            ))}

            {members.length === 0 && (
              <div className="col-span-2 text-center py-16 text-gray-600">
                <Users className="w-12 h-12 mx-auto mb-3 opacity-30"/>
                <p className="text-sm">Ekip üyesi eklenmemiş</p>
                <button onClick={() => setShowAddMember(true)}
                  className="mt-3 text-sm text-purple-400 hover:text-purple-300">+ İlk üyeyi ekle</button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── ANALİZLER ── */}
      {tab === 'analyses' && (
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">
          {/* Liste */}
          <div className="lg:col-span-2 space-y-3">
            <div className="flex items-center gap-2">
              <h2 className="font-semibold flex-1">Analizler ({analyses.length})</h2>
              <select value={filterChannel} onChange={e => { setFilterChannel(e.target.value); }}
                className="bg-white/5 border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-white">
                <option value="">Tümü</option>
                <option value="whatsapp">WhatsApp</option>
                <option value="phone">Telefon</option>
              </select>
            </div>
            <div className="space-y-2 max-h-[600px] overflow-y-auto pr-1">
              {analyses.map(a => (
                <div key={a.id} onClick={() => setSelectedAnalysis(a)}
                  className={`p-3.5 rounded-xl cursor-pointer border transition-all ${selectedAnalysis?.id === a.id ? 'bg-purple-600/15 border-purple-500/40' : 'bg-white/3 border-white/8 hover:bg-white/5'}`}>
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-2">
                      <Avatar name={a.member_name || '?'} size="sm"/>
                      <div>
                        <div className="text-xs font-semibold">{a.member_name}</div>
                        <div className="text-xs text-gray-500">{a.customer_phone}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5">
                      {a.channel === 'whatsapp' ? <MessageSquare className="w-3 h-3 text-teal-400"/> : <PhoneCall className="w-3 h-3 text-amber-400"/>}
                      <ScorePill score={a.overall_score}/>
                    </div>
                  </div>
                  <p className="text-xs text-gray-500 line-clamp-2">{a.summary || 'Özet yok'}</p>
                  <div className="text-xs text-gray-600 mt-1.5">
                    {new Date(a.created_at).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
              ))}
              {analyses.length === 0 && (
                <div className="text-center py-12 text-gray-600">
                  <BarChart2 className="w-10 h-10 mx-auto mb-2 opacity-30"/>
                  <p className="text-sm">Henüz analiz yok</p>
                </div>
              )}
            </div>
          </div>

          {/* Detay */}
          <div className="lg:col-span-3">
            {selectedAnalysis && selectedAnalysis.overall_score ? (
              <div className="bg-white/3 border border-white/8 rounded-2xl p-5 space-y-5 max-h-[700px] overflow-y-auto">
                {/* Başlık */}
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <Avatar name={selectedAnalysis.member_name || '?'} size="sm"/>
                      <span className="font-bold">{selectedAnalysis.member_name}</span>
                      {selectedAnalysis.channel === 'whatsapp'
                        ? <span className="text-xs px-2 py-0.5 bg-teal-500/15 text-teal-400 rounded-full">WhatsApp</span>
                        : <span className="text-xs px-2 py-0.5 bg-amber-500/15 text-amber-400 rounded-full">Telefon</span>}
                    </div>
                    <div className="text-sm text-gray-400">{selectedAnalysis.customer_phone}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-3xl font-black" style={{
                      color: selectedAnalysis.overall_score >= 80 ? '#10b981'
                        : selectedAnalysis.overall_score >= 60 ? '#f59e0b'
                        : '#ef4444'
                    }}>{selectedAnalysis.overall_score}</div>
                    <div className="text-xs text-gray-500">Genel Skor</div>
                  </div>
                </div>

                <p className="text-sm text-gray-300 leading-relaxed border-l-2 border-purple-600/50 pl-3">{selectedAnalysis.summary}</p>

                {/* Detaylı skorlar */}
                <div className="space-y-2.5">
                  <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Detaylı Puanlar</h4>
                  <ScoreBar label="Profesyonellik" score={selectedAnalysis.professionalism_score || 0}/>
                  <ScoreBar label="Satış Tekniği" score={selectedAnalysis.sales_technique_score || 0}/>
                  <ScoreBar label="Empati" score={selectedAnalysis.empathy_score || 0}/>
                  <ScoreBar label="Kapanış" score={selectedAnalysis.closing_score || 0}/>
                  <ScoreBar label="İletişim" score={selectedAnalysis.communication_score || 0}/>
                </div>

                {/* Güçlü/Zayıf */}
                <div className="grid grid-cols-2 gap-4">
                  {selectedAnalysis.strengths?.length > 0 && (
                    <div>
                      <h4 className="text-xs font-semibold text-emerald-400 uppercase tracking-wider mb-2">Güçlü Yönler</h4>
                      <div className="space-y-1.5">
                        {selectedAnalysis.strengths.map((s: string, i: number) => (
                          <div key={i} className="flex items-start gap-1.5 text-xs">
                            <CheckCircle className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5"/>
                            <span className="text-gray-300">{s}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  {selectedAnalysis.weaknesses?.length > 0 && (
                    <div>
                      <h4 className="text-xs font-semibold text-red-400 uppercase tracking-wider mb-2">Zayıf Yönler</h4>
                      <div className="space-y-1.5">
                        {selectedAnalysis.weaknesses.map((w: string, i: number) => (
                          <div key={i} className="flex items-start gap-1.5 text-xs">
                            <AlertTriangle className="w-3.5 h-3.5 text-red-400 shrink-0 mt-0.5"/>
                            <span className="text-gray-300">{w}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Kaçırılan fırsatlar */}
                {selectedAnalysis.lost_opportunities?.length > 0 && (
                  <div>
                    <h4 className="text-xs font-semibold text-amber-400 uppercase tracking-wider mb-2">Kaçırılan Fırsatlar</h4>
                    <div className="space-y-2">
                      {selectedAnalysis.lost_opportunities.map((o: any, i: number) => (
                        <div key={i} className="p-3 bg-amber-500/8 border border-amber-500/20 rounded-xl">
                          <div className="text-xs font-medium text-amber-300 mb-1">{o.moment}</div>
                          <div className="text-xs text-gray-400">{o.suggestion}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Öneriler */}
                {selectedAnalysis.recommendations?.length > 0 && (
                  <div>
                    <h4 className="text-xs font-semibold text-purple-400 uppercase tracking-wider mb-2">Öneriler</h4>
                    <div className="space-y-1.5">
                      {selectedAnalysis.recommendations.map((r: string, i: number) => (
                        <div key={i} className="flex items-start gap-1.5 text-xs">
                          <Target className="w-3.5 h-3.5 text-purple-400 shrink-0 mt-0.5"/>
                          <span className="text-gray-300">{r}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center justify-center h-80 bg-white/3 border border-white/8 rounded-2xl text-gray-600">
                <div className="text-center">
                  <Eye className="w-10 h-10 mx-auto mb-2 opacity-30"/>
                  <p className="text-sm">Sol listeden bir analiz seç</p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── RAPOR ── */}
      {tab === 'report' && memberReport && (
        <div className="space-y-5">
          <div className="flex items-center gap-4">
            <Avatar name={memberReport.member?.name || '?'} size="lg"/>
            <div>
              <h2 className="font-bold text-xl">{memberReport.member?.name}</h2>
              <div className="text-sm text-gray-400">{memberReport.member?.role} · Son {memberReport.period_days} gün</div>
            </div>
          </div>

          {/* Özet kartlar */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            {[
              { label: 'Toplam Analiz', value: memberReport.total_analyses },
              { label: 'WhatsApp', value: memberReport.whatsapp_count },
              { label: 'Telefon', value: memberReport.phone_count },
              { label: 'Genel Skor', value: memberReport.avg_score || '—' },
              { label: 'Satış Tekniği', value: memberReport.scores?.sales_technique || '—' },
            ].map(({ label, value }) => (
              <div key={label} className="bg-white/3 border border-white/8 rounded-2xl p-4 text-center">
                <div className="text-2xl font-bold">{value}</div>
                <div className="text-xs text-gray-500 mt-1">{label}</div>
              </div>
            ))}
          </div>

          {/* Detaylı skorlar */}
          <div className="bg-white/3 border border-white/8 rounded-2xl p-5">
            <h3 className="font-semibold mb-4">Performans Skorları</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <ScoreBar label="Profesyonellik" score={memberReport.scores?.professionalism || 0}/>
              <ScoreBar label="Satış Tekniği" score={memberReport.scores?.sales_technique || 0}/>
              <ScoreBar label="Empati" score={memberReport.scores?.empathy || 0}/>
              <ScoreBar label="Kapanış" score={memberReport.scores?.closing || 0}/>
            </div>
          </div>

          {/* Güçlü/Zayıf/Öneriler */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white/3 border border-white/8 rounded-2xl p-4">
              <h3 className="text-sm font-semibold text-emerald-400 flex items-center gap-2 mb-3">
                <TrendingUp className="w-4 h-4"/> Güçlü Yönler
              </h3>
              <div className="space-y-2">
                {memberReport.top_strengths?.map((s: any) => (
                  <div key={s.text} className="flex items-center gap-2">
                    <CheckCircle className="w-3.5 h-3.5 text-emerald-400 shrink-0"/>
                    <span className="text-xs text-gray-300 flex-1">{s.text}</span>
                    <span className="text-xs text-emerald-400">{s.count}x</span>
                  </div>
                ))}
                {!memberReport.top_strengths?.length && <p className="text-xs text-gray-600">Veri yok</p>}
              </div>
            </div>
            <div className="bg-white/3 border border-white/8 rounded-2xl p-4">
              <h3 className="text-sm font-semibold text-red-400 flex items-center gap-2 mb-3">
                <TrendingDown className="w-4 h-4"/> Gelişim Alanları
              </h3>
              <div className="space-y-2">
                {memberReport.top_weaknesses?.map((w: any) => (
                  <div key={w.text} className="flex items-center gap-2">
                    <AlertTriangle className="w-3.5 h-3.5 text-red-400 shrink-0"/>
                    <span className="text-xs text-gray-300 flex-1">{w.text}</span>
                    <span className="text-xs text-red-400">{w.count}x</span>
                  </div>
                ))}
                {!memberReport.top_weaknesses?.length && <p className="text-xs text-gray-600">Veri yok</p>}
              </div>
            </div>
            <div className="bg-white/3 border border-white/8 rounded-2xl p-4">
              <h3 className="text-sm font-semibold text-purple-400 flex items-center gap-2 mb-3">
                <Target className="w-4 h-4"/> Koçluk Önerileri
              </h3>
              <div className="space-y-2">
                {memberReport.top_recommendations?.map((r: any) => (
                  <div key={r.text} className="flex items-start gap-2">
                    <ArrowUpRight className="w-3.5 h-3.5 text-purple-400 shrink-0 mt-0.5"/>
                    <span className="text-xs text-gray-300">{r.text}</span>
                  </div>
                ))}
                {!memberReport.top_recommendations?.length && <p className="text-xs text-gray-600">Veri yok</p>}
              </div>
            </div>
          </div>

          {/* Konuşma geçmişi */}
          <div className="bg-white/3 border border-white/8 rounded-2xl overflow-hidden">
            <div className="px-5 py-4 border-b border-white/8">
              <h3 className="font-semibold">Konuşma Geçmişi</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/8 text-gray-500 text-xs">
                    <th className="text-left px-4 py-3">Müşteri</th>
                    <th className="text-center px-4 py-3">Kanal</th>
                    <th className="text-center px-4 py-3">Süre</th>
                    <th className="text-center px-4 py-3">Skor</th>
                    <th className="text-left px-4 py-3">Özet</th>
                    <th className="text-right px-4 py-3">Tarih</th>
                  </tr>
                </thead>
                <tbody>
                  {memberReport.recent_analyses?.map((a: any) => (
                    <tr key={a.id} className="border-b border-white/5 hover:bg-white/3 cursor-pointer"
                      onClick={() => { setSelectedAnalysis(a); setTab('analyses'); }}>
                      <td className="px-4 py-3">
                        <div className="font-medium text-xs">{a.customer_name || a.customer_phone}</div>
                        <div className="text-xs text-gray-500 font-mono">{a.customer_phone}</div>
                      </td>
                      <td className="px-4 py-3 text-center">
                        {a.channel === 'whatsapp'
                          ? <span className="text-xs px-2 py-0.5 bg-teal-500/15 text-teal-400 rounded-full">WA</span>
                          : <span className="text-xs px-2 py-0.5 bg-amber-500/15 text-amber-400 rounded-full">Tel</span>}
                      </td>
                      <td className="px-4 py-3 text-center text-xs text-gray-400">
                        {a.duration_seconds ? `${Math.round(a.duration_seconds / 60)}dk` : '—'}
                      </td>
                      <td className="px-4 py-3 text-center"><ScorePill score={a.score}/></td>
                      <td className="px-4 py-3 text-xs text-gray-400 max-w-[200px] truncate">{a.summary}</td>
                      <td className="px-4 py-3 text-right text-xs text-gray-500">
                        {new Date(a.created_at).toLocaleDateString('tr-TR')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {!memberReport.recent_analyses?.length && (
                <div className="text-center py-10 text-gray-600 text-sm">Bu üye için analiz bulunamadı</div>
              )}
            </div>
          </div>
        </div>
      )}

      {tab === 'report' && !memberReport && (
        <div className="text-center py-20 text-gray-600">
          <Award className="w-12 h-12 mx-auto mb-3 opacity-30"/>
          <p className="text-sm">Ekip sekmesinden bir üye seçerek rapor görüntüle</p>
        </div>
      )}
    </div>
  );
}