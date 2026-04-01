import { useState, useCallback, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import { invokeEdgeFunction } from '../lib/edgeFunctions'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ArrowLeft,
  Sparkles,
  BookOpen,
  GraduationCap,
  Building2,
  User,
  FileText,
  Lightbulb,
  RefreshCw,
  Wand2,
  CheckCircle2,
  ClipboardList,
} from 'lucide-react'
import toast from 'react-hot-toast'

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4 } },
}

// Universidades organizadas por Província
const angolianUniversitiesByProvince = {
  'Luanda': [
    'Universidade Agostinho Neto (UAN)',
    'Universidade Lusíada de Angola (ULA)',
    'Universidade Metodista de Angola (UMA)',
    'Universidade Católica de Angola (UCAN)',
    'Universidade Jean Piaget de Angola',
    'Universidade Privada de Angola (UPRA)',
    'Universidade Óscar Ribas (UÓR)',
    'Universidade de Belas (UNIBELAS)',
    'Universidade Técnica de Angola (UTANGA)',
    'Universidade Independente de Angola (UNIA)',
    'Instituto Superior Politécnico Gregório Semedo (IGS)',
    'Instituto Superior Politécnico de Tecnologias e Ciências (ISPTEC)',
    'Instituto Superior de Ciências Sociais e Relações Internacionais (CISSRI)',
    'Instituto Superior de Gestão e Administração de Luanda (ISGAL)',
    'Instituto Superior de Ciências de Educação de Luanda (ISCED-Luanda)',
    'Instituto Superior de Serviço Social (ISSS)',
    'Escola Superior Pedagógica do Bengo',
  ],
  'Huíla': [
    'Universidade Mandume ya Ndemofayo (UMN)',
    'Instituto Superior Politécnico da Huíla (ISPH)',
    'Instituto Superior de Ciências de Educação da Huíla (ISCED-Huíla)',
    'Instituto Superior de Tecnologia de Lubango (ISTL)',
    'Instituto Superior Politécnico Independente da Huíla (ISPIH)',
  ],
  'Huambo': [
    'Universidade José Eduardo dos Santos (UJES) – Huambo',
    'Instituto Superior de Ciências de Educação do Huambo (ISCED-Huambo)',
    'Instituto Superior Politécnico do Huambo (ISPH-Huambo)',
    'Instituto Superior Técnico de Engenharia do Huambo (ISTEH)',
  ],
  'Benguela': [
    'Universidade Katyavala Bwila (UKB)',
    'Instituto Superior de Ciências de Educação de Benguela (ISCED-Benguela)',
    'Instituto Superior Politécnico de Benguela (ISPB)',
    'Instituto Superior de Ciências da Saúde de Benguela (ISCISAB)',
  ],
  'Uíge': [
    'Universidade Kimpa Vita (UKV)',
    'Instituto Superior de Ciências de Educação do Uíge (ISCED-Uíge)',
    'Instituto Superior Politécnico do Uíge (ISPU)',
  ],
  'Namibe': [
    'Instituto Superior Politécnico do Namibe (ISPN)',
    'Instituto Superior de Ciências de Educação do Namibe (ISCED-Namibe)',
    'Instituto Superior de Tecnologia do Namibe (ISTN)',
  ],
  'Cabinda': [
    'Instituto Superior Politécnico de Cabinda (ISPDC)',
    'Instituto Superior de Ciências de Educação de Cabinda (ISCED-Cabinda)',
  ],
  'Cunene': [
    'Universidade Ondjiva (UO)',
    'Instituto Superior Politécnico do Cunene (ISPC)',
  ],
  'Lunda Norte / Lunda Sul': [
    'Instituto Superior Politécnico do Dundo (ISPD)',
    'Instituto Superior de Ciências de Educação da Lunda Norte (ISCED-Lunda Norte)',
  ],
  'Malanje': [
    'Instituto Superior Politécnico de Malanje (ISPM)',
    'Instituto Superior de Ciências de Educação de Malanje (ISCED-Malanje)',
  ],
  'Moxico': [
    'Instituto Superior Politécnico do Moxico (ISPMO)',
    'Instituto Superior de Ciências de Educação do Moxico (ISCED-Moxico)',
  ],
  'Outra': ['Outra'],
}

const angolianUniversities = Object.values(angolianUniversitiesByProvince).flat()

const courses = [
  'Engenharia Informática',
  'Ciências da Computação',
  'Direito',
  'Economia',
  'Gestão de Empresas',
  'Contabilidade e Auditoria',
  'Psicologia',
  'Sociologia',
  'Comunicação Social',
  'Enfermagem',
  'Medicina',
  'Arquitectura',
  'Engenharia Civil',
  'Engenharia Electrónica',
  'Outro',
]

function traduzirErroIA(detail) {
  const message = String(detail || '').trim()
  const normalized = message.toLowerCase()

  if (!message) return 'Erro desconhecido ao gerar conteúdo com IA.'
  if (normalized.includes('invalid x-api-key')) {
    return 'Chave da IA inválida no servidor. Actualize o secret ANTHROPIC_API_KEY e faça novo deploy da função.'
  }
  if (
    normalized.includes('insufficient_quota') ||
    normalized.includes('quota') ||
    normalized.includes('credit balance is too low')
  ) {
    return 'Saldo/quota insuficiente na conta da IA. Verifique a facturação da Anthropic.'
  }
  if (normalized.includes('model') && normalized.includes('not found')) {
    return 'Modelo da IA indisponível para esta chave. Ajuste o modelo na Edge Function e faça deploy.'
  }
  if (normalized.includes('rate limit') || normalized.includes('too many requests')) {
    return 'Muitas tentativas em pouco tempo. Aguarde alguns segundos e tente novamente.'
  }

  return message
}

// Shimmer skeleton component
function SkeletonLines({ lines = 3 }) {
  return (
    <div className="space-y-2 py-1">
      {Array.from({ length: lines }).map((_, i) => (
        <div
          key={i}
          className="h-3.5 rounded-full bg-white/10 animate-pulse"
          style={{ width: i === lines - 1 ? '60%' : '100%' }}
        />
      ))}
    </div>
  )
}

// AI badge component
function AIBadge({ onRegenerate, loading }) {
  return (
    <div className="flex items-center justify-between mt-2">
      <span className="inline-flex items-center gap-1.5 text-xs font-medium text-primary-400 bg-primary-400/10 px-2.5 py-1 rounded-full border border-primary-400/20">
        <Wand2 className="w-3 h-3" />
        Gerado por IA
      </span>
      <button
        type="button"
        onClick={onRegenerate}
        disabled={loading}
        className="inline-flex items-center gap-1.5 text-xs text-dark-400 hover:text-white transition-colors disabled:opacity-40"
      >
        <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
        Regenerar
      </button>
    </div>
  )
}

export default function NewProject() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [aiGenerated, setAiGenerated] = useState(false)

  const [form, setForm] = useState({
    title: '',
    university: '',
    customUniversity: '',
    academicNorm: 'ABNT',
    projectType: 'tcc', // 'tcc' or 'anteprojecto'
    dbStructure: '',
    course: '',
    customCourse: '',
    studentName: user?.user_metadata?.full_name || '',
    advisor: '',
    topic: '',
    problemStatement: '',
    methodology: '',
    year: new Date().getFullYear().toString(),
    maxPages: 80,
  })

  const [dbUniversities, setDbUniversities] = useState([])
  const [universityCityMap, setUniversityCityMap] = useState({})

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

  const updateField = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  // ─── AI generation via Supabase Edge Function (Claude) ─────────────────────
  const generateWithAI = useCallback(async (title) => {
    if (!title || title.trim().length < 10) return

    setGenerating(true)
    setAiGenerated(false)

    const prompt = `Você é um especialista académico angolano em orientação de Trabalhos de Conclusão de Curso (TCC).

Com base no título do TCC abaixo, gera em Português de Angola (pré-Acordo Ortográfico, DESCARTANDO totalmente o Novo Acordo Ortográfico da Língua Portuguesa, escrevendo por exemplo: "objectivo", "projecto", "acção") (sem usar "você", use "o estudante"):

TÍTULO: "${title}"

Responde APENAS com um JSON válido no seguinte formato, sem texto extra:
{
  "topic": "Descrição detalhada do tema em 2-3 parágrafos. Explica o contexto académico, a relevância no contexto angolano e os principais conceitos abordados.",
  "problemStatement": "Um parágrafo que define claramente o problema central de investigação: o que existe de lacunoso ou problemático na realidade que justifica este estudo."
}`

    try {
      const { data: sessionData } = await supabase.auth.getSession()
      const token = sessionData?.session?.access_token
      if (!token) {
        toast.error('Inicia sessão para usar a geração com IA.')
        setGenerating(false)
        return
      }

      const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || ''
      const data = await invokeEdgeFunction(
        'generate-tcc-fields',
        { prompt },
        token,
        anonKey,
      )

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
      toast.success('✨ Campos gerados pela IA com sucesso!')
    } catch (err) {
      const detail = err?.message || String(err)
      const detailEmPt = traduzirErroIA(detail)
      toast.error(
        detailEmPt.length > 140
          ? 'Não foi possível gerar com IA. Verifica rede, deploy da função e sessão.'
          : `IA: ${detailEmPt}`,
      )
      console.error('Falha na geração com IA:', err)
    }

    setGenerating(false)
  }, [])

  const handleTitleBlur = () => {
    if (form.title.trim().length >= 10 && !form.topic) {
      generateWithAI(form.title)
    }
  }

  const handleRegenerate = () => {
    if (form.title.trim().length >= 10) {
      generateWithAI(form.title)
    } else {
      toast.error('Escreve um título com pelo menos 10 caracteres primeiro.')
    }
  }

  // Derive city from university name for the static list (when DB has no city)
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
  // ────────────────────────────────────────────────────────────────────────────

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (!form.title || !form.university || (form.university === 'Outra' && !form.customUniversity) || !form.course || (form.course === 'Outro' && !form.customCourse) || !form.topic) {
      toast.error('Preencha os campos obrigatórios: Título, Universidade, Curso e Tema.')
      return
    }

    setLoading(true)

    // Determine city for the cover page
    const selectedUniversity = form.university === 'Outra' ? form.customUniversity : form.university
    const universityCity = universityCityMap[selectedUniversity] || deriveCityFromProvince(selectedUniversity)

    const { data, error } = await supabase
      .from('projects')
      .insert({
        user_id: user.id,
        title: form.title,
        university: form.university === 'Outra' ? form.customUniversity : form.university,
        course: form.course === 'Outro' ? form.customCourse : form.course,
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
      .select()
      .single()

    if (error) {
      toast.error('Erro ao criar projecto: ' + error.message)
      setLoading(false)
      return
    }

    const refCode = 'TCC-' + Math.random().toString(36).substring(2, 7).toUpperCase()
    
    const { error: payErr } = await supabase.from('payments').insert({
      user_id: user.id,
      project_id: data.id,
      amount: 55000,
      reference_code: refCode,
      status: 'pendente'
    })

    if (payErr) {
      toast.error('Projecto criado com erro no pagamento associado. Tente gerar depois.')
    } else {
      toast.success('Projecto criado! Complete o pagamento para iniciar a geração com IA.')
    }
    
    navigate(`/payment/${data.id}`)
  }

  return (
    <div className="min-h-screen">
      {/* Top bar */}
      <header className="glass fixed top-0 left-0 right-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-3 flex items-center gap-4">
          <Link
            to="/dashboard"
            className="flex items-center gap-2 text-dark-400 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            <span className="text-sm font-medium">Voltar</span>
          </Link>
          <div className="h-5 w-px bg-white/10" />
          <span className="text-sm font-medium text-dark-300">Novo Projecto</span>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-6 pt-24 pb-12">
        <motion.div variants={fadeUp} initial="hidden" animate="visible">
          <div className="mb-8">
            <h1 className="text-3xl font-display font-bold flex items-center gap-3">
              <Sparkles className="w-8 h-8 text-primary-400" />
              Criar Novo Projecto
            </h1>
            <p className="text-dark-400 mt-2 text-sm">
              Seleccione o tipo de trabalho. A IA irá gerar automaticamente o tema, o problema de
              investigação e todas as secções do documento.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Tipo de Projecto */}
            <div className="glass-card rounded-2xl p-6">
              <h2 className="text-lg font-semibold flex items-center gap-2 mb-4">
                <ClipboardList className="w-5 h-5 text-primary-400" />
                Tipo de Trabalho Académico
              </h2>
              <div className="grid sm:grid-cols-2 gap-4">
                <button
                  type="button"
                  onClick={() => updateField('projectType', 'tcc')}
                  className={`relative flex flex-col items-start gap-2 rounded-xl p-4 border-2 transition-all text-left ${
                    form.projectType === 'tcc'
                      ? 'border-primary-500 bg-primary-500/10 text-white'
                      : 'border-white/10 bg-white/5 text-dark-400 hover:border-white/20'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <GraduationCap className={`w-5 h-5 ${form.projectType === 'tcc' ? 'text-primary-400' : 'text-dark-500'}`} />
                    <span className="font-semibold text-sm">TCC / Monografia</span>
                  </div>
                  <p className="text-xs opacity-70">
                    Trabalho de Conclusão de Curso completo com todos os capítulos: introdução, revisão de literatura, metodologia, resultados e conclusão.
                  </p>
                  {form.projectType === 'tcc' && (
                    <CheckCircle2 className="absolute top-3 right-3 w-4 h-4 text-primary-400" />
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => updateField('projectType', 'anteprojecto')}
                  className={`relative flex flex-col items-start gap-2 rounded-xl p-4 border-2 transition-all text-left ${
                    form.projectType === 'anteprojecto'
                      ? 'border-accent-500 bg-accent-500/10 text-white'
                      : 'border-white/10 bg-white/5 text-dark-400 hover:border-white/20'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <FileText className={`w-5 h-5 ${form.projectType === 'anteprojecto' ? 'text-accent-400' : 'text-dark-500'}`} />
                    <span className="font-semibold text-sm">Ante-Projecto</span>
                  </div>
                  <p className="text-xs opacity-70">
                    Proposta de investigação prévia ao TCC com justificativa, fundamentação teórica, metodologia proposta, cronograma e orçamento.
                  </p>
                  {form.projectType === 'anteprojecto' && (
                    <CheckCircle2 className="absolute top-3 right-3 w-4 h-4 text-accent-400" />
                  )}
                </button>
              </div>
            </div>

            {/* Work info */}
            <div className="glass-card rounded-2xl p-6 space-y-5">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <FileText className="w-5 h-5 text-primary-400" />
                Informações do Trabalho
              </h2>

              {/* Title — triggers AI generation on blur */}
              <div>
                <label className="block text-sm font-medium text-dark-300 mb-1.5">
                  Título do {form.projectType === 'anteprojecto' ? 'Ante-Projecto' : 'TCC'} <span className="text-red-400">*</span>
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={form.title}
                    onChange={(e) => updateField('title', e.target.value)}
                    onBlur={handleTitleBlur}
                    className="input-field pr-10"
                    placeholder="Ex: O Impacto da IA na Educação em Angola"
                  />
                  <AnimatePresence>
                    {aiGenerated && !generating && (
                      <motion.span
                        initial={{ opacity: 0, scale: 0.5 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0 }}
                        className="absolute right-3 top-1/2 -translate-y-1/2"
                      >
                        <CheckCircle2 className="w-5 h-5 text-green-400" />
                      </motion.span>
                    )}
                  </AnimatePresence>
                </div>
                <p className="text-xs text-dark-500 mt-1.5">
                  Sai do campo após escrever para a IA gerar os campos abaixo automaticamente.
                </p>
              </div>

              {/* Tema / Descrição — AI-powered */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-sm font-medium text-dark-300">
                    Tema / Descrição do Tema <span className="text-red-400">*</span>
                  </label>
                  {generating && (
                    <span className="inline-flex items-center gap-1.5 text-xs text-primary-400 animate-pulse">
                      <Wand2 className="w-3.5 h-3.5" />
                      A gerar...
                    </span>
                  )}
                </div>

                {generating ? (
                  <div className="input-field min-h-[120px]">
                    <SkeletonLines lines={5} />
                  </div>
                ) : (
                  <textarea
                    value={form.topic}
                    onChange={(e) => updateField('topic', e.target.value)}
                    className="input-field min-h-[120px] resize-y transition-all"
                    placeholder="Descreva detalhadamente o tema. A IA irá preencher este campo automaticamente após escreveres o título."
                  />
                )}

                {aiGenerated && !generating && (
                  <AIBadge onRegenerate={handleRegenerate} loading={generating} />
                )}
              </div>

              {/* Problema de Investigação — AI-powered */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-sm font-medium text-dark-300">
                    Problema de Investigação
                  </label>
                  {generating && (
                    <span className="inline-flex items-center gap-1.5 text-xs text-primary-400 animate-pulse">
                      <Wand2 className="w-3.5 h-3.5" />
                      A gerar...
                    </span>
                  )}
                </div>

                {generating ? (
                  <div className="input-field min-h-[90px]">
                    <SkeletonLines lines={3} />
                  </div>
                ) : (
                  <textarea
                    value={form.problemStatement}
                    onChange={(e) => updateField('problemStatement', e.target.value)}
                    className="input-field min-h-[90px] resize-y transition-all"
                    placeholder="(Opcional) Qual é o problema central que o seu trabalho pretende resolver?"
                  />
                )}

                {aiGenerated && !generating && (
                  <AIBadge onRegenerate={handleRegenerate} loading={generating} />
                )}
              </div>

              {/* Metodologia */}
              <div>
                <label className="block text-sm font-medium text-dark-300 mb-1.5">
                  Metodologia Preferida
                </label>
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
            </div>

            {/* Academic info */}
            <div className="glass-card rounded-2xl p-6 space-y-5">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <GraduationCap className="w-5 h-5 text-primary-400" />
                Informações Académicas
              </h2>

              <div className="grid sm:grid-cols-2 gap-5 mb-2">
                <div>
                  <label className="block text-sm font-medium text-dark-300 mb-1.5">
                    Norma Académica <span className="text-red-400">*</span>
                  </label>
                  <select
                    value={form.academicNorm}
                    onChange={(e) => updateField('academicNorm', e.target.value)}
                    className="input-field"
                  >
                    <option value="ABNT">ABNT (Recomendado)</option>
                    <option value="APA">APA</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-dark-300 mb-1.5">
                    Ano
                  </label>
                  <input
                    type="number"
                    value={form.year}
                    onChange={(e) => updateField('year', e.target.value)}
                    className="input-field w-full"
                    placeholder="2026"
                  />
                </div>
              </div>

              <div className="grid sm:grid-cols-2 gap-5">
                <div>
                  <label className="block text-sm font-medium text-dark-300 mb-1.5">
                    Universidade <span className="text-red-400">*</span>
                  </label>
                  <select
                    value={form.university}
                    onChange={(e) => updateField('university', e.target.value)}
                    className="input-field"
                  >
                    <option value="">Seleccionar universidade</option>
                    {dbUniversities.length > 0 ? (
                      dbUniversities.map((u) => (
                        <option key={u} value={u}>{u}</option>
                      ))
                    ) : (
                      Object.entries(angolianUniversitiesByProvince).map(([province, unis]) => (
                        <optgroup key={province} label={`— ${province} —`}>
                          {unis.map((u) => (
                            <option key={u} value={u}>{u}</option>
                          ))}
                        </optgroup>
                      ))
                    )}
                  </select>
                  {form.university === 'Outra' && (
                    <input
                      type="text"
                      value={form.customUniversity}
                      onChange={(e) => updateField('customUniversity', e.target.value)}
                      className="input-field mt-3"
                      placeholder="Digite o nome da Universidade"
                    />
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-dark-300 mb-1.5">
                    Curso <span className="text-red-400">*</span>
                  </label>
                  <select
                    value={form.course}
                    onChange={(e) => updateField('course', e.target.value)}
                    className="input-field"
                  >
                    <option value="">Seleccionar curso</option>
                    {courses.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                  {form.course === 'Outro' && (
                    <input
                      type="text"
                      value={form.customCourse}
                      onChange={(e) => updateField('customCourse', e.target.value)}
                      className="input-field mt-3"
                      placeholder="Digite o nome do Curso"
                    />
                  )}
                </div>
              </div>

              <div className="grid sm:grid-cols-2 gap-5">
                <div>
                  <label className="block text-sm font-medium text-dark-300 mb-1.5">
                    Nome do Estudante
                  </label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-dark-500" />
                    <input
                      type="text"
                      value={form.studentName}
                      onChange={(e) => updateField('studentName', e.target.value)}
                      className="input-field pl-10"
                      placeholder="Seu nome"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-dark-300 mb-1.5">
                    Orientador
                  </label>
                  <div className="relative">
                    <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-dark-500" />
                    <input
                      type="text"
                      value={form.advisor}
                      onChange={(e) => updateField('advisor', e.target.value)}
                      className="input-field pl-10"
                      placeholder="Nome do orientador (opcional)"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-dark-300 mb-1.5">
                  Nº Máximo de Páginas
                </label>
                <input
                  type="number"
                  min="10"
                  max="120"
                  value={form.maxPages}
                  onChange={(e) => updateField('maxPages', e.target.value)}
                  className="input-field w-full"
                  placeholder="80"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-dark-300 mb-1.5">
                  Dados da Amostra, Estatísticas ou Sistemas (Opcional)
                </label>
                <textarea
                  value={form.dbStructure}
                  onChange={(e) => updateField('dbStructure', e.target.value)}
                  className="input-field min-h-[90px] resize-y transition-all"
                  placeholder="Cole aqui a contagem da população/amostra, questões das entrevistas, dados estatísticos ou até tabelas de Software. A IA gerará Gráficos (Pizza, Barras), Tabelas Markdown ou Diagramas UML consoante os dados."
                />
              </div>
            </div>

            {/* Tip */}
            <div className="glass-light rounded-xl p-4 flex items-start gap-3">
              <Lightbulb className="w-5 h-5 text-yellow-400 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-dark-300">
                <strong className="text-dark-200">Dica:</strong> A IA gera o Tema e o Problema de
                Investigação automaticamente. Podes editar os textos gerados antes de criar o TCC.
                Quanto mais preciso for o título, melhor será o resultado.
              </p>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading || generating}
              className="btn-primary w-full py-4 rounded-xl flex items-center justify-center gap-2 text-lg disabled:opacity-50"
            >
              {loading ? (
                <>
                  <div className="loading-spinner w-5 h-5 border-2" />
                  A criar projecto...
                </>
              ) : generating ? (
                <>
                  <Wand2 className="w-5 h-5 animate-pulse" />
                  A gerar campos com IA...
                </>
              ) : (
                <>
                  <Sparkles className="w-5 h-5" />
                  {form.projectType === 'anteprojecto' ? 'Criar Ante-Projecto' : 'Criar TCC'} — Avançar para Pagamento
                </>
              )}
            </button>
          </form>
        </motion.div>
      </main>
    </div>
  )
}
