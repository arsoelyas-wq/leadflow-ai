'use client'
import { useEffect, useState, useCallback } from 'react'
import { api } from '@/lib/api'
import {
  Zap, Plus, Trash2, Play, Pause, BarChart2, Settings2, ChevronRight,
  MessageSquare, Clock, GitBranch, Wrench, Flag,
  Users, CheckCircle, XCircle, RefreshCw, Copy,
  ArrowDown, Shuffle, Mail, Phone, MessageCircle,
  ChevronDown, ChevronUp, Save, List
} from 'lucide-react'

// ─── Types ────────────────────────────────────────────────────────────────────

type NodeType = 'message' | 'wait' | 'condition' | 'ab_split' | 'action' | 'end'
type Channel  = 'whatsapp' | 'email' | 'sms'

interface WorkflowNode {
  id: string
  type: NodeType
  label?: string
  config: {
    channel?: Channel
    template?: string
    useAI?: boolean
    subject?: string
    abVariants?: { a: string; b: string }
    splitPct?: number
    days?: number
    hours?: number
    useSmartTiming?: boolean
    condField?: string
    condOperator?: string
    condValue?: string
    actionType?: string
    actionValue?: string
    webhookUrl?: string
    webhookMethod?: string
  }
  next?: string
  nextTrue?: string
  nextFalse?: string
  nextA?: string
  nextB?: string
}

interface WorkflowDef {
  id: string
  name: string
  description?: string
  trigger_type: string
  trigger_config: any
  nodes: WorkflowNode[]
  is_active: boolean
  run_count: number
  last_run_at?: string
  created_at: string
  nodeCount: number
  enrollments: { active: number; completed: number; error: number }
}

interface Template {
  id: string
  name: string
  description: string
  trigger_type: string
  nodes: WorkflowNode[]
}

// ─── Constants ─────────────────────────────────────────────────────────────────

const TRIGGER_LABELS: Record<string, string> = {
  manual:          'Manuel',
  lead_created:    'Lead Oluştuğunda',
  stage_changed:   'Aşama Değiştiğinde',
  score_threshold: 'Skor Eşiği',
  email_opened:    'Email Açıldığında',
  cron:            'Zamanlanmış',
}

const NODE_ICONS: Record<NodeType, any> = {
  message:   MessageSquare,
  wait:      Clock,
  condition: GitBranch,
  ab_split:  Shuffle,
  action:    Wrench,
  end:       Flag,
}

const NODE_COLORS: Record<NodeType, string> = {
  message:   'border-cyan-500/40 bg-cyan-500/10',
  wait:      'border-amber-500/40 bg-amber-500/10',
  condition: 'border-purple-500/40 bg-purple-500/10',
  ab_split:  'border-pink-500/40 bg-pink-500/10',
  action:    'border-emerald-500/40 bg-emerald-500/10',
  end:       'border-slate-600/40 bg-slate-700/30',
}

const NODE_TEXT_COLORS: Record<NodeType, string> = {
  message:   'text-cyan-400',
  wait:      'text-amber-400',
  condition: 'text-purple-400',
  ab_split:  'text-pink-400',
  action:    'text-emerald-400',
  end:       'text-slate-400',
}

const COND_FIELDS = [
  { value: 'status',    label: 'Aşama' },
  { value: 'score',     label: 'Skor' },
  { value: 'hot_score', label: 'Hot Score' },
  { value: 'sector',    label: 'Sektör' },
  { value: 'city',      label: 'Şehir' },
  { value: 'email',     label: 'Email' },
  { value: 'phone',     label: 'Telefon' },
]

const COND_OPS = [
  { value: 'eq',       label: '= Eşit' },
  { value: 'not_eq',   label: '≠ Eşit Değil' },
  { value: 'gt',       label: '> Büyük' },
  { value: 'lt',       label: '< Küçük' },
  { value: 'gte',      label: '≥ B.Eşit' },
  { value: 'lte',      label: '≤ K.Eşit' },
  { value: 'contains', label: 'İçerir' },
  { value: 'is_null',  label: 'Boş' },
]

const ACTION_TYPES = [
  { value: 'update_status', label: 'Aşama Değiştir' },
  { value: 'update_score',  label: 'Skor Güncelle (+/-)' },
  { value: 'add_tag',       label: 'Etiket Ekle' },
  { value: 'assign_owner',  label: 'Sahip Ata' },
  { value: 'webhook',       label: 'Webhook' },
]

function genId() { return Math.random().toString(36).slice(2, 8) }

function nodeLabel(n: WorkflowNode): string {
  if (n.label) return n.label
  switch (n.type) {
    case 'message':   return `${n.config.channel?.toUpperCase() || 'Mesaj'} Gönder`
    case 'wait':      return `${n.config.useSmartTiming ? 'Akıllı ' : ''}${n.config.days || 0}g ${n.config.hours || 0}s Bekle`.trim()
    case 'condition': return `Koşul: ${n.config.condField || ''}`
    case 'ab_split':  return `A/B Test (%${n.config.splitPct ?? 50})`
    case 'action':    return n.config.actionType || 'Eylem'
    case 'end':       return 'Bitti'
    default:          return n.type
  }
}

// ─── Node Editor Component ────────────────────────────────────────────────────

function NodeEditor({ node, nodes, onChange, onDelete }: {
  node: WorkflowNode
  nodes: WorkflowNode[]
  onChange: (n: WorkflowNode) => void
  onDelete: () => void
}) {
  const [open, setOpen] = useState(true)
  const Icon = NODE_ICONS[node.type]
  const otherNodes = nodes.filter(n => n.id !== node.id)

  const set = (patch: Partial<WorkflowNode['config']>) =>
    onChange({ ...node, config: { ...node.config, ...patch } })

  return (
    <div className={`border rounded-xl ${NODE_COLORS[node.type]} overflow-hidden`}>
      <div className="flex items-center gap-2 px-4 py-3 cursor-pointer" onClick={() => setOpen(o => !o)}>
        <Icon size={14} className={NODE_TEXT_COLORS[node.type]} />
        <span className={`text-sm font-medium flex-1 ${NODE_TEXT_COLORS[node.type]}`}>{nodeLabel(node)}</span>
        <button onClick={e => { e.stopPropagation(); onDelete() }}
          className="text-slate-600 hover:text-red-400 transition p-1">
          <Trash2 size={12} />
        </button>
        {open ? <ChevronUp size={14} className="text-slate-500" /> : <ChevronDown size={14} className="text-slate-500" />}
      </div>

      {open && (
        <div className="px-4 pb-4 space-y-3 border-t border-slate-700/50 pt-3">
          <input value={node.label || ''} onChange={e => onChange({ ...node, label: e.target.value })}
            placeholder="Adım adı (opsiyonel)"
            className="w-full bg-slate-900/50 border border-slate-700 rounded-lg px-3 py-1.5 text-slate-300 text-xs focus:outline-none focus:border-cyan-500" />

          {node.type === 'message' && (
            <div className="space-y-2">
              <select value={node.config.channel || 'whatsapp'} onChange={e => set({ channel: e.target.value as Channel })}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-white text-xs focus:outline-none focus:border-cyan-500">
                <option value="whatsapp">WhatsApp</option>
                <option value="email">Email</option>
                <option value="sms">SMS</option>
              </select>
              {node.config.channel === 'email' && (
                <input value={node.config.subject || ''} onChange={e => set({ subject: e.target.value })}
                  placeholder="Email konusu"
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-white text-xs focus:outline-none focus:border-cyan-500" />
              )}
              <textarea value={node.config.template || ''} onChange={e => set({ template: e.target.value })}
                placeholder={'Mesaj şablonu\nDeğişkenler: {{isim}} {{firma}} {{sehir}} {{sektor}}'}
                rows={3}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-white text-xs focus:outline-none focus:border-cyan-500 resize-none" />
              <label className="flex items-center gap-2 text-xs text-slate-400 cursor-pointer">
                <input type="checkbox" checked={!!node.config.useAI} onChange={e => set({ useAI: e.target.checked })} className="rounded" />
                AI ile kişiselleştir (Claude Haiku)
              </label>
            </div>
          )}

          {node.type === 'wait' && (
            <div className="space-y-2">
              <div className="flex gap-2">
                <div className="flex-1">
                  <label className="text-slate-500 text-xs block mb-1">Gün</label>
                  <input type="number" min={0} value={node.config.days ?? 0}
                    onChange={e => set({ days: parseInt(e.target.value) || 0 })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-white text-xs focus:outline-none focus:border-cyan-500" />
                </div>
                <div className="flex-1">
                  <label className="text-slate-500 text-xs block mb-1">Saat</label>
                  <input type="number" min={0} max={23} value={node.config.hours ?? 0}
                    onChange={e => set({ hours: parseInt(e.target.value) || 0 })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-white text-xs focus:outline-none focus:border-cyan-500" />
                </div>
              </div>
              <label className="flex items-center gap-2 text-xs text-slate-400 cursor-pointer">
                <input type="checkbox" checked={!!node.config.useSmartTiming}
                  onChange={e => set({ useSmartTiming: e.target.checked })} className="rounded" />
                Doğru An motoru (sektöre göre en iyi saat)
              </label>
            </div>
          )}

          {node.type === 'condition' && (
            <div className="space-y-2">
              <select value={node.config.condField || ''} onChange={e => set({ condField: e.target.value })}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-white text-xs focus:outline-none focus:border-cyan-500">
                <option value="">Alan seçin...</option>
                {COND_FIELDS.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
              </select>
              <select value={node.config.condOperator || 'eq'} onChange={e => set({ condOperator: e.target.value })}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-white text-xs focus:outline-none focus:border-cyan-500">
                {COND_OPS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
              {node.config.condOperator !== 'is_null' && (
                <input value={node.config.condValue || ''} onChange={e => set({ condValue: e.target.value })}
                  placeholder="Değer"
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-white text-xs focus:outline-none focus:border-cyan-500" />
              )}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-emerald-400 text-xs block mb-1">✓ Doğru ise</label>
                  <select value={node.nextTrue || ''} onChange={e => onChange({ ...node, nextTrue: e.target.value || undefined })}
                    className="w-full bg-slate-900 border border-emerald-700/30 rounded-lg px-2 py-1.5 text-white text-xs focus:outline-none">
                    <option value="">Bitti</option>
                    {otherNodes.map(n => <option key={n.id} value={n.id}>{nodeLabel(n)}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-red-400 text-xs block mb-1">✗ Yanlış ise</label>
                  <select value={node.nextFalse || ''} onChange={e => onChange({ ...node, nextFalse: e.target.value || undefined })}
                    className="w-full bg-slate-900 border border-red-700/30 rounded-lg px-2 py-1.5 text-white text-xs focus:outline-none">
                    <option value="">Bitti</option>
                    {otherNodes.map(n => <option key={n.id} value={n.id}>{nodeLabel(n)}</option>)}
                  </select>
                </div>
              </div>
            </div>
          )}

          {node.type === 'ab_split' && (
            <div className="space-y-2">
              <div>
                <label className="text-slate-400 text-xs block mb-1">A Varyantı (%{node.config.splitPct ?? 50})</label>
                <textarea value={node.config.abVariants?.a || ''} rows={2}
                  onChange={e => set({ abVariants: { a: e.target.value, b: node.config.abVariants?.b || '' } })}
                  placeholder="A grubu mesajı"
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-white text-xs focus:outline-none focus:border-cyan-500 resize-none" />
              </div>
              <div>
                <label className="text-slate-400 text-xs block mb-1">B Varyantı (%{100 - (node.config.splitPct ?? 50)})</label>
                <textarea value={node.config.abVariants?.b || ''} rows={2}
                  onChange={e => set({ abVariants: { a: node.config.abVariants?.a || '', b: e.target.value } })}
                  placeholder="B grubu mesajı"
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-white text-xs focus:outline-none focus:border-cyan-500 resize-none" />
              </div>
              <div>
                <label className="text-slate-500 text-xs">A oranı: %{node.config.splitPct ?? 50}</label>
                <input type="range" min={10} max={90} step={10} value={node.config.splitPct ?? 50}
                  onChange={e => set({ splitPct: parseInt(e.target.value) })}
                  className="w-full accent-pink-500" />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-pink-400 text-xs block mb-1">A yolu</label>
                  <select value={node.nextA || ''} onChange={e => onChange({ ...node, nextA: e.target.value || undefined })}
                    className="w-full bg-slate-900 border border-pink-700/30 rounded-lg px-2 py-1.5 text-white text-xs focus:outline-none">
                    <option value="">Bitti</option>
                    {otherNodes.map(n => <option key={n.id} value={n.id}>{nodeLabel(n)}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-pink-400 text-xs block mb-1">B yolu</label>
                  <select value={node.nextB || ''} onChange={e => onChange({ ...node, nextB: e.target.value || undefined })}
                    className="w-full bg-slate-900 border border-pink-700/30 rounded-lg px-2 py-1.5 text-white text-xs focus:outline-none">
                    <option value="">Bitti</option>
                    {otherNodes.map(n => <option key={n.id} value={n.id}>{nodeLabel(n)}</option>)}
                  </select>
                </div>
              </div>
            </div>
          )}

          {node.type === 'action' && (
            <div className="space-y-2">
              <select value={node.config.actionType || ''} onChange={e => set({ actionType: e.target.value })}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-white text-xs focus:outline-none focus:border-cyan-500">
                <option value="">Eylem seçin...</option>
                {ACTION_TYPES.map(a => <option key={a.value} value={a.value}>{a.label}</option>)}
              </select>
              {node.config.actionType === 'webhook' ? (
                <div className="space-y-1">
                  <input value={node.config.webhookUrl || ''} onChange={e => set({ webhookUrl: e.target.value })}
                    placeholder="https://..."
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-white text-xs focus:outline-none focus:border-cyan-500" />
                  <select value={node.config.webhookMethod || 'POST'} onChange={e => set({ webhookMethod: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-white text-xs focus:outline-none">
                    <option>POST</option><option>GET</option><option>PUT</option>
                  </select>
                </div>
              ) : node.config.actionType && (
                <input value={node.config.actionValue || ''} onChange={e => set({ actionValue: e.target.value })}
                  placeholder={
                    node.config.actionType === 'update_score' ? '+10 veya -5' :
                    node.config.actionType === 'update_status' ? 'new/contacted/proposal/won...' :
                    node.config.actionType === 'add_tag' ? 'etiket_adı' : 'Değer'
                  }
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-white text-xs focus:outline-none focus:border-cyan-500" />
              )}
            </div>
          )}

          {!['condition', 'ab_split', 'end'].includes(node.type) && (
            <div>
              <label className="text-slate-500 text-xs block mb-1">Sonraki adım</label>
              <select value={node.next || ''} onChange={e => onChange({ ...node, next: e.target.value || undefined })}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2 py-1.5 text-white text-xs focus:outline-none">
                <option value="">Bitti / Son</option>
                {otherNodes.map(n => <option key={n.id} value={n.id}>{nodeLabel(n)}</option>)}
              </select>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

type Tab = 'flows' | 'editor' | 'monitor'

export default function WorkflowV2Page() {
  const [tab, setTab]                   = useState<Tab>('flows')
  const [workflows, setWorkflows]       = useState<WorkflowDef[]>([])
  const [templates, setTemplates]       = useState<Template[]>([])
  const [loading, setLoading]           = useState(true)
  const [saving, setSaving]             = useState(false)
  const [msg, setMsg]                   = useState<string | null>(null)

  const [editWf, setEditWf]             = useState<WorkflowDef | null>(null)
  const [editorName, setEditorName]     = useState('')
  const [editorTrigger, setEditorTrigger] = useState('manual')
  const [editorNodes, setEditorNodes]   = useState<WorkflowNode[]>([])

  const [monitorWf, setMonitorWf]       = useState<WorkflowDef | null>(null)
  const [enrollments, setEnrollments]   = useState<any[]>([])
  const [analytics, setAnalytics]       = useState<any>(null)
  const [monitorTab, setMonitorTab]     = useState<'active' | 'completed' | 'error'>('active')

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [wfData, tplData] = await Promise.all([
        api.get('/api/workflow-v2'),
        api.get('/api/workflow-v2/meta/templates'),
      ])
      setWorkflows(wfData.workflows || [])
      setTemplates(tplData.templates || [])
    } catch {} finally { setLoading(false) }
  }, [])

  useEffect(() => { load() }, [load])

  const openCreate = () => {
    setEditWf(null)
    setEditorName('Yeni Workflow')
    setEditorTrigger('manual')
    setEditorNodes([
      { id: genId(), type: 'message', label: 'Mesaj Gönder', config: { channel: 'whatsapp', template: '' } },
      { id: genId(), type: 'end', label: 'Bitti', config: {} },
    ])
    setMsg(null)
    setTab('editor')
  }

  const openEdit = (wf: WorkflowDef) => {
    setEditWf(wf)
    setEditorName(wf.name)
    setEditorTrigger(wf.trigger_type)
    setEditorNodes(wf.nodes || [])
    setMsg(null)
    setTab('editor')
  }

  const openFromTemplate = (tpl: Template) => {
    setEditWf(null)
    setEditorName(tpl.name)
    setEditorTrigger(tpl.trigger_type)
    setEditorNodes(tpl.nodes || [])
    setMsg(null)
    setTab('editor')
  }

  const addNode = (type: NodeType) => {
    const id = genId()
    const newNode: WorkflowNode = { id, type, config: {} }
    if (type === 'message')   newNode.config = { channel: 'whatsapp', template: '' }
    if (type === 'wait')      newNode.config = { days: 1, hours: 0 }
    if (type === 'condition') newNode.config = { condField: 'score', condOperator: 'gte', condValue: '70' }
    if (type === 'ab_split')  newNode.config = { abVariants: { a: '', b: '' }, splitPct: 50 }
    if (type === 'action')    newNode.config = { actionType: 'update_status', actionValue: 'contacted' }

    const lastNonEnd = [...editorNodes].reverse().find(n => n.type !== 'end')
    let updated = [...editorNodes]
    if (lastNonEnd && !lastNonEnd.next && !['condition', 'ab_split'].includes(lastNonEnd.type)) {
      updated = updated.map(n => n.id === lastNonEnd.id ? { ...n, next: id } : n)
    }
    const endIdx = updated.findIndex(n => n.type === 'end')
    if (endIdx >= 0) updated.splice(endIdx, 0, newNode)
    else updated.push(newNode)
    setEditorNodes(updated)
  }

  const removeNode = (nodeId: string) => {
    setEditorNodes(ns => {
      const filtered = ns.filter(n => n.id !== nodeId)
      return filtered.map(n => ({
        ...n,
        next:      n.next      === nodeId ? undefined : n.next,
        nextTrue:  n.nextTrue  === nodeId ? undefined : n.nextTrue,
        nextFalse: n.nextFalse === nodeId ? undefined : n.nextFalse,
        nextA:     n.nextA     === nodeId ? undefined : n.nextA,
        nextB:     n.nextB     === nodeId ? undefined : n.nextB,
      }))
    })
  }

  const save = async () => {
    if (!editorName.trim()) return
    setSaving(true)
    setMsg(null)
    try {
      if (editWf) {
        await api.patch(`/api/workflow-v2/${editWf.id}`, { name: editorName, trigger_type: editorTrigger, nodes: editorNodes })
      } else {
        await api.post('/api/workflow-v2', { name: editorName, trigger_type: editorTrigger, nodes: editorNodes })
      }
      await load()
      setTab('flows')
    } catch (e: any) { setMsg(e.message) }
    finally { setSaving(false) }
  }

  const toggleActive = async (wf: WorkflowDef) => {
    await api.post(`/api/workflow-v2/${wf.id}/toggle`, {})
    load()
  }

  const deleteWf = async (wf: WorkflowDef) => {
    if (!confirm(`"${wf.name}" silinsin mi?`)) return
    await api.delete(`/api/workflow-v2/${wf.id}`)
    load()
  }

  const openMonitor = async (wf: WorkflowDef) => {
    setMonitorWf(wf)
    setTab('monitor')
    const [enData, anData] = await Promise.all([
      api.get(`/api/workflow-v2/${wf.id}/enrollments?limit=100`),
      api.get(`/api/workflow-v2/${wf.id}/analytics`),
    ])
    setEnrollments(enData.enrollments || [])
    setAnalytics(anData)
  }

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Zap size={22} className="text-amber-400" /> Workflow Engine
          </h1>
          <p className="text-slate-400 text-sm mt-0.5">Görsel akış tasarımcısı · Koşullar · A/B Test · Çok kanallı</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={load} className="p-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-slate-400 hover:text-white transition">
            <RefreshCw size={15} />
          </button>
          <button onClick={openCreate}
            className="flex items-center gap-2 bg-amber-500 hover:bg-amber-400 text-slate-900 px-4 py-2.5 rounded-lg text-sm font-bold transition">
            <Plus size={16} /> Yeni Akış
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-slate-800/50 rounded-xl p-1 w-fit">
        {([
          ['flows',   List,      'Akışlar'],
          ['editor',  Settings2, 'Editör'],
          ['monitor', BarChart2, 'Monitör'],
        ] as [Tab, any, string][]).map(([t, Icon, label]) => (
          <button key={t} onClick={() => setTab(t)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition ${tab === t ? 'bg-slate-700 text-white' : 'text-slate-400 hover:text-white'}`}>
            <Icon size={14} />{label}
          </button>
        ))}
      </div>

      {/* ── Flows Tab ── */}
      {tab === 'flows' && (
        <div className="space-y-6">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <RefreshCw size={20} className="animate-spin text-slate-500" />
            </div>
          ) : (
            <>
              {workflows.length === 0 ? (
                <div className="text-center py-16 bg-slate-800/30 border border-slate-700 rounded-xl">
                  <Zap size={48} className="text-slate-600 mx-auto mb-4" />
                  <h2 className="text-white font-semibold mb-2">Henüz Akış Yok</h2>
                  <p className="text-slate-400 text-sm mb-6">Aşağıdan şablonla başlayın veya sıfırdan oluşturun.</p>
                  <button onClick={openCreate}
                    className="flex items-center gap-2 bg-amber-500 hover:bg-amber-400 text-slate-900 px-5 py-2.5 rounded-lg text-sm font-bold transition mx-auto">
                    <Plus size={16} /> Akış Oluştur
                  </button>
                </div>
              ) : (
                <div className="grid gap-4">
                  {workflows.map(wf => (
                    <div key={wf.id} className="bg-slate-800/50 border border-slate-700 hover:border-slate-600 rounded-xl p-5 transition">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="text-white font-semibold truncate">{wf.name}</h3>
                            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${wf.is_active ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-slate-700 text-slate-500 border border-slate-600'}`}>
                              {wf.is_active ? 'Aktif' : 'Pasif'}
                            </span>
                          </div>
                          <p className="text-slate-500 text-xs mb-3">{TRIGGER_LABELS[wf.trigger_type] || wf.trigger_type} · {wf.nodeCount} adım</p>
                          <div className="flex items-center gap-4 text-xs text-slate-500">
                            <span className="flex items-center gap-1"><Users size={11} className="text-amber-400" />{wf.enrollments.active} aktif</span>
                            <span className="flex items-center gap-1"><CheckCircle size={11} className="text-emerald-400" />{wf.enrollments.completed} tamamlandı</span>
                            {wf.enrollments.error > 0 && <span className="flex items-center gap-1"><XCircle size={11} className="text-red-400" />{wf.enrollments.error} hata</span>}
                            <span>{wf.run_count} çalıştırma</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <button onClick={() => openMonitor(wf)} title="Monitör"
                            className="p-2 bg-slate-700 hover:bg-slate-600 rounded-lg text-slate-400 hover:text-white transition">
                            <BarChart2 size={14} />
                          </button>
                          <button onClick={() => openEdit(wf)} title="Düzenle"
                            className="p-2 bg-slate-700 hover:bg-slate-600 rounded-lg text-slate-400 hover:text-white transition">
                            <Settings2 size={14} />
                          </button>
                          <button onClick={() => toggleActive(wf)}
                            className={`p-2 rounded-lg transition ${wf.is_active ? 'bg-amber-500/20 text-amber-400 hover:bg-amber-500/30' : 'bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30'}`}>
                            {wf.is_active ? <Pause size={14} /> : <Play size={14} />}
                          </button>
                          <button onClick={() => deleteWf(wf)}
                            className="p-2 bg-slate-700 hover:bg-red-500/20 rounded-lg text-slate-500 hover:text-red-400 transition">
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {templates.length > 0 && (
                <div>
                  <h2 className="text-white font-semibold mb-3 flex items-center gap-2">
                    <Copy size={16} className="text-slate-400" /> Hazır Şablonlar
                  </h2>
                  <div className="grid grid-cols-3 gap-4">
                    {templates.map(tpl => (
                      <button key={tpl.id} onClick={() => openFromTemplate(tpl)}
                        className="text-left bg-slate-800/30 border border-slate-700 hover:border-amber-500/30 rounded-xl p-4 transition group">
                        <h3 className="text-white text-sm font-medium group-hover:text-amber-400 transition mb-1">{tpl.name}</h3>
                        <p className="text-slate-500 text-xs mb-3">{tpl.description}</p>
                        <span className="text-xs text-slate-600 bg-slate-800 px-2 py-0.5 rounded-lg">
                          {TRIGGER_LABELS[tpl.trigger_type]} · {tpl.nodes.length} adım
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* ── Editor Tab ── */}
      {tab === 'editor' && (
        <div className="space-y-4">
          {msg && <div className="bg-red-500/10 border border-red-500/30 text-red-400 px-4 py-2.5 rounded-lg text-sm">{msg}</div>}

          <div className="flex items-center gap-3">
            <input value={editorName} onChange={e => setEditorName(e.target.value)}
              className="flex-1 bg-slate-800 border border-slate-700 rounded-lg px-4 py-2.5 text-white font-semibold focus:outline-none focus:border-amber-500 text-lg" />
            <select value={editorTrigger} onChange={e => setEditorTrigger(e.target.value)}
              className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-amber-500">
              {Object.entries(TRIGGER_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
            <button onClick={save} disabled={saving}
              className="flex items-center gap-2 bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-slate-900 px-4 py-2.5 rounded-lg text-sm font-bold transition">
              <Save size={15} /> {saving ? 'Kaydediliyor...' : 'Kaydet'}
            </button>
          </div>

          <div className="grid grid-cols-3 gap-6">
            {/* Palette */}
            <div className="space-y-3">
              <h3 className="text-slate-400 text-xs font-semibold uppercase tracking-wider">Adım Ekle</h3>
              {([
                ['message',   'Mesaj Gönder',  'WhatsApp, Email veya SMS'],
                ['wait',      'Bekle',          'Zamanlı veya akıllı'],
                ['condition', 'Koşul',          'Eğer/Değilse dallanma'],
                ['ab_split',  'A/B Test',       'İki varyant test et'],
                ['action',    'Eylem',          'Güncelle, etiket, webhook'],
              ] as [NodeType, string, string][]).map(([type, title, desc]) => {
                const Icon = NODE_ICONS[type]
                return (
                  <button key={type} onClick={() => addNode(type)}
                    className={`w-full text-left p-3 rounded-xl border transition hover:scale-[1.01] ${NODE_COLORS[type]}`}>
                    <div className="flex items-center gap-2 mb-0.5">
                      <Icon size={13} className={NODE_TEXT_COLORS[type]} />
                      <span className={`text-sm font-medium ${NODE_TEXT_COLORS[type]}`}>{title}</span>
                    </div>
                    <p className="text-slate-500 text-xs pl-5">{desc}</p>
                  </button>
                )
              })}
              <div className="pt-2 border-t border-slate-700">
                <p className="text-slate-600 text-xs">Değişkenler:</p>
                <p className="text-slate-600 text-xs font-mono mt-1">{'{{isim}} {{firma}}'}</p>
                <p className="text-slate-600 text-xs font-mono">{'{{sehir}} {{sektor}}'}</p>
              </div>
            </div>

            {/* Canvas */}
            <div className="col-span-2 space-y-2">
              <h3 className="text-slate-400 text-xs font-semibold uppercase tracking-wider">Akış ({editorNodes.length} adım)</h3>
              {editorNodes.length === 0 && (
                <div className="text-center py-12 border border-dashed border-slate-700 rounded-xl text-slate-500 text-sm">
                  Sol taraftan adım ekleyin
                </div>
              )}
              {editorNodes.map((node, idx) => (
                <div key={node.id}>
                  <NodeEditor
                    node={node}
                    nodes={editorNodes}
                    onChange={updated => setEditorNodes(ns => ns.map(n => n.id === node.id ? updated : n))}
                    onDelete={() => removeNode(node.id)}
                  />
                  {idx < editorNodes.length - 1 && node.type !== 'condition' && node.type !== 'ab_split' && (
                    <div className="flex justify-center py-0.5">
                      <ArrowDown size={14} className="text-slate-700" />
                    </div>
                  )}
                  {(node.type === 'condition' || node.type === 'ab_split') && idx < editorNodes.length - 1 && (
                    <div className="flex items-center justify-center gap-10 py-1">
                      <div className="flex flex-col items-center">
                        <ArrowDown size={12} className={node.type === 'condition' ? 'text-emerald-600' : 'text-pink-600'} />
                        <span className={`text-xs ${node.type === 'condition' ? 'text-emerald-600' : 'text-pink-600'}`}>
                          {node.type === 'condition' ? '✓ Doğru' : 'A'}
                        </span>
                      </div>
                      <div className="flex flex-col items-center">
                        <ArrowDown size={12} className={node.type === 'condition' ? 'text-red-600' : 'text-pink-500'} />
                        <span className={`text-xs ${node.type === 'condition' ? 'text-red-600' : 'text-pink-500'}`}>
                          {node.type === 'condition' ? '✗ Yanlış' : 'B'}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── Monitor Tab ── */}
      {tab === 'monitor' && (
        <div className="space-y-6">
          {!monitorWf ? (
            <div className="text-center py-16 text-slate-500 text-sm">
              Akışlar sekmesinden bir workflow için <BarChart2 size={14} className="inline mx-1" /> ikonuna tıklayın.
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-white font-semibold text-lg">{monitorWf.name}</h2>
                  <p className="text-slate-400 text-sm">{TRIGGER_LABELS[monitorWf.trigger_type]} · {monitorWf.nodeCount} adım</p>
                </div>
                <button onClick={() => openEdit(monitorWf)}
                  className="flex items-center gap-2 bg-slate-700 hover:bg-slate-600 text-slate-300 px-3 py-2 rounded-lg text-sm transition">
                  <Settings2 size={14} /> Düzenle
                </button>
              </div>

              {analytics && (
                <div className="grid grid-cols-4 gap-4">
                  {[
                    { label: 'Aktif',      value: analytics.summary?.active    || 0, color: 'text-amber-400' },
                    { label: 'Tamamlandı', value: analytics.summary?.completed || 0, color: 'text-emerald-400' },
                    { label: 'Hata',       value: analytics.summary?.error     || 0, color: 'text-red-400' },
                    { label: 'Adım Toplamı', value: analytics.totalSteps       || 0, color: 'text-cyan-400' },
                  ].map(s => (
                    <div key={s.label} className="bg-slate-800/50 border border-slate-700 rounded-xl p-4 text-center">
                      <div className={`text-2xl font-bold ${s.color}`}>{s.value}</div>
                      <div className="text-slate-500 text-xs mt-1">{s.label}</div>
                    </div>
                  ))}
                </div>
              )}

              {analytics?.nodeStats && Object.keys(analytics.nodeStats).length > 0 && (
                <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-5">
                  <h3 className="text-white font-medium mb-4 text-sm">Adım Analizi</h3>
                  <div className="space-y-3">
                    {(monitorWf.nodes || []).filter(n => analytics.nodeStats[n.id]).map(n => {
                      const s = analytics.nodeStats[n.id]
                      const total = (s.executed || 0) + (s.skipped || 0) + (s.error || 0)
                      const pct = total > 0 ? Math.round((s.executed / total) * 100) : 0
                      return (
                        <div key={n.id} className="flex items-center gap-3">
                          <span className="text-slate-400 text-xs w-32 truncate">{nodeLabel(n)}</span>
                          <div className="flex-1 bg-slate-700 rounded-full h-2 overflow-hidden">
                            <div className="h-full bg-emerald-500 rounded-full transition-all" style={{ width: `${pct}%` }} />
                          </div>
                          <span className="text-slate-400 text-xs w-14 text-right">{s.executed}/{total}</span>
                          {((s.variantA || 0) + (s.variantB || 0)) > 0 && (
                            <span className="text-pink-400 text-xs">A:{s.variantA || 0} B:{s.variantB || 0}</span>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}

              <div className="bg-slate-800/50 border border-slate-700 rounded-xl overflow-hidden">
                <div className="flex border-b border-slate-700">
                  {(['active', 'completed', 'error'] as const).map(s => (
                    <button key={s} onClick={() => setMonitorTab(s)}
                      className={`flex-1 py-2.5 text-sm font-medium transition ${monitorTab === s ? 'bg-slate-700 text-white' : 'text-slate-500 hover:text-white'}`}>
                      {s === 'active' ? 'Aktif' : s === 'completed' ? 'Tamamlandı' : 'Hata'}
                      <span className="ml-1.5 text-xs opacity-60">
                        ({enrollments.filter(e => e.status === s).length})
                      </span>
                    </button>
                  ))}
                </div>
                <div className="divide-y divide-slate-700/50">
                  {enrollments.filter(e => e.status === monitorTab).slice(0, 30).map(e => (
                    <div key={e.id} className="px-4 py-3 flex items-center gap-4">
                      <div className="flex-1 min-w-0">
                        <p className="text-white text-sm font-medium truncate">{e.leads?.company_name || 'Bilinmiyor'}</p>
                        <p className="text-slate-500 text-xs">{e.leads?.contact_name || ''}</p>
                      </div>
                      {e.ab_variant && (
                        <span className="text-xs font-bold px-2 py-0.5 rounded bg-pink-500/20 text-pink-400">{e.ab_variant}</span>
                      )}
                      {e.status === 'active' && e.next_step_at && (
                        <span className="text-xs text-amber-400">
                          {new Date(e.next_step_at).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                        </span>
                      )}
                      {e.status === 'error' && e.error_msg && (
                        <span className="text-xs text-red-400 truncate max-w-32">{e.error_msg}</span>
                      )}
                      <span className={`text-xs px-2 py-0.5 rounded-full ${
                        e.status === 'active'    ? 'bg-amber-500/20 text-amber-400' :
                        e.status === 'completed' ? 'bg-emerald-500/20 text-emerald-400' :
                                                   'bg-red-500/20 text-red-400'
                      }`}>
                        {e.status === 'active' ? 'Aktif' : e.status === 'completed' ? 'Bitti' : 'Hata'}
                      </span>
                    </div>
                  ))}
                  {enrollments.filter(e => e.status === monitorTab).length === 0 && (
                    <div className="text-center py-8 text-slate-500 text-sm">Kayıt yok</div>
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  )
}
