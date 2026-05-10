import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useAuth } from '../contexts/AuthContext'
import { GraduationCap, Mail, Lock, User, ArrowRight, Heart, Users, Sparkles } from 'lucide-react'
import toast from 'react-hot-toast'
import Input from '../components/ui/Input'
import Button from '../components/ui/Button'

const fadeUp = {
  hidden:  { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.16, 1, 0.3, 1] } },
}

export default function RegisterPage() {
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fatherName, setFatherName] = useState('')
  const [motherName, setMotherName] = useState('')
  const [otherRelatives, setOtherRelatives] = useState('')
  const [loading, setLoading] = useState(false)
  const { signUp } = useAuth()
  const navigate = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!fullName || !email || !password) {
      toast.error('Preencha os campos obrigatórios')
      return
    }
    if (password.length < 6) {
      toast.error('A senha deve ter pelo menos 6 caracteres')
      return
    }
    setLoading(true)
    const { error } = await signUp(email, password, fullName, {
      fatherName, motherName, otherRelatives,
    })
    setLoading(false)
    if (error) {
      toast.error(error.message)
    } else {
      toast.success('Conta criada com sucesso!')
      navigate('/dashboard')
    }
  }

  return (
    <div className="min-h-screen grid lg:grid-cols-2">
      {/* ── LEFT: form ─────────────────────────────────────────────── */}
      <div className="flex items-center justify-center px-4 sm:px-6 py-10 sm:py-14">
        <motion.div
          variants={fadeUp} initial="hidden" animate="visible"
          className="w-full max-w-lg"
        >
          <Link to="/" className="inline-flex items-center justify-center gap-2.5 mb-8 group">
            <span className="w-10 h-10 rounded-2xl bg-gradient-to-br from-primary-600 to-accent-600 text-white flex items-center justify-center shadow-glow-sm group-hover:shadow-glow transition-shadow">
              <GraduationCap className="w-5 h-5" />
            </span>
            <span className="text-xl font-display font-bold tracking-tight text-dark-900">
              AngolaTCC <span className="text-primary-600">AI</span>
            </span>
          </Link>

          <h1 className="text-3xl sm:text-4xl font-display font-extrabold tracking-tight text-dark-900 mb-2">
            Criar <span className="gradient-text">conta</span>
          </h1>
          <p className="text-dark-500 mb-8 text-sm sm:text-base">
            Comece a gerar o seu TCC ou Ante-Projecto com IA em segundos.
          </p>

          <form onSubmit={handleSubmit} className="space-y-5">
            <Input
              label="Nome Completo"
              required
              autoComplete="name"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              leftIcon={User}
              placeholder="O seu nome completo"
            />
            <Input
              label="Email"
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              leftIcon={Mail}
              placeholder="seu@email.com"
            />
            <Input
              label="Senha"
              type="password"
              required
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              leftIcon={Lock}
              placeholder="Mínimo 6 caracteres"
              hint="Use uma senha forte com letras, números e símbolos."
            />

            {/* Família — opcional, agrupado num bloco subtil */}
            <div className="rounded-2xl border border-dark-100 bg-dark-50/50 p-5 mt-2">
              <div className="flex items-center gap-2 mb-1.5">
                <span className="w-7 h-7 rounded-lg bg-primary-50 text-primary-600 flex items-center justify-center">
                  <Heart className="w-4 h-4" />
                </span>
                <h3 className="text-sm font-semibold text-dark-900">Família para a Dedicatória</h3>
                <span className="ml-auto text-[10px] uppercase tracking-wider text-dark-400 font-semibold">Opcional</span>
              </div>
              <p className="text-xs text-dark-500 mb-4">
                A IA usará estes nomes ao gerar a dedicatória do seu TCC. Pode preencher mais tarde.
              </p>
              <div className="grid sm:grid-cols-2 gap-3">
                <Input
                  label="Pai"
                  value={fatherName}
                  onChange={(e) => setFatherName(e.target.value)}
                  leftIcon={Users}
                  placeholder="Ex: Manuel Silva"
                />
                <Input
                  label="Mãe"
                  value={motherName}
                  onChange={(e) => setMotherName(e.target.value)}
                  leftIcon={Users}
                  placeholder="Ex: Maria da Conceição"
                />
              </div>
              <div className="mt-3">
                <label className="block text-sm font-medium text-dark-700 mb-1.5">
                  Outros familiares
                </label>
                <textarea
                  value={otherRelatives}
                  onChange={(e) => setOtherRelatives(e.target.value)}
                  className="input-field text-sm min-h-[72px] resize-none"
                  placeholder="Irmãos, avós, colegas, mentores…"
                />
              </div>
            </div>

            <Button
              type="submit"
              size="lg"
              fullWidth
              loading={loading}
              rightIcon={ArrowRight}
              className="mt-2"
            >
              Criar conta
            </Button>
          </form>

          <p className="text-center text-dark-500 text-sm mt-6">
            Já tem conta?{' '}
            <Link to="/login" className="text-primary-600 hover:text-primary-700 font-semibold transition-colors">
              Entrar
            </Link>
          </p>
        </motion.div>
      </div>

      {/* ── RIGHT: marketing ───────────────────────────────────────── */}
      <aside className="hidden lg:flex relative items-center justify-center p-12 overflow-hidden bg-gradient-to-br from-accent-600 via-accent-500 to-primary-600 text-white">
        <div className="absolute -top-32 -right-32 w-96 h-96 bg-white/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-32 -left-32 w-96 h-96 bg-primary-300/20 rounded-full blur-3xl" />
        <div className="absolute inset-0 bg-noise opacity-[0.04] mix-blend-overlay pointer-events-none" />

        <motion.div variants={fadeUp} initial="hidden" animate="visible" className="relative max-w-md text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/15 backdrop-blur-md text-xs font-semibold mb-8 ring-1 ring-white/20">
            <Sparkles className="w-3.5 h-3.5" /> Novo · 100% pt-AO
          </div>

          <h2 className="text-4xl xl:text-5xl font-display font-extrabold leading-tight mb-6">
            Comece em <br /><span className="text-amber-200">menos de 60 segundos.</span>
          </h2>
          <p className="text-white/85 text-lg leading-relaxed mb-10">
            Sem cartão de crédito. Pagamento Express por TCC ou Ante-Projecto, validação em até 1h útil.
          </p>

          <div className="grid grid-cols-3 gap-3 text-left">
            {[
              { v: '500+', l: 'TCCs gerados' },
              { v: '50+',  l: 'Universidades' },
              { v: '4.9',  l: 'Satisfação ★' },
            ].map((s) => (
              <div key={s.l} className="rounded-2xl bg-white/10 backdrop-blur-md ring-1 ring-white/15 p-4">
                <div className="text-2xl font-display font-extrabold">{s.v}</div>
                <div className="text-[11px] text-white/70 mt-1">{s.l}</div>
              </div>
            ))}
          </div>
        </motion.div>
      </aside>
    </div>
  )
}
