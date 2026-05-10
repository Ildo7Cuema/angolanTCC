import { useState, useCallback, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import Navbar from '../components/Navbar'
import PageLayout from '../components/PageLayout'
import Button from '../components/ui/Button'
import Input from '../components/ui/Input'
import { supabase } from '../lib/supabase'
import { callFunction, traduzirErroIA as traduzirErroIALib } from '../lib/generateSection'
import { suggestNormForUniversity, NORM_OPTIONS, getUniversityProfile } from '../lib/universityProfiles'
import {
  Sparkles, BookOpen, GraduationCap, Building2, User, FileText, Lightbulb,
  RefreshCw, Wand2, CheckCircle2, ClipboardList, ChevronDown, X, Layers, ArrowRight,
} from 'lucide-react'
import toast from 'react-hot-toast'

const fadeUp = {
  hidden:  { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.45, ease: [0.16, 1, 0.3, 1] } },
}

// ─── Datasets (idênticos ao original) ──────────────────────────────────────
const angolianUniversitiesByProvince = {
  'Luanda': [
    'Universidade Agostinho Neto (UAN)','Universidade Lusíada de Angola (ULA)','Universidade Metodista de Angola (UMA)',
    'Universidade Católica de Angola (UCAN)','Universidade Jean Piaget de Angola','Universidade Privada de Angola (UPRA)',
    'Universidade Óscar Ribas (UÓR)','Universidade de Belas (UNIBELAS)','Universidade Técnica de Angola (UTANGA)',
    'Universidade Independente de Angola (UNIA)','Instituto Superior Politécnico Gregório Semedo (IGS)',
    'Instituto Superior Politécnico de Tecnologias e Ciências (ISPTEC)',
    'Instituto Superior de Ciências Sociais e Relações Internacionais (CISSRI)',
    'Instituto Superior de Gestão e Administração de Luanda (ISGAL)',
    'Instituto Superior de Ciências de Educação de Luanda (ISCED-Luanda)',
    'Instituto Superior de Serviço Social (ISSS)','Escola Superior Pedagógica do Bengo',
  ],
  'Huíla': ['Universidade Mandume ya Ndemofayo (UMN)','Instituto Superior Politécnico da Huíla (ISPH)','Instituto Superior de Ciências de Educação da Huíla (ISCED-Huíla)','Instituto Superior de Tecnologia de Lubango (ISTL)','Instituto Superior Politécnico Independente da Huíla (ISPIH)'],
  'Huambo': ['Universidade José Eduardo dos Santos (UJES) – Huambo','Instituto Superior de Ciências de Educação do Huambo (ISCED-Huambo)','Instituto Superior Politécnico do Huambo (ISPH-Huambo)','Instituto Superior Técnico de Engenharia do Huambo (ISTEH)'],
  'Benguela': ['Universidade Katyavala Bwila (UKB)','Instituto Superior de Ciências de Educação de Benguela (ISCED-Benguela)','Instituto Superior Politécnico de Benguela (ISPB)','Instituto Superior de Ciências da Saúde de Benguela (ISCISAB)'],
  'Uíge': ['Universidade Kimpa Vita (UKV)','Instituto Superior de Ciências de Educação do Uíge (ISCED-Uíge)','Instituto Superior Politécnico do Uíge (ISPU)'],
  'Namibe': ['Instituto Superior Politécnico do Namibe (ISPN)','Instituto Superior de Ciências de Educação do Namibe (ISCED-Namibe)','Instituto Superior de Tecnologia do Namibe (ISTN)'],
  'Cabinda': ['Instituto Superior Politécnico de Cabinda (ISPDC)','Instituto Superior de Ciências de Educação de Cabinda (ISCED-Cabinda)'],
  'Cunene': ['Universidade Ondjiva (UO)','Instituto Superior Politécnico do Cunene (ISPC)'],
  'Lunda Norte / Lunda Sul': ['Instituto Superior Politécnico do Dundo (ISPD)','Instituto Superior de Ciências de Educação da Lunda Norte (ISCED-Lunda Norte)'],
  'Malanje': ['Instituto Superior Politécnico de Malanje (ISPM)','Instituto Superior de Ciências de Educação de Malanje (ISCED-Malanje)'],
  'Moxico': ['Instituto Superior Politécnico do Moxico (ISPMO)','Instituto Superior de Ciências de Educação do Moxico (ISCED-Moxico)'],
  'Outra': ['Outra'],
}
const angolianUniversities = Object.values(angolianUniversitiesByProvince).flat()
const courses = [
  'Engenharia Informática','Ciências da Computação','Direito','Economia','Gestão de Empresas',
  'Contabilidade e Auditoria','Psicologia','Sociologia','Comunicação Social','Enfermagem',
  'Medicina','Arquitectura','Engenharia Civil','Engenharia Electrónica',
]
const knowledgeAreas = [
  'Sistemas de Informação','Segurança Informática','Inteligência Artificial e Machine Learning',
  'Redes e Telecomunicações','Desenvolvimento de Software','Computação em Nuvem','Internet das Coisas (IoT)',
  'Gestão de Projectos','Finanças e Investimentos','Marketing e Estratégia Empresarial','Recursos Humanos e Gestão de Pessoas',
  'Comércio Internacional','Empreendedorismo','Contabilidade Financeira','Auditoria e Controlo Interno',
  'Fiscalidade e Tributação','Direito Comercial e Empresarial','Direito Penal','Direito Constitucional',
  'Direito do Trabalho','Direito Internacional','Saúde Pública e Epidemiologia','Cuidados de Enfermagem',
  'Saúde Materno-Infantil','Gestão Hospitalar','Pedagogia e Didáctica','Educação Inclusiva','Gestão Escolar',
  'Tecnologias na Educação','Ciências Políticas e Governação','Relações Internacionais','Sociologia Urbana',
  'Psicologia Clínica','Psicologia Organizacional','Comunicação e Jornalismo','Construção Civil e Infraestrutura',
  'Engenharia Eléctrica','Energias Renováveis','Gestão da Construção','Meio Ambiente e Sustentabilidade',
  'Agricultura e Desenvolvimento Rural','Recursos Hídricos','Desenvolvimento Económico de Angola',
  'Políticas Públicas em Angola','Petróleo e Gás','Mineração e Recursos Naturais',
]
const traduzirErroIA = traduzirErroIALib

// ─── Helpers UI ────────────────────────────────────────────────────────────
function SkeletonLines({ lines = 3 }) {
  return (
    <div className="space-y-2 py-1">
      {Array.from({ length: lines }).map((_, i) => (
        <div key={i} className="skeleton h-3.5"
          style={{ width: i === lines - 1 ? '60%' : '100%' }} />
      ))}
    </div>
  )
}

function AIBadge({ onRegenerate, loading }) {
  return (
    <div className="flex items-center justify-between mt-2">
      <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary-700 bg-primary-50 px-2.5 py-1 rounded-full border border-primary-200">
        <Wand2 className="w-3 h-3" /> Gerado por IA
      </span>
      <button
        type="button"
        onClick={onRegenerate}
        disabled={loading}
        className="inline-flex items-center gap-1.5 text-xs font-medium text-dark-500 hover:text-dark-900 transition-colors disabled:opacity-40"
      >
        <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
        Regenerar
      </button>
    </div>
  )
}

function SectionHeader({ icon: Icon, title, subtitle }) {
  return (
    <div className="flex items-start gap-3 mb-5">
      <div className="w-10 h-10 rounded-xl bg-primary-50 text-primary-600 flex items-center justify-center ring-1 ring-primary-100 flex-shrink-0">
        <Icon className="w-5 h-5" />
      </div>
      <div>
        <h2 className="text-base sm:text-lg font-display font-bold text-dark-900 leading-tight">{title}</h2>
        {subtitle && <p className="text-xs sm:text-sm text-dark-500 mt-0.5">{subtitle}</p>}
      </div>
    </div>
  )
}

/* ────────────────────────────────────────────────────────────────────────── */

export default function NewProject() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [aiGenerated, setAiGenerated] = useState(false)
  const [suggestions, setSuggestions] = useState([])
  const [loadingSuggestions, setLoadingSuggestions] = useState(false)
  const [showSuggestions, setShowSuggestions] = useState(false)
  const debounceRef = useRef(null)
  const titleWrapperRef = useRef(null)

  const [form, setForm] = useState({
    title: '',
    university: '',
    academicNorm: 'ABNT',
    projectType: 'tcc',
    dbStructure: '',
    course: '',
    studentName: user?.user_metadata?.full_name || '',
    advisor: '',
    topic: '',
    problemStatement: '',
    methodology: '',
    year: new Date().getFullYear().toString(),
    maxPages: 80,
    knowledgeArea: '',
  })

  const [dbUniversities, setDbUniversities] = useState([])
  const [universityCityMap, setUniversityCityMap] = useState({})
  // Indica se o utilizador editou manualmente a norma — se SIM, não a
  // sobrescrevemos automaticamente quando a universidade/curso mudarem.
  const [normManuallyChanged, setNormManuallyChanged] = useState(false)

  useEffect(() => {
    async function fetchUniversities() {
      const { data } = await supabase.from('universities').select('name, city, province').order('name')
      if (data && data.length > 0) {
        setDbUniversities(data.map(u => u.name))
        const cityMap = {}
        data.forEach(u => {
          if (u.city) cityMap[u.name] = u.city
          else if (u.province) cityMap[u.name] = u.province
        })
        setUniversityCityMap(cityMap)
      }
    }
    fetchUniversities()
  }, [])

  // Auto-sugere a norma com base na universidade + curso seleccionados
  // (só se o utilizador ainda não a tiver alterado manualmente).
  useEffect(() => {
    if (normManuallyChanged) return
    if (!form.university && !form.course) return
    const suggested = suggestNormForUniversity(form.university, form.course)
    if (suggested && suggested !== form.academicNorm) {
      setForm((prev) => ({ ...prev, academicNorm: suggested }))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.university, form.course])

  const updateField = (field, value) => setForm((prev) => ({ ...prev, [field]: value }))

  // Perfil da universidade actualmente seleccionada (para mostrar info no UI)
  const currentProfile = form.university
    ? getUniversityProfile(form.university, { course: form.course })
    : null

  // ─── AI: Tema + Problema (a partir do título) ──────────────────────────
  const generateWithAI = useCallback(async (title) => {
    if (!title || title.trim().length < 10) return
    setGenerating(true); setAiGenerated(false)

    const prompt = `Você é um especialista académico angolano em orientação de Trabalhos de Conclusão de Curso (TCC).

Com base no título do TCC abaixo, gera em Português de Angola (pré-Acordo Ortográfico, DESCARTANDO totalmente o Novo Acordo Ortográfico da Língua Portuguesa, escrevendo por exemplo: "objectivo", "projecto", "acção") (sem usar "você", use "o estudante"):

TÍTULO: "${title}"

Responde APENAS com um JSON válido no seguinte formato, sem texto extra:
{
  "topic": "Descrição detalhada do tema em 2-3 parágrafos. Explica o contexto académico, a relevância no contexto angolano e os principais conceitos abordados.",
  "problemStatement": "Um parágrafo que define claramente o problema central de investigação: o que existe de lacunoso ou problemático na realidade que justifica este estudo."
}`

    try {
      const data = await callFunction('generate-tcc-fields', { prompt })
      const raw = data?.text || ''
      const jsonMatch = raw.match(/\{[\s\S]*\}/)
      if (!jsonMatch) throw new Error('Resposta inválida da IA')
      const parsed = JSON.parse(jsonMatch[0])
      setForm((prev) => ({
        ...prev,
        topic: parsed.topic || prev.topic,
        problemStatement: parsed.problemStatement || prev.problemStatement,
      }))
      setAiGenerated(true)
      toast.success('Campos gerados pela IA com sucesso!')
    } catch (err) {
      const detail = err?.message || String(err)
      const detailEmPt = traduzirErroIA(detail)
      toast.error(detailEmPt.length > 140
        ? 'Não foi possível gerar com IA. Verifica rede, deploy da função e sessão.'
        : `IA: ${detailEmPt}`)
    }
    setGenerating(false)
  }, [])

  const handleTitleBlur = () => {
    if (form.title.trim().length >= 10 && !form.topic) generateWithAI(form.title)
  }
  const handleRegenerate = () => {
    if (form.title.trim().length >= 10) generateWithAI(form.title)
    else toast.error('Escreve um título com pelo menos 10 caracteres primeiro.')
  }

  // ─── AI: Sugestões inline ──────────────────────────────────────────────
  const fetchTitleSuggestions = useCallback(async (partialTitle) => {
    if (!partialTitle || partialTitle.trim().length < 4) {
      setSuggestions([]); setShowSuggestions(false); return
    }
    const course = form.course.trim() || ''
    const university = form.university.trim() || ''
    const docLabel = form.projectType === 'anteprojecto' ? 'Ante-Projecto de Pesquisa' : 'Trabalho de Conclusão de Curso (TCC)'
    const knowledgeArea = form.knowledgeArea?.trim() || ''

    setLoadingSuggestions(true); setShowSuggestions(true)

    const prompt = `Você é um especialista académico angolano. O estudante está a escrever o título do seu ${docLabel} e digitou até agora: "${partialTitle}".
${course ? `Curso: ${course}.` : ''}${university ? ` Universidade: ${university}.` : ''}${knowledgeArea ? ` Área/Campo de Conhecimento: ${knowledgeArea}.` : ''}

Com base no que foi escrito, gere exactamente 5 sugestões de títulos académicos completos e polidos que:
- Completem ou expandam a ideia iniciada
- Sejam relevantes para o contexto angolano de 2024/2025
- Usem linguagem académica formal e pré-Acordo Ortográfico (objectivo, projecto, impacto, análise, etc.)
- Sejam específicos e originais — não genéricos
- Variem em abordagem (ex: um sobre impacto, outro sobre análise, outro sobre estratégia, etc.)
${knowledgeArea ? `- Todos os títulos devem estar relacionados com a área de "${knowledgeArea}"\n` : ''}
Responde APENAS com JSON válido neste formato, sem texto extra:
{"suggestions":["título 1","título 2","título 3","título 4","título 5"]}`

    try {
      const data = await callFunction('generate-tcc-fields', { prompt })
      const raw = data?.text || ''
      const jsonMatch = raw.match(/\{[\s\S]*\}/)
      if (!jsonMatch) throw new Error('JSON inválido')
      const parsed = JSON.parse(jsonMatch[0])
      const list = Array.isArray(parsed.suggestions) ? parsed.suggestions.filter(Boolean) : []
      setSuggestions(list)
      if (list.length > 0) setShowSuggestions(true)
    } catch (err) {
      setSuggestions([])
    }
    setLoadingSuggestions(false)
  }, [form.course, form.university, form.projectType, form.knowledgeArea])

  const generateSuggestions = useCallback(async () => {
    setLoadingSuggestions(true); setShowSuggestions(true); setSuggestions([])
    const course = form.course.trim() || 'Geral'
    const university = form.university.trim() || 'Universidade angolana'
    const docLabel = form.projectType === 'anteprojecto' ? 'Ante-Projecto de Pesquisa' : 'Trabalho de Conclusão de Curso (TCC)'
    const knowledgeArea = form.knowledgeArea?.trim() || ''
    const areaClause = knowledgeArea ? `, com foco específico na área de "${knowledgeArea}"` : ''
    const areaRule   = knowledgeArea ? `\n- Todos os títulos devem estar relacionados com a área de "${knowledgeArea}".` : ''

    const prompt = `Você é um especialista académico angolano. Gere exactamente 6 ideias de títulos de ${docLabel} para um estudante do curso de "${course}" na ${university}${areaClause}.

Regras: relevantes para Angola 2024/2025, académicos, específicos, pré-Acordo Ortográfico, variados em abordagem (impacto, análise, estratégia, avaliação, etc.).${areaRule}
Responde APENAS com JSON: {"suggestions":["t1","t2","t3","t4","t5","t6"]}`

    try {
      const data = await callFunction('generate-tcc-fields', { prompt })
      const raw = data?.text || ''
      const jsonMatch = raw.match(/\{[\s\S]*\}/)
      if (!jsonMatch) throw new Error('JSON inválido')
      const parsed = JSON.parse(jsonMatch[0])
      setSuggestions(Array.isArray(parsed.suggestions) ? parsed.suggestions.filter(Boolean) : [])
    } catch {
      toast.error('Não foi possível gerar sugestões. Tente novamente.')
      setShowSuggestions(false)
    }
    setLoadingSuggestions(false)
  }, [form.course, form.university, form.projectType, form.knowledgeArea])

  const handleTitleChange = (e) => {
    const val = e.target.value
    updateField('title', val)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    if (val.trim().length >= 4) {
      debounceRef.current = setTimeout(() => fetchTitleSuggestions(val), 700)
    } else {
      setSuggestions([]); setShowSuggestions(false)
    }
  }

  const handleSelectSuggestion = (title) => {
    updateField('title', title)
    setShowSuggestions(false); setSuggestions([])
    if (debounceRef.current) clearTimeout(debounceRef.current)
    generateWithAI(title)
  }

  const closeSuggestions = () => { setShowSuggestions(false); setSuggestions([]) }

  useEffect(() => {
    const handler = (e) => {
      if (titleWrapperRef.current && !titleWrapperRef.current.contains(e.target)) closeSuggestions()
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const deriveCityFromProvince = (universityName = '') => {
    const name = universityName.toLowerCase()
    if (name.includes('lubango') || name.includes('huíla') || name.includes('mandume')) return 'Lubango'
    if (name.includes('huambo') || name.includes('ujes')) return 'Huambo'
    if (name.includes('benguela') || name.includes('katyavala')) return 'Benguela'
    if (name.includes('uíge') || name.includes('kimpa vita')) return 'Uíge'
    if (name.includes('namibe') || name.includes('moçâmedes')) return 'Moçâmedes'
    if (name.includes('cabinda')) return 'Cabinda'
    if (name.includes('ondjiva') || name.includes('cunene')) return 'Ondjiva'
    if (name.includes('dundo') || name.includes('lunda')) return 'Dundo'
    if (name.includes('malanje')) return 'Malanje'
    if (name.includes('luena') || name.includes('moxico')) return 'Luena'
    return 'Luanda'
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.title || !form.university.trim() || !form.course.trim() || !form.topic) {
      toast.error('Preencha os campos obrigatórios: Título, Universidade, Curso e Tema.')
      return
    }
    setLoading(true)
    const universityCity = universityCityMap[form.university] || deriveCityFromProvince(form.university)

    const { data, error } = await supabase
      .from('projects')
      .insert({
        user_id: user.id,
        title: form.title,
        university: form.university,
        course: form.course,
        student_name: form.studentName,
        advisor: form.advisor,
        topic: form.topic,
        problem_statement: form.problemStatement,
        methodology: form.methodology,
        year: form.year,
        max_pages: parseInt(form.maxPages, 10) || 80,
        status: 'generating',
        sections: {
          academic_norm: form.academicNorm,
          db_structure: form.dbStructure,
          projectType: form.projectType,
          father_name: user?.user_metadata?.father_name || '',
          mother_name: user?.user_metadata?.mother_name || '',
          other_relatives: user?.user_metadata?.other_relatives || '',
          university_city: universityCity,
        },
      })
      .select().single()

    if (error) { toast.error('Erro ao criar projecto: ' + error.message); setLoading(false); return }

    const refCode = (form.projectType === 'anteprojecto' ? 'AP-' : 'TCC-') +
      Math.random().toString(36).substring(2, 7).toUpperCase()
    const paymentAmount = form.projectType === 'anteprojecto' ? 15000 : 35000

    const { error: payErr } = await supabase.from('payments').insert({
      user_id: user.id, project_id: data.id, amount: paymentAmount,
      reference_code: refCode, status: 'pendente'
    })

    if (payErr) toast.error('Projecto criado com erro no pagamento associado. Tente gerar depois.')
    else        toast.success('Projecto criado! Complete o pagamento para iniciar a geração com IA.')

    navigate(`/payment/${data.id}`)
  }

  // ─── Render ────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen">
      <Navbar backTo="/dashboard" backLabel="Voltar" title="Novo Projecto" />

      <PageLayout maxWidth="max-w-3xl">
        <motion.div variants={fadeUp} initial="hidden" animate="visible">
          {/* Header */}
          <div className="mb-8">
            <span className="eyebrow"><Sparkles className="w-3.5 h-3.5" /> NOVO PROJECTO</span>
            <h1 className="mt-3 text-3xl sm:text-4xl font-display font-extrabold tracking-tight text-dark-900">
              Comece o seu <span className="gradient-text">trabalho</span>
            </h1>
            <p className="text-dark-500 mt-2 text-sm sm:text-base max-w-xl">
              Escolha o tipo de trabalho. A IA gerará automaticamente o tema, o problema de investigação e todas as secções do documento.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* ── Tipo de Trabalho ──────────────────────────────── */}
            <section className="glass-card p-5 sm:p-6">
              <SectionHeader icon={ClipboardList} title="Tipo de trabalho académico" subtitle="Escolha entre TCC ou Ante-Projecto." />

              <div className="grid sm:grid-cols-2 gap-3 sm:gap-4">
                {[
                  { id: 'tcc',          icon: GraduationCap, label: 'TCC / Monografia', price: '35.000 AOA',
                    desc: 'Trabalho de Conclusão de Curso completo: introdução, revisão, metodologia, resultados, conclusão.' },
                  { id: 'anteprojecto', icon: FileText,      label: 'Ante-Projecto', price: '15.000 AOA',
                    desc: 'Proposta de investigação prévia ao TCC com justificativa, fundamentação, metodologia, cronograma e orçamento.' },
                ].map((opt) => {
                  const active = form.projectType === opt.id
                  const Icon = opt.icon
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => updateField('projectType', opt.id)}
                      className={[
                        'relative flex flex-col items-start gap-2.5 rounded-2xl p-4 sm:p-5 border-2 transition-all text-left',
                        active
                          ? 'border-primary-500 bg-primary-50/50 shadow-glow-sm'
                          : 'border-dark-200/70 bg-white hover:border-dark-300 hover:-translate-y-0.5 hover:shadow-md',
                      ].join(' ')}
                    >
                      <div className="flex items-center justify-between w-full">
                        <span className={`w-9 h-9 rounded-xl flex items-center justify-center ${active ? 'bg-primary-600 text-white' : 'bg-dark-100 text-dark-500'}`}>
                          <Icon className="w-4.5 h-4.5" />
                        </span>
                        <span className={`text-[11px] font-bold px-2.5 py-1 rounded-full ${active ? 'bg-primary-600 text-white' : 'bg-dark-100 text-dark-600'}`}>
                          {opt.price}
                        </span>
                      </div>
                      <h3 className="text-sm sm:text-base font-display font-bold text-dark-900">{opt.label}</h3>
                      <p className="text-xs text-dark-500 leading-relaxed">{opt.desc}</p>
                      {active && (
                        <CheckCircle2 className="absolute top-3 right-3 w-5 h-5 text-primary-600" />
                      )}
                    </button>
                  )
                })}
              </div>
            </section>

            {/* ── Informações do Trabalho ──────────────────────── */}
            <section className="glass-card p-5 sm:p-6 space-y-5">
              <SectionHeader icon={FileText} title="Informações do trabalho" subtitle="Conte-nos do que se trata. A IA usa estes dados para gerar conteúdo relevante." />

              {/* Knowledge Area */}
              <div>
                <Input
                  label="Área de conhecimento"
                  hint="Opcional — melhora as sugestões de título da IA."
                  list="knowledge-areas-list"
                  value={form.knowledgeArea}
                  onChange={(e) => updateField('knowledgeArea', e.target.value)}
                  leftIcon={Layers}
                  placeholder="Ex: Segurança Informática, Saúde Pública, Direito Comercial…"
                  rightSlot={form.knowledgeArea ? (
                    <button type="button" onClick={() => updateField('knowledgeArea', '')}
                      className="btn-icon" aria-label="Limpar">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  ) : null}
                />
                <datalist id="knowledge-areas-list">
                  {knowledgeAreas.map((a) => <option key={a} value={a} />)}
                </datalist>
              </div>

              {/* Title with AI suggestions */}
              <div ref={titleWrapperRef}>
                <div className="flex items-center justify-between mb-1.5 gap-2">
                  <label className="block text-sm font-medium text-dark-700">
                    Título do {form.projectType === 'anteprojecto' ? 'Ante-Projecto' : 'TCC'}
                    <span className="text-danger-500 ml-0.5">*</span>
                  </label>
                  <button
                    type="button"
                    onClick={generateSuggestions}
                    disabled={loadingSuggestions || generating}
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary-700 hover:text-primary-800 bg-primary-50 hover:bg-primary-100 border border-primary-200 px-2.5 py-1 rounded-full transition-all disabled:opacity-40"
                  >
                    <Lightbulb className="w-3 h-3" /> Inspirar-me
                  </button>
                </div>

                <div className="relative">
                  <input
                    type="text"
                    value={form.title}
                    onChange={handleTitleChange}
                    onBlur={handleTitleBlur}
                    onFocus={() => { if (suggestions.length > 0) setShowSuggestions(true) }}
                    onKeyDown={(e) => { if (e.key === 'Escape') closeSuggestions() }}
                    className="input-field pr-10"
                    placeholder="Comece a escrever — a IA sugere títulos automaticamente…"
                    autoComplete="off"
                  />

                  <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                    <AnimatePresence mode="wait">
                      {loadingSuggestions ? (
                        <motion.span key="spin" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                          <RefreshCw className="w-4 h-4 text-primary-600 animate-spin" />
                        </motion.span>
                      ) : aiGenerated && !generating ? (
                        <motion.span key="ok" initial={{ opacity: 0, scale: 0.5 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}>
                          <CheckCircle2 className="w-5 h-5 text-success-500" />
                        </motion.span>
                      ) : null}
                    </AnimatePresence>
                  </div>

                  <AnimatePresence>
                    {showSuggestions && (loadingSuggestions || suggestions.length > 0) && (
                      <motion.div
                        initial={{ opacity: 0, y: -4, scaleY: 0.96 }}
                        animate={{ opacity: 1, y: 0, scaleY: 1 }}
                        exit={{ opacity: 0, y: -4, scaleY: 0.96 }}
                        transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
                        style={{ transformOrigin: 'top' }}
                        className="absolute left-0 right-0 top-full mt-2 z-50 rounded-2xl border border-primary-200 bg-white/95 backdrop-blur-xl shadow-xl overflow-hidden"
                      >
                        <div className="flex items-center justify-between px-4 py-2.5 border-b border-dark-100 bg-primary-50/40">
                          <span className="text-xs font-semibold text-primary-700 flex items-center gap-1.5">
                            <Sparkles className="w-3.5 h-3.5" />
                            {loadingSuggestions ? 'IA a gerar sugestões…' : `${suggestions.length} sugestões — clique para usar`}
                          </span>
                          <button
                            type="button"
                            onMouseDown={(e) => { e.preventDefault(); closeSuggestions() }}
                            className="btn-icon w-7 h-7"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        {loadingSuggestions && (
                          <div className="p-3 space-y-2">
                            {[85, 70, 90, 65, 80].map((w, i) => (
                              <div key={i} className="skeleton h-9" style={{ width: `${w}%` }} />
                            ))}
                          </div>
                        )}

                        {!loadingSuggestions && (
                          <div className="py-1.5">
                            {suggestions.map((s, i) => (
                              <motion.button
                                key={`${s}-${i}`}
                                type="button"
                                initial={{ opacity: 0, x: -6 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: i * 0.04 }}
                                onMouseDown={(e) => { e.preventDefault(); handleSelectSuggestion(s) }}
                                className="w-full text-left px-4 py-2.5 text-sm text-dark-700 hover:text-dark-900 hover:bg-primary-50 transition-colors flex items-center gap-2.5 group"
                              >
                                <ChevronDown className="w-3.5 h-3.5 text-primary-600 flex-shrink-0 -rotate-90 opacity-0 group-hover:opacity-100 transition-opacity" />
                                <span className="leading-snug">{s}</span>
                              </motion.button>
                            ))}
                            <div className="border-t border-dark-100 px-4 py-2">
                              <button
                                type="button"
                                onMouseDown={(e) => { e.preventDefault(); fetchTitleSuggestions(form.title) }}
                                className="text-xs text-dark-500 hover:text-primary-600 flex items-center gap-1.5 transition-colors"
                              >
                                <RefreshCw className="w-3 h-3" /> Gerar outras sugestões
                              </button>
                            </div>
                          </div>
                        )}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                <p className="text-xs text-dark-500 mt-1.5">
                  A IA sugere títulos automaticamente. Use <strong className="text-primary-600">Inspirar-me</strong> para ideias do zero. Ao sair do campo, o tema e o problema são gerados.
                </p>
              </div>

              {/* Tema */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-sm font-medium text-dark-700">
                    Tema / descrição <span className="text-danger-500">*</span>
                  </label>
                  {generating && (
                    <span className="inline-flex items-center gap-1.5 text-xs text-primary-600 animate-pulse font-medium">
                      <Wand2 className="w-3.5 h-3.5" /> A gerar…
                    </span>
                  )}
                </div>
                {generating ? (
                  <div className="input-field min-h-[120px]"><SkeletonLines lines={5} /></div>
                ) : (
                  <textarea
                    value={form.topic}
                    onChange={(e) => updateField('topic', e.target.value)}
                    className="input-field min-h-[120px] resize-y"
                    placeholder="Descreva detalhadamente o tema. A IA preenche automaticamente após escreveres o título."
                  />
                )}
                {aiGenerated && !generating && <AIBadge onRegenerate={handleRegenerate} loading={generating} />}
              </div>

              {/* Problema */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-sm font-medium text-dark-700">Problema de investigação</label>
                  {generating && (
                    <span className="inline-flex items-center gap-1.5 text-xs text-primary-600 animate-pulse font-medium">
                      <Wand2 className="w-3.5 h-3.5" /> A gerar…
                    </span>
                  )}
                </div>
                {generating ? (
                  <div className="input-field min-h-[90px]"><SkeletonLines lines={3} /></div>
                ) : (
                  <textarea
                    value={form.problemStatement}
                    onChange={(e) => updateField('problemStatement', e.target.value)}
                    className="input-field min-h-[90px] resize-y"
                    placeholder="(Opcional) Qual é o problema central que o seu trabalho pretende resolver?"
                  />
                )}
                {aiGenerated && !generating && <AIBadge onRegenerate={handleRegenerate} loading={generating} />}
              </div>

              {/* Metodologia */}
              <div>
                <label className="block text-sm font-medium text-dark-700 mb-1.5">Metodologia preferida</label>
                <select
                  value={form.methodology}
                  onChange={(e) => updateField('methodology', e.target.value)}
                  className="input-field"
                >
                  <option value="">Seleccionar (opcional)</option>
                  <option value="qualitativa">Qualitativa</option>
                  <option value="quantitativa">Quantitativa</option>
                  <option value="mista">Mista (Quali-Quantitativa)</option>
                  <option value="bibliografica">Revisão Bibliográfica</option>
                  <option value="estudo_caso">Estudo de Caso</option>
                </select>
              </div>
            </section>

            {/* ── Informações Académicas ───────────────────────── */}
            <section className="glass-card p-5 sm:p-6 space-y-5">
              <SectionHeader icon={GraduationCap} title="Informações académicas" subtitle="Norma, instituição, curso e dados pessoais." />

              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <div className="flex items-center justify-between mb-1.5 gap-2">
                    <label className="block text-sm font-medium text-dark-700">
                      Norma académica <span className="text-danger-500">*</span>
                    </label>
                    {currentProfile && currentProfile.defaultNorm === form.academicNorm && !normManuallyChanged && (
                      <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-primary-700 bg-primary-50 px-2 py-0.5 rounded-full border border-primary-200">
                        <Sparkles className="w-2.5 h-2.5" /> Sugerida
                      </span>
                    )}
                  </div>
                  <select
                    value={form.academicNorm}
                    onChange={(e) => {
                      updateField('academicNorm', e.target.value)
                      setNormManuallyChanged(true)
                    }}
                    className="input-field"
                  >
                    {NORM_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                  {currentProfile && (
                    <p className="text-[11px] text-dark-500 mt-1">
                      {form.university} usa habitualmente <strong className="text-dark-700">{currentProfile.defaultNorm}</strong> e segue o modelo de capa próprio.
                    </p>
                  )}
                </div>
                <Input
                  label="Ano"
                  type="number"
                  value={form.year}
                  onChange={(e) => updateField('year', e.target.value)}
                  placeholder="2026"
                />
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <Input
                    label="Universidade"
                    required
                    list="universities-list"
                    value={form.university}
                    onChange={(e) => updateField('university', e.target.value)}
                    leftIcon={GraduationCap}
                    placeholder="Escreva ou seleccione…"
                    autoComplete="off"
                    rightSlot={form.university ? (
                      <button type="button" onClick={() => updateField('university', '')}
                        className="btn-icon" aria-label="Limpar">
                        <X className="w-3.5 h-3.5" />
                      </button>
                    ) : null}
                    hint="Escreva ou seleccione da lista de sugestões."
                  />
                  <datalist id="universities-list">
                    {(dbUniversities.length > 0 ? dbUniversities : angolianUniversities).map((u) => (
                      <option key={u} value={u} />
                    ))}
                  </datalist>
                </div>

                <div>
                  <Input
                    label="Curso"
                    required
                    list="courses-list"
                    value={form.course}
                    onChange={(e) => updateField('course', e.target.value)}
                    leftIcon={BookOpen}
                    placeholder="Escreva ou seleccione…"
                    autoComplete="off"
                    rightSlot={form.course ? (
                      <button type="button" onClick={() => updateField('course', '')}
                        className="btn-icon" aria-label="Limpar">
                        <X className="w-3.5 h-3.5" />
                      </button>
                    ) : null}
                    hint="Escreva ou seleccione da lista de sugestões."
                  />
                  <datalist id="courses-list">
                    {courses.map((c) => <option key={c} value={c} />)}
                  </datalist>
                </div>
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                <Input
                  label="Nome do estudante"
                  value={form.studentName}
                  onChange={(e) => updateField('studentName', e.target.value)}
                  leftIcon={User}
                  placeholder="O seu nome"
                />
                <Input
                  label="Orientador"
                  value={form.advisor}
                  onChange={(e) => updateField('advisor', e.target.value)}
                  leftIcon={Building2}
                  placeholder="Nome do orientador (opcional)"
                />
              </div>

              <Input
                label="Nº máximo de páginas"
                type="number" min="10" max="120"
                value={form.maxPages}
                onChange={(e) => updateField('maxPages', e.target.value)}
                placeholder="80"
              />

              <div>
                <label className="block text-sm font-medium text-dark-700 mb-1.5">
                  Dados de amostra, estatísticas ou sistemas <span className="text-dark-400 text-xs">(opcional)</span>
                </label>
                <textarea
                  value={form.dbStructure}
                  onChange={(e) => updateField('dbStructure', e.target.value)}
                  className="input-field min-h-[100px] resize-y"
                  placeholder="Cole população/amostra, questões de entrevista, dados estatísticos ou tabelas de software. A IA gerará Gráficos, Tabelas Markdown ou Diagramas UML conforme os dados."
                />
              </div>
            </section>

            {/* Tip */}
            <div className="glass-light rounded-2xl p-4 sm:p-5 flex items-start gap-3">
              <span className="w-9 h-9 rounded-xl bg-amber-50 ring-1 ring-amber-100 text-amber-600 flex items-center justify-center flex-shrink-0">
                <Lightbulb className="w-4.5 h-4.5" />
              </span>
              <p className="text-sm text-dark-600 leading-relaxed">
                <strong className="text-dark-900">Dica:</strong> Quanto mais preciso for o título, melhor é o resultado. A IA preenche o tema e o problema automaticamente — pode editar tudo antes de criar o projecto.
              </p>
            </div>

            {/* Submit */}
            <div className="sticky bottom-24 md:static z-30">
              <Button
                type="submit"
                size="xl"
                fullWidth
                loading={loading}
                disabled={loading || generating}
                rightIcon={ArrowRight}
                leftIcon={Sparkles}
              >
                {loading
                  ? 'A criar projecto…'
                  : generating
                    ? 'A gerar campos com IA…'
                    : `Criar ${form.projectType === 'anteprojecto' ? 'Ante-Projecto' : 'TCC'} — ${form.projectType === 'anteprojecto' ? '15.000' : '35.000'} AOA`}
              </Button>
            </div>
          </form>
        </motion.div>
      </PageLayout>
    </div>
  )
}
