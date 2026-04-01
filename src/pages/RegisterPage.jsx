import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { GraduationCap, Mail, Lock, User, Eye, EyeOff, ArrowRight, Users, Heart } from 'lucide-react'
import toast from 'react-hot-toast'

export default function RegisterPage() {
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
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
      fatherName,
      motherName,
      otherRelatives,
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
    <div className="min-h-screen flex items-center justify-center px-6 py-12">
      <div className="w-full max-w-lg">
        {/* Logo */}
        <Link to="/" className="flex items-center justify-center gap-2 mb-10">
          <GraduationCap className="w-10 h-10 text-primary-400" />
          <span className="text-2xl font-display font-bold gradient-text">AngolaTCC AI</span>
        </Link>

        {/* Card */}
        <div className="glass-card rounded-2xl p-8">
          <h1 className="text-2xl font-display font-bold text-center mb-2">Criar Conta</h1>
          <p className="text-dark-400 text-center mb-8 text-sm">
            Comece a gerar o seu TCC ou Ante-Projecto com IA.
          </p>

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Dados pessoais */}
            <div>
              <label className="block text-sm font-medium text-dark-300 mb-1.5">
                Nome Completo <span className="text-red-400">*</span>
              </label>
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
              <label className="block text-sm font-medium text-dark-300 mb-1.5">
                Email <span className="text-red-400">*</span>
              </label>
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
              <label className="block text-sm font-medium text-dark-300 mb-1.5">
                Senha <span className="text-red-400">*</span>
              </label>
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

            {/* Dedicatória — família */}
            <div className="border-t border-white/10 pt-5">
              <div className="flex items-center gap-2 mb-3">
                <Heart className="w-4 h-4 text-primary-400" />
                <h3 className="text-sm font-semibold text-dark-200">
                  Família para a Dedicatória
                </h3>
              </div>
              <p className="text-xs text-dark-500 mb-4">
                Estes dados serão usados pela IA para personalizar a dedicatória do seu TCC com os nomes reais da sua família. São opcionais, mas tornam o trabalho muito mais pessoal.
              </p>

              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-dark-400 mb-1.5">
                    Nome do Pai
                  </label>
                  <div className="relative">
                    <Users className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-dark-500" />
                    <input
                      type="text"
                      value={fatherName}
                      onChange={(e) => setFatherName(e.target.value)}
                      className="input-field pl-9 text-sm"
                      placeholder="Ex: Manuel António Silva"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-dark-400 mb-1.5">
                    Nome da Mãe
                  </label>
                  <div className="relative">
                    <Users className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-dark-500" />
                    <input
                      type="text"
                      value={motherName}
                      onChange={(e) => setMotherName(e.target.value)}
                      className="input-field pl-9 text-sm"
                      placeholder="Ex: Maria da Conceição Silva"
                    />
                  </div>
                </div>
              </div>

              <div className="mt-4">
                <label className="block text-xs font-medium text-dark-400 mb-1.5">
                  Outros Parentes / Dedicatória Extra
                </label>
                <textarea
                  value={otherRelatives}
                  onChange={(e) => setOtherRelatives(e.target.value)}
                  className="input-field text-sm min-h-[70px] resize-none"
                  placeholder="Ex: irmãos, avós, cônjuge, amigos especiais que deseja incluir na dedicatória..."
                />
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
