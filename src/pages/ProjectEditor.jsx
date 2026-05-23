import { useEffect, useState, useCallback, useRef } from 'react'
import ConfirmDialog from '../components/ConfirmDialog'
import { Link, useParams, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import {
  generateSection,
  generateAllSections,
  traduzirErroIA,
  humanizeSection,
  summarizeAllSections,
  getSummarizableSectionIds,
} from '../lib/generateSection'
import { exportToDocx } from '../lib/exportDocx'
import { sanitizeAIContent } from '../lib/sanitizeContent'
import { normalizeIndiceContent } from '../lib/indiceContent'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ArrowLeft, Download, RefreshCw, Sparkles, ChevronRight, Edit3, Check, X,
  Copy, Trash2, FileDown, Loader2, AlertCircle, CheckCircle2, Wand2, Menu,
  Maximize2, Minimize2, FileMinus2, Zap, Gauge, Feather,
} from 'lucide-react'
import toast from 'react-hot-toast'
import { getSectionsForProject } from '../lib/documentSections'
import BottomSheet from '../components/ui/BottomSheet'
import Button from '../components/ui/Button'
import Modal from '../components/Modal'

const fadeUp = {
  hidden:  { opacity: 0, y: 8 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.28, ease: [0.16, 1, 0.3, 1] } },
  exit:    { opacity: 0, y: -6, transition: { duration: 0.18 } },
}

// ─── Tipos de gráfico ──────────────────────────────────────────────────────
const CHART_TYPES = [
  { id: 'bar',           label: 'Barras' },
  { id: 'horizontalBar', label: 'H. Barras' },
  { id: 'pie',           label: 'Pizza' },
  { id: 'doughnut',      label: 'Anel' },
  { id: 'line',          label: 'Linha' },
  { id: 'radar',         label: 'Radar' },
]

// ─── Defaults visuais para QuickChart ──────────────────────────────────────
function applyChartDefaults(config) {
  const type = config.type || 'bar'
  const isCircular = ['pie', 'doughnut', 'polarArea'].includes(type)
  const isLine    = type === 'line'

  const datalabels = isCircular
    ? { display: true, color: '#FFFFFF', font: { size: 14, weight: 'bold', family: 'Arial' },
        anchor: 'center', align: 'center', textShadowBlur: 4, textShadowColor: 'rgba(0,0,0,0.6)' }
    : { display: true, color: '#111827', backgroundColor: 'rgba(255,255,255,0.85)',
        borderRadius: 3, padding: { top: 2, bottom: 2, left: 5, right: 5 },
        font: { size: 12, weight: 'bold', family: 'Arial' }, anchor: 'end',
        align: isLine ? 'top' : 'end', clamp: true, offset: 4 }

  const result = {
    ...config,
    options: {
      ...(config.options || {}),
      layout: { padding: { top: isCircular ? 8 : 28, bottom: 8, left: 8, right: 8 } },
      plugins: {
        datalabels,
        title: { display: !!(config.options?.plugins?.title?.text),
          font: { size: 17, weight: 'bold', family: 'Arial' }, color: '#111827',
          padding: { top: 8, bottom: 16 }, ...(config.options?.plugins?.title || {}) },
        legend: { display: true, position: 'bottom',
          labels: { font: { size: 13, family: 'Arial' }, color: '#111827', padding: 16, boxWidth: 16 },
          ...(config.options?.plugins?.legend || {}) },
      },
    },
  }
  if (!isCircular) {
    result.options.scales = {
      x: { ticks: { font: { size: 12, family: 'Arial' }, color: '#374151', maxRotation: 45 },
           grid: { color: '#E5E7EB' }, ...(config.options?.scales?.x || {}) },
      y: { ticks: { font: { size: 12, family: 'Arial' }, color: '#374151' },
           grid: { color: '#E5E7EB' }, grace: '15%', ...(config.options?.scales?.y || {}) },
    }
  }
  return result
}

// ─── ChartBlock ────────────────────────────────────────────────────────────
function ChartBlock({ jsonStr, onTypeChange }) {
  const [config, setConfig] = useState(null)
  const [parseError, setParseError] = useState(false)
  const [imgFailed, setImgFailed] = useState(false)

  useEffect(() => {
    try { setConfig(JSON.parse(jsonStr)); setParseError(false); setImgFailed(false) }
    catch { setParseError(true) }
  }, [jsonStr])

  if (parseError || !config) {
    return (
      <div className="my-4 p-3 rounded-xl bg-danger-50 border border-danger-100 text-center">
        <p className="text-danger-600 text-xs font-medium">Configuração de gráfico inválida</p>
      </div>
    )
  }

  const currentType = config.type || 'bar'
  const withDefaults = applyChartDefaults(config)
  const chartUrl = `https://quickchart.io/chart?v=3&c=${encodeURIComponent(JSON.stringify(withDefaults))}&w=600&h=380&backgroundColor=white&devicePixelRatio=1`

  const handleTypeChange = (newType) => {
    if (newType === currentType) return
    const newConfig = { ...config, type: newType }
    setConfig(newConfig); setImgFailed(false)
    onTypeChange?.(JSON.stringify(newConfig, null, 2))
  }

  return (
    <div className="my-6 space-y-3 p-4 rounded-2xl border border-dark-200 bg-white">
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-xs font-semibold text-dark-500 shrink-0">Tipo:</span>
        <div className="flex items-center gap-1.5 flex-wrap">
          {CHART_TYPES.map((t) => (
            <button
              key={t.id}
              onClick={() => handleTypeChange(t.id)}
              className={[
                'text-xs px-2.5 py-1 rounded-lg border transition-all font-semibold',
                currentType === t.id
                  ? 'bg-primary-600 border-primary-600 text-white shadow-sm'
                  : 'bg-white border-dark-200 text-dark-600 hover:border-primary-300 hover:text-primary-700',
              ].join(' ')}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>
      <div className="flex flex-col items-center gap-2">
        {imgFailed ? (
          <div className="w-full h-32 rounded-xl bg-dark-50 border border-dark-100 flex items-center justify-center">
            <p className="text-dark-400 text-sm">Erro ao carregar gráfico — verifique a ligação à internet</p>
          </div>
        ) : (
          <img
            src={chartUrl}
            alt="Gráfico de Análise"
            className="max-w-full rounded-xl border border-dark-100 shadow-sm bg-white"
            onError={() => setImgFailed(true)}
          />
        )}
        <p className="text-xs text-dark-400 italic">Gráfico automático · clique no tipo acima para mudar</p>
      </div>
    </div>
  )
}

function IndiceListPreview({ content }) {
  const lines = (content || '').split('\n').map((l) => l.trim()).filter(Boolean)
  if (lines.length === 0) return null

  return (
    <div className="my-4 space-y-1 font-serif text-sm text-dark-800">
      {lines.map((line, i) => {
        const pageMatch = line.match(/[\s\u2013\u2014\-]+(\d{1,4})\s*$/)
        const page = pageMatch ? pageMatch[1] : ''
        const title = pageMatch ? line.slice(0, pageMatch.index).trim() : line
        return (
          <div key={i} className="flex gap-2 leading-relaxed">
            <span className="flex-1 min-w-0">{title}</span>
            {page && (
              <>
                <span className="flex-1 border-b border-dotted border-dark-300 mb-1 min-w-[2rem]" aria-hidden />
                <span className="tabular-nums text-dark-600 shrink-0">{page}</span>
              </>
            )}
          </div>
        )
      })}
    </div>
  )
}

function MarkdownTablePreview({ lines }) {
  const rows = []
  let isFirstRow = true
  for (const line of lines) {
    if (/^[\s|:\-]+$/.test(line.replace(/[|]/g, ''))) continue
    const cols = line.replace(/^\|/, '').replace(/\|$/, '').split('|').map((c) => c.trim())
    if (cols.length === 0 || cols.every((c) => c === '')) continue
    rows.push({ cols, header: isFirstRow }); isFirstRow = false
  }
  if (rows.length === 0) return null

  return (
    <div className="overflow-x-auto my-5 rounded-2xl border border-dark-200 shadow-sm">
      <table className="w-full text-sm">
        <tbody>
          {rows.map((row, i) => (
            <tr
              key={i}
              className={row.header
                ? 'bg-primary-50 font-semibold text-dark-900 text-center'
                : 'border-t border-dark-100 text-dark-700 hover:bg-primary-50/30 transition-colors'}
            >
              {row.cols.map((col, j) => (
                <td key={j} className="px-4 py-2.5 border-r border-dark-100 last:border-r-0">{col}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

// ─── Parser de conteúdo ──────────────────────────────────────────────────
function parseSectionContent(rawContent, onChartTypeChange, sectionId) {
  if (!rawContent) return []

  if (sectionId === 'indice') {
    const normalized = normalizeIndiceContent(rawContent)
    return [<IndiceListPreview key="indice-list" content={normalized} />]
  }

  // Defesa em camadas: sanitiza ANTES de renderizar para garantir que
  // qualquer ##, ---, **inline**, &nbsp; que tenha escapado dos prompts
  // não apareça como símbolo cru no editor.
  const content = sanitizeAIContent(rawContent)
  const lines = content.split('\n')
  const elements = []
  let i = 0
  let chartIndex = 0

  while (i < lines.length) {
    const line = lines[i]
    const trimmed = line.trim()

    if (trimmed === '```chart' || trimmed.startsWith('```chart')) {
      const chartLines = []
      i++
      while (i < lines.length && lines[i].trim() !== '```') { chartLines.push(lines[i]); i++ }
      const idx = chartIndex++
      elements.push(
        <ChartBlock key={`chart-${i}`} jsonStr={chartLines.join('\n')}
          onTypeChange={(newJson) => onChartTypeChange?.(idx, newJson)} />
      )
      i++; continue
    }
    if (trimmed === '```mermaid') {
      const mermaidLines = []
      i++
      while (i < lines.length && lines[i].trim() !== '```') { mermaidLines.push(lines[i]); i++ }
      try {
        const code = mermaidLines.join('\n')
        const state = { code, mermaid: { theme: 'default' } }
        const base64 = btoa(unescape(encodeURIComponent(JSON.stringify(state))))
        const url = `https://mermaid.ink/img/${base64}`
        elements.push(
          <div key={`mer-${i}`} className="my-6 flex flex-col items-center gap-2">
            <img src={url} alt="Diagrama" className="max-w-full rounded-xl border border-dark-100 shadow-sm bg-white"
              onError={(e) => { e.currentTarget.style.display = 'none' }} />
            <p className="text-xs text-dark-400 italic">Diagrama</p>
          </div>
        )
      } catch { elements.push(<span key={`mer-${i}`} />) }
      i++; continue
    }
    if (trimmed.startsWith('|') && trimmed.includes('|', 1)) {
      const tableLines = []
      while (i < lines.length && lines[i].trim().startsWith('|')) { tableLines.push(lines[i].trim()); i++ }
      elements.push(<MarkdownTablePreview key={`tbl-${i}`} lines={tableLines} />)
      continue
    }
    if (!trimmed) { elements.push(<br key={`br-${i}`} />); i++; continue }
    if (/^\*\*(Figura|Tabela|Gráfico)\s*\d+/i.test(trimmed)) {
      elements.push(
        <p key={`cap-${i}`} className="text-center text-sm text-dark-700 italic my-1 font-medium">
          {trimmed.replace(/\*\*/g, '')}
        </p>
      )
      i++; continue
    }
    if (
      line.match(/^(CAPÍTULO|REFERÊNCIAS|REPÚBLICA|MINISTÉRIO|FACULDADE)/i) ||
      line.match(/^\d+\.\d*\.?\s/) ||
      (line.trim() === line.trim().toUpperCase() && line.trim().length > 3 && /[A-ZÀ-Ü]/.test(line))
    ) {
      elements.push(
        <p key={`h-${i}`} className="font-display font-extrabold text-dark-900 text-lg sm:text-xl mt-6 mb-2 tracking-tight">
          {line}
        </p>
      )
      i++; continue
    }
    if (trimmed.startsWith('•') || trimmed.startsWith('- ')) {
      elements.push(<p key={`b-${i}`} className="pl-4 text-dark-800 my-1">{line}</p>)
      i++; continue
    }
    elements.push(<p key={`p-${i}`} className="text-dark-800 leading-relaxed my-1.5">{line}</p>)
    i++
  }
  return elements
}

/* ────────────────────────────────────────────────────────────────────────── */

export default function ProjectEditor() {
  const { id } = useParams()
  const { user } = useAuth()
  const navigate = useNavigate()
  const [project, setProject] = useState(null)
  const activeSections = getSectionsForProject(project?.sections?.projectType || 'tcc')
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [generatingSection, setGeneratingSection] = useState(null)
  const [humanizingSection, setHumanizingSection] = useState(null)
  const [generationProgress, setGenerationProgress] = useState({ done: 0, total: 0 })
  const [generationErrors, setGenerationErrors] = useState({})
  const [activeSection, setActiveSection] = useState('introducao')
  const [editingSection, setEditingSection] = useState(null)
  const [editContent, setEditContent] = useState('')
  const [exporting, setExporting] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [mobileSheetOpen, setMobileSheetOpen] = useState(false)
  const [focusMode, setFocusMode] = useState(false)
  const textareaRef = useRef(null)

  // ─── Estado da feature de RESUMIR TRABALHO ────────────────────
  const [showSummarizeModal, setShowSummarizeModal] = useState(false)
  const [summarizing, setSummarizing] = useState(false)
  const [summarizeProgress, setSummarizeProgress] = useState({ done: 0, total: 0, current: '' })
  const [summarizeLevel, setSummarizeLevel] = useState('medium') // compact | medium | light

  // ─── Fetch ─────────────────────────────────────────────────────────────
  const fetchProject = useCallback(async () => {
    const { data, error } = await supabase
      .from('projects').select('*').eq('id', id).eq('user_id', user.id).single()

    if (error || !data) { toast.error('Projecto não encontrado'); navigate('/dashboard'); return }

    const { data: payData } = await supabase
      .from('payments').select('status').eq('project_id', id)
      .order('created_at', { ascending: false }).limit(1)

    if (payData && payData.length > 0 && payData[0].status !== 'pago') {
      toast.error('O pagamento deste TCC ainda não foi validado.')
      navigate(`/payment/${id}`); return
    }

    setProject(data); setLoading(false)

    const projectType = data.sections?.projectType || 'tcc'
    const expected = getSectionsForProject(projectType)
    const hasAnyContent = expected.some(
      (s) => data.sections?.[s.id] && typeof data.sections[s.id] === 'string' && data.sections[s.id].trim().length > 0
    )
    if (!hasAnyContent) generateTCC(data)
  }, [id, user.id, navigate])

  useEffect(() => { fetchProject() }, [fetchProject])

  // ─── Generate all ──────────────────────────────────────────────────────
  const generateTCC = async (proj) => {
    const projectData = proj || project
    if (!projectData) return
    setGenerating(true); setGenerationErrors({})
    setGenerationProgress({ done: 0, total: activeSections.length })

    const sectionIds = activeSections.map((s) => s.id)
    const generated = await generateAllSections(
      sectionIds, projectData,
      (sectionId, text, index, total) => {
        setGeneratingSection(sectionId)
        setGenerationProgress({ done: index + 1, total })
        setProject((prev) => ({ ...prev, sections: { ...prev?.sections, [sectionId]: text } }))
      },
      (sectionId, errorMsg, index) => {
        const translated = traduzirErroIA(errorMsg)
        setGenerationErrors((prev) => ({ ...prev, [sectionId]: translated }))
        setGenerationProgress((prev) => ({ ...prev, done: index + 1 }))
        if (index === 0) toast.error(`Erro: ${translated}`, { duration: 8000 })
      }
    )

    const successCount = Object.keys(generated).length
    const failCount = activeSections.length - successCount

    if (successCount > 0) {
      const { error } = await supabase
        .from('projects')
        .update({ sections: { ...projectData.sections, ...generated },
                  status: failCount === 0 ? 'completed' : 'draft' })
        .eq('id', id)

      if (error) toast.error('Erro ao salvar o TCC gerado')
      else {
        setProject((prev) => ({ ...prev, sections: { ...prev?.sections, ...generated },
                                status: failCount === 0 ? 'completed' : 'draft' }))
        if (failCount === 0) toast.success('TCC gerado com sucesso com IA!')
        else toast.success(`${successCount} secções geradas. ${failCount} falharam — pode regenerar individualmente.`)
      }
    } else {
      toast.error('Não foi possível gerar nenhuma secção. Verifique a configuração da IA.')
    }
    setGenerating(false); setGeneratingSection(null)
  }

  // ─── Regenerate one ────────────────────────────────────────────────────
  const regenerateOneSection = async (sectionId) => {
    if (!project) return
    setGeneratingSection(sectionId)
    setGenerationErrors((prev) => { const copy = { ...prev }; delete copy[sectionId]; return copy })
    try {
      const text = await generateSection(sectionId, project)
      const updatedSections = { ...project.sections, [sectionId]: text }
      setProject((prev) => ({ ...prev, sections: updatedSections }))
      await supabase.from('projects').update({ sections: updatedSections }).eq('id', id)
      toast.success(`"${activeSections.find((s) => s.id === sectionId)?.title}" regenerada com IA!`)
    } catch (err) {
      const msg = traduzirErroIA(err instanceof Error ? err.message : String(err))
      setGenerationErrors((prev) => ({ ...prev, [sectionId]: msg })); toast.error(msg)
    }
    setGeneratingSection(null)
  }

  // ─── Humanize ───────────────────────────────────────────────────────────
  const handleHumanize = async (sectionId) => {
    const text = project?.sections?.[sectionId]
    if (!text) { toast.error('Não há conteúdo gerado nesta secção para humanizar.'); return }
    setHumanizingSection(sectionId)
    setGenerationErrors((prev) => { const copy = { ...prev }; delete copy[sectionId]; return copy })
    try {
      const humanized = await humanizeSection(sectionId, text)
      const updatedSections = { ...project.sections, [sectionId]: humanized }
      setProject((prev) => ({ ...prev, sections: updatedSections }))
      await supabase.from('projects').update({ sections: updatedSections }).eq('id', id)
      toast.success(`Secção "${activeSections.find((s) => s.id === sectionId)?.title}" humanizada!`)
    } catch (err) {
      const msg = traduzirErroIA(err instanceof Error ? err.message : String(err))
      setGenerationErrors((prev) => ({ ...prev, [sectionId]: msg })); toast.error(msg)
    }
    setHumanizingSection(null)
  }

  // ─── Chart type change persist ─────────────────────────────────────────
  const handleChartTypeChange = async (chartIdx, newJson) => {
    const content = project?.sections?.[activeSection] || ''
    let count = 0
    const updated = content.replace(/```chart\n([\s\S]*?)```/g, (match) => {
      if (count === chartIdx) { count++; return '```chart\n' + newJson + '\n```' }
      count++; return match
    })
    if (updated === content) return
    const updatedSections = { ...project.sections, [activeSection]: updated }
    setProject(prev => ({ ...prev, sections: updatedSections }))
    try { await supabase.from('projects').update({ sections: updatedSections }).eq('id', id) }
    catch (err) { console.error('Erro ao actualizar tipo de gráfico:', err) }
  }

  // ─── Edit ──────────────────────────────────────────────────────────────
  const handleEditSection = (sectionId) => {
    setEditingSection(sectionId)
    const raw = project?.sections?.[sectionId] || ''
    setEditContent(sectionId === 'indice' ? normalizeIndiceContent(raw) : raw)
    setTimeout(() => textareaRef.current?.focus(), 100)
  }
  const handleSaveSection = async () => {
    const saved =
      editingSection === 'indice' ? normalizeIndiceContent(editContent) : editContent
    const updatedSections = { ...project.sections, [editingSection]: saved }
    const { error } = await supabase.from('projects').update({ sections: updatedSections }).eq('id', id)
    if (error) toast.error('Erro ao salvar')
    else { setProject((prev) => ({ ...prev, sections: updatedSections })); toast.success('Secção actualizada') }
    setEditingSection(null)
  }

  const handleCopySection = (sectionId) => {
    const content = project?.sections?.[sectionId] || ''
    navigator.clipboard.writeText(content)
    toast.success('Conteúdo copiado!')
  }

  const confirmDeleteProject = async () => {
    setDeleting(true)
    const { error } = await supabase.from('projects').delete().eq('id', id)
    setDeleting(false); setShowDeleteDialog(false)
    if (error) toast.error('Erro ao eliminar projecto')
    else { toast.success('Projecto eliminado'); navigate('/dashboard') }
  }

  const handleExportDocx = async () => {
    if (!project?.sections || Object.keys(project.sections).length === 0) {
      toast.error('Gere o TCC antes de exportar.'); return
    }
    setExporting(true)
    try { await exportToDocx(project, project.sections); toast.success('Documento Word descarregado!') }
    catch { toast.error('Erro ao exportar. Tente descarregar em TXT.') }
    setExporting(false)
  }

  // ─── Resumir Trabalho ──────────────────────────────────────────────────
  // Cria um NOVO projecto (preservando o original) com as secções
  // resumidas pela IA. O novo projecto fica ligado ao original via
  // `source_project_id` para se rastreabilidade.
  const handleSummarize = async () => {
    if (!project?.sections || Object.keys(project.sections).length === 0) {
      toast.error('Gere o TCC antes de resumir.')
      return
    }
    setSummarizing(true)
    setSummarizeProgress({ done: 0, total: 0, current: '' })

    const projectType = project.sections?.projectType || 'tcc'
    const summarizableIds = getSummarizableSectionIds(project.sections, projectType)
    if (summarizableIds.length === 0) {
      toast.error('Não há secções com conteúdo suficiente para resumir.')
      setSummarizing(false)
      return
    }
    setSummarizeProgress({ done: 0, total: summarizableIds.length, current: '' })

    try {
      const { sections: summarizedSections, failures } = await summarizeAllSections(
        project.sections,
        {
          level: summarizeLevel,
          onProgress: (sectionId, _text, index, total) => {
            const def = activeSections.find((s) => s.id === sectionId)
            setSummarizeProgress({ done: index + 1, total, current: def?.title || sectionId })
          },
        },
      )

      if (failures.length === summarizableIds.length) {
        toast.error('Não foi possível resumir nenhuma secção. Verifica a ligação e o deploy da função summarize-tcc-section.')
        setSummarizing(false)
        setSummarizeProgress({ done: 0, total: 0, current: '' })
        return
      }

      // Cria um novo projecto resumido — preserva o original
      const summaryTag = summarizeLevel === 'compact'
        ? '[Compacto]'
        : summarizeLevel === 'light' ? '[Leve]' : '[Médio]'
      const newTitle = `${project.title} — Resumo ${summaryTag}`

      const { data: newProject, error: insertErr } = await supabase
        .from('projects')
        .insert({
          user_id: user.id,
          title: newTitle.slice(0, 200),
          university: project.university,
          course: project.course,
          student_name: project.student_name,
          advisor: project.advisor,
          topic: project.topic,
          problem_statement: project.problem_statement,
          methodology: project.methodology,
          year: project.year,
          max_pages: Math.max(15, Math.round((project.max_pages || 80) * 0.5)),
          status: 'completed',
          source_project_id: project.id,
          sections: {
            ...summarizedSections,
            is_summary: true,
            summary_level: summarizeLevel,
            summarized_from: project.id,
          },
        })
        .select()
        .single()

      if (insertErr || !newProject) {
        toast.error(`Erro ao salvar projecto resumido: ${insertErr?.message || 'Tente novamente'}`)
      } else {
        const refCode = 'RES-' + Math.random().toString(36).substring(2, 7).toUpperCase()
        const { error: payErr } = await supabase.from('payments').insert({
          user_id: user.id,
          project_id: newProject.id,
          amount: 0,
          reference_code: refCode,
          status: 'pago',
        })
        if (payErr) {
          console.warn('Pagamento do resumo não registado:', payErr.message)
        }

        if (failures.length > 0) {
          const names = failures
            .map((f) => activeSections.find((s) => s.id === f.sectionId)?.title || f.sectionId)
            .join(', ')
          toast(
            `Resumo criado. ${failures.length} secção(ões) mantiveram o texto original: ${names}.`,
            { duration: 8000, icon: '⚠️' },
          )
        } else {
          toast.success('Resumo criado com sucesso! A abrir...')
        }
        setShowSummarizeModal(false)
        navigate(`/project/${newProject.id}`)
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      toast.error(`Erro ao resumir: ${traduzirErroIA(msg)}`)
    }
    setSummarizing(false)
    setSummarizeProgress({ done: 0, total: 0, current: '' })
  }

  const handleDownloadTxt = () => {
    const allContent = activeSections.map(
      (s) => `\n\n${'='.repeat(60)}\n${s.title.toUpperCase()}\n${'='.repeat(60)}\n\n${project?.sections?.[s.id] || '(Conteúdo não gerado)'}`
    ).join('\n')
    const blob = new Blob([allContent], { type: 'text/plain;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${project?.title || 'TCC'} - ${project?.student_name || 'Estudante'}.txt`
    a.click()
    URL.revokeObjectURL(url)
    toast.success('Ficheiro TXT descarregado!')
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="loading-spinner w-10 h-10 border-4 mx-auto mb-4" />
          <p className="text-dark-500">A carregar projecto…</p>
        </div>
      </div>
    )
  }

  const activeSectionData = activeSections.find((s) => s.id === activeSection)
  const sectionContent = project?.sections?.[activeSection] || ''
  const sectionError = generationErrors[activeSection]
  const isSectionGenerating = generatingSection === activeSection
  const completedCount = activeSections.filter((s) => !!project?.sections?.[s.id]).length

  // Sub-component: lista de secções (reusada em sidebar e bottom sheet)
  const SectionList = ({ onPick }) => (
    <nav className="space-y-1">
      {activeSections.map((section) => {
        const Icon = section.icon
        const hasContent = !!project?.sections?.[section.id]
        const hasError = !!generationErrors[section.id]
        const thisGen = generatingSection === section.id
        return (
          <button
            key={section.id}
            onClick={() => { setActiveSection(section.id); onPick?.() }}
            className={[
              'sidebar-link tap-feedback',
              activeSection === section.id ? 'active' : '',
            ].join(' ')}
          >
            <Icon className="w-4 h-4 flex-shrink-0" />
            <span className="truncate flex-1 text-left">{section.title}</span>
            {thisGen && <Loader2 className="w-3.5 h-3.5 animate-spin text-primary-600" />}
            {!thisGen && hasError && <AlertCircle className="w-3.5 h-3.5 text-danger-500" />}
            {!thisGen && !hasError && hasContent && <CheckCircle2 className="w-3.5 h-3.5 text-success-500" />}
          </button>
        )
      })}
    </nav>
  )

  // ─── Render ────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen flex flex-col">
      {/* ── TOP BAR ─────────────────────────────────────────────── */}
      <header className="glass fixed top-0 left-0 right-0 z-40 pt-safe">
        <div className="px-3 sm:px-5 h-14 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <Link
              to="/dashboard"
              aria-label="Voltar ao dashboard"
              className="btn-icon -ml-1.5"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <button
              onClick={() => setMobileSheetOpen(true)}
              className="md:hidden btn-icon"
              aria-label="Abrir secções"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="hidden md:block h-5 w-px bg-dark-200" />
            <h1 className="text-sm font-semibold text-dark-900 truncate max-w-[160px] sm:max-w-xs">
              {project?.title || 'TCC sem título'}
            </h1>
            {generating && (
              <span className="text-xs text-primary-600 flex items-center gap-1.5 font-medium">
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                {generationProgress.done}/{generationProgress.total}
              </span>
            )}
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2">
            {/* Focus mode (desktop) */}
            <button
              onClick={() => setFocusMode((v) => !v)}
              className="hidden lg:inline-flex btn-icon"
              title={focusMode ? 'Sair do modo foco' : 'Entrar no modo foco'}
              aria-label={focusMode ? 'Sair do modo foco' : 'Entrar no modo foco'}
            >
              {focusMode ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>

            <button
              onClick={() => generateTCC(project)}
              disabled={generating}
              className="btn-secondary h-9 px-3 rounded-lg flex items-center gap-1.5 text-xs"
              title="Regenerar todas as secções"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${generating ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">Regenerar</span>
            </button>

            <Button
              size="sm" leftIcon={exporting ? Loader2 : FileDown}
              loading={exporting} disabled={exporting || generating}
              onClick={handleExportDocx} className="!h-9 !px-3"
              title="Exportar Word (.docx)"
            >
              <span className="hidden sm:inline">Word</span>
            </Button>

            <button
              onClick={() => setShowSummarizeModal(true)}
              disabled={generating || exporting || summarizing}
              className="h-9 px-3 rounded-lg hidden sm:flex items-center gap-1.5 text-xs font-medium text-amber-700 bg-amber-50 hover:bg-amber-100 border border-amber-200 transition-all disabled:opacity-50"
              title="Resumir trabalho (cria nova versão condensada)"
            >
              {summarizing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FileMinus2 className="w-3.5 h-3.5" />}
              Resumir
            </button>

            <button
              onClick={handleDownloadTxt}
              className="btn-secondary h-9 px-3 rounded-lg hidden lg:flex items-center gap-1.5 text-xs"
              title="Descarregar TXT"
            >
              <Download className="w-3.5 h-3.5" />
              TXT
            </button>

            <button
              onClick={() => setShowDeleteDialog(true)}
              className="btn-icon text-danger-500 hover:bg-danger-50 hover:text-danger-700"
              aria-label="Eliminar projecto"
              title="Eliminar projecto"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>
        {/* Progress bar global */}
        {generating && (
          <div className="h-0.5 w-full bg-dark-100 overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-primary-600 to-accent-600 transition-all duration-500"
              style={{ width: `${(generationProgress.done / Math.max(generationProgress.total, 1)) * 100}%` }}
            />
          </div>
        )}
      </header>

      {/* ── BODY: sidebar + main ──────────────────────────────────── */}
      <div className="flex flex-1 pt-14">
        {/* Sidebar (desktop) */}
        <aside
          className={[
            'glass border-r border-dark-100 flex-shrink-0 transition-all duration-300',
            focusMode ? 'lg:w-0 lg:overflow-hidden border-r-0' : 'lg:w-72 xl:w-80',
            'hidden md:block w-64',
          ].join(' ')}
        >
          <div className="p-4 sticky top-14">
            <div className="flex items-center justify-between mb-4 px-1">
              <h2 className="text-xs font-bold text-dark-500 uppercase tracking-wider">Secções</h2>
              <span className="text-[10px] font-bold text-dark-400">
                {completedCount}/{activeSections.length}
              </span>
            </div>
            <SectionList />

            {generating && (
              <div className="mt-6 p-3.5 rounded-2xl bg-primary-50 border border-primary-200">
                <div className="flex items-center gap-2 mb-2">
                  <Sparkles className="w-4 h-4 text-primary-600 animate-pulse" />
                  <span className="text-xs text-primary-700 font-bold">A gerar com IA…</span>
                </div>
                <div className="w-full h-1.5 bg-white rounded-full overflow-hidden ring-1 ring-primary-100">
                  <div
                    className="h-full bg-gradient-to-r from-primary-600 to-accent-600 rounded-full transition-all duration-500"
                    style={{ width: `${(generationProgress.done / Math.max(generationProgress.total, 1)) * 100}%` }}
                  />
                </div>
                <p className="text-xs text-dark-500 mt-1.5">
                  {generationProgress.done} de {generationProgress.total} secções
                </p>
              </div>
            )}
          </div>
        </aside>

        {/* Main */}
        <main className="flex-1 min-w-0 overflow-auto">
          <div className={focusMode ? 'max-w-3xl mx-auto p-6 sm:p-10' : 'max-w-3xl mx-auto p-4 sm:p-6 lg:p-8'}>
            {isSectionGenerating && !sectionContent ? (
              <div className="py-20 text-center">
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
                  <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary-50 to-accent-50 ring-1 ring-primary-100 flex items-center justify-center mx-auto">
                    <Sparkles className="w-8 h-8 text-primary-600 animate-pulse" />
                  </div>
                  <h2 className="text-xl font-display font-bold text-dark-900">
                    A gerar «{activeSectionData?.title}» com IA…
                  </h2>
                  <p className="text-dark-500 text-sm max-w-md mx-auto">
                    O Claude Sonnet está a criar conteúdo académico de qualidade. Pode demorar 15-30 segundos.
                  </p>
                  <Loader2 className="w-6 h-6 animate-spin mx-auto text-primary-600" />
                </motion.div>
              </div>
            ) : (
              <AnimatePresence mode="wait">
                <motion.div
                  key={activeSection}
                  variants={fadeUp}
                  initial="hidden"
                  animate="visible"
                  exit="exit"
                  className="w-full"
                >
                  {/* Section header sticky */}
                  <div className="sticky top-14 -mx-4 sm:-mx-6 lg:-mx-8 px-4 sm:px-6 lg:px-8 py-3 mb-5 z-20 bg-gradient-to-b from-white via-white/95 to-white/0 backdrop-blur-sm">
                    <div className="flex items-center justify-between gap-3 flex-wrap">
                      <h2 className="text-2xl sm:text-3xl font-display font-extrabold text-dark-900 tracking-tight flex items-center gap-3 min-w-0">
                        {activeSectionData && (
                          <span className="w-10 h-10 rounded-xl bg-primary-50 text-primary-600 flex items-center justify-center ring-1 ring-primary-100 flex-shrink-0">
                            <activeSectionData.icon className="w-5 h-5" />
                          </span>
                        )}
                        <span className="truncate">{activeSectionData?.title}</span>
                      </h2>

                      <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                        <button
                          onClick={() => regenerateOneSection(activeSection)}
                          disabled={generating || isSectionGenerating || humanizingSection === activeSection}
                          className="btn-secondary h-9 px-3 rounded-lg flex items-center gap-1.5 text-xs"
                          title="Regenerar com IA"
                        >
                          {isSectionGenerating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                          <span className="hidden sm:inline">Gerar IA</span>
                        </button>
                        {sectionContent && (
                          <button
                            onClick={() => handleHumanize(activeSection)}
                            disabled={generating || isSectionGenerating || humanizingSection === activeSection}
                            className="h-9 px-3 rounded-lg flex items-center gap-1.5 text-xs font-medium text-accent-700 bg-accent-50 hover:bg-accent-100 border border-accent-200 transition-all"
                            title="Humanizar (anti-detecção IA)"
                          >
                            {humanizingSection === activeSection ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Wand2 className="w-3.5 h-3.5" />}
                            <span className="hidden sm:inline">Humanizar</span>
                          </button>
                        )}
                        <button
                          onClick={() => handleCopySection(activeSection)}
                          className="btn-icon"
                          title="Copiar"
                        >
                          <Copy className="w-3.5 h-3.5" />
                        </button>
                        {editingSection !== activeSection ? (
                          <Button
                            size="sm" onClick={() => handleEditSection(activeSection)}
                            leftIcon={Edit3} className="!h-9 !px-3"
                          >
                            <span className="hidden sm:inline">Editar</span>
                          </Button>
                        ) : (
                          <div className="flex gap-1.5">
                            <Button size="sm" variant="success" onClick={handleSaveSection} leftIcon={Check} className="!h-9 !px-3">
                              <span className="hidden sm:inline">Salvar</span>
                            </Button>
                            <Button size="sm" variant="secondary" onClick={() => setEditingSection(null)} leftIcon={X} className="!h-9 !px-3">
                              <span className="hidden sm:inline">Cancelar</span>
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Erro */}
                  {sectionError && (
                    <div className="mb-4 p-4 rounded-2xl bg-danger-50 border border-danger-100 flex items-start gap-3">
                      <AlertCircle className="w-5 h-5 text-danger-600 flex-shrink-0 mt-0.5" />
                      <div className="flex-1">
                        <p className="text-sm text-danger-700 font-semibold mb-1">Erro ao gerar esta secção</p>
                        <p className="text-xs text-danger-600/80">{sectionError}</p>
                        <button onClick={() => regenerateOneSection(activeSection)}
                          className="mt-2 text-xs text-danger-700 underline hover:text-danger-800 font-medium">
                          Tentar novamente
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Content */}
                  {editingSection === activeSection ? (
                    <textarea
                      ref={textareaRef}
                      value={editContent}
                      onChange={(e) => setEditContent(e.target.value)}
                      className="w-full min-h-[600px] bg-white border border-dark-200 rounded-2xl p-6 text-dark-700 text-sm leading-relaxed resize-y focus:outline-none focus:ring-4 focus:ring-primary-100 focus:border-primary-400 font-mono shadow-inner-soft"
                    />
                  ) : (
                    <div className="rounded-3xl bg-white border border-dark-100 shadow-sm p-6 sm:p-8 lg:p-10">
                      <div className="prose prose-slate prose-sm sm:prose-base max-w-none prose-headings:text-dark-900 prose-headings:font-display prose-headings:font-extrabold prose-h1:text-xl prose-h2:text-lg prose-h3:text-base prose-p:text-dark-700 prose-a:text-primary-600 prose-strong:text-dark-900 prose-strong:font-bold">
                        {sectionContent ? (
                          parseSectionContent(sectionContent, handleChartTypeChange, activeSection)
                        ) : (
                          <div className="text-center py-12">
                            <Sparkles className="w-10 h-10 text-dark-300 mx-auto mb-3" />
                            <p className="text-dark-400 italic mb-4">Conteúdo ainda não gerado para esta secção.</p>
                            <Button onClick={() => regenerateOneSection(activeSection)}
                              disabled={generating || humanizingSection === activeSection}
                              leftIcon={Sparkles} size="md">
                              Gerar com Inteligência Artificial
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Spacer para mobile bottom buffer */}
                  <div className="h-32 md:h-12" />
                </motion.div>
              </AnimatePresence>
            )}
          </div>
        </main>
      </div>

      {/* Mobile sheet com a lista de secções */}
      <BottomSheet
        open={mobileSheetOpen}
        onClose={() => setMobileSheetOpen(false)}
        title="Secções do trabalho"
        description={`${completedCount} de ${activeSections.length} concluídas`}
        maxWidth="max-w-md"
      >
        <SectionList onPick={() => setMobileSheetOpen(false)} />
      </BottomSheet>

      <ConfirmDialog
        open={showDeleteDialog}
        variant="danger"
        title="Eliminar Projecto"
        message="Tens a certeza que queres eliminar este projecto? Todos os dados e conteúdo gerado serão perdidos."
        detail="Esta acção é irreversível."
        confirmLabel="Eliminar"
        cancelLabel="Cancelar"
        loading={deleting}
        onConfirm={confirmDeleteProject}
        onCancel={() => setShowDeleteDialog(false)}
      />

      {/* Modal Resumir Trabalho */}
      <Modal
        open={showSummarizeModal}
        onClose={() => !summarizing && setShowSummarizeModal(false)}
        title="Resumir trabalho"
        maxWidth="max-w-lg"
        dismissible={!summarizing}
        icon={
          <div className="w-11 h-11 rounded-2xl bg-amber-50 ring-1 ring-amber-100 text-amber-600 flex items-center justify-center">
            <FileMinus2 className="w-5 h-5" />
          </div>
        }
      >
        {!summarizing ? (
          <>
            <p className="text-sm text-dark-600 leading-relaxed mb-5">
              Cria uma <strong className="text-dark-900">versão condensada</strong> deste {project?.sections?.projectType === 'anteprojecto' ? 'ante-projecto' : 'TCC'},
              ideal quando o trabalho ultrapassa 80–90 páginas. As citações,
              tabelas, gráficos e estrutura ficam preservados.
              O original NÃO é alterado — abre-se um novo projecto com o resumo.
            </p>

            <p className="text-xs font-semibold text-dark-700 uppercase tracking-wider mb-2">
              Nível de resumo
            </p>
            <div className="space-y-2 mb-5">
              {[
                { id: 'light',   icon: Feather, label: 'Suave',     desc: '~70% do tamanho original — só remove redundâncias' },
                { id: 'medium',  icon: Gauge,   label: 'Médio',     desc: '~50% do tamanho original — equilibrado, recomendado' },
                { id: 'compact', icon: Zap,     label: 'Compacto',  desc: '~30% do tamanho original — resumo agressivo (executivo)' },
              ].map((opt) => {
                const Icon = opt.icon
                const active = summarizeLevel === opt.id
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setSummarizeLevel(opt.id)}
                    className={[
                      'w-full text-left flex items-start gap-3 p-3.5 rounded-2xl border-2 transition-all',
                      active
                        ? 'border-primary-500 bg-primary-50/60'
                        : 'border-dark-200/70 bg-white hover:border-dark-300',
                    ].join(' ')}
                  >
                    <span className={[
                      'w-9 h-9 rounded-xl flex items-center justify-center ring-1 flex-shrink-0',
                      active ? 'bg-primary-600 text-white ring-primary-300' : 'bg-dark-100 text-dark-600 ring-dark-200',
                    ].join(' ')}>
                      <Icon className="w-4 h-4" />
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-display font-bold text-dark-900 text-sm">{opt.label}</span>
                        {active && <CheckCircle2 className="w-4 h-4 text-primary-600" />}
                      </div>
                      <p className="text-xs text-dark-500 mt-0.5">{opt.desc}</p>
                    </div>
                  </button>
                )
              })}
            </div>

            <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-800 mb-5">
              <strong>Nota:</strong> Capa, índice, dedicatória, agradecimentos, resumo, abstract e
              referências bibliográficas ficam preservados na íntegra (são curtos por natureza).
              Apenas as secções analíticas (introdução, revisão, metodologia, resultados, conclusão, etc.) são condensadas.
            </div>

            <div className="flex gap-2.5">
              <Button
                variant="secondary"
                fullWidth
                onClick={() => setShowSummarizeModal(false)}
              >
                Cancelar
              </Button>
              <Button
                variant="primary"
                fullWidth
                leftIcon={Sparkles}
                onClick={handleSummarize}
              >
                Resumir
              </Button>
            </div>
          </>
        ) : (
          <div className="py-6 text-center space-y-4">
            <div className="w-16 h-16 mx-auto rounded-2xl bg-gradient-to-br from-amber-50 to-primary-50 ring-1 ring-amber-100 flex items-center justify-center">
              <FileMinus2 className="w-8 h-8 text-amber-600 animate-pulse" />
            </div>
            <h3 className="font-display font-bold text-dark-900 text-lg">
              A resumir o trabalho…
            </h3>
            <p className="text-sm text-dark-500">
              {summarizeProgress.current
                ? <>Secção actual: <strong className="text-dark-900">{summarizeProgress.current}</strong></>
                : 'A iniciar…'}
            </p>
            <div className="w-full h-2 bg-dark-100 rounded-full overflow-hidden ring-1 ring-dark-100">
              <div
                className="h-full bg-gradient-to-r from-amber-500 to-primary-600 rounded-full transition-all duration-500"
                style={{ width: `${summarizeProgress.total > 0 ? (summarizeProgress.done / summarizeProgress.total) * 100 : 0}%` }}
              />
            </div>
            <p className="text-xs text-dark-500">
              {summarizeProgress.done} de {summarizeProgress.total} secções
            </p>
            <p className="text-xs text-dark-400 italic max-w-sm mx-auto">
              Pode demorar alguns minutos. As citações, tabelas e gráficos são preservados.
            </p>
          </div>
        )}
      </Modal>
    </div>
  )
}
