import { useState } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useAuth } from '../contexts/AuthContext'
import { GraduationCap, Mail, Lock, ArrowRight, Sparkles, Shield, Zap, BookOpen } from 'lucide-react'
import toast from 'react-hot-toast'
import Input from '../components/ui/Input'
import Button from '../components/ui/Button'

const fadeUp = {
  hidden:  { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.16, 1, 0.3, 1] } },
}

const HIGHLIGHTS = [
  { icon: Sparkles, text: 'IA Claude Sonnet treinada para o contexto académico angolano' },
  { icon: Shield,   text: 'Conteúdo original, gerado exclusivamente para si' },
  { icon: Zap,      text: 'TCC completo em minutos, exportado em Word formatado' },
  { icon: BookOpen, text: 'Editor visual com gráficos, tabelas e diagramas Mermaid' },
]

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const { signIn } = useAuth()

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!email || !password) {
      toast.error('Preencha todos os campos')
      return
    }
    setLoading(true)
    const { error } = await signIn(email, password)
    if (error) {
      setLoading(false)
      toast.error(
        error.message === 'Invalid login credentials'
          ? 'Email ou senha incorrectos.'
          : (error.message || 'Falha ao iniciar sessão.'),
      )
      return
    }
    toast.success('Bem-vindo de volta!')
    // Não chamamos `navigate('/dashboard')` aqui de propósito: o `PublicRoute`
    // detecta `user` actualizado pelo `onAuthStateChange` e redirecciona
    // automaticamente. Chamar `navigate` em paralelo causa o warning
    // "Cannot update a component (`BrowserRouter`) while rendering …"
    // e pode disparar erros no console em modo Strict + Suspense.
  }

  return (
    <div className="min-h-screen grid lg:grid-cols-2">
      {/* ── LEFT: form ─────────────────────────────────────────────── */}
      <div className="flex items-center justify-center px-4 sm:px-6 py-10 sm:py-16">
        <motion.div
          variants={fadeUp} initial="hidden" animate="visible"
          className="w-full max-w-md"
        >
          {/* logo */}
          <Link to="/" className="inline-flex items-center justify-center gap-2.5 mb-10 group">
            <span className="w-10 h-10 rounded-2xl bg-gradient-to-br from-primary-600 to-accent-600 text-white flex items-center justify-center shadow-glow-sm group-hover:shadow-glow transition-shadow">
              <GraduationCap className="w-5 h-5" />
            </span>
            <span className="text-xl font-display font-bold tracking-tight text-dark-900">
              AngolaTCC <span className="text-primary-600">AI</span>
            </span>
          </Link>

          <h1 className="text-3xl sm:text-4xl font-display font-extrabold tracking-tight text-dark-900 mb-3">
            Bem-vindo de <span className="gradient-text">volta</span>
          </h1>
          <p className="text-dark-500 mb-10 text-sm sm:text-base">
            Aceda ao seu painel e continue de onde parou.
          </p>

          <form onSubmit={handleSubmit} className="space-y-5">
            <Input
              label="Email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              leftIcon={Mail}
              placeholder="seu@email.com"
              required
            />
            <Input
              label="Senha"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              leftIcon={Lock}
              placeholder="••••••••"
              required
            />

            <Button
              type="submit"
              size="lg"
              fullWidth
              loading={loading}
              rightIcon={ArrowRight}
              className="mt-2"
            >
              Entrar
            </Button>
          </form>

          <p className="text-center text-dark-500 text-sm mt-8">
            Não tem conta?{' '}
            <Link to="/register" className="text-primary-600 hover:text-primary-700 font-semibold transition-colors">
              Criar conta gratuitamente
            </Link>
          </p>
        </motion.div>
      </div>

      {/* ── RIGHT: marketing panel ─────────────────────────────────── */}
      <aside
        className="hidden lg:flex relative items-center justify-center p-12 overflow-hidden bg-gradient-to-br from-primary-600 via-primary-500 to-accent-600 text-white"
      >
        {/* decorative blobs */}
        <div className="absolute -top-32 -right-32 w-96 h-96 bg-white/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-32 -left-32 w-96 h-96 bg-accent-300/20 rounded-full blur-3xl" />
        {/* noise overlay */}
        <div className="absolute inset-0 bg-noise opacity-[0.04] mix-blend-overlay pointer-events-none" />

        <motion.div
          variants={fadeUp} initial="hidden" animate="visible"
          className="relative max-w-md text-center"
        >
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/15 backdrop-blur-md text-xs font-semibold mb-8 ring-1 ring-white/20">
            <Sparkles className="w-3.5 h-3.5" />
            500+ estudantes angolanos confiam
          </div>

          <h2 className="text-4xl xl:text-5xl font-display font-extrabold leading-tight mb-6">
            O futuro do TCC <br />
            <span className="text-amber-200">já chegou.</span>
          </h2>
          <p className="text-white/85 text-lg leading-relaxed mb-10">
            Inteligência artificial de elite para construir o seu Trabalho de Conclusão de Curso, do título ao Word final.
          </p>

          <ul className="space-y-3.5 text-left">
            {HIGHLIGHTS.map((h, i) => (
              <motion.li
                key={i}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.3 + i * 0.1 }}
                className="flex items-start gap-3 text-sm text-white/90"
              >
                <span className="w-8 h-8 rounded-xl bg-white/15 backdrop-blur-md ring-1 ring-white/20 flex items-center justify-center flex-shrink-0">
                  <h.icon className="w-4 h-4" />
                </span>
                <span className="pt-1.5">{h.text}</span>
              </motion.li>
            ))}
          </ul>
        </motion.div>
      </aside>
    </div>
  )
}
