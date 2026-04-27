import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Plus,
  GraduationCap,
  LogOut,
  FileText,
  Clock,
  ChevronRight,
  Sparkles,
  FolderOpen,
  ArrowUpCircle,
  X,
  AlertTriangle,
} from 'lucide-react'
import toast from 'react-hot-toast'
import Navbar from '../components/Navbar'

const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  visible: (i = 0) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.05, duration: 0.4 },
  }),
}

export default function Dashboard() {
  const { user, signOut } = useAuth()
  const navigate = useNavigate()
  const [projects, setProjects] = useState([])
  const [loading, setLoading] = useState(true)
  const [migratingProject, setMigratingProject] = useState(null)
  const [migrationLoading, setMigrationLoading] = useState(false)

  useEffect(() => {
    fetchProjects()
  }, [])

  const fetchProjects = async () => {
    if (!user?.id) {
      setLoading(false)
      return
    }

    const { data, error } = await supabase
      .from('projects')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching projects:', {
        message: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code,
      })
      toast.error(`Erro ao carregar projectos: ${error.message}`)
    } else {
      setProjects(data || [])
    }
    setLoading(false)
  }

  const handleSignOut = async () => {
    await signOut()
    toast.success('Sessão encerrada')
    navigate('/')
  }

  const formatDate = (dateStr) => {
    return new Date(dateStr).toLocaleDateString('pt-AO', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    })
  }

  const statusLabel = (status) => {
    const map = {
      draft: { text: 'Rascunho', className: 'badge-warning' },
      generating: { text: 'A gerar...', className: 'badge-info' },
      completed: { text: 'Concluído', className: 'badge-success' },
    }
    const s = map[status] || map.draft
    return <span className={`badge ${s.className}`}>{s.text}</span>
  }

  const isAnteProjecto = (project) =>
    project.sections?.projectType === 'anteprojecto'

  const hasMigratedTCC = (anteProjectoId) =>
    projects.some((p) => p.source_project_id === anteProjectoId)

  const handleMigrateClick = (e, project) => {
    e.preventDefault()
    e.stopPropagation()
    setMigratingProject(project)
  }

  const confirmMigration = async () => {
    if (!migratingProject) return
    setMigrationLoading(true)

    const ap = migratingProject
    const apSections = ap.sections || {}

    const inheritedContent = {
      projectType: 'tcc',
      academic_norm: apSections.academic_norm || 'ABNT',
      university: apSections.university,
      university_city: apSections.university_city,
      father_name: apSections.father_name,
      mother_name: apSections.mother_name,
      other_relatives: apSections.other_relatives,
      db_structure: apSections.db_structure,
      introducao: apSections.introducao || null,
      revisao_literatura: apSections.fundamentacao_teorica || null,
      metodologia: apSections.metodologia || null,
      referencias: apSections.referencias || null,
    }

    const { data: newProject, error: projErr } = await supabase
      .from('projects')
      .insert({
        user_id: user.id,
        title: ap.title,
        university: ap.university,
        course: ap.course,
        student_name: ap.student_name,
        advisor: ap.advisor,
        topic: ap.topic,
        problem_statement: ap.problem_statement,
        methodology: ap.methodology,
        year: ap.year,
        status: 'draft',
        sections: inheritedContent,
        source_project_id: ap.id,
      })
      .select()
      .single()

    if (projErr || !newProject) {
      toast.error(`Erro ao criar TCC: ${projErr?.message || 'Tente novamente'}`)
      setMigrationLoading(false)
      return
    }

    const refCode = 'TCC-' + Math.random().toString(36).substring(2, 7).toUpperCase()
    const { error: payErr } = await supabase.from('payments').insert({
      user_id: user.id,
      project_id: newProject.id,
      amount: 35000,
      reference_code: refCode,
      status: 'pendente',
    })

    if (payErr) {
      toast.error('TCC criado mas erro no pagamento. Aceda ao projecto para resolver.')
      setMigrationLoading(false)
      setMigratingProject(null)
      await fetchProjects()
      navigate(`/project/${newProject.id}`)
      return
    }

    toast.success('TCC criado com sucesso! Efectue o pagamento para continuar.')
    setMigrationLoading(false)
    setMigratingProject(null)
    navigate(`/payment/${newProject.id}`)
  }

  return (
    <div className="min-h-screen overflow-x-hidden">
      {/* Top bar */}
      <Navbar
        rightContent={
          <div className="flex items-center gap-3">
            {user?.email === 'ildocuema@gmail.com' && (
              <Link
                to="/admin"
                className="text-sm px-3 py-1.5 bg-indigo-50 text-indigo-600 hover:bg-indigo-100 rounded-lg font-medium transition-colors"
              >
                Painel Admin
              </Link>
            )}
            <span className="text-sm text-slate-500 hidden sm:block">
              {user?.user_metadata?.full_name || user?.email}
            </span>
            <button
              onClick={handleSignOut}
              className="btn-secondary text-sm px-3 py-2 rounded-lg flex items-center gap-2"
            >
              <LogOut className="w-4 h-4" /> Sair
            </button>
          </div>
        }
      />

      <main className="max-w-5xl mx-auto px-4 sm:px-6 pt-24 pb-12 w-full min-w-0">
        {/* Header */}
        <motion.div
          variants={fadeUp}
          initial="hidden"
          animate="visible"
          className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8"
        >
          <div>
            <h1 className="text-3xl font-display font-bold text-slate-900">Meus Projectos</h1>
            <p className="text-slate-500 text-sm mt-1">
              Gerencie os seus Trabalhos de Conclusão de Curso e Ante-Projectos.
            </p>
          </div>
          <Link
            to="/new-project"
            className="btn-primary px-5 py-3 rounded-xl flex items-center gap-2 text-sm w-fit"
          >
            <Plus className="w-4 h-4" /> Novo Projecto
          </Link>
        </motion.div>

        {/* Projects */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="loading-spinner" />
          </div>
        ) : projects.length === 0 ? (
          <motion.div
            variants={fadeUp}
            initial="hidden"
            animate="visible"
            className="glass-card rounded-2xl p-12 text-center"
          >
            <FolderOpen className="w-16 h-16 text-slate-300 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-slate-800 mb-2">Nenhum projecto ainda</h2>
            <p className="text-slate-500 mb-6 text-sm">
              Comece a criar o seu primeiro TCC com inteligência artificial.
            </p>
            <Link
              to="/new-project"
              className="btn-primary px-6 py-3 rounded-xl inline-flex items-center gap-2"
            >
              <Sparkles className="w-4 h-4" /> Criar Projecto
            </Link>
          </motion.div>
        ) : (
          <div className="grid gap-4">
            {projects.map((project, i) => {
              const isAP = isAnteProjecto(project)
              const alreadyMigrated = hasMigratedTCC(project.id)
              const isMigratedTCC = !isAP && project.source_project_id

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
                    className="glass-card rounded-xl p-4 flex items-start gap-3 group w-full min-w-0"
                  >
                    {/* Icon */}
                    <div className="flex-shrink-0 mt-0.5">
                      <div
                        className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                          isAP
                            ? 'bg-amber-50'
                            : isMigratedTCC
                            ? 'bg-emerald-50'
                            : 'bg-indigo-50'
                        }`}
                      >
                        <FileText
                          className={`w-5 h-5 ${
                            isAP
                              ? 'text-amber-500'
                              : isMigratedTCC
                              ? 'text-emerald-500'
                              : 'text-indigo-600'
                          }`}
                        />
                      </div>
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start gap-2">
                        <h3 className="font-semibold text-slate-900 leading-snug break-words flex-1 min-w-0">
                          {project.title || 'Projecto sem título'}
                        </h3>
                        <ChevronRight className="w-5 h-5 text-slate-400 group-hover:text-indigo-500 transition-colors flex-shrink-0 mt-0.5" />
                      </div>

                      <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                        <span
                          className={`badge ${
                            isAP
                              ? 'badge-warning'
                              : isMigratedTCC
                              ? 'badge-success'
                              : 'badge-info'
                          }`}
                        >
                          {isAP ? 'Ante-Projecto' : isMigratedTCC ? 'TCC (migrado)' : 'TCC'}
                        </span>
                        <span className="text-xs text-slate-400 flex items-center gap-1">
                          <Clock className="w-3 h-3 flex-shrink-0" />
                          {formatDate(project.created_at)}
                        </span>
                        {statusLabel(project.status)}
                      </div>

                      {isAP && !alreadyMigrated && (
                        <div className="mt-2.5">
                          <button
                            onClick={(e) => handleMigrateClick(e, project)}
                            className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-600 hover:bg-emerald-100 transition-colors border border-emerald-200"
                          >
                            <ArrowUpCircle className="w-3.5 h-3.5" />
                            Migrar p/ TCC
                          </button>
                        </div>
                      )}
                      {isAP && alreadyMigrated && (
                        <span className="mt-1.5 text-xs text-slate-400 block">Já migrado</span>
                      )}
                    </div>
                  </Link>
                </motion.div>
              )
            })}
          </div>
        )}
      </main>

      {/* Migration Modal */}
      <AnimatePresence>
        {migratingProject && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
            onClick={() => !migrationLoading && setMigratingProject(null)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={(e) => e.stopPropagation()}
              className="glass-card rounded-2xl p-6 max-w-md w-full"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="w-12 h-12 rounded-xl bg-emerald-50 flex items-center justify-center flex-shrink-0">
                  <ArrowUpCircle className="w-6 h-6 text-emerald-500" />
                </div>
                <button
                  onClick={() => !migrationLoading && setMigratingProject(null)}
                  className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <h2 className="text-lg font-display font-bold text-slate-900 mb-2">
                Migrar para TCC
              </h2>
              <p className="text-slate-500 text-sm mb-1">
                Será criado um novo TCC com base no ante-projecto:
              </p>
              <p className="text-slate-800 font-medium text-sm mb-4 truncate">
                "{migratingProject.title}"
              </p>

              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 mb-5 space-y-2 text-sm text-slate-600">
                <div className="flex items-start gap-2">
                  <span className="text-emerald-500 font-bold mt-0.5">✓</span>
                  <span>Metadados herdados (título, tema, curso, orientador)</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-emerald-500 font-bold mt-0.5">✓</span>
                  <span>Conteúdo reutilizável copiado (introdução, fundamentação, metodologia, referências)</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-emerald-500 font-bold mt-0.5">✓</span>
                  <span>O ante-projecto original permanece intacto</span>
                </div>
                <div className="flex items-start gap-2 pt-1 border-t border-slate-200">
                  <span className="text-amber-600">
                    Será necessário efectuar o pagamento de <strong>35.000 AOA</strong> para o TCC.
                  </span>
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => !migrationLoading && setMigratingProject(null)}
                  disabled={migrationLoading}
                  className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors text-sm font-medium disabled:opacity-50"
                >
                  Cancelar
                </button>
                <button
                  onClick={confirmMigration}
                  disabled={migrationLoading}
                  className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-sm transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {migrationLoading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      A migrar...
                    </>
                  ) : (
                    <>
                      <ArrowUpCircle className="w-4 h-4" />
                      Confirmar Migração
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
