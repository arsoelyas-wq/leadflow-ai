'use client'
import { useEffect, useState, useCallback } from 'react'
import { api } from '@/lib/api'
import {
  Zap, Plus, Play, Pause, Trash2, Settings2, BarChart2,
  ChevronRight, ChevronDown, ChevronUp, ChevronLeft,
  MessageSquare, Clock, GitBranch, Shuffle, Wrench, Flag,
  Rocket, FileText, RefreshCw, Sparkles,
  Users, CheckCircle, XCircle, ArrowDown, Save,
  MessageCircle, Mail, Phone, Check
} from 'lucide-react'

// ─── Types ────────────────────────────────────────────────────────────────────

type NodeType = 'message' | 'wait' | 'condition' | 'ab_split' | 'action' | 'end'
type Channel  = 'whatsapp' | 'email' | 'sms'
type GoalId   = 'welcome' | 'proposal' | 'reactivate' | 'custom'
type View     = 'list' | 'wizard' | 'editor' | 'monitor'

interface WorkflowNode {
  id: string
  type: NodeType
  label?: string
  config: {
    channel?: Channel; template?: string; useAI?: boolean; subject?: string
    abVariants?: { a: string; b: string }; splitPct?: number
    days?: number; hours?: number; useSmartTiming?: boolean
    condField?: string; condOperator?: string; condValue?: string
    actionType?: string; actionValue?: string; webhookUrl?: string
  }
  next?: string; nextTrue?: string; nextFalse?: string; nextA?: string; nextB?: string
}

interface WorkflowDef {
  id: string; name: string; description?: string
  trigger_type: string; trigger_config: any
  nodes: WorkflowNode[]; is_active: boolean
  run_count: number; last_run_at?: string; created_at: string
  nodeCount: number
  enrollments: { active: number; completed: number; error: number }
}

interface WizardConfig {
  goal: GoalId; name: string; channel: Channel
  useAI: boolean; followUps: number; waitDays: number
  message: string; smartTiming: boolean
}

// ─── Constants ─────────────────────────────────────────────────────────────────

const TRIGGER_LABELS: Record<string, string> = {
  manual: 'Manuel', lead_created: 'Lead Oluştuğunda',
  stage_changed: 'Aşama Değişince', score_threshold: 'Skor Eşiği',
  email_opened: 'Email Açıldığında', cron: 'Zamanlanmış',
}

const CHANNEL_ICONS: Record<Channel, any> = {
  whatsapp: MessageCircle, email: Mail, sms: Phone,
}

const CHANNEL_LABELS: Record<Channel, string> = {
  whatsapp: 'WhatsApp', email: 'Email', sms: 'SMS',
}

const GOALS = [
  {
    id: 'welcome' as GoalId,
    icon: Rocket,
    color: 'text-cyan-400',
    border: 'border-cyan-500/40 hover:border-cyan-500',
    bg: 'bg-cyan-500/5',
    title: 'Yeni Lead Karşıla',
    desc: 'Her yeni lead eklendiğinde otomatik devreye girer. Hoş geldin → takip → kapanış.',
    tag: 'Tetikleyici: Lead Oluştuğunda',
  },
  {
    id: 'proposal' as GoalId,
    icon: FileText,
    color: 'text-amber-400',
    border: 'border-amber-500/40 hover:border-amber-500',
    bg: 'bg-amber-500/5',
    title: 'Teklif Takibini Otomatikleştir',
    desc: 'Lead teklif aşamasına geçince başlar. Akıllı hatırlatmalar ve A/B test mesajları.',
    tag: 'Tetikleyici: Teklif Aşamasına Geçince',
  },
  {
    id: 'reactivate' as GoalId,
    icon: RefreshCw,
    color: 'text-purple-400',
    border: 'border-purple-500/40 hover:border-purple-500',
    bg: 'bg-purple-500/5',
    title: 'Soğumuş Leadleri Isıt',
    desc: 'Seçtiğiniz leadleri yeniden canlandırın. AI kişiselleştirilmiş mesajlarla yeniden bağlantı.',
    tag: 'Tetikleyici: Manuel / Toplu',
  },
  {
    id: 'custom' as GoalId,
    icon: Sparkles,
    color: 'text-slate-400',
    border: 'border-slate-600/40 hover:border-slate-500',
    bg: 'bg-slate-800/30',
    title: 'Sıfırdan Oluştur',
    desc: 'Gelişmiş editörle kendi akışını tasarla. Koşullar, dallanmalar, webhook\'lar.',
    tag: 'Tam kontrol — gelişmiş mod',
  },
]

const DEFAULT_MESSAGES: Record<GoalId, string> = {
  welcome:    'Merhaba {{isim}}! {{firma}} ile çalışmayı çok isteriz. Size nasıl yardımcı olabiliriz?',
  proposal:   'Merhaba {{isim}}, teklifimizi inceleme fırsatı buldunuz mu? Sorularınız için buradayım.',
  reactivate: 'Merhaba {{isim}}, uzun süredir görüşemedik. {{firma}} için yeni bir çözümümüz var, paylaşmak istedim.',
  custom:     '',
}

const NODE_ICONS: Record<NodeType, any> = {
  message: MessageSquare, wait: Clock, condition: GitBranch,
  ab_split: Shuffle, action: Wrench, end: Flag,
}
const NODE_COLORS: Record<NodeType, string> = {
  message: 'bg-cyan-500/10 border-cyan-500/30 text-cyan-400',
  wait: 'bg-amber-500/10 border-amber-500/30 text-amber-400',
  condition: 'bg-purple-500/10 border-purple-500/30 text-purple-400',
  ab_split: 'bg-pink-500/10 border-pink-500/30 text-pink-400',
  action: 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400',
  end: 'bg-slate-700/30 border-slate-600/30 text-slate-500',
}

const COND_FIELDS = [
  { value: 'status', label: 'Aşama' }, { value: 'score', label: 'Skor' },
  { value: 'hot_score', label: 'Hot Score' }, { value: 'sector', label: 'Sektör' },
  { value: 'city', label: 'Şehir' }, { value: 'email', label: 'Email' },
]
const COND_OPS = [
  { value: 'eq', label: '= Eşit' }, { value: 'not_eq', label: '≠ Eşit Değil' },
  { value: 'gt', label: '> Büyük' }, { value: 'lt', label: '< Küçük' },
  { value: 'gte', label: '≥ B.Eşit' }, { value: 'lte', label: '≤ K.Eşit' },
  { value: 'contains', label: 'İçerir' }, { value: 'is_null', label: 'Boş' },
]
const ACTION_TYPES = [
  { value: 'update_status', label: 'Aşama Değiştir' },
  { value: 'update_score', label: 'Skor Güncelle (+/-)' },
  { value: 'add_tag', label: 'Etiket Ekle' },
  { value: 'webhook', label: 'Webhook' },
]

// ─── Helpers ──────────────────────────────────────────────────────────────────

const gid = () => Math.random().toString(36).slice(2, 7)

function nodeLabel(n: WorkflowNode): string {
  if (n.label) return n.label
  switch (n.type) {
    case 'message':   return `${CHANNEL_LABELS[n.config.channel || 'whatsapp']} Mesajı`
    case 'wait':      return `${n.config.days || 0} gün bekle`
    case 'condition': return `Koşul: ${n.config.condField || ''}`
    case 'ab_split':  return `A/B Test`
    case 'action':    return n.config.actionType || 'Eylem'
    case 'end':       return 'Bitti'
    default:          return n.type
  }
}

function wizardToWorkflow(cfg: WizardConfig): { trigger_type: string; trigger_config: any; nodes: WorkflowNode[] } {
  const trigger: Record<GoalId, { trigger_type: string; trigger_config: any }> = {
    welcome:    { trigger_type: 'lead_created',  trigger_config: {} },
    proposal:   { trigger_type: 'stage_changed', trigger_config: { to: 'proposal' } },
    reactivate: { trigger_type: 'manual',        trigger_config: {} },
    custom:     { trigger_type: 'manual',        trigger_config: {} },
  }

  const { trigger_type, trigger_config } = trigger[cfg.goal]
  const endId = gid()
  const nodes: WorkflowNode[] = []

  const followUpTexts = [
    'Merhaba {{isim}}, mesajımı gördünüz mü? Kısa bir görüşme için uygun musunuz?',
    'Son bir mesaj daha atmak istedim {{isim}}. İlgileniyorsanız bir satır yeterli!',
    'Merhaba {{isim}}, tekrar görüşmek umuduyla. Uygun bir zaman var mı?',
    '{{firma}} için hazırladığımız önerilerimizi paylaşmak isteriz {{isim}}.',
    'Son denememiz: {{isim}}, size ulaşabilir miyiz?',
  ]

  // First message
  const firstId = gid()
  nodes.push({
    id: firstId, type: 'message', label: 'İlk Mesaj',
    config: { channel: cfg.channel, template: cfg.message || DEFAULT_MESSAGES[cfg.goal], useAI: cfg.useAI },
    next: endId,
  })

  let prevMsgId = firstId

  for (let i = 0; i < cfg.followUps; i++) {
    const waitId = gid()
    const msgId  = gid()
    const isLast = i === cfg.followUps - 1

    // Wire previous → wait
    nodes[nodes.findIndex(n => n.id === prevMsgId)].next = waitId

    nodes.push({
      id: waitId, type: 'wait', label: `${cfg.waitDays} Gün Bekle`,
      config: { days: cfg.waitDays, useSmartTiming: cfg.smartTiming },
      next: msgId,
    })
    nodes.push({
      id: msgId, type: 'message', label: `Takip ${i + 1}`,
      config: {
        channel: cfg.channel,
        template: followUpTexts[i] || followUpTexts[followUpTexts.length - 1],
        useAI: cfg.useAI,
      },
      next: endId,
    })

    prevMsgId = msgId
  }

  nodes.push({ id: endId, type: 'end', label: 'Tamamlandı', config: {} })

  return { trigger_type, trigger_config, nodes }
}

// ─── Node editor sub-component (for advanced mode) ───────────────────────────

function NodeEditor({ node, nodes, onChange, onDelete }: {
  node: WorkflowNode; nodes: WorkflowNode[]
  onChange: (n: WorkflowNode) => void; onDelete: () => void
}) {
  const [open, setOpen] = useState(true)
  const Icon = NODE_ICONS[node.type]
  const others = nodes.filter(n => n.id !== node.id)
  const set = (p: Partial<WorkflowNode['config']>) => onChange({ ...node, config: { ...node.config, ...p } })

  return (
    <div className={`border rounded-xl overflow-hidden ${NODE_COLORS[node.type].split(' ').map(c => c.startsWith('text-') ? '' : c).join(' ')}`}>
      <div className="flex items-center gap-2 px-4 py-3 cursor-pointer" onClick={() => setOpen(o => !o)}>
        <Icon size={14} className={NODE_COLORS[node.type].split(' ').find(c => c.startsWith('text-'))} />
        <span className={`text-sm font-medium flex-1 ${NODE_COLORS[node.type].split(' ').find(c => c.startsWith('text-'))}`}>{nodeLabel(node)}</span>
        <button onClick={e => { e.stopPropagation(); onDelete() }} className="text-slate-600 hover:text-red-400 p-1 transition">
          <Trash2 size={12} />
        </button>
        {open ? <ChevronUp size={13} className="text-slate-500" /> : <ChevronDown size={13} className="text-slate-500" />}
      </div>
      {open && (
        <div className="px-4 pb-4 pt-3 space-y-2.5 border-t border-slate-700/40">
          <input value={node.label || ''} onChange={e => onChange({ ...node, label: e.target.value })}
            placeholder="Adım adı" className="w-full bg-slate-900/60 border border-slate-700 rounded-lg px-3 py-1.5 text-slate-300 text-xs focus:outline-none focus:border-cyan-500" />

          {node.type === 'message' && <>
            <select value={node.config.channel || 'whatsapp'} onChange={e => set({ channel: e.target.value as Channel })}
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-white text-xs focus:outline-none">
              <option value="whatsapp">WhatsApp</option><option value="email">Email</option><option value="sms">SMS</option>
            </select>
            {node.config.channel === 'email' && <input value={node.config.subject || ''} onChange={e => set({ subject: e.target.value })}
              placeholder="Email konusu" className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-white text-xs focus:outline-none" />}
            <textarea value={node.config.template || ''} onChange={e => set({ template: e.target.value })}
              placeholder={'Mesaj şablonu — {{isim}} {{firma}} {{sehir}} kullanabilirsiniz'} rows={3}
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-white text-xs focus:outline-none resize-none" />
            <label className="flex items-center gap-2 text-xs text-slate-400 cursor-pointer">
              <input type="checkbox" checked={!!node.config.useAI} onChange={e => set({ useAI: e.target.checked })} className="rounded" />
              AI ile kişiselleştir
            </label>
          </>}

          {node.type === 'wait' && <div className="flex gap-2">
            <div className="flex-1">
              <label className="text-slate-500 text-xs mb-1 block">Gün</label>
              <input type="number" min={0} value={node.config.days ?? 1} onChange={e => set({ days: +e.target.value || 0 })}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-white text-xs focus:outline-none" />
            </div>
            <div className="flex-1">
              <label className="text-slate-500 text-xs mb-1 block">Saat</label>
              <input type="number" min={0} max={23} value={node.config.hours ?? 0} onChange={e => set({ hours: +e.target.value || 0 })}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-white text-xs focus:outline-none" />
            </div>
            <div className="flex-1 pt-5">
              <label className="flex items-center gap-1.5 text-xs text-slate-400 cursor-pointer mt-0.5">
                <input type="checkbox" checked={!!node.config.useSmartTiming} onChange={e => set({ useSmartTiming: e.target.checked })} />
                Akıllı saat
              </label>
            </div>
          </div>}

          {node.type === 'condition' && <>
            <select value={node.config.condField || ''} onChange={e => set({ condField: e.target.value })}
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-white text-xs focus:outline-none">
              <option value="">Alan seçin...</option>
              {COND_FIELDS.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
            </select>
            <div className="flex gap-2">
              <select value={node.config.condOperator || 'eq'} onChange={e => set({ condOperator: e.target.value })}
                className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-white text-xs focus:outline-none">
                {COND_OPS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
              {node.config.condOperator !== 'is_null' &&
                <input value={node.config.condValue || ''} onChange={e => set({ condValue: e.target.value })}
                  placeholder="Değer" className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-white text-xs focus:outline-none" />}
            </div>
            <div className="grid grid-cols-2 gap-2">
              {[['nextTrue', '✓ Doğru', 'text-emerald-400', 'border-emerald-700/30'], ['nextFalse', '✗ Yanlış', 'text-red-400', 'border-red-700/30']].map(([k, lbl, tc, bc]) => (
                <div key={k}>
                  <label className={`${tc} text-xs block mb-1`}>{lbl}</label>
                  <select value={(node as any)[k] || ''} onChange={e => onChange({ ...node, [k]: e.target.value || undefined })}
                    className={`w-full bg-slate-900 border ${bc} rounded-lg px-2 py-1.5 text-white text-xs focus:outline-none`}>
                    <option value="">Bitti</option>
                    {others.map(n => <option key={n.id} value={n.id}>{nodeLabel(n)}</option>)}
                  </select>
                </div>
              ))}
            </div>
          </>}

          {node.type === 'ab_split' && <>
            <div className="flex gap-2">
              <div className="flex-1">
                <label className="text-slate-400 text-xs mb-1 block">A Mesajı (%{node.config.splitPct ?? 50})</label>
                <textarea value={node.config.abVariants?.a || ''} rows={2}
                  onChange={e => set({ abVariants: { a: e.target.value, b: node.config.abVariants?.b || '' } })}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-white text-xs focus:outline-none resize-none" />
              </div>
              <div className="flex-1">
                <label className="text-slate-400 text-xs mb-1 block">B Mesajı (%{100 - (node.config.splitPct ?? 50)})</label>
                <textarea value={node.config.abVariants?.b || ''} rows={2}
                  onChange={e => set({ abVariants: { a: node.config.abVariants?.a || '', b: e.target.value } })}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-white text-xs focus:outline-none resize-none" />
              </div>
            </div>
            <input type="range" min={10} max={90} step={10} value={node.config.splitPct ?? 50}
              onChange={e => set({ splitPct: +e.target.value })} className="w-full accent-pink-500" />
          </>}

          {node.type === 'action' && <>
            <select value={node.config.actionType || ''} onChange={e => set({ actionType: e.target.value })}
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-white text-xs focus:outline-none">
              <option value="">Eylem seçin...</option>
              {ACTION_TYPES.map(a => <option key={a.value} value={a.value}>{a.label}</option>)}
            </select>
            {node.config.actionType && node.config.actionType !== 'webhook' &&
              <input value={node.config.actionValue || ''} onChange={e => set({ actionValue: e.target.value })}
                placeholder={node.config.actionType === 'update_score' ? '+10 veya -5' : 'Değer'}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-white text-xs focus:outline-none" />}
            {node.config.actionType === 'webhook' &&
              <input value={node.config.webhookUrl || ''} onChange={e => set({ webhookUrl: e.target.value })}
                placeholder="https://..." className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-white text-xs focus:outline-none" />}
          </>}

          {!['condition', 'ab_split', 'end'].includes(node.type) &&
            <div>
              <label className="text-slate-500 text-xs mb-1 block">Sonraki adım</label>
              <select value={node.next || ''} onChange={e => onChange({ ...node, next: e.target.value || undefined })}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2 py-1.5 text-white text-xs focus:outline-none">
                <option value="">Bitti</option>
                {others.map(n => <option key={n.id} value={n.id}>{nodeLabel(n)}</option>)}
              </select>
            </div>}
        </div>
      )}
    </div>
  )
}

// ─── Flow preview (mini) ──────────────────────────────────────────────────────

function FlowPreview({ nodes }: { nodes: WorkflowNode[] }) {
  const ordered: WorkflowNode[] = []
  const first = nodes.find(n => n.type !== 'end')
  let cur = first
  const seen = new Set<string>()
  while (cur && !seen.has(cur.id)) {
    ordered.push(cur)
    seen.add(cur.id)
    const nextId = cur.next || cur.nextTrue
    cur = nextId ? nodes.find(n => n.id === nextId) : undefined
  }
  const end = nodes.find(n => n.type === 'end')
  if (end && !seen.has(end.id)) ordered.push(end)

  return (
    <div className="flex items-center gap-1.5 flex-wrap">
      {ordered.map((n, i) => {
        const Icon = NODE_ICONS[n.type]
        const colorClass = NODE_COLORS[n.type]
        return (
          <div key={n.id} className="flex items-center gap-1.5">
            {i > 0 && <ChevronRight size={10} className="text-slate-600 shrink-0" />}
            <span className={`flex items-center gap-1 text-xs px-2 py-0.5 rounded-lg border ${colorClass}`}>
              <Icon size={10} /> {nodeLabel(n)}
            </span>
          </div>
        )
      })}
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function WorkflowPage() {
  const [view, setView]               = useState<View>('list')
  const [workflows, setWorkflows]     = useState<WorkflowDef[]>([])
  const [templates, setTemplates]     = useState<any[]>([])
  const [loading, setLoading]         = useState(true)
  const [expandedId, setExpandedId]   = useState<string | null>(null)
  const [enrollments, setEnrollments] = useState<any[]>([])
  const [analytics, setAnalytics]     = useState<any>(null)
  const [monitorWf, setMonitorWf]     = useState<WorkflowDef | null>(null)

  // Wizard state
  const [step, setStep]               = useState(1)
  const [wizConfig, setWizConfig]     = useState<WizardConfig>({
    goal: 'welcome', name: '', channel: 'whatsapp',
    useAI: true, followUps: 2, waitDays: 2, message: '', smartTiming: true,
  })
  const [allLeads, setAllLeads]       = useState<any[]>([])
  const [selectedLeads, setSelectedLeads] = useState<string[]>([])
  const [leadFilter, setLeadFilter]   = useState('')
  const [saving, setSaving]           = useState(false)
  const [msg, setMsg]                 = useState<string | null>(null)

  // Advanced editor state
  const [editWf, setEditWf]           = useState<WorkflowDef | null>(null)
  const [editorName, setEditorName]   = useState('')
  const [editorTrigger, setEditorTrigger] = useState('manual')
  const [editorNodes, setEditorNodes] = useState<WorkflowNode[]>([])

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

  // ── Wizard helpers ──

  const startWizard = () => {
    setStep(1)
    setMsg(null)
    setSelectedLeads([])
    setWizConfig({ goal: 'welcome', name: '', channel: 'whatsapp', useAI: true, followUps: 2, waitDays: 2, message: '', smartTiming: true })
    if (!allLeads.length) {
      api.get('/api/leads?limit=200').then(d => setAllLeads(d.leads || [])).catch(() => {})
    }
    setView('wizard')
  }

  const selectGoal = (goal: GoalId) => {
    if (goal === 'custom') {
      setEditorName('Yeni Workflow')
      setEditorTrigger('manual')
      setEditorNodes([
        { id: gid(), type: 'message', label: 'İlk Mesaj', config: { channel: 'whatsapp', template: '' } },
        { id: gid(), type: 'end', label: 'Bitti', config: {} },
      ])
      setEditWf(null)
      setView('editor')
      return
    }
    const GOAL_NAMES: Record<string, string> = {
      welcome: 'Yeni Lead Karşılama', proposal: 'Teklif Takip Serisi', reactivate: 'Soğuk Lead Isıtma',
    }
    setWizConfig(c => ({ ...c, goal, name: GOAL_NAMES[goal] || '', message: DEFAULT_MESSAGES[goal] }))
    setStep(2)
  }

  const wizardBack = () => {
    if (step === 2) setStep(1)
    else if (step === 3) setStep(2)
    else setView('list')
  }

  const wizardNext = () => {
    if (step === 2) setStep(3)
  }

  const saveAndLaunch = async (startNow: boolean) => {
    setSaving(true)
    setMsg(null)
    try {
      const { trigger_type, trigger_config, nodes } = wizardToWorkflow(wizConfig)
      const wfRes = await api.post('/api/workflow-v2', {
        name: wizConfig.name, trigger_type, trigger_config, nodes,
      })
      const wfId = wfRes.workflow.id

      if (startNow) {
        await api.patch(`/api/workflow-v2/${wfId}`, { is_active: true })
      }

      if (selectedLeads.length > 0) {
        await api.post(`/api/workflow-v2/${wfId}/enroll-bulk`, { leadIds: selectedLeads })
      }

      await load()
      setView('list')
    } catch (e: any) { setMsg(e.message) }
    finally { setSaving(false) }
  }

  // ── List helpers ──

  const toggleActive = async (wf: WorkflowDef) => {
    await api.post(`/api/workflow-v2/${wf.id}/toggle`, {}).catch(() => {})
    load()
  }

  const deleteWf = async (wf: WorkflowDef) => {
    if (!confirm(`"${wf.name}" silinsin mi?`)) return
    await api.delete(`/api/workflow-v2/${wf.id}`).catch(() => {})
    load()
  }

  const expandCard = async (wf: WorkflowDef) => {
    if (expandedId === wf.id) { setExpandedId(null); return }
    setExpandedId(wf.id)
    const [enData, anData] = await Promise.all([
      api.get(`/api/workflow-v2/${wf.id}/enrollments?limit=10`).catch(() => ({ enrollments: [] })),
      api.get(`/api/workflow-v2/${wf.id}/analytics`).catch(() => null),
    ])
    setEnrollments(enData.enrollments || [])
    setAnalytics(anData)
  }

  const openEditor = (wf: WorkflowDef) => {
    setEditWf(wf)
    setEditorName(wf.name)
    setEditorTrigger(wf.trigger_type)
    setEditorNodes(wf.nodes || [])
    setMsg(null)
    setView('editor')
  }

  const saveEditor = async () => {
    setSaving(true)
    setMsg(null)
    try {
      if (editWf) {
        await api.patch(`/api/workflow-v2/${editWf.id}`, { name: editorName, trigger_type: editorTrigger, nodes: editorNodes })
      } else {
        await api.post('/api/workflow-v2', { name: editorName, trigger_type: editorTrigger, nodes: editorNodes })
      }
      await load()
      setView('list')
    } catch (e: any) { setMsg(e.message) }
    finally { setSaving(false) }
  }

  const addEditorNode = (type: NodeType) => {
    const id = gid()
    const n: WorkflowNode = { id, type, config: {} }
    if (type === 'message') n.config = { channel: 'whatsapp', template: '' }
    if (type === 'wait')    n.config = { days: 1 }
    if (type === 'condition') n.config = { condField: 'score', condOperator: 'gte', condValue: '70' }
    if (type === 'ab_split')  n.config = { abVariants: { a: '', b: '' }, splitPct: 50 }
    if (type === 'action')    n.config = { actionType: 'update_status', actionValue: 'contacted' }

    const lastNonEnd = [...editorNodes].reverse().find(x => x.type !== 'end')
    let updated = [...editorNodes]
    if (lastNonEnd && !lastNonEnd.next && !['condition', 'ab_split'].includes(lastNonEnd.type)) {
      updated = updated.map(x => x.id === lastNonEnd.id ? { ...x, next: id } : x)
    }
    const endIdx = updated.findIndex(x => x.type === 'end')
    if (endIdx >= 0) updated.splice(endIdx, 0, n)
    else updated.push(n)
    setEditorNodes(updated)
  }

  const removeEditorNode = (nodeId: string) => {
    setEditorNodes(ns => ns.filter(n => n.id !== nodeId).map(n => ({
      ...n,
      next:      n.next      === nodeId ? undefined : n.next,
      nextTrue:  n.nextTrue  === nodeId ? undefined : n.nextTrue,
      nextFalse: n.nextFalse === nodeId ? undefined : n.nextFalse,
      nextA:     n.nextA     === nodeId ? undefined : n.nextA,
      nextB:     n.nextB     === nodeId ? undefined : n.nextB,
    })))
  }

  const filteredLeads = allLeads.filter(l =>
    !leadFilter || (l.company_name || '').toLowerCase().includes(leadFilter.toLowerCase())
  )

  // ─────────────────────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────────────────────

  // ── WIZARD ────────────────────────────────────────────────────────────────────
  if (view === 'wizard') {
    const previewNodes = step === 3 ? wizardToWorkflow(wizConfig).nodes : []

    return (
      <div className="max-w-3xl mx-auto space-y-8">
        {/* Progress */}
        <div className="flex items-center gap-3">
          <button onClick={wizardBack} className="p-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-slate-400 hover:text-white transition">
            <ChevronLeft size={16} />
          </button>
          <div className="flex-1 flex items-center gap-2">
            {[1,2,3].map(s => (
              <div key={s} className={`h-1.5 flex-1 rounded-full transition-all ${s <= step ? 'bg-amber-500' : 'bg-slate-700'}`} />
            ))}
          </div>
          <span className="text-slate-500 text-sm">{step}/3</span>
        </div>

        {/* Step 1: Goal */}
        {step === 1 && (
          <div className="space-y-6">
            <div>
              <h1 className="text-2xl font-bold text-white">Ne yapmak istiyorsunuz?</h1>
              <p className="text-slate-400 text-sm mt-1">Hedefi seçin, gerisi otomatik kurulsun.</p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              {GOALS.map(g => {
                const Icon = g.icon
                return (
                  <button key={g.id} onClick={() => selectGoal(g.id)}
                    className={`text-left p-5 rounded-2xl border-2 transition group ${g.border} ${g.bg}`}>
                    <Icon size={28} className={`${g.color} mb-3`} />
                    <h3 className="text-white font-semibold text-base mb-1 group-hover:text-white">{g.title}</h3>
                    <p className="text-slate-400 text-xs leading-relaxed mb-3">{g.desc}</p>
                    <span className="text-xs text-slate-500 bg-slate-800/60 px-2.5 py-1 rounded-lg">{g.tag}</span>
                  </button>
                )
              })}
            </div>
          </div>
        )}

        {/* Step 2: Config */}
        {step === 2 && (
          <div className="space-y-6">
            <div>
              <h1 className="text-2xl font-bold text-white">Akışı ayarlayın</h1>
              <p className="text-slate-400 text-sm mt-1">Birkaç tercih yapın, sistem akışı otomatik oluştursun.</p>
            </div>

            <div className="bg-slate-800/50 border border-slate-700 rounded-2xl p-6 space-y-5">
              {/* Name */}
              <div>
                <label className="text-slate-300 text-sm font-medium block mb-2">Akış Adı</label>
                <input value={wizConfig.name} onChange={e => setWizConfig(c => ({ ...c, name: e.target.value }))}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-amber-500 text-sm" />
              </div>

              {/* Channel */}
              <div>
                <label className="text-slate-300 text-sm font-medium block mb-2">İletişim Kanalı</label>
                <div className="grid grid-cols-3 gap-3">
                  {(['whatsapp', 'email', 'sms'] as Channel[]).map(ch => {
                    const Icon = CHANNEL_ICONS[ch]
                    const active = wizConfig.channel === ch
                    return (
                      <button key={ch} onClick={() => setWizConfig(c => ({ ...c, channel: ch }))}
                        className={`flex items-center gap-2 px-4 py-3 rounded-xl border-2 text-sm font-medium transition ${active ? 'border-amber-500 bg-amber-500/10 text-amber-400' : 'border-slate-700 text-slate-400 hover:border-slate-500'}`}>
                        <Icon size={16} /> {CHANNEL_LABELS[ch]}
                        {active && <Check size={14} className="ml-auto" />}
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Message */}
              <div>
                <label className="text-slate-300 text-sm font-medium block mb-2">İlk Mesaj Şablonu</label>
                <textarea value={wizConfig.message} onChange={e => setWizConfig(c => ({ ...c, message: e.target.value }))}
                  rows={3} placeholder="Mesajınızı yazın... {{isim}}, {{firma}}, {{sehir}} kullanabilirsiniz"
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-amber-500 resize-none" />
                <p className="text-slate-600 text-xs mt-1">Değişkenler: {'{{isim}}'} {'{{firma}}'} {'{{sehir}}'} {'{{sektor}}'}</p>
              </div>

              {/* AI toggle */}
              <div className="flex items-center justify-between p-4 bg-slate-900/50 rounded-xl border border-slate-700">
                <div>
                  <p className="text-white text-sm font-medium">AI Kişiselleştirme</p>
                  <p className="text-slate-500 text-xs mt-0.5">Claude Haiku her mesajı alıcıya göre uyarlar</p>
                </div>
                <button onClick={() => setWizConfig(c => ({ ...c, useAI: !c.useAI }))}
                  className={`w-12 h-6 rounded-full transition-colors ${wizConfig.useAI ? 'bg-amber-500' : 'bg-slate-700'}`}>
                  <div className={`w-5 h-5 bg-white rounded-full shadow transition-transform mx-0.5 ${wizConfig.useAI ? 'translate-x-6' : ''}`} />
                </button>
              </div>

              {/* Follow-ups */}
              <div>
                <label className="text-slate-300 text-sm font-medium block mb-3">
                  Takip Mesajı Sayısı — <span className="text-amber-400">{wizConfig.followUps} takip</span>
                </label>
                <div className="flex gap-2">
                  {[0, 1, 2, 3, 4, 5].map(n => (
                    <button key={n} onClick={() => setWizConfig(c => ({ ...c, followUps: n }))}
                      className={`w-10 h-10 rounded-xl text-sm font-semibold transition ${wizConfig.followUps === n ? 'bg-amber-500 text-slate-900' : 'bg-slate-700 text-slate-400 hover:bg-slate-600'}`}>
                      {n}
                    </button>
                  ))}
                </div>
              </div>

              {/* Wait days */}
              {wizConfig.followUps > 0 && <div>
                <label className="text-slate-300 text-sm font-medium block mb-3">
                  Mesajlar Arası Bekleme — <span className="text-amber-400">{wizConfig.waitDays} gün</span>
                </label>
                <div className="flex gap-2">
                  {[1, 2, 3, 5, 7].map(d => (
                    <button key={d} onClick={() => setWizConfig(c => ({ ...c, waitDays: d }))}
                      className={`px-4 h-10 rounded-xl text-sm font-semibold transition ${wizConfig.waitDays === d ? 'bg-amber-500 text-slate-900' : 'bg-slate-700 text-slate-400 hover:bg-slate-600'}`}>
                      {d}g
                    </button>
                  ))}
                </div>
              </div>}

              {/* Smart timing */}
              <div className="flex items-center justify-between p-4 bg-slate-900/50 rounded-xl border border-slate-700">
                <div>
                  <p className="text-white text-sm font-medium">Doğru An Motoru</p>
                  <p className="text-slate-500 text-xs mt-0.5">Sektöre göre en iyi iletişim saatini otomatik seçer</p>
                </div>
                <button onClick={() => setWizConfig(c => ({ ...c, smartTiming: !c.smartTiming }))}
                  className={`w-12 h-6 rounded-full transition-colors ${wizConfig.smartTiming ? 'bg-amber-500' : 'bg-slate-700'}`}>
                  <div className={`w-5 h-5 bg-white rounded-full shadow transition-transform mx-0.5 ${wizConfig.smartTiming ? 'translate-x-6' : ''}`} />
                </button>
              </div>
            </div>

            <button onClick={wizardNext} disabled={!wizConfig.name}
              className="w-full py-3.5 bg-amber-500 hover:bg-amber-400 disabled:opacity-40 text-slate-900 font-bold rounded-xl transition flex items-center justify-center gap-2">
              Devam Et <ChevronRight size={18} />
            </button>
          </div>
        )}

        {/* Step 3: Launch */}
        {step === 3 && (
          <div className="space-y-6">
            <div>
              <h1 className="text-2xl font-bold text-white">Hazır! Başlatın</h1>
              <p className="text-slate-400 text-sm mt-1">Akışı gözden geçirin ve lead'leri seçin.</p>
            </div>

            {msg && <div className="bg-red-500/10 border border-red-500/30 text-red-400 px-4 py-3 rounded-xl text-sm">{msg}</div>}

            {/* Flow preview */}
            <div className="bg-slate-800/50 border border-slate-700 rounded-2xl p-5">
              <p className="text-slate-400 text-xs font-semibold uppercase tracking-wider mb-4">Akış Önizlemesi</p>
              <div className="space-y-2">
                {previewNodes.map((n, i) => {
                  const Icon = NODE_ICONS[n.type]
                  return (
                    <div key={n.id} className="flex items-start gap-3">
                      <div className="flex flex-col items-center">
                        <div className={`w-8 h-8 rounded-xl border flex items-center justify-center shrink-0 ${NODE_COLORS[n.type]}`}>
                          <Icon size={13} />
                        </div>
                        {i < previewNodes.length - 1 && <div className="w-px flex-1 bg-slate-700 mt-1 mb-0.5 h-4" />}
                      </div>
                      <div className="pt-1.5">
                        <p className="text-white text-sm font-medium">{nodeLabel(n)}</p>
                        {n.type === 'message' && n.config.template &&
                          <p className="text-slate-500 text-xs mt-0.5 line-clamp-1">{n.config.template.slice(0, 80)}</p>}
                        {n.type === 'wait' &&
                          <p className="text-slate-500 text-xs mt-0.5">{n.config.useSmartTiming ? 'Akıllı saat ile' : `${n.config.days} gün beklenir`}</p>}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Lead selection */}
            <div className="bg-slate-800/50 border border-slate-700 rounded-2xl p-5">
              <div className="flex items-center justify-between mb-3">
                <p className="text-slate-300 text-sm font-medium">Lead Seçimi <span className="text-slate-500">({selectedLeads.length} seçili)</span></p>
                <button onClick={() => setSelectedLeads(allLeads.map(l => l.id))} className="text-xs text-amber-400 hover:text-amber-300 transition">
                  Tümünü seç
                </button>
              </div>
              <input value={leadFilter} onChange={e => setLeadFilter(e.target.value)}
                placeholder="Firma adı ara..."
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:border-amber-500 mb-3" />
              <div className="max-h-48 overflow-y-auto space-y-1 pr-1">
                {filteredLeads.slice(0, 50).map(l => (
                  <label key={l.id} className="flex items-center gap-2.5 px-3 py-2 rounded-lg hover:bg-slate-700/40 cursor-pointer">
                    <input type="checkbox" checked={selectedLeads.includes(l.id)}
                      onChange={e => setSelectedLeads(p => e.target.checked ? [...p, l.id] : p.filter(id => id !== l.id))}
                      className="accent-amber-500 rounded" />
                    <div className="flex-1 min-w-0">
                      <p className="text-white text-xs font-medium truncate">{l.company_name}</p>
                      <p className="text-slate-500 text-xs truncate">{l.city} · {l.sector}</p>
                    </div>
                  </label>
                ))}
                {filteredLeads.length === 0 && <p className="text-slate-500 text-sm text-center py-4">Lead bulunamadı</p>}
              </div>
              <p className="text-slate-600 text-xs mt-2">
                Lead seçmeden kaydetmek de mümkün — sonra el ile ekleyebilirsiniz.
              </p>
            </div>

            {/* Actions */}
            <div className="flex gap-3">
              <button onClick={() => saveAndLaunch(false)} disabled={saving}
                className="flex-1 py-3.5 bg-slate-700 hover:bg-slate-600 disabled:opacity-40 text-white font-semibold rounded-xl transition">
                {saving ? 'Kaydediliyor...' : 'Kaydet (Pasif)'}
              </button>
              <button onClick={() => saveAndLaunch(true)} disabled={saving}
                className="flex-1 py-3.5 bg-amber-500 hover:bg-amber-400 disabled:opacity-40 text-slate-900 font-bold rounded-xl transition flex items-center justify-center gap-2">
                <Zap size={16} /> {saving ? 'Başlatılıyor...' : 'Kaydet & Başlat'}
              </button>
            </div>
          </div>
        )}
      </div>
    )
  }

  // ── ADVANCED EDITOR ───────────────────────────────────────────────────────────
  if (view === 'editor') {
    const PALETTE: [NodeType, string, string][] = [
      ['message', 'Mesaj', 'WhatsApp, Email, SMS'],
      ['wait', 'Bekle', 'Zamanlı veya akıllı'],
      ['condition', 'Koşul', 'Eğer/Değilse dallan'],
      ['ab_split', 'A/B Test', 'İki varyant dene'],
      ['action', 'Eylem', 'Güncelle, etiket, webhook'],
    ]
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <button onClick={() => setView('list')} className="p-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-slate-400 hover:text-white transition">
            <ChevronLeft size={16} />
          </button>
          <input value={editorName} onChange={e => setEditorName(e.target.value)}
            className="flex-1 bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-white font-semibold text-lg focus:outline-none focus:border-amber-500" />
          <select value={editorTrigger} onChange={e => setEditorTrigger(e.target.value)}
            className="bg-slate-800 border border-slate-700 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none">
            {Object.entries(TRIGGER_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
          <button onClick={saveEditor} disabled={saving}
            className="flex items-center gap-2 bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-slate-900 px-4 py-2.5 rounded-xl text-sm font-bold transition">
            <Save size={15} /> {saving ? 'Kaydediliyor...' : 'Kaydet'}
          </button>
        </div>
        {msg && <div className="bg-red-500/10 border border-red-500/30 text-red-400 px-4 py-2.5 rounded-xl text-sm">{msg}</div>}
        <div className="grid grid-cols-3 gap-6">
          <div className="space-y-2">
            <p className="text-slate-500 text-xs font-semibold uppercase tracking-wider">Adım Ekle</p>
            {PALETTE.map(([type, title, desc]) => {
              const Icon = NODE_ICONS[type]
              const cc = NODE_COLORS[type]
              return (
                <button key={type} onClick={() => addEditorNode(type)}
                  className={`w-full text-left p-3 rounded-xl border transition ${cc.split(' ').filter(c => !c.startsWith('text-')).join(' ')}`}>
                  <div className="flex items-center gap-2 mb-0.5">
                    <Icon size={13} className={cc.split(' ').find(c => c.startsWith('text-'))} />
                    <span className={`text-sm font-medium ${cc.split(' ').find(c => c.startsWith('text-'))}`}>{title}</span>
                  </div>
                  <p className="text-slate-500 text-xs pl-5">{desc}</p>
                </button>
              )
            })}
          </div>
          <div className="col-span-2 space-y-2">
            <p className="text-slate-500 text-xs font-semibold uppercase tracking-wider">Akış ({editorNodes.length} adım)</p>
            {editorNodes.length === 0 && (
              <div className="text-center py-12 border border-dashed border-slate-700 rounded-xl text-slate-500 text-sm">
                Sol taraftan adım ekleyin
              </div>
            )}
            {editorNodes.map((node, i) => (
              <div key={node.id}>
                <NodeEditor node={node} nodes={editorNodes}
                  onChange={u => setEditorNodes(ns => ns.map(n => n.id === node.id ? u : n))}
                  onDelete={() => removeEditorNode(node.id)} />
                {i < editorNodes.length - 1 && !['condition', 'ab_split'].includes(node.type) &&
                  <div className="flex justify-center py-0.5"><ArrowDown size={13} className="text-slate-700" /></div>}
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  // ── LIST ──────────────────────────────────────────────────────────────────────

  const activeCount    = workflows.filter(w => w.is_active).length
  const totalEnrolled  = workflows.reduce((s, w) => s + w.enrollments.active, 0)
  const totalCompleted = workflows.reduce((s, w) => s + w.enrollments.completed, 0)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Zap size={22} className="text-amber-400" /> Otomasyon
          </h1>
          <p className="text-slate-400 text-sm mt-0.5">
            Satış süreçlerinizi otomatikleştirin — bir kez kurun, sürekli çalışsın.
          </p>
        </div>
        <button onClick={startWizard}
          className="flex items-center gap-2 bg-amber-500 hover:bg-amber-400 text-slate-900 px-5 py-2.5 rounded-xl text-sm font-bold transition shadow-lg shadow-amber-500/20">
          <Plus size={16} /> Yeni Otomasyon
        </button>
      </div>

      {/* Stats */}
      {workflows.length > 0 && (
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: 'Aktif Otomasyon',  value: activeCount,    color: 'text-amber-400' },
            { label: 'Aktif Lead',        value: totalEnrolled,  color: 'text-cyan-400' },
            { label: 'Tamamlanan',        value: totalCompleted, color: 'text-emerald-400' },
          ].map(s => (
            <div key={s.label} className="bg-slate-800/50 border border-slate-700 rounded-xl p-4 text-center">
              <div className={`text-2xl font-bold ${s.color}`}>{s.value}</div>
              <div className="text-slate-500 text-xs mt-1">{s.label}</div>
            </div>
          ))}
        </div>
      )}

      {/* Automation list */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <RefreshCw size={20} className="animate-spin text-slate-500" />
        </div>
      ) : workflows.length === 0 ? (
        /* Empty state — show goal cards directly */
        <div className="space-y-4">
          <p className="text-slate-400 text-sm">Henüz otomasyon yok. Hedef seçerek 60 saniyede kurun:</p>
          <div className="grid grid-cols-2 gap-4">
            {GOALS.map(g => {
              const Icon = g.icon
              return (
                <button key={g.id} onClick={() => { startWizard(); selectGoal(g.id) }}
                  className={`text-left p-5 rounded-2xl border-2 transition group ${g.border} ${g.bg}`}>
                  <Icon size={24} className={`${g.color} mb-3`} />
                  <h3 className="text-white font-semibold mb-1">{g.title}</h3>
                  <p className="text-slate-400 text-xs">{g.desc}</p>
                </button>
              )
            })}
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {workflows.map(wf => {
            const isExpanded = expandedId === wf.id
            const triggerGoal = GOALS.find(g =>
              (g.id === 'welcome' && wf.trigger_type === 'lead_created') ||
              (g.id === 'proposal' && wf.trigger_type === 'stage_changed') ||
              (g.id === 'reactivate' && wf.trigger_type === 'manual')
            )
            const GoalIcon = triggerGoal?.icon || Zap

            return (
              <div key={wf.id} className={`bg-slate-800/50 border rounded-2xl overflow-hidden transition ${isExpanded ? 'border-slate-600' : 'border-slate-700 hover:border-slate-600'}`}>
                {/* Card header */}
                <div className="px-5 py-4 flex items-center gap-4 cursor-pointer" onClick={() => expandCard(wf)}>
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${wf.is_active ? 'bg-amber-500/20' : 'bg-slate-700'}`}>
                    <GoalIcon size={18} className={wf.is_active ? 'text-amber-400' : 'text-slate-500'} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="text-white font-semibold truncate">{wf.name}</h3>
                      <span className={`text-xs px-2 py-0.5 rounded-full shrink-0 ${wf.is_active ? 'bg-emerald-500/15 text-emerald-400' : 'bg-slate-700 text-slate-500'}`}>
                        {wf.is_active ? 'Aktif' : 'Pasif'}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 mt-0.5">
                      <span className="text-slate-500 text-xs">{TRIGGER_LABELS[wf.trigger_type]}</span>
                      <span className="text-slate-600 text-xs">·</span>
                      <span className="text-slate-500 text-xs">{wf.nodeCount} adım</span>
                      {wf.enrollments.active > 0 && <>
                        <span className="text-slate-600 text-xs">·</span>
                        <span className="text-cyan-400 text-xs">{wf.enrollments.active} aktif lead</span>
                      </>}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button onClick={e => { e.stopPropagation(); toggleActive(wf) }}
                      className={`p-2 rounded-lg transition ${wf.is_active ? 'bg-amber-500/15 text-amber-400 hover:bg-amber-500/25' : 'bg-emerald-500/15 text-emerald-400 hover:bg-emerald-500/25'}`}>
                      {wf.is_active ? <Pause size={14} /> : <Play size={14} />}
                    </button>
                    <button onClick={e => { e.stopPropagation(); openEditor(wf) }}
                      className="p-2 bg-slate-700 hover:bg-slate-600 rounded-lg text-slate-400 hover:text-white transition">
                      <Settings2 size={14} />
                    </button>
                    <button onClick={e => { e.stopPropagation(); deleteWf(wf) }}
                      className="p-2 bg-slate-700 hover:bg-red-500/20 rounded-lg text-slate-500 hover:text-red-400 transition">
                      <Trash2 size={14} />
                    </button>
                    {isExpanded ? <ChevronUp size={14} className="text-slate-500" /> : <ChevronDown size={14} className="text-slate-500" />}
                  </div>
                </div>

                {/* Expanded detail */}
                {isExpanded && (
                  <div className="border-t border-slate-700/60 px-5 pb-5 pt-4 space-y-4">
                    {/* Flow preview */}
                    <div>
                      <p className="text-slate-500 text-xs mb-2">Akış</p>
                      <FlowPreview nodes={wf.nodes} />
                    </div>

                    {/* Stats */}
                    {analytics && (
                      <div className="grid grid-cols-4 gap-3">
                        {[
                          { label: 'Aktif',       value: analytics.summary?.active    || 0, color: 'text-amber-400' },
                          { label: 'Tamamlandı',  value: analytics.summary?.completed || 0, color: 'text-emerald-400' },
                          { label: 'Hata',        value: analytics.summary?.error     || 0, color: 'text-red-400' },
                          { label: 'Toplam Adım', value: analytics.totalSteps         || 0, color: 'text-cyan-400' },
                        ].map(s => (
                          <div key={s.label} className="bg-slate-900/50 rounded-xl p-3 text-center">
                            <div className={`text-xl font-bold ${s.color}`}>{s.value}</div>
                            <div className="text-slate-600 text-xs mt-0.5">{s.label}</div>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Recent enrollments */}
                    {enrollments.length > 0 && (
                      <div>
                        <p className="text-slate-500 text-xs mb-2">Son Aktivite</p>
                        <div className="space-y-1.5">
                          {enrollments.slice(0, 5).map(e => (
                            <div key={e.id} className="flex items-center gap-3 px-3 py-2 bg-slate-900/40 rounded-lg">
                              <div className="flex-1 min-w-0">
                                <p className="text-white text-xs font-medium truncate">{e.leads?.company_name}</p>
                              </div>
                              {e.ab_variant && <span className="text-xs text-pink-400 font-bold">{e.ab_variant}</span>}
                              <span className={`text-xs px-2 py-0.5 rounded-full ${
                                e.status === 'active'    ? 'bg-amber-500/15 text-amber-400' :
                                e.status === 'completed' ? 'bg-emerald-500/15 text-emerald-400' :
                                                           'bg-red-500/15 text-red-400'
                              }`}>
                                {e.status === 'active' ? 'Devam ediyor' : e.status === 'completed' ? 'Bitti' : 'Hata'}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          })}

          {/* New automation shortcut */}
          <button onClick={startWizard}
            className="w-full py-4 border-2 border-dashed border-slate-700 hover:border-amber-500/40 rounded-2xl text-slate-500 hover:text-amber-400 text-sm transition flex items-center justify-center gap-2">
            <Plus size={16} /> Yeni Otomasyon Ekle
          </button>
        </div>
      )}

      {/* Templates at bottom when has workflows */}
      {workflows.length > 0 && templates.length > 0 && (
        <div>
          <p className="text-slate-500 text-xs font-semibold uppercase tracking-wider mb-3">Hazır Şablonlar</p>
          <div className="grid grid-cols-3 gap-3">
            {templates.map(tpl => (
              <button key={tpl.id} onClick={async () => {
                setSaving(true)
                try {
                  await api.post('/api/workflow-v2', {
                    name: tpl.name, trigger_type: tpl.trigger_type,
                    trigger_config: tpl.trigger_config, nodes: tpl.nodes,
                  })
                  load()
                } catch {} finally { setSaving(false) }
              }}
                className="text-left p-4 bg-slate-800/30 border border-slate-700 hover:border-slate-600 rounded-xl transition">
                <p className="text-white text-sm font-medium mb-1">{tpl.name}</p>
                <p className="text-slate-500 text-xs mb-2 line-clamp-2">{tpl.description}</p>
                <span className="text-xs text-slate-600">{TRIGGER_LABELS[tpl.trigger_type]} · {tpl.nodes.length} adım</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
