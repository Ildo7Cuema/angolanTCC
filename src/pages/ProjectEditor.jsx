import { useEffect, useState, useCallback, useRef } from 'react'
import ConfirmDialog from '../components/ConfirmDialog'
import { Link, useParams, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import { generateSection, generateAllSections, traduzirErroIA, humanizeSection } from '../lib/generateSection'
import { exportToDocx } from '../lib/exportDocx'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ArrowLeft,
  Download,
  RefreshCw,
  Sparkles,
  ChevronRight,
  Edit3,
  Check,
  X,
  BookOpen,
  FileText,
  AlignLeft,
  List,
  Lightbulb,
  Search,
  Layers,
  BarChart3,
  MessageSquare,
  BookmarkPlus,
  Copy,
  Trash2,
  FileDown,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Wand2,
} from 'lucide-react'
import toast from 'react-hot-toast'
import { getSectionsForProject } from '../lib/documentSections'

const fadeUp = {
  hidden: { opacity: 0, y: 10 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.3 } },
  exit: { opacity: 0, y: -10, transition: { duration: 0.2 } },
}

// ─── Tipos de gráfico disponíveis para o selector ──────────────────────────

const CHART_TYPES = [
  { id: 'bar',           label: 'Barras' },
  { id: 'horizontalBar', label: 'H. Barras' },
  { id: 'pie',           label: 'Pizza' },
  { id: 'doughnut',      label: 'Anel' },
  { id: 'line',          label: 'Linha' },
  { id: 'radar',         label: 'Radar' },
]

// ─── Defaults de visibilidade para gráficos QuickChart ─────────────────────

function applyChartDefaults(config) {
  const type = config.type || 'bar'
  const isCircular = ['pie', 'doughnut', 'polarArea'].includes(type)
  const isLine    = type === 'line'

  // Datalabels: mostra os valores directamente nos elementos do gráfico
  const datalabels = isCircular
    ? {
        // Pizza / Anel: valor centrado dentro de cada fatia, texto branco
        display: true,
        color: '#FFFFFF',
        font: { size: 14, weight: 'bold', family: 'Arial' },
        anchor: 'center',
        align: 'center',
        textShadowBlur: 4,
        textShadowColor: 'rgba(0,0,0,0.6)',
      }
    : {
        // Barras / Linha: valor acima do elemento, fundo branco semi-transparente
        display: true,
        color: '#111827',
        backgroundColor: 'rgba(255,255,255,0.85)',
        borderRadius: 3,
        padding: { top: 2, bottom: 2, left: 5, right: 5 },
        font: { size: 12, weight: 'bold', family: 'Arial' },
        anchor: 'end',
        align: isLine ? 'top' : 'end',
        clamp: true,
        offset: 4,
      }

  const result = {
    ...config,
    options: {
      ...(config.options || {}),
      // Espaço extra no topo para os datalabels acima das barras não ficarem cortados
      layout: { padding: { top: isCircular ? 8 : 28, bottom: 8, left: 8, right: 8 } },
      plugins: {
        datalabels,
        title: {
          display: !!(config.options?.plugins?.title?.text),
          font: { size: 17, weight: 'bold', family: 'Arial' },
          color: '#111827',
          padding: { top: 8, bottom: 16 },
          ...(config.options?.plugins?.title || {}),
        },
        legend: {
          display: true,
          position: 'bottom',
          labels: { font: { size: 13, family: 'Arial' }, color: '#111827', padding: 16 },
          ...(config.options?.plugins?.legend || {}),
        },
      },
    },
  }

  if (!isCircular) {
    result.options.scales = {
      x: {
        ticks: { font: { size: 12, family: 'Arial' }, color: '#374151', maxRotation: 45 },
        grid: { color: '#E5E7EB' },
        ...(config.options?.scales?.x || {}),
      },
      y: {
        ticks: { font: { size: 12, family: 'Arial' }, color: '#374151' },
        grid: { color: '#E5E7EB' },
        grace: '15%', // espaço extra no topo para os datalabels
        ...(config.options?.scales?.y || {}),
      },
    }
  }

  return result
}

// ─── Componente de Gráfico com selector de tipo ─────────────────────────────

function ChartBlock({ jsonStr, onTypeChange }) {
  const [config, setConfig] = useState(null)
  const [parseError, setParseError] = useState(false)
  const [imgFailed, setImgFailed] = useState(false)

  useEffect(() => {
    try {
      setConfig(JSON.parse(jsonStr))
      setParseError(false)
      setImgFailed(false)
    } catch {
      setParseError(true)
    }
  }, [jsonStr])

  if (parseError || !config) {
    return (
      <div className="my-4 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-center">
        <p className="text-red-400 text-xs">Configuração de gráfico inválida</p>
      </div>
    )
  }

  const currentType = config.type || 'bar'
  const withDefaults = applyChartDefaults(config)
  const chartUrl = `https://quickchart.io/chart?v=3&c=${encodeURIComponent(JSON.stringify(withDefaults))}&w=600&h=380&backgroundColor=white&devicePixelRatio=1`

  const handleTypeChange = (newType) => {
    if (newType === currentType) return
    const newConfig = { ...config, type: newType }
    setConfig(newConfig)
    setImgFailed(false)
    onTypeChange?.(JSON.stringify(newConfig, null, 2))
  }

  return (
    <div className="my-6 space-y-3 p-4 rounded-2xl border border-white/10 bg-white/[0.02]">
      {/* Selector de tipo */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-xs font-medium text-dark-500 shrink-0">Tipo de gráfico:</span>
        <div className="flex items-center gap-1.5 flex-wrap">
          {CHART_TYPES.map(t => (
            <button
              key={t.id}
              onClick={() => handleTypeChange(t.id)}
              className={`text-xs px-2.5 py-1 rounded-lg border transition-all font-medium ${
                currentType === t.id
                  ? 'bg-primary-500/25 border-primary-500/40 text-primary-300'
                  : 'bg-white/[0.03] border-white/10 text-dark-400 hover:border-white/25 hover:text-dark-200'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Imagem do gráfico */}
      <div className="flex flex-col items-center gap-2">
        {imgFailed ? (
          <div className="w-full h-32 rounded-xl bg-dark-800 border border-white/10 flex items-center justify-center">
            <p className="text-dark-500 text-sm">Erro ao carregar gráfico — verifique a ligação à internet</p>
          </div>
        ) : (
          <img
            src={chartUrl}
            alt="Gráfico de Análise"
            className="max-w-full rounded-xl border border-white/10 shadow-md bg-white"
            onError={() => setImgFailed(true)}
          />
        )}
        <p className="text-xs text-dark-500 italic">
          Gráfico automático · Altere o tipo acima · Exporta embutido no Word
        </p>
      </div>
    </div>
  )
}

// ─── Componente de Tabela Markdown ─────────────────────────────────────────

function MarkdownTablePreview({ lines }) {
  const rows = []
  let isFirstRow = true

  for (const line of lines) {
    if (/^[\s|:\-]+$/.test(line.replace(/[|]/g, ''))) continue
    const cols = line.replace(/^\|/, '').replace(/\|$/, '').split('|').map(c => c.trim())
    if (cols.length === 0 || cols.every(c => c === '')) continue
    rows.push({ cols, header: isFirstRow })
    isFirstRow = false
  }

  if (rows.length === 0) return null

  return (
    <div className="overflow-x-auto my-5 rounded-xl border border-white/10 shadow-inner">
      <table className="w-full text-sm">
        <tbody>
          {rows.map((row, i) => (
            <tr
              key={i}
              className={row.header
                ? 'bg-primary-500/20 font-semibold text-white text-center'
                : 'border-t border-white/5 text-dark-300 hover:bg-white/[0.02]'
              }
            >
              {row.cols.map((col, j) => (
                <td key={j} className="px-4 py-2 border-r border-white/10 last:border-r-0 whitespace-nowrap">
                  {col}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

// ─── Parser de conteúdo de secção ──────────────────────────────────────────
// Converte texto com blocos especiais em React elements para preview visual.
// onChartTypeChange(chartIdx, newJson) → callback para persistir mudança de tipo.

function parseSectionContent(content, onChartTypeChange) {
  if (!content) return []
  const lines = content.split('\n')
  const elements = []
  let i = 0
  let chartIndex = 0

  while (i < lines.length) {
    const line = lines[i]
    const trimmed = line.trim()

    // Bloco ```chart — renderiza ChartBlock com selector de tipo
    if (trimmed === '```chart' || trimmed.startsWith('```chart')) {
      const chartLines = []
      i++
      while (i < lines.length && lines[i].trim() !== '```') {
        chartLines.push(lines[i])
        i++
      }
      const key = `chart-${i}`
      const idx = chartIndex++
      elements.push(
        <ChartBlock
          key={key}
          jsonStr={chartLines.join('\n')}
          onTypeChange={(newJson) => onChartTypeChange?.(idx, newJson)}
        />
      )
      i++
      continue
    }

    // Bloco ```mermaid — gera imagem via mermaid.ink
    if (trimmed === '```mermaid') {
      const mermaidLines = []
      i++
      while (i < lines.length && lines[i].trim() !== '```') {
        mermaidLines.push(lines[i])
        i++
      }
      const key = `mermaid-${i}`
      try {
        const mermaidCode = mermaidLines.join('\n')
        const state = { code: mermaidCode, mermaid: { theme: 'dark' } }
        const base64 = btoa(unescape(encodeURIComponent(JSON.stringify(state))))
        const url = `https://mermaid.ink/img/${base64}`
        elements.push(
          <div key={key} className="my-6 flex flex-col items-center gap-2">
            <img
              src={url}
              alt="Diagrama"
              className="max-w-full rounded-xl border border-white/10 shadow-lg"
              onError={(e) => { e.currentTarget.style.display = 'none' }}
            />
            <p className="text-xs text-dark-500 italic">Diagrama</p>
          </div>
        )
      } catch {
        elements.push(<span key={key} />)
      }
      i++
      continue
    }

    // Tabela Markdown — renderiza como tabela HTML estilizada
    if (trimmed.startsWith('|') && trimmed.includes('|', 1)) {
      const tableLines = []
      while (i < lines.length && lines[i].trim().startsWith('|')) {
        tableLines.push(lines[i].trim())
        i++
      }
      elements.push(<MarkdownTablePreview key={`tbl-${i}`} lines={tableLines} />)
      continue
    }

    // Linha vazia
    if (!trimmed) {
      elements.push(<br key={`br-${i}`} />)
      i++
      continue
    }

    // Legenda de figura/tabela
    if (/^\*\*(Figura|Tabela|Gráfico)\s*\d+/i.test(trimmed)) {
      elements.push(
        <p key={`cap-${i}`} className="text-center text-xs text-dark-400 italic my-1">
          {trimmed.replace(/\*\*/g, '')}
        </p>
      )
      i++
      continue
    }

    // Títulos / cabeçalhos em negrito
    if (
      line.match(/^(CAPÍTULO|REFERÊNCIAS|REPÚBLICA|MINISTÉRIO|FACULDADE)/i) ||
      line.match(/^\d+\.\d*\.?\s/) ||
      (line.trim() === line.trim().toUpperCase() && line.trim().length > 3 && /[A-ZÀ-Ü]/.test(line))
    ) {
      elements.push(
        <p key={`h-${i}`} className="font-bold text-dark-100 mt-4 mb-1">{line}</p>
      )
      i++
      continue
    }

    // Bullet points
    if (trimmed.startsWith('•') || trimmed.startsWith('- ')) {
      elements.push(
        <p key={`b-${i}`} className="pl-4 text-dark-300 my-0.5">{line}</p>
      )
      i++
      continue
    }

    // Texto normal
    elements.push(
      <p key={`p-${i}`} className="text-dark-300 leading-relaxed my-1">{line}</p>
    )
    i++
  }

  return elements
}

export default function ProjectEditor() {
  const { id } = useParams()
  const { user } = useAuth()
  const navigate = useNavigate()
  const [project, setProject] = useState(null)
  const activeSections = getSectionsForProject(project?.sections?.projectType || 'tcc')
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [generatingSection, setGeneratingSection] = useState(null) // ID da secção a gerar agora
  const [humanizingSection, setHumanizingSection] = useState(null)
  const [generationProgress, setGenerationProgress] = useState({ done: 0, total: 0 })
  const [generationErrors, setGenerationErrors] = useState({}) // sectionId → erro
  const [activeSection, setActiveSection] = useState('introducao')
  const [editingSection, setEditingSection] = useState(null)
  const [editContent, setEditContent] = useState('')
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [exporting, setExporting] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const textareaRef = useRef(null)

  // ─── Carregar projecto ──────────────────────────────────────────────────

  const fetchProject = useCallback(async () => {
    const { data, error } = await supabase
      .from('projects')
      .select('*')
      .eq('id', id)
      .eq('user_id', user.id)
      .single()

    if (error || !data) {
      toast.error('Projecto não encontrado')
      navigate('/dashboard')
      return
    }

    // Verificar Pagamento
    const { data: payData, error: payErr } = await supabase
      .from('payments')
      .select('status')
      .eq('project_id', id)
      .order('created_at', { ascending: false })
      .limit(1)

    if (payData && payData.length > 0) {
      if (payData[0].status !== 'pago') {
        toast.error('O pagamento deste TCC ainda não foi validado.')
        navigate(`/payment/${id}`)
        return
      }
    }

    setProject(data)
    setLoading(false)

    // Se o projecto acabou de ser criado, gerar automaticamente
    if (
      data.status === 'generating' &&
      (!data.sections || Object.keys(data.sections).length === 0)
    ) {
      generateTCC(data)
    }
  }, [id, user.id, navigate])

  useEffect(() => {
    fetchProject()
  }, [fetchProject])

  // ─── Geração com IA real (Claude Sonnet) ────────────────────────────────

  const generateTCC = async (proj) => {
    const projectData = proj || project
    if (!projectData) return

    setGenerating(true)
    setGenerationErrors({})
    setGenerationProgress({ done: 0, total: activeSections.length })

    const sectionIds = activeSections.map((s) => s.id)

    const generated = await generateAllSections(
      sectionIds,
      projectData,
      // onProgress
      (sectionId, text, index, total) => {
        setGeneratingSection(sectionId)
        setGenerationProgress({ done: index + 1, total })
        setProject((prev) => ({
          ...prev,
          sections: { ...prev?.sections, [sectionId]: text },
        }))
      },
      // onError
      (sectionId, errorMsg, index) => {
        const translated = traduzirErroIA(errorMsg)
        setGenerationErrors((prev) => ({ ...prev, [sectionId]: translated }))
        setGenerationProgress((prev) => ({ ...prev, done: index + 1 }))
        console.error(`Erro ao gerar "${sectionId}":`, errorMsg)
      }
    )

    // Salvar no Supabase
    const successCount = Object.keys(generated).length
    const failCount = activeSections.length - successCount

    if (successCount > 0) {
      const { error } = await supabase
        .from('projects')
        .update({
          sections: { ...projectData.sections, ...generated },
          status: failCount === 0 ? 'completed' : 'draft',
        })
        .eq('id', id)

      if (error) {
        toast.error('Erro ao salvar o TCC gerado')
      } else {
        setProject((prev) => ({
          ...prev,
          sections: { ...prev?.sections, ...generated },
          status: failCount === 0 ? 'completed' : 'draft',
        }))

        if (failCount === 0) {
          toast.success('🎓 TCC gerado com sucesso com IA!')
        } else {
          toast.success(
            `${successCount} secções geradas. ${failCount} falharam — pode regenerar individualmente.`
          )
        }
      }
    } else {
      toast.error('Não foi possível gerar nenhuma secção. Verifique a configuração da IA.')
    }

    setGenerating(false)
    setGeneratingSection(null)
  }

  // ─── Regenerar uma secção individual ────────────────────────────────────

  const regenerateOneSection = async (sectionId) => {
    if (!project) return
    setGeneratingSection(sectionId)
    setGenerationErrors((prev) => {
      const copy = { ...prev }
      delete copy[sectionId]
      return copy
    })

    try {
      const text = await generateSection(sectionId, project)

      // Actualizar localmente
      const updatedSections = { ...project.sections, [sectionId]: text }
      setProject((prev) => ({ ...prev, sections: updatedSections }))

      // Salvar no Supabase
      await supabase.from('projects').update({ sections: updatedSections }).eq('id', id)

      toast.success(`"${activeSections.find((s) => s.id === sectionId)?.title}" regenerada com IA!`)
    } catch (err) {
      const msg = traduzirErroIA(err instanceof Error ? err.message : String(err))
      setGenerationErrors((prev) => ({ ...prev, [sectionId]: msg }))
      toast.error(msg)
    }

    setGeneratingSection(null)
  }

  // ─── Humanizar uma secção ──────────────────────────────────────────────────

  const handleHumanize = async (sectionId) => {
    const textToHumanize = project?.sections?.[sectionId];
    if (!textToHumanize) {
      toast.error('Não há conteúdo gerado nesta secção para humanizar.');
      return;
    }

    setHumanizingSection(sectionId)
    setGenerationErrors((prev) => {
      const copy = { ...prev }
      delete copy[sectionId]
      return copy
    })

    try {
      const humanizedText = await humanizeSection(sectionId, textToHumanize)

      // Actualizar localmente
      const updatedSections = { ...project.sections, [sectionId]: humanizedText }
      setProject((prev) => ({ ...prev, sections: updatedSections }))

      // Salvar no Supabase
      await supabase.from('projects').update({ sections: updatedSections }).eq('id', id)

      toast.success(`Secção "${activeSections.find((s) => s.id === sectionId)?.title}" humanizada com sucesso!`)
    } catch (err) {
      const msg = traduzirErroIA(err instanceof Error ? err.message : String(err))
      setGenerationErrors((prev) => ({ ...prev, [sectionId]: msg }))
      toast.error(msg)
    }

    setHumanizingSection(null)
  }

  // ─── Alterar tipo de gráfico inline ────────────────────────────────────

  const handleChartTypeChange = async (chartIdx, newJson) => {
    const content = project?.sections?.[activeSection] || ''
    let count = 0
    const updated = content.replace(/```chart\n([\s\S]*?)```/g, (match) => {
      if (count === chartIdx) {
        count++
        return '```chart\n' + newJson + '\n```'
      }
      count++
      return match
    })
    if (updated === content) return
    const updatedSections = { ...project.sections, [activeSection]: updated }
    setProject(prev => ({ ...prev, sections: updatedSections }))
    try {
      await supabase.from('projects').update({ sections: updatedSections }).eq('id', id)
    } catch (err) {
      console.error('Erro ao actualizar tipo de gráfico:', err)
    }
  }

  // ─── Edição manual ──────────────────────────────────────────────────────

  const handleEditSection = (sectionId) => {
    setEditingSection(sectionId)
    setEditContent(project?.sections?.[sectionId] || '')
    setTimeout(() => textareaRef.current?.focus(), 100)
  }

  const handleSaveSection = async () => {
    const updatedSections = { ...project.sections, [editingSection]: editContent }

    const { error } = await supabase
      .from('projects')
      .update({ sections: updatedSections })
      .eq('id', id)

    if (error) {
      toast.error('Erro ao salvar')
    } else {
      setProject((prev) => ({ ...prev, sections: updatedSections }))
      toast.success('Secção actualizada')
    }
    setEditingSection(null)
  }

  // ─── Acções auxiliares ──────────────────────────────────────────────────

  const handleCopySection = (sectionId) => {
    const content = project?.sections?.[sectionId] || ''
    navigator.clipboard.writeText(content)
    toast.success('Conteúdo copiado!')
  }

  const handleDeleteProject = () => {
    setShowDeleteDialog(true)
  }

  const confirmDeleteProject = async () => {
    setDeleting(true)
    const { error } = await supabase.from('projects').delete().eq('id', id)
    setDeleting(false)
    setShowDeleteDialog(false)
    if (error) {
      toast.error('Erro ao eliminar projecto')
    } else {
      toast.success('Projecto eliminado')
      navigate('/dashboard')
    }
  }

  // ─── Exportação ─────────────────────────────────────────────────────────

  const handleExportDocx = async () => {
    if (!project?.sections || Object.keys(project.sections).length === 0) {
      toast.error('Gere o TCC antes de exportar.')
      return
    }
    setExporting(true)
    try {
      await exportToDocx(project, project.sections)
      toast.success('Documento Word descarregado!')
    } catch (err) {
      console.error('Export error:', err)
      toast.error('Erro ao exportar. Tente descarregar em TXT.')
    }
    setExporting(false)
  }

  const handleDownloadTxt = () => {
    const allContent = activeSections.map(
      (s) =>
        `\n\n${'='.repeat(60)}\n${s.title.toUpperCase()}\n${'='.repeat(60)}\n\n${project?.sections?.[s.id] || '(Conteúdo não gerado)'}`
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

  // ─── Loading screen ────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="loading-spinner w-10 h-10 border-4 mx-auto mb-4" />
          <p className="text-dark-400">A carregar projecto...</p>
        </div>
      </div>
    )
  }

  const activeSectionData = activeSections.find((s) => s.id === activeSection)
  const sectionContent = project?.sections?.[activeSection] || ''
  const sectionError = generationErrors[activeSection]
  const isSectionGenerating = generatingSection === activeSection

  // ─── Render ─────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen flex flex-col">
      {/* Top bar */}
      <header className="glass fixed top-0 left-0 right-0 z-50">
        <div className="max-w-full mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              to="/dashboard"
              className="flex items-center gap-2 text-dark-400 hover:text-white transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div className="h-5 w-px bg-white/10" />
            <h1 className="text-sm font-semibold truncate max-w-[200px] sm:max-w-xs">
              {project?.title || 'TCC sem título'}
            </h1>
            {generating && (
              <span className="text-xs text-primary-400 flex items-center gap-1.5 ml-2">
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                {generationProgress.done}/{generationProgress.total}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {/* Regenerar tudo */}
            <button
              onClick={() => generateTCC(project)}
              disabled={generating}
              className="btn-secondary text-xs px-3 py-2 rounded-lg flex items-center gap-1.5"
              title="Regenerar todas as secções com IA"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${generating ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">Regenerar</span>
            </button>

            {/* Export Word */}
            <button
              onClick={handleExportDocx}
              disabled={exporting || generating}
              className="btn-primary text-xs px-3 py-2 rounded-lg flex items-center gap-1.5"
              title="Exportar como Word (DOCX)"
            >
              {exporting ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <FileDown className="w-3.5 h-3.5" />
              )}
              <span className="hidden sm:inline">Word</span>
            </button>

            {/* Export TXT */}
            <button
              onClick={handleDownloadTxt}
              className="btn-secondary text-xs px-3 py-2 rounded-lg flex items-center gap-1.5"
              title="Descarregar como TXT"
            >
              <Download className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">TXT</span>
            </button>

            {/* Eliminar */}
            <button
              onClick={handleDeleteProject}
              className="text-red-400/70 hover:text-red-400 p-2 rounded-lg transition-colors"
              title="Eliminar projecto"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      <div className="flex flex-1 pt-14">
        {/* Sidebar */}
        <aside
          className={`glass border-r border-white/5 transition-all duration-300 flex-shrink-0 ${
            sidebarOpen ? 'w-64' : 'w-0 overflow-hidden'
          }`}
        >
          <div className="p-4 sticky top-14">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xs font-semibold text-dark-400 uppercase tracking-wider">
                Secções
              </h2>
              <button
                onClick={() => setSidebarOpen(false)}
                className="text-dark-500 hover:text-dark-300 sm:hidden"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <nav className="space-y-0.5">
              {activeSections.map((section) => {
                const Icon = section.icon
                const hasContent = !!project?.sections?.[section.id]
                const hasError = !!generationErrors[section.id]
                const isThisGenerating = generatingSection === section.id
                return (
                  <button
                    key={section.id}
                    onClick={() => setActiveSection(section.id)}
                    className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-all text-left ${
                      activeSection === section.id
                        ? 'bg-primary-500/15 text-primary-400 font-medium'
                        : 'text-dark-400 hover:text-dark-200 hover:bg-white/5'
                    }`}
                  >
                    <Icon className="w-4 h-4 flex-shrink-0" />
                    <span className="truncate flex-1">{section.title}</span>
                    {/* Indicadores de estado */}
                    {isThisGenerating && (
                      <Loader2 className="w-3 h-3 animate-spin text-primary-400 ml-auto" />
                    )}
                    {!isThisGenerating && hasError && (
                      <AlertCircle className="w-3 h-3 text-red-400 ml-auto" />
                    )}
                    {!isThisGenerating && !hasError && hasContent && (
                      <CheckCircle2 className="w-3 h-3 text-green-400 ml-auto" />
                    )}
                  </button>
                )
              })}
            </nav>

            {/* Progresso geral */}
            {generating && (
              <div className="mt-6 p-3 rounded-lg bg-primary-500/5 border border-primary-500/10">
                <div className="flex items-center gap-2 mb-2">
                  <Sparkles className="w-4 h-4 text-primary-400 animate-pulse" />
                  <span className="text-xs text-primary-300 font-medium">A gerar com IA...</span>
                </div>
                <div className="w-full h-1.5 bg-dark-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-primary-500 to-primary-400 rounded-full transition-all duration-500"
                    style={{
                      width: `${(generationProgress.done / Math.max(generationProgress.total, 1)) * 100}%`,
                    }}
                  />
                </div>
                <p className="text-xs text-dark-500 mt-1.5">
                  {generationProgress.done} de {generationProgress.total} secções
                </p>
              </div>
            )}
          </div>
        </aside>

        {/* Toggle sidebar button */}
        {!sidebarOpen && (
          <button
            onClick={() => setSidebarOpen(true)}
            className="fixed left-2 top-20 z-40 bg-dark-800 border border-white/10 rounded-lg p-2 text-dark-400 hover:text-white transition-colors"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        )}

        {/* Main content */}
        <main className="flex-1 min-w-0 p-6 overflow-auto">
          {/* A gerar esta secção */}
          {isSectionGenerating && !sectionContent ? (
            <div className="max-w-3xl mx-auto py-20 text-center">
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="space-y-4"
              >
                <div className="w-16 h-16 rounded-full bg-primary-500/10 flex items-center justify-center mx-auto">
                  <Sparkles className="w-8 h-8 text-primary-400 animate-pulse" />
                </div>
                <h2 className="text-xl font-semibold">
                  A gerar «{activeSectionData?.title}» com IA...
                </h2>
                <p className="text-dark-400 text-sm">
                  O Claude Sonnet está a criar conteúdo académico de qualidade. Isto pode demorar
                  15-30 segundos por secção.
                </p>
                <Loader2 className="w-6 h-6 animate-spin mx-auto text-primary-400" />
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
                className="max-w-3xl mx-auto"
              >
                {/* Section header */}
                <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
                  <h2 className="text-2xl font-display font-bold flex items-center gap-3">
                    {activeSectionData && (
                      <activeSectionData.icon className="w-6 h-6 text-primary-400" />
                    )}
                    {activeSectionData?.title}
                  </h2>
                  <div className="flex items-center gap-2 flex-wrap">
                    <button
                      onClick={() => regenerateOneSection(activeSection)}
                      disabled={generating || isSectionGenerating || humanizingSection === activeSection}
                      className="btn-secondary text-xs px-3 py-2 rounded-lg flex items-center gap-1.5"
                      title="Regenerar esta secção com IA"
                    >
                      {isSectionGenerating ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Sparkles className="w-3.5 h-3.5" />
                      )}
                      Gerar com IA
                    </button>
                    {sectionContent && (
                      <button
                        onClick={() => handleHumanize(activeSection)}
                        disabled={generating || isSectionGenerating || humanizingSection === activeSection}
                        className="btn-secondary text-xs px-3 py-2 rounded-lg flex items-center gap-1.5 border-primary-500/30 text-primary-300 hover:text-primary-100 hover:bg-primary-500/10"
                        title="Reescreve o texto tirando marcas robóticas da IA"
                      >
                        {humanizingSection === activeSection ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <Wand2 className="w-3.5 h-3.5" />
                        )}
                        Humanizar (Antidetecção)
                      </button>
                    )}
                    <button
                      onClick={() => handleCopySection(activeSection)}
                      className="btn-secondary text-xs px-3 py-2 rounded-lg flex items-center gap-1.5"
                    >
                      <Copy className="w-3.5 h-3.5" /> Copiar
                    </button>
                    {editingSection !== activeSection ? (
                      <button
                        onClick={() => handleEditSection(activeSection)}
                        className="btn-primary text-xs px-3 py-2 rounded-lg flex items-center gap-1.5"
                      >
                        <Edit3 className="w-3.5 h-3.5" /> Editar
                      </button>
                    ) : (
                      <div className="flex gap-1.5">
                        <button
                          onClick={handleSaveSection}
                          className="btn-primary text-xs px-3 py-2 rounded-lg flex items-center gap-1.5"
                        >
                          <Check className="w-3.5 h-3.5" /> Salvar
                        </button>
                        <button
                          onClick={() => setEditingSection(null)}
                          className="btn-secondary text-xs px-3 py-2 rounded-lg flex items-center gap-1.5"
                        >
                          <X className="w-3.5 h-3.5" /> Cancelar
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Erro na geração desta secção */}
                {sectionError && (
                  <div className="mb-4 p-4 rounded-xl bg-red-500/10 border border-red-500/20 flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm text-red-300 font-medium mb-1">
                        Erro ao gerar esta secção
                      </p>
                      <p className="text-xs text-red-400/80">{sectionError}</p>
                      <button
                        onClick={() => regenerateOneSection(activeSection)}
                        className="mt-2 text-xs text-red-300 underline hover:text-red-200"
                      >
                        Tentar novamente
                      </button>
                    </div>
                  </div>
                )}

                {/* Section content */}
                {editingSection === activeSection ? (
                  <textarea
                    ref={textareaRef}
                    value={editContent}
                    onChange={(e) => setEditContent(e.target.value)}
                    className="w-full min-h-[600px] bg-dark-900/50 border border-white/10 rounded-xl p-6 text-dark-200 text-sm leading-relaxed resize-y focus:outline-none focus:ring-2 focus:ring-primary-500/40 font-mono"
                  />
                ) : (
                  <div className="glass-card rounded-2xl p-6 sm:p-8">
                    <div className="prose prose-invert prose-sm max-w-none">
                      {sectionContent ? (
                        parseSectionContent(sectionContent, handleChartTypeChange)
                      ) : (
                        <div className="text-center py-12">
                          <Sparkles className="w-10 h-10 text-dark-600 mx-auto mb-3" />
                          <p className="text-dark-500 italic mb-3">
                            Conteúdo ainda não gerado para esta secção.
                          </p>
                          <button
                            onClick={() => regenerateOneSection(activeSection)}
                            disabled={generating || humanizingSection === activeSection}
                            className="btn-primary text-sm px-4 py-2 rounded-lg inline-flex items-center gap-2"
                          >
                            <Sparkles className="w-4 h-4" />
                            Gerar com Inteligência Artificial
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </motion.div>
            </AnimatePresence>
          )}
        </main>
      </div>

      <ConfirmDialog
        open={showDeleteDialog}
        variant="danger"
        title="Eliminar Projecto"
        message="Tens a certeza que queres eliminar este projecto? Todos os dados e conteúdo gerado serão perdidos."
        detail="Esta acção é irreversível. O projecto será permanentemente eliminado."
        confirmLabel="Eliminar"
        cancelLabel="Cancelar"
        loading={deleting}
        onConfirm={confirmDeleteProject}
        onCancel={() => setShowDeleteDialog(false)}
      />
    </div>
  )
}
