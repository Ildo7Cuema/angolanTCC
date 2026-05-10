import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import { motion } from 'framer-motion'
import {
  Plus, LogOut, FileText, Clock, ChevronRight, Sparkles, FolderOpen,
  ArrowUpCircle, Search, Filter, ShieldCheck, BookOpenCheck, BarChart3, Layers,
} from 'lucide-react'
import toast from 'react-hot-toast'
import Navbar from '../components/Navbar'
import PageLayout from '../components/PageLayout'
import Button from '../components/ui/Button'
import EmptyState from '../components/ui/EmptyState'
import { SkeletonStat, SkeletonCard } from '../components/ui/Skeleton'
import StatCard from '../components/ui/StatCard'
import Tabs from '../components/ui/Tabs'
import BottomSheet from '../components/ui/BottomSheet'

const fadeUp = {
  hidden:  { opacity: 0, y: 12 },
  visible: (i = 0) => ({
    opacity: 1, y: 0, transition: { delay: i * 0.04, duration: 0.4, ease: [0.16, 1, 0.3, 1] },
  }),
}

export default function Dashboard() {
  const { user, signOut } = useAuth()
  const navigate = useNavigate()
  const [projects, setProjects] = useState([])
  const [loading, setLoading] = useState(true)

  const [migrating, setMigrating] = useState(null)
  const [migrationLoading, setMigrationLoading] = useState(false)

  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('all') // all | tcc | anteprojecto | completed

  useEffect(() => {
    let cancelled = false
    const run = async () => {
      if (!user?.id) { setLoading(false); return }
      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
      if (cancelled) return
      if (error) toast.error(`Erro ao carregar projectos: ${error.message}`)
      else setProjects(data || [])
      setLoading(false)
    }
    run()
    return () => { cancelled = true }
  }, [user?.id])

  const fetchProjects = async () => {
    if (!user?.id) { setLoading(false); return }
    const { data, error } = await supabase
      .from('projects')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    if (error) toast.error(`Erro ao carregar projectos: ${error.message}`)
    else setProjects(data || [])
    setLoading(false)
  }

  const handleSignOut = async () => {
    await signOut()
    toast.success('Sessão encerrada')
    navigate('/')
  }

  const formatDate = (s) =>
    new Date(s).toLocaleDateString('pt-AO', { day: '2-digit', month: 'short', year: 'numeric' })

  const isAnteProjecto = (p) => p.sections?.projectType === 'anteprojecto'
  const isSummary      = (p) => !!p.sections?.is_summary
  const hasMigratedTCC = (apId) => projects.some((p) => p.source_project_id === apId && !p.sections?.is_summary)

  const stats = useMemo(() => {
    const total       = projects.length
    const aps         = projects.filter(isAnteProjecto).length
    const tccs        = total - aps
    const completed   = projects.filter((p) => p.status === 'completed').length
    return { total, tccs, aps, completed }
  }, [projects])

  const visibleProjects = useMemo(() => {
    return projects.filter((p) => {
      const titleMatch = !search || (p.title || '').toLowerCase().includes(search.toLowerCase())
      const ap = isAnteProjecto(p)
      let typeMatch = true
      if (filter === 'tcc') typeMatch = !ap
      else if (filter === 'anteprojecto') typeMatch = ap
      else if (filter === 'completed') typeMatch = p.status === 'completed'
      return titleMatch && typeMatch
    })
  }, [projects, search, filter])

  const statusBadge = (status) => {
    const map = {
      draft:      { text: 'Rascunho',  cls: 'badge-warning' },
      generating: { text: 'A gerar…',  cls: 'badge-info' },
      completed:  { text: 'Concluído', cls: 'badge-success' },
    }
    const s = map[status] || map.draft
    return <span className={`badge ${s.cls}`}>{s.text}</span>
  }

  // ── Migration AP → TCC ──────────────────────────────────────────────────
  const confirmMigration = async () => {
    if (!migrating) return
    setMigrationLoading(true)
    const ap = migrating
    const apS = ap.sections || {}

    const inheritedContent = {
      projectType: 'tcc',
      academic_norm: apS.academic_norm || 'ABNT',
      university: apS.university,
      university_city: apS.university_city,
      father_name: apS.father_name,
      mother_name: apS.mother_name,
      other_relatives: apS.other_relatives,
      db_structure: apS.db_structure,
      introducao: apS.introducao || null,
      revisao_literatura: apS.fundamentacao_teorica || null,
      metodologia: apS.metodologia || null,
      referencias: apS.referencias || null,
    }

    const { data: newProject, error: projErr } = await supabase
      .from('projects')
      .insert({
        user_id: user.id,
        title: ap.title, university: ap.university, course: ap.course,
        student_name: ap.student_name, advisor: ap.advisor, topic: ap.topic,
        problem_statement: ap.problem_statement, methodology: ap.methodology, year: ap.year,
        status: 'draft', sections: inheritedContent, source_project_id: ap.id,
      })
      .select().single()

    if (projErr || !newProject) {
      toast.error(`Erro ao criar TCC: ${projErr?.message || 'Tente novamente'}`)
      setMigrationLoading(false); return
    }

    const refCode = 'TCC-' + Math.random().toString(36).substring(2, 7).toUpperCase()
    const { error: payErr } = await supabase.from('payments').insert({
      user_id: user.id, project_id: newProject.id, amount: 35000,
      reference_code: refCode, status: 'pendente',
    })

    if (payErr) {
      toast.error('TCC criado mas erro no pagamento. Aceda ao projecto para resolver.')
      setMigrationLoading(false); setMigrating(null)
      await fetchProjects()
      navigate(`/project/${newProject.id}`)
      return
    }
    toast.success('TCC criado! Efectue o pagamento para continuar.')
    setMigrationLoading(false); setMigrating(null)
    navigate(`/payment/${newProject.id}`)
  }

  // ── Render ──────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen overflow-x-hidden">
      <Navbar
        rightContent={
          <>
            {user?.email === 'ildocuema@gmail.com' && (
              <Link to="/admin" className="hidden sm:inline-flex h-9 px-3 items-center gap-1.5 rounded-lg bg-primary-50 text-primary-600 hover:bg-primary-100 text-xs font-semibold transition-colors">
                <ShieldCheck className="w-4 h-4" /> Admin
              </Link>
            )}
            <span className="hidden md:block text-sm text-dark-500 max-w-[180px] truncate">
              {user?.user_metadata?.full_name || user?.email}
            </span>
            <button
              onClick={handleSignOut}
              className="btn-secondary h-9 px-3 rounded-lg flex items-center gap-1.5 text-xs"
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:inline">Sair</span>
            </button>
          </>
        }
      />

      <PageLayout maxWidth="max-w-6xl">
        {/* ── HEADER ────────────────────────────────────────────────── */}
        <motion.div
          variants={fadeUp} initial="hidden" animate="visible"
          className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-8 sm:mb-10"
        >
          <div>
            <span className="eyebrow mb-3"><Sparkles className="w-3.5 h-3.5" /> WORKSPACE</span>
            <h1 className="mt-3 text-3xl sm:text-4xl font-display font-extrabold tracking-tight text-dark-900">
              Olá, {(user?.user_metadata?.full_name || user?.email || '').split(' ')[0]} 👋
            </h1>
            <p className="text-dark-500 text-sm sm:text-base mt-1.5">
              Gerencie os seus Trabalhos de Conclusão de Curso e Ante-Projectos.
            </p>
          </div>
          <Link to="/new-project" className="hidden sm:inline-flex">
            <Button size="lg" leftIcon={Plus}>Novo Projecto</Button>
          </Link>
        </motion.div>

        {/* ── STATS ─────────────────────────────────────────────────── */}
        <motion.section
          variants={fadeUp} initial="hidden" animate="visible"
          className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-8 sm:mb-10"
        >
          {loading ? (
            <>
              <SkeletonStat /><SkeletonStat /><SkeletonStat /><SkeletonStat />
            </>
          ) : (
            <>
              <StatCard label="Total"        value={stats.total}     icon={Layers}        tone="primary" />
              <StatCard label="TCCs"         value={stats.tccs}      icon={BookOpenCheck} tone="info"    />
              <StatCard label="Ante-Projectos" value={stats.aps}      icon={FileText}      tone="warning" />
              <StatCard label="Concluídos"   value={stats.completed} icon={BarChart3}     tone="success" />
            </>
          )}
        </motion.section>

        {/* ── TOOLBAR ───────────────────────────────────────────────── */}
        <motion.div
          variants={fadeUp} initial="hidden" animate="visible"
          className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between mb-5"
        >
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-dark-400 pointer-events-none" />
            <input
              type="text"
              placeholder="Pesquisar projectos…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="input-field pl-10 h-11"
            />
          </div>

          <div className="flex items-center gap-3 overflow-x-auto scrollbar-hide -mx-1 px-1">
            <Filter className="w-4 h-4 text-dark-400 flex-shrink-0" />
            <Tabs
              size="sm"
              value={filter}
              onChange={setFilter}
              tabs={[
                { id: 'all',          label: 'Todos' },
                { id: 'tcc',          label: 'TCC' },
                { id: 'anteprojecto', label: 'Ante-Projecto' },
                { id: 'completed',    label: 'Concluídos' },
              ]}
            />
          </div>
        </motion.div>

        {/* ── PROJECTS GRID ─────────────────────────────────────────── */}
        {loading ? (
          <div className="grid sm:grid-cols-2 gap-4">
            <SkeletonCard /><SkeletonCard /><SkeletonCard /><SkeletonCard />
          </div>
        ) : visibleProjects.length === 0 ? (
          <EmptyState
            icon={FolderOpen}
            title={projects.length === 0 ? 'Nenhum projecto ainda' : 'Sem resultados'}
            description={projects.length === 0
              ? 'Crie o seu primeiro TCC ou Ante-Projecto com inteligência artificial.'
              : 'Ajuste a pesquisa ou os filtros para encontrar os seus projectos.'}
            action={projects.length === 0 ? (
              <Link to="/new-project">
                <Button size="lg" leftIcon={Sparkles}>Criar primeiro projecto</Button>
              </Link>
            ) : null}
          />
        ) : (
          <motion.div
            variants={fadeUp} initial="hidden" animate="visible"
            className="grid sm:grid-cols-2 gap-3 sm:gap-4"
          >
            {visibleProjects.map((project, i) => {
              const ap = isAnteProjecto(project)
              const summary = isSummary(project)
              const alreadyMigrated = hasMigratedTCC(project.id)
              const isMigratedTCC = !ap && !summary && project.source_project_id

              const tone = summary ? 'rose' : ap ? 'amber' : isMigratedTCC ? 'emerald' : 'primary'
              const toneCls = {
                amber:    { bg: 'bg-amber-50',    fg: 'text-amber-600',    ring: 'ring-amber-100' },
                emerald:  { bg: 'bg-emerald-50',  fg: 'text-emerald-600',  ring: 'ring-emerald-100' },
                primary:  { bg: 'bg-primary-50',  fg: 'text-primary-600',  ring: 'ring-primary-100' },
                rose:     { bg: 'bg-rose-50',     fg: 'text-rose-600',     ring: 'ring-rose-100' },
              }[tone]

              return (
                <motion.div
                  key={project.id}
                  variants={fadeUp}
                  initial="hidden"
                  animate="visible"
                  custom={i}
                  className="relative"
                >
                  <Link
                    to={`/project/${project.id}`}
                    className="premium-card p-4 sm:p-5 flex items-start gap-4 group"
                  >
                    <div className={`flex-shrink-0 w-11 h-11 sm:w-12 sm:h-12 rounded-2xl flex items-center justify-center ring-1 ${toneCls.bg} ${toneCls.fg} ${toneCls.ring}`}>
                      <FileText className="w-5 h-5 sm:w-5.5 sm:h-5.5" />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-start gap-2">
                        <h3 className="font-display font-bold text-dark-900 leading-snug break-words flex-1 min-w-0">
                          {project.title || 'Projecto sem título'}
                        </h3>
                        <ChevronRight className="w-5 h-5 text-dark-300 group-hover:text-primary-500 group-hover:translate-x-0.5 transition-all flex-shrink-0 mt-0.5" />
                      </div>

                      <div className="flex items-center gap-2 mt-2 flex-wrap">
                        <span className={`badge ${summary ? 'bg-rose-50 text-rose-700 border-rose-200' : ap ? 'badge-warning' : isMigratedTCC ? 'badge-success' : 'badge-info'}`}>
                          {summary
                            ? `Resumo · ${project.sections?.summary_level === 'compact' ? 'Compacto' : project.sections?.summary_level === 'light' ? 'Suave' : 'Médio'}`
                            : ap ? 'Ante-Projecto' : isMigratedTCC ? 'TCC (migrado)' : 'TCC'}
                        </span>
                        {statusBadge(project.status)}
                        <span className="text-[11px] text-dark-400 inline-flex items-center gap-1 ml-auto">
                          <Clock className="w-3 h-3" />
                          {formatDate(project.created_at)}
                        </span>
                      </div>

                      {ap && !alreadyMigrated && !summary && (
                        <div className="mt-3">
                          <button
                            onClick={(e) => { e.preventDefault(); e.stopPropagation(); setMigrating(project) }}
                            className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 transition-colors border border-emerald-200"
                          >
                            <ArrowUpCircle className="w-3.5 h-3.5" />
                            Migrar para TCC
                          </button>
                        </div>
                      )}
                      {ap && alreadyMigrated && !summary && (
                        <span className="mt-1.5 text-xs text-dark-400 block">Já migrado</span>
                      )}
                      {summary && (
                        <span className="mt-1.5 text-xs text-rose-500 block">
                          Versão resumida do projecto original
                        </span>
                      )}
                    </div>
                  </Link>
                </motion.div>
              )
            })}
          </motion.div>
        )}
      </PageLayout>

      {/* FAB mobile (substitui CTA do header em ecrãs pequenos) */}
      <Link
        to="/new-project"
        className="sm:hidden fixed bottom-24 right-4 z-30 w-14 h-14 rounded-2xl bg-gradient-to-br from-primary-600 to-accent-600 text-white flex items-center justify-center shadow-glow active:scale-95 transition-transform pb-safe"
        aria-label="Novo Projecto"
      >
        <Plus className="w-6 h-6" />
      </Link>

      {/* Migration Bottom Sheet */}
      <BottomSheet
        open={!!migrating}
        onClose={() => !migrationLoading && setMigrating(null)}
        title="Migrar para TCC"
        description="Será criado um novo TCC com base no ante-projecto seleccionado."
        footer={
          <div className="flex gap-2.5">
            <Button
              variant="secondary" fullWidth
              onClick={() => !migrationLoading && setMigrating(null)}
              disabled={migrationLoading}
            >Cancelar</Button>
            <Button
              variant="success" fullWidth
              onClick={confirmMigration}
              loading={migrationLoading}
              leftIcon={ArrowUpCircle}
            >Confirmar</Button>
          </div>
        }
      >
        <p className="text-dark-700 font-medium text-sm mb-4 truncate">
          "{migrating?.title}"
        </p>
        <ul className="space-y-2.5 text-sm text-dark-600">
          {[
            'Metadados herdados (título, tema, curso, orientador)',
            'Conteúdo reutilizável copiado (introdução, fundamentação, metodologia, referências)',
            'O ante-projecto original permanece intacto',
          ].map((t) => (
            <li key={t} className="flex items-start gap-2">
              <span className="w-5 h-5 rounded-full bg-success-50 ring-1 ring-success-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="w-2 h-2 rounded-full bg-success-500" />
              </span>
              {t}
            </li>
          ))}
        </ul>
        <div className="mt-4 p-3 rounded-xl bg-amber-50 border border-amber-200 text-sm text-amber-800">
          Será necessário pagar <strong>35.000 AOA</strong> para liberar o novo TCC.
        </div>
      </BottomSheet>
    </div>
  )
}
