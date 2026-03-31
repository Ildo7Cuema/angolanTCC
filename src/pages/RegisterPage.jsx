import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { GraduationCap, Mail, Lock, User, Eye, EyeOff, ArrowRight } from 'lucide-react'
import toast from 'react-hot-toast'

export default function RegisterPage() {
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const { signUp } = useAuth()
  const navigate = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!fullName || !email || !password) {
      toast.error('Preencha todos os campos')
      return
    }
    if (password.length < 6) {
      toast.error('A senha deve ter pelo menos 6 caracteres')
      return
    }

    setLoading(true)
    const { error } = await signUp(email, password, fullName)
    setLoading(false)

    if (error) {
      toast.error(error.message)
    } else {
      toast.success('Conta criada com sucesso!')
      navigate('/dashboard')
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-6 py-12">
      <div className="w-full max-w-md">
        {/* Logo */}
        <Link to="/" className="flex items-center justify-center gap-2 mb-10">
          <GraduationCap className="w-10 h-10 text-primary-400" />
          <span className="text-2xl font-display font-bold gradient-text">AngolaTCC AI</span>
        </Link>

        {/* Card */}
        <div className="glass-card rounded-2xl p-8">
          <h1 className="text-2xl font-display font-bold text-center mb-2">Criar Conta</h1>
          <p className="text-dark-400 text-center mb-8 text-sm">
            Comece a gerar o seu TCC com IA.
          </p>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-dark-300 mb-1.5">Nome Completo</label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-dark-500" />
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="input-field pl-10"
                  placeholder="Seu nome completo"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-dark-300 mb-1.5">Email</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-dark-500" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="input-field pl-10"
                  placeholder="seu@email.com"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-dark-300 mb-1.5">Senha</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-dark-500" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="input-field pl-10 pr-10"
                  placeholder="Mínimo 6 caracteres"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-dark-500 hover:text-dark-300 transition-colors"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full py-3 rounded-xl flex items-center justify-center gap-2 text-base disabled:opacity-50"
            >
              {loading ? (
                <div className="loading-spinner w-5 h-5 border-2" />
              ) : (
                <>Criar Conta <ArrowRight className="w-4 h-4" /></>
              )}
            </button>
          </form>

          <p className="text-center text-dark-400 text-sm mt-6">
            Já tem conta?{' '}
            <Link to="/login" className="text-primary-400 hover:text-primary-300 font-medium transition-colors">
              Entrar
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
