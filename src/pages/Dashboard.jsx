import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import { motion } from 'framer-motion'
import {
  Plus,
  GraduationCap,
  LogOut,
  FileText,
  Clock,
  ChevronRight,
  Sparkles,
  FolderOpen,
} from 'lucide-react'
import toast from 'react-hot-toast'

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
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
      draft: { text: 'Rascunho', color: 'text-yellow-400 bg-yellow-400/10' },
      generating: { text: 'A gerar...', color: 'text-blue-400 bg-blue-400/10' },
      completed: { text: 'Concluído', color: 'text-green-400 bg-green-400/10' },
    }
    const s = map[status] || map.draft
    return (
      <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${s.color}`}>
        {s.text}
      </span>
    )
  }

  return (
    <div className="min-h-screen">
      {/* Top bar */}
      <header className="glass fixed top-0 left-0 right-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-3 flex items-center justify-between">
          <Link to="/dashboard" className="flex items-center gap-2">
            <GraduationCap className="w-7 h-7 text-primary-400" />
            <span className="text-lg font-display font-bold gradient-text">AngolaTCC AI</span>
          </Link>
          <div className="flex items-center gap-4">
            {user?.email === 'ildocuema@gmail.com' && (
              <Link
                to="/admin"
                className="text-sm px-3 py-1.5 bg-primary-500/10 text-primary-400 hover:bg-primary-500/20 rounded-lg font-medium transition-colors"
              >
                Painel Admin
              </Link>
            )}
            <span className="text-sm text-dark-400 hidden sm:block">
              {user?.user_metadata?.full_name || user?.email}
            </span>
            <button
              onClick={handleSignOut}
              className="btn-secondary text-sm px-3 py-2 rounded-lg flex items-center gap-2"
            >
              <LogOut className="w-4 h-4" /> Sair
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 pt-24 pb-12">
        {/* Header */}
        <motion.div
          variants={fadeUp}
          initial="hidden"
          animate="visible"
          className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8"
        >
          <div>
            <h1 className="text-3xl font-display font-bold">Meus Projectos</h1>
            <p className="text-dark-400 text-sm mt-1">
              Gerencie os seus Trabalhos de Conclusão de Curso.
            </p>
          </div>
          <Link
            to="/new-project"
            className="btn-primary px-5 py-3 rounded-xl flex items-center gap-2 text-sm w-fit"
          >
            <Plus className="w-4 h-4" /> Novo TCC
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
            <FolderOpen className="w-16 h-16 text-dark-600 mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">Nenhum projecto ainda</h2>
            <p className="text-dark-400 mb-6 text-sm">
              Comece a criar o seu primeiro TCC com inteligência artificial.
            </p>
            <Link
              to="/new-project"
              className="btn-primary px-6 py-3 rounded-xl inline-flex items-center gap-2"
            >
              <Sparkles className="w-4 h-4" /> Criar TCC
            </Link>
          </motion.div>
        ) : (
          <div className="grid gap-4">
            {projects.map((project, i) => (
              <motion.div
                key={project.id}
                variants={fadeUp}
                initial="hidden"
                animate="visible"
                custom={i}
              >
                <Link
                  to={`/project/${project.id}`}
                  className="glass-card rounded-xl p-5 flex items-center gap-4 group"
                >
                  <div className="w-12 h-12 rounded-xl bg-primary-500/10 flex items-center justify-center flex-shrink-0">
                    <FileText className="w-6 h-6 text-primary-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-white truncate">
                      {project.title || 'TCC sem título'}
                    </h3>
                    <div className="flex items-center gap-3 mt-1">
                      <span className="text-xs text-dark-400 flex items-center gap-1">
                        <Clock className="w-3 h-3" /> {formatDate(project.created_at)}
                      </span>
                      {statusLabel(project.status)}
                    </div>
                  </div>
                  <ChevronRight className="w-5 h-5 text-dark-500 group-hover:text-primary-400 transition-colors" />
                </Link>
              </motion.div>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
