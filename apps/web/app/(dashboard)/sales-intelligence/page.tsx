'use client';
import { useState, useEffect } from 'react';
import { 
  Users, TrendingUp, TrendingDown, MessageSquare, Phone, 
  Star, AlertTriangle, CheckCircle, ChevronRight, RefreshCw,
  BarChart2, Award, Target, Clock, Plus, Trash2, Eye,
  ArrowUp, ArrowDown, Minus
} from 'lucide-react';

const API = process.env.NEXT_PUBLIC_API_URL || 'https://leadflow-ai-production.up.railway.app';

function getToken() {
  if (typeof window === 'undefined') return '';
  return localStorage.getItem('token') || '';
}

function headers() {
  return { 'Authorization': `Bearer ${getToken()}`, 'Content-Type': 'application/json' };
}

function ScoreRing({ score, size = 80 }: { score: number; size?: number }) {
  const r = (size / 2) - 8;
  const circ = 2 * Math.PI * r;
  const fill = (score / 100) * circ;
  const color = score >= 80 ? '#10b981' : score >= 60 ? '#f59e0b' : score >= 40 ? '#f97316' : '#ef4444';
  return (
    <svg width={size} height={size} className="rotate-[-90deg]">
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="6"/>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth="6"
        strokeDasharray={`${fill} ${circ}`} strokeLinecap="round"
        style={{ transition: 'stroke-dasharray 1s ease' }}/>
      <text x={size/2} y={size/2} textAnchor="middle" dominantBaseline="central"
        className="rotate-90" style={{ rotate: '90deg', transformOrigin: 'center', fontSize: size < 60 ? '12px' : '16px', fontWeight: 700, fill: color, transform: `rotate(90deg)` }}>
      </text>
    </svg>
  );
}

function ScoreBadge({ score }: { score: number }) {
  const color = score >= 80 ? 'text-emerald-400 bg-emerald-400/10' 
    : score >= 60 ? 'text-amber-400 bg-amber-400/10'
    : score >= 40 ? 'text-orange-400 bg-orange-400/10' 
    : 'text-red-400 bg-red-400/10';
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
      <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
        <div className={`h-full ${color} rounded-full transition-all duration-700`} style={{ width: `${score}%` }}/>
      </div>
    </div>
  );
}

export default function SalesIntelligencePage() {
  const [tab, setTab] = useState<'dashboard'|'team'|'analyses'|'report'>('dashboard');
  const [dashboard, setDashboard] = useState<any>(null);
  const [team, setTeam] = useState<any[]>([]);
  const [analyses, setAnalyses] = useState<any[]>([]);
  const [selectedAnalysis, setSelectedAnalysis] = useState<any>(null);
  const [selectedAgent, setSelectedAgent] = useState<string>('');
  const [agentReport, setAgentReport] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [addingMember, setAddingMember] = useState(false);
  const [newMember, setNewMember] = useState({ name: '', email: '', phone: '', role: 'Satış Temsilcisi' });
  const [days, setDays] = useState(30);
  const [leads, setLeads] = useState<any[]>([]);
  const [selectedLead, setSelectedLead] = useState('');
  const [analysisAgent, setAnalysisAgent] = useState('');

  useEffect(() => { loadDashboard(); loadTeam(); loadAnalyses(); loadLeads(); }, [days]);

  async function loadDashboard() {
    setLoading(true);
    try {
      const r = await fetch(`${API}/api/sales-intelligence/dashboard?days=${days}`, { headers: headers() });
      const d = await r.json();
      setDashboard(d);
    } catch {}
    setLoading(false);
  }

  async function loadTeam() {
    const r = await fetch(`${API}/api/sales-intelligence/team`, { headers: headers() });
    const d = await r.json();
    setTeam(d.team || []);
  }

  async function loadAnalyses() {
    const r = await fetch(`${API}/api/sales-intelligence/analyses?limit=50`, { headers: headers() });
    const d = await r.json();
    setAnalyses(d.analyses || []);
  }

  async function loadLeads() {
    const r = await fetch(`${API}/api/leads?limit=100`, { headers: headers() });
    const d = await r.json();
    setLeads(d.leads || []);
  }

  async function addTeamMember() {
    if (!newMember.name) return;
    setLoading(true);
    await fetch(`${API}/api/sales-intelligence/team`, {
      method: 'POST', headers: headers(), body: JSON.stringify(newMember)
    });
    setNewMember({ name: '', email: '', phone: '', role: 'Satış Temsilcisi' });
    setAddingMember(false);
    loadTeam();
    setLoading(false);
  }

  async function removeTeamMember(id: string) {
    await fetch(`${API}/api/sales-intelligence/team/${id}`, { method: 'DELETE', headers: headers() });
    loadTeam();
  }

  async function analyzeConversation() {
    if (!selectedLead) return;
    setAnalyzing(true);
    try {
      const r = await fetch(`${API}/api/sales-intelligence/analyze`, {
        method: 'POST', headers: headers(),
        body: JSON.stringify({ leadId: selectedLead, agentName: analysisAgent || 'Temsilci', days })
      });
      const d = await r.json();
      if (d.analysis) {
        setSelectedAnalysis(d.analysis);
        loadAnalyses();
        loadDashboard();
      } else {
        alert(d.error || 'Analiz yapılamadı');
      }
    } catch (e: any) { alert(e.message); }
    setAnalyzing(false);
  }

  async function analyzeAll() {
    setAnalyzing(true);
    try {
      const r = await fetch(`${API}/api/sales-intelligence/analyze-all`, {
        method: 'POST', headers: headers(),
        body: JSON.stringify({ agentName: analysisAgent || 'Temsilci', days })
      });
      const d = await r.json();
      alert(`${d.analyzed} konuşma analiz edildi`);
      loadAnalyses();
      loadDashboard();
    } catch {}
    setAnalyzing(false);
  }

  async function loadAgentReport(name: string) {
    setSelectedAgent(name);
    const r = await fetch(`${API}/api/sales-intelligence/report/${encodeURIComponent(name)}?days=${days}`, { headers: headers() });
    const d = await r.json();
    setAgentReport(d);
    setTab('report');
  }

  const tabClass = (t: string) => `px-4 py-2 text-sm font-medium rounded-lg transition-all ${tab === t ? 'bg-purple-600 text-white' : 'text-gray-400 hover:text-white hover:bg-white/5'}`;

  return (
    <div className="min-h-screen bg-gray-950 text-white p-6 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <BarChart2 className="w-7 h-7 text-purple-400"/>
            Satış Zekası & Performans
          </h1>
          <p className="text-gray-400 text-sm mt-1">WhatsApp konuşmalarını AI ile analiz et, ekip performansını ölç</p>
        </div>
        <div className="flex items-center gap-3">
          <select value={days} onChange={e => setDays(Number(e.target.value))}
            className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white">
            <option value={7}>Son 7 gün</option>
            <option value={30}>Son 30 gün</option>
            <option value={90}>Son 90 gün</option>
          </select>
          <button onClick={() => { loadDashboard(); loadAnalyses(); }}
            className="flex items-center gap-2 px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm hover:bg-white/10">
            <RefreshCw className="w-4 h-4"/> Yenile
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 bg-white/5 p-1 rounded-xl w-fit">
        {[['dashboard','Dashboard'],['team','Ekip'],['analyses','Analizler'],['report','Rapor']].map(([t,l]) => (
          <button key={t} onClick={() => setTab(t as any)} className={tabClass(t)}>{l}</button>
        ))}
      </div>

      {/* DASHBOARD TAB */}
      {tab === 'dashboard' && (
        <div className="space-y-6">
          {/* Analiz Başlat */}
          <div className="bg-gradient-to-r from-purple-900/40 to-indigo-900/40 border border-purple-500/20 rounded-2xl p-5">
            <h2 className="text-base font-semibold mb-4 flex items-center gap-2">
              <Target className="w-5 h-5 text-purple-400"/> Konuşma Analizi Başlat
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              <select value={selectedLead} onChange={e => setSelectedLead(e.target.value)}
                className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm col-span-2">
                <option value="">Lead seç...</option>
                {leads.filter(l => l.phone).map(l => (
                  <option key={l.id} value={l.id}>{l.company_name} — {l.phone}</option>
                ))}
              </select>
              <input value={analysisAgent} onChange={e => setAnalysisAgent(e.target.value)}
                placeholder="Temsilci adı (opsiyonel)"
                className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm"/>
              <div className="flex gap-2">
                <button onClick={analyzeConversation} disabled={analyzing || !selectedLead}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 rounded-lg text-sm font-medium">
                  {analyzing ? <RefreshCw className="w-4 h-4 animate-spin"/> : <MessageSquare className="w-4 h-4"/>}
                  Analiz Et
                </button>
                <button onClick={analyzeAll} disabled={analyzing}
                  className="px-3 py-2 bg-white/5 border border-white/10 hover:bg-white/10 rounded-lg text-sm" title="Tümünü analiz et">
                  <Users className="w-4 h-4"/>
                </button>
              </div>
            </div>
          </div>

          {loading ? (
            <div className="flex items-center justify-center h-40 text-gray-400">
              <RefreshCw className="w-6 h-6 animate-spin mr-2"/> Yükleniyor...
            </div>
          ) : dashboard ? (
            <>
              {/* Özet Kartlar */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                  { label: 'Toplam Analiz', value: dashboard.total_analyses, icon: BarChart2, color: 'purple' },
                  { label: 'Ortalama Skor', value: dashboard.avg_score, icon: Star, color: dashboard.avg_score >= 70 ? 'emerald' : dashboard.avg_score >= 50 ? 'amber' : 'red' },
                  { label: 'Mükemmel (%80+)', value: dashboard.score_distribution?.excellent || 0, icon: Award, color: 'emerald' },
                  { label: 'Zayıf (<%40)', value: dashboard.score_distribution?.poor || 0, icon: AlertTriangle, color: 'red' },
                ].map(({ label, value, icon: Icon, color }) => (
                  <div key={label} className="bg-white/5 border border-white/10 rounded-2xl p-4">
                    <div className={`w-10 h-10 rounded-xl bg-${color}-500/10 flex items-center justify-center mb-3`}>
                      <Icon className={`w-5 h-5 text-${color}-400`}/>
                    </div>
                    <div className="text-2xl font-bold text-white">{value}</div>
                    <div className="text-xs text-gray-400 mt-1">{label}</div>
                  </div>
                ))}
              </div>

              {/* Ekip Performans Tablosu */}
              {dashboard.agent_summary?.length > 0 && (
                <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden">
                  <div className="p-4 border-b border-white/10">
                    <h3 className="font-semibold flex items-center gap-2">
                      <Users className="w-4 h-4 text-purple-400"/> Ekip Performansı
                    </h3>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-white/10 text-gray-400 text-xs">
                          <th className="text-left px-4 py-3">Temsilci</th>
                          <th className="text-center px-4 py-3">Konuşma</th>
                          <th className="text-center px-4 py-3">Ort. Skor</th>
                          <th className="text-center px-4 py-3">Min</th>
                          <th className="text-center px-4 py-3">Max</th>
                          <th className="text-right px-4 py-3">Rapor</th>
                        </tr>
                      </thead>
                      <tbody>
                        {dashboard.agent_summary.map((a: any, i: number) => (
                          <tr key={a.name} className="border-b border-white/5 hover:bg-white/5">
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-full bg-purple-600/20 flex items-center justify-center text-purple-300 text-xs font-bold">
                                  {i + 1}
                                </div>
                                <span className="font-medium">{a.name}</span>
                              </div>
                            </td>
                            <td className="px-4 py-3 text-center text-gray-300">{a.conversation_count}</td>
                            <td className="px-4 py-3 text-center"><ScoreBadge score={a.avg_score}/></td>
                            <td className="px-4 py-3 text-center text-red-400 text-xs">{a.min_score}</td>
                            <td className="px-4 py-3 text-center text-emerald-400 text-xs">{a.max_score}</td>
                            <td className="px-4 py-3 text-right">
                              <button onClick={() => loadAgentReport(a.name)}
                                className="text-purple-400 hover:text-purple-300 text-xs flex items-center gap-1 ml-auto">
                                Rapor <ChevronRight className="w-3 h-3"/>
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* En İyi Konuşmalar */}
                <div className="bg-white/5 border border-white/10 rounded-2xl p-4 space-y-3">
                  <h3 className="font-semibold flex items-center gap-2 text-emerald-400">
                    <TrendingUp className="w-4 h-4"/> En İyi Konuşmalar
                  </h3>
                  {dashboard.top_conversations?.map((c: any) => (
                    <div key={c.id} onClick={() => { setTab('analyses'); setSelectedAnalysis(c); }}
                      className="flex items-center justify-between p-3 bg-white/5 rounded-xl cursor-pointer hover:bg-white/10">
                      <div>
                        <div className="text-sm font-medium">{c.company || 'Bilinmiyor'}</div>
                        <div className="text-xs text-gray-400 truncate max-w-[200px]">{c.summary}</div>
                      </div>
                      <ScoreBadge score={c.score}/>
                    </div>
                  ))}
                </div>

                {/* En Kötü Konuşmalar */}
                <div className="bg-white/5 border border-white/10 rounded-2xl p-4 space-y-3">
                  <h3 className="font-semibold flex items-center gap-2 text-red-400">
                    <TrendingDown className="w-4 h-4"/> İyileştirilmesi Gerekenler
                  </h3>
                  {dashboard.worst_conversations?.map((c: any) => (
                    <div key={c.id} onClick={() => { setTab('analyses'); setSelectedAnalysis(c); }}
                      className="flex items-center justify-between p-3 bg-white/5 rounded-xl cursor-pointer hover:bg-white/10">
                      <div>
                        <div className="text-sm font-medium">{c.company || 'Bilinmiyor'}</div>
                        <div className="text-xs text-gray-400 truncate max-w-[200px]">{c.summary}</div>
                      </div>
                      <ScoreBadge score={c.score}/>
                    </div>
                  ))}
                </div>
              </div>

              {/* Ortak Zayıf Yönler */}
              {dashboard.top_weaknesses?.length > 0 && (
                <div className="bg-white/5 border border-white/10 rounded-2xl p-4">
                  <h3 className="font-semibold flex items-center gap-2 mb-4">
                    <AlertTriangle className="w-4 h-4 text-amber-400"/> En Sık Karşılaşılan Zayıf Yönler
                  </h3>
                  <div className="space-y-2">
                    {dashboard.top_weaknesses.map((w: any) => (
                      <div key={w.text} className="flex items-center gap-3">
                        <div className="flex-1 text-sm text-gray-300">{w.text}</div>
                        <div className="text-xs text-amber-400 font-medium">{w.count}x</div>
                        <div className="w-24 h-1.5 bg-white/10 rounded-full overflow-hidden">
                          <div className="h-full bg-amber-500 rounded-full" style={{ width: `${(w.count / (dashboard.top_weaknesses[0]?.count || 1)) * 100}%` }}/>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="text-center py-20 text-gray-500">
              <BarChart2 className="w-12 h-12 mx-auto mb-3 opacity-30"/>
              <p>Henüz analiz yok. İlk konuşmayı analiz etmek için yukarıdaki formu kullan.</p>
            </div>
          )}
        </div>
      )}

      {/* TEAM TAB */}
      {tab === 'team' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-lg">Ekip Üyeleri</h2>
            <button onClick={() => setAddingMember(!addingMember)}
              className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-500 rounded-lg text-sm">
              <Plus className="w-4 h-4"/> Üye Ekle
            </button>
          </div>

          {addingMember && (
            <div className="bg-white/5 border border-purple-500/30 rounded-2xl p-4 space-y-3">
              <h3 className="text-sm font-medium text-purple-300">Yeni Ekip Üyesi</h3>
              <div className="grid grid-cols-2 gap-3">
                <input value={newMember.name} onChange={e => setNewMember({...newMember, name: e.target.value})}
                  placeholder="Ad Soyad *" className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm"/>
                <input value={newMember.email} onChange={e => setNewMember({...newMember, email: e.target.value})}
                  placeholder="Email" className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm"/>
                <input value={newMember.phone} onChange={e => setNewMember({...newMember, phone: e.target.value})}
                  placeholder="WhatsApp numarası" className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm"/>
                <select value={newMember.role} onChange={e => setNewMember({...newMember, role: e.target.value})}
                  className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm">
                  <option>Satış Temsilcisi</option>
                  <option>Kıdemli Satış Temsilcisi</option>
                  <option>Satış Müdürü</option>
                  <option>Müşteri Hizmetleri</option>
                </select>
              </div>
              <div className="flex gap-2 justify-end">
                <button onClick={() => setAddingMember(false)} className="px-4 py-2 text-sm text-gray-400 hover:text-white">İptal</button>
                <button onClick={addTeamMember} className="px-4 py-2 bg-purple-600 hover:bg-purple-500 rounded-lg text-sm">Ekle</button>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {team.map(m => {
              const agentData = dashboard?.agent_summary?.find((a: any) => a.name === m.name);
              return (
                <div key={m.id} className="bg-white/5 border border-white/10 rounded-2xl p-4 space-y-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-purple-600/20 flex items-center justify-center text-purple-300 font-bold text-sm">
                        {m.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div className="font-medium text-sm">{m.name}</div>
                        <div className="text-xs text-gray-400">{m.role}</div>
                      </div>
                    </div>
                    <button onClick={() => removeTeamMember(m.id)} className="text-gray-500 hover:text-red-400">
                      <Trash2 className="w-4 h-4"/>
                    </button>
                  </div>
                  {m.email && <div className="text-xs text-gray-400">{m.email}</div>}
                  {m.phone && <div className="text-xs text-gray-400">{m.phone}</div>}
                  {agentData ? (
                    <div className="border-t border-white/10 pt-3 space-y-1">
                      <div className="flex justify-between text-xs">
                        <span className="text-gray-400">Ort. Skor</span>
                        <ScoreBadge score={agentData.avg_score}/>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span className="text-gray-400">Konuşma</span>
                        <span className="text-white">{agentData.conversation_count}</span>
                      </div>
                      <button onClick={() => loadAgentReport(m.name)}
                        className="w-full mt-2 py-1.5 text-xs text-purple-400 border border-purple-500/30 rounded-lg hover:bg-purple-500/10 flex items-center justify-center gap-1">
                        <Eye className="w-3 h-3"/> Detaylı Rapor
                      </button>
                    </div>
                  ) : (
                    <div className="text-xs text-gray-500 text-center pt-2">Henüz analiz yok</div>
                  )}
                </div>
              );
            })}
            {team.length === 0 && (
              <div className="col-span-3 text-center py-12 text-gray-500">
                <Users className="w-10 h-10 mx-auto mb-2 opacity-30"/>
                <p className="text-sm">Ekip üyesi eklenmemiş</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ANALYSES TAB */}
      {tab === 'analyses' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Liste */}
          <div className="space-y-3">
            <h2 className="font-semibold">Konuşma Analizleri ({analyses.length})</h2>
            <div className="space-y-2 max-h-[600px] overflow-y-auto pr-1">
              {analyses.map(a => (
                <div key={a.id} onClick={() => setSelectedAnalysis(a)}
                  className={`p-4 rounded-2xl cursor-pointer border transition-all ${selectedAnalysis?.id === a.id ? 'bg-purple-600/20 border-purple-500/50' : 'bg-white/5 border-white/10 hover:bg-white/8'}`}>
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <div className="font-medium text-sm">{a.company_name || a.phone}</div>
                      <div className="text-xs text-gray-400">{a.agent_name} · {a.message_count} mesaj</div>
                    </div>
                    <ScoreBadge score={a.overall_score}/>
                  </div>
                  <p className="text-xs text-gray-400 line-clamp-2">{a.summary}</p>
                  <div className="text-xs text-gray-500 mt-2">
                    {new Date(a.created_at).toLocaleDateString('tr-TR', { day:'numeric', month:'long', hour:'2-digit', minute:'2-digit' })}
                  </div>
                </div>
              ))}
              {analyses.length === 0 && (
                <div className="text-center py-12 text-gray-500">
                  <MessageSquare className="w-10 h-10 mx-auto mb-2 opacity-30"/>
                  <p className="text-sm">Henüz analiz yok</p>
                </div>
              )}
            </div>
          </div>

          {/* Detay */}
          {selectedAnalysis && selectedAnalysis.overall_score ? (
            <div className="bg-white/5 border border-white/10 rounded-2xl p-5 space-y-5 max-h-[700px] overflow-y-auto">
              <div>
                <div className="flex items-start justify-between mb-1">
                  <div>
                    <h3 className="font-bold text-lg">{selectedAnalysis.company_name || selectedAnalysis.phone}</h3>
                    <p className="text-xs text-gray-400">{selectedAnalysis.agent_name} · {selectedAnalysis.channel?.toUpperCase()}</p>
                  </div>
                  <div className="text-right">
                    <div className="text-3xl font-bold" style={{ color: selectedAnalysis.overall_score >= 80 ? '#10b981' : selectedAnalysis.overall_score >= 60 ? '#f59e0b' : '#ef4444' }}>
                      {selectedAnalysis.overall_score}
                    </div>
                    <div className="text-xs text-gray-400">Genel Skor</div>
                  </div>
                </div>
                <p className="text-sm text-gray-300 mt-2">{selectedAnalysis.summary}</p>
              </div>

              {/* Detaylı Puanlar */}
              <div className="space-y-2">
                <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Detaylı Puanlar</h4>
                <ScoreBar label="Profesyonellik" score={selectedAnalysis.professionalism_score || 0}/>
                <ScoreBar label="Yanıt Hızı & Kalitesi" score={selectedAnalysis.responsiveness_score || 0}/>
                <ScoreBar label="Satış Tekniği" score={selectedAnalysis.sales_technique_score || 0}/>
                <ScoreBar label="Empati & Müşteri Anlayışı" score={selectedAnalysis.empathy_score || 0}/>
                <ScoreBar label="Kapanış Tekniği" score={selectedAnalysis.closing_score || 0}/>
              </div>

              {/* Güçlü Yönler */}
              {selectedAnalysis.strengths?.length > 0 && (
                <div>
                  <h4 className="text-xs font-semibold text-emerald-400 uppercase tracking-wider mb-2">Güçlü Yönler</h4>
                  <div className="space-y-1">
                    {selectedAnalysis.strengths.map((s: string, i: number) => (
                      <div key={i} className="flex items-start gap-2 text-sm">
                        <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5"/>
                        <span className="text-gray-300">{s}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Zayıf Yönler */}
              {selectedAnalysis.weaknesses?.length > 0 && (
                <div>
                  <h4 className="text-xs font-semibold text-red-400 uppercase tracking-wider mb-2">Zayıf Yönler</h4>
                  <div className="space-y-1">
                    {selectedAnalysis.weaknesses.map((w: string, i: number) => (
                      <div key={i} className="flex items-start gap-2 text-sm">
                        <AlertTriangle className="w-4 h-4 text-red-400 shrink-0 mt-0.5"/>
                        <span className="text-gray-300">{w}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Kaçırılan Fırsatlar */}
              {selectedAnalysis.lost_opportunities?.length > 0 && (
                <div>
                  <h4 className="text-xs font-semibold text-amber-400 uppercase tracking-wider mb-2">Kaçırılan Fırsatlar</h4>
                  <div className="space-y-2">
                    {selectedAnalysis.lost_opportunities.map((o: any, i: number) => (
                      <div key={i} className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-3">
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
                  <div className="space-y-1">
                    {selectedAnalysis.recommendations.map((r: string, i: number) => (
                      <div key={i} className="flex items-start gap-2 text-sm">
                        <Target className="w-4 h-4 text-purple-400 shrink-0 mt-0.5"/>
                        <span className="text-gray-300">{r}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Önemli Anlar */}
              {selectedAnalysis.key_moments?.length > 0 && (
                <div>
                  <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Önemli Anlar</h4>
                  <div className="space-y-2">
                    {selectedAnalysis.key_moments.map((m: any, i: number) => (
                      <div key={i} className={`flex items-start gap-2 text-xs p-2 rounded-lg ${m.type === 'positive' ? 'bg-emerald-500/10' : m.type === 'negative' ? 'bg-red-500/10' : 'bg-white/5'}`}>
                        <span className="text-gray-400 font-mono shrink-0">{m.time}</span>
                        <span className="text-gray-300">{m.description}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="flex items-center justify-center h-80 text-gray-500 bg-white/5 rounded-2xl border border-white/10">
              <div className="text-center">
                <Eye className="w-10 h-10 mx-auto mb-2 opacity-30"/>
                <p className="text-sm">Detayları görmek için bir analiz seç</p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* REPORT TAB */}
      {tab === 'report' && agentReport && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="font-bold text-xl">{agentReport.agent_name} — Performans Raporu</h2>
            <span className="text-sm text-gray-400">Son {agentReport.period_days} gün</span>
          </div>

          {/* Özet */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            {[
              { label: 'Konuşma', value: agentReport.total_conversations },
              { label: 'Mesaj', value: agentReport.total_messages },
              { label: 'Genel Skor', value: agentReport.scores?.overall },
              { label: 'Satış Tekniği', value: agentReport.scores?.sales_technique },
              { label: 'Empati', value: agentReport.scores?.empathy },
            ].map(({ label, value }) => (
              <div key={label} className="bg-white/5 border border-white/10 rounded-2xl p-4 text-center">
                <div className="text-2xl font-bold text-white">{value}</div>
                <div className="text-xs text-gray-400 mt-1">{label}</div>
              </div>
            ))}
          </div>

          {/* Detaylı Skorlar */}
          <div className="bg-white/5 border border-white/10 rounded-2xl p-5">
            <h3 className="font-semibold mb-4">Detaylı Skorlar</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <ScoreBar label="Profesyonellik" score={agentReport.scores?.professionalism || 0}/>
              <ScoreBar label="Satış Tekniği" score={agentReport.scores?.sales_technique || 0}/>
              <ScoreBar label="Empati" score={agentReport.scores?.empathy || 0}/>
              <ScoreBar label="Kapanış" score={agentReport.scores?.closing || 0}/>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Güçlü Yönler */}
            <div className="bg-white/5 border border-white/10 rounded-2xl p-4 space-y-3">
              <h3 className="font-semibold text-emerald-400 flex items-center gap-2">
                <TrendingUp className="w-4 h-4"/> Güçlü Yönler
              </h3>
              {agentReport.top_strengths?.map((s: any) => (
                <div key={s.text} className="flex items-center gap-2">
                  <CheckCircle className="w-3.5 h-3.5 text-emerald-400 shrink-0"/>
                  <span className="text-sm text-gray-300 flex-1">{s.text}</span>
                  <span className="text-xs text-emerald-400">{s.count}x</span>
                </div>
              ))}
            </div>

            {/* Zayıf Yönler */}
            <div className="bg-white/5 border border-white/10 rounded-2xl p-4 space-y-3">
              <h3 className="font-semibold text-red-400 flex items-center gap-2">
                <TrendingDown className="w-4 h-4"/> Gelişim Alanları
              </h3>
              {agentReport.top_weaknesses?.map((w: any) => (
                <div key={w.text} className="flex items-center gap-2">
                  <AlertTriangle className="w-3.5 h-3.5 text-red-400 shrink-0"/>
                  <span className="text-sm text-gray-300 flex-1">{w.text}</span>
                  <span className="text-xs text-red-400">{w.count}x</span>
                </div>
              ))}
            </div>

            {/* Öneriler */}
            <div className="bg-white/5 border border-white/10 rounded-2xl p-4 space-y-3">
              <h3 className="font-semibold text-purple-400 flex items-center gap-2">
                <Target className="w-4 h-4"/> Koçluk Önerileri
              </h3>
              {agentReport.top_recommendations?.map((r: any) => (
                <div key={r.text} className="flex items-start gap-2">
                  <ArrowUp className="w-3.5 h-3.5 text-purple-400 shrink-0 mt-0.5"/>
                  <span className="text-sm text-gray-300">{r.text}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Konuşma Geçmişi */}
          <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden">
            <div className="p-4 border-b border-white/10">
              <h3 className="font-semibold">Konuşma Geçmişi</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/10 text-gray-400 text-xs">
                    <th className="text-left px-4 py-3">Müşteri</th>
                    <th className="text-left px-4 py-3">Telefon</th>
                    <th className="text-center px-4 py-3">Mesaj</th>
                    <th className="text-center px-4 py-3">Skor</th>
                    <th className="text-left px-4 py-3">Özet</th>
                    <th className="text-right px-4 py-3">Tarih</th>
                  </tr>
                </thead>
                <tbody>
                  {agentReport.conversations?.map((c: any) => (
                    <tr key={c.id} className="border-b border-white/5 hover:bg-white/5">
                      <td className="px-4 py-3 font-medium">{c.company || 'Bilinmiyor'}</td>
                      <td className="px-4 py-3 text-gray-400 text-xs font-mono">{c.phone}</td>
                      <td className="px-4 py-3 text-center text-gray-300">{c.message_count}</td>
                      <td className="px-4 py-3 text-center"><ScoreBadge score={c.score}/></td>
                      <td className="px-4 py-3 text-xs text-gray-400 max-w-[200px] truncate">{c.summary}</td>
                      <td className="px-4 py-3 text-right text-xs text-gray-500">
                        {new Date(c.created_at).toLocaleDateString('tr-TR')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {tab === 'report' && !agentReport && (
        <div className="text-center py-20 text-gray-500">
          <BarChart2 className="w-12 h-12 mx-auto mb-3 opacity-30"/>
          <p>Ekip sekmesinden bir temsilci seçerek rapor görüntüle</p>
        </div>
      )}
    </div>
  );
}