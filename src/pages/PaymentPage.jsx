import { useEffect, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import {
  CreditCard, Copy, ArrowRight, CheckCircle2, Clock, AlertCircle,
  Building2, Smartphone, MessageCircle, Shield, Sparkles,
} from 'lucide-react'
import toast from 'react-hot-toast'
import Navbar from '../components/Navbar'
import PageLayout from '../components/PageLayout'
import Button from '../components/ui/Button'
import { Skeleton, SkeletonText } from '../components/ui/Skeleton'

const fadeUp = {
  hidden:  { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.16, 1, 0.3, 1] } },
}

export default function PaymentPage() {
  const { id } = useParams()
  const { user } = useAuth()
  const navigate = useNavigate()

  const [project, setProject] = useState(null)
  const [payment, setPayment] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchPaymentData()
    const t = setInterval(() => fetchPaymentData(true), 10000)
    return () => clearInterval(t)
  }, [id])

  const fetchPaymentData = async (silent = false) => {
    const { data: projData, error: projErr } = await supabase
      .from('projects')
      .select('title, sections')
      .eq('id', id)
      .single()

    if (projErr || !projData) {
      if (!silent) { toast.error('Projecto não encontrado'); navigate('/dashboard') }
      return
    }
    setProject(projData)

    const { data: payData, error: payErr } = await supabase
      .from('payments')
      .select('*')
      .eq('project_id', id)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(1)

    if (payErr || !payData?.length) {
      if (!silent) { toast.error('Sem detalhes de pagamento. Crie o projecto novamente.'); navigate('/dashboard') }
      return
    }

    const current = payData[0]
    setPayment((prev) => {
      if (silent && prev && prev.status !== 'pago' && current.status === 'pago') {
        toast.success('Pagamento validado! O seu TCC já pode ser gerado.')
        navigate(`/project/${id}`)
      }
      return current
    })
    setLoading(false)
  }

  const handleCopy = () => {
    if (payment?.reference_code) {
      navigator.clipboard.writeText(payment.reference_code)
      toast.success('Referência copiada!')
    }
  }

  const formatCurrency = (amount) =>
    new Intl.NumberFormat('pt-AO', { style: 'currency', currency: 'AOA', minimumFractionDigits: 2 })
      .format(amount || 0)

  const docType = project?.sections?.projectType === 'anteprojecto' ? 'Ante-Projecto' : 'TCC'
  const docTypeShort = project?.sections?.projectType === 'anteprojecto' ? 'AP' : 'TCC'

  const whatsappMessage = encodeURIComponent(
    `Olá! Realizei o pagamento do meu ${docType}.\n` +
    `*Ref:* ${payment?.reference_code}\n` +
    `*Valor:* ${payment?.amount ? formatCurrency(payment.amount) : ''}\n` +
    'Por favor valide o meu acesso. Obrigado.'
  )
  const whatsappUrl = `https://wa.me/244921923232?text=${whatsappMessage}`

  // ── Status pill helper ──────────────────────────────────────────────────
  const StatusPill = () => {
    if (payment?.status === 'pago') {
      return (
        <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-success-50 text-success-700 ring-1 ring-success-200 text-xs font-semibold">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-success-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-success-500" />
          </span>
          <CheckCircle2 className="w-3.5 h-3.5" /> Confirmado
        </span>
      )
    }
    if (payment?.status === 'rejeitado') {
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-danger-50 text-danger-700 ring-1 ring-danger-200 text-xs font-semibold">
          <AlertCircle className="w-3.5 h-3.5" /> Rejeitado
        </span>
      )
    }
    return (
      <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-warning-50 text-warning-700 ring-1 ring-warning-200 text-xs font-semibold">
        <Clock className="w-3.5 h-3.5 animate-pulse" /> Aguardando validação
      </span>
    )
  }

  if (loading) {
    return (
      <div className="min-h-screen">
        <Navbar backTo="/dashboard" backLabel="Voltar" title="Pagamento" />
        <PageLayout maxWidth="max-w-xl" padTop="pt-24">
          <div className="space-y-4">
            <Skeleton className="h-48 rounded-3xl" />
            <Skeleton className="h-72 rounded-3xl" />
          </div>
        </PageLayout>
      </div>
    )
  }

  return (
    <div className="min-h-screen">
      <Navbar backTo="/dashboard" backLabel="Voltar" title="Pagamento" />

      <PageLayout maxWidth="max-w-xl">
        <motion.div variants={fadeUp} initial="hidden" animate="visible" className="space-y-5">
          {/* ── HEADER ─────────────────────────────────────────────── */}
          <div className="text-center mb-6">
            <div className="w-16 h-16 mx-auto rounded-2xl bg-gradient-to-br from-primary-500 to-accent-500 text-white flex items-center justify-center shadow-glow mb-4">
              <CreditCard className="w-8 h-8" />
            </div>
            <h1 className="text-2xl sm:text-3xl font-display font-extrabold text-dark-900 tracking-tight">
              Resumo do Pedido
            </h1>
            <p className="text-dark-500 text-sm sm:text-base mt-2 max-w-sm mx-auto">
              Liberte a geração por IA do seu <span className="font-semibold text-dark-800">{docType}</span>{' '}
              <span className="text-dark-900 font-medium">"{project?.title}"</span>.
            </p>
          </div>

          {/* ── HERO CARD ─────────────────────────────────────────── */}
          <motion.div
            variants={fadeUp}
            className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-primary-600 via-primary-500 to-accent-600 text-white p-6 sm:p-7 shadow-glow"
          >
            <div className="absolute -top-10 -right-10 w-48 h-48 bg-white/10 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute -bottom-10 -left-10 w-48 h-48 bg-accent-300/15 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute inset-0 bg-noise opacity-[0.04] mix-blend-overlay pointer-events-none" />

            <div className="relative">
              <div className="flex items-start justify-between mb-6">
                <div>
                  <p className="text-xs uppercase tracking-widest text-white/70 font-semibold">{docType}</p>
                  <p className="text-sm text-white/85 mt-0.5 truncate max-w-[220px] sm:max-w-xs">
                    {project?.title}
                  </p>
                </div>
                <div className="px-2.5 py-1 rounded-md bg-white/15 backdrop-blur-md ring-1 ring-white/20 text-[11px] font-mono font-bold tracking-wider">
                  {docTypeShort}
                </div>
              </div>

              <div className="mb-1 text-white/70 text-xs uppercase tracking-wider">Valor a pagar</div>
              <div className="text-4xl sm:text-5xl font-display font-extrabold tracking-tight leading-none">
                {formatCurrency(payment?.amount || 35000)}
              </div>

              <div className="mt-6 pt-5 border-t border-white/15 flex items-center justify-between gap-3">
                <div>
                  <p className="text-[10px] uppercase tracking-widest text-white/60 font-semibold mb-1">
                    Referência única
                  </p>
                  <p className="font-mono font-bold text-lg sm:text-xl tracking-wider">
                    {payment?.reference_code}
                  </p>
                </div>
                <button
                  onClick={handleCopy}
                  className="h-10 px-3 rounded-xl bg-white/15 hover:bg-white/25 backdrop-blur-md ring-1 ring-white/20 text-xs font-semibold inline-flex items-center gap-1.5 transition-colors"
                  aria-label="Copiar referência"
                >
                  <Copy className="w-3.5 h-3.5" /> Copiar
                </button>
              </div>
            </div>
          </motion.div>

          {/* ── STATUS BAR ─────────────────────────────────────────── */}
          <motion.div variants={fadeUp} className="glass-card p-5 flex items-center justify-between gap-3">
            <div>
              <p className="text-xs text-dark-500 font-medium mb-1">Estado do pagamento</p>
              <StatusPill />
            </div>
            <Shield className="w-6 h-6 text-success-500" />
          </motion.div>

          {/* ── HOW TO PAY ─────────────────────────────────────────── */}
          <motion.div variants={fadeUp} className="glass-card p-6 sm:p-7">
            <h3 className="text-base font-display font-bold text-dark-900 mb-5 flex items-center gap-2">
              <Sparkles className="w-4.5 h-4.5 text-primary-600" /> Como efectuar o pagamento
            </h3>

            <ol className="space-y-4">
              <li className="flex gap-3">
                <span className="w-7 h-7 rounded-full bg-primary-100 text-primary-700 flex items-center justify-center font-bold text-xs flex-shrink-0 ring-1 ring-primary-200">1</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-dark-900 mb-2">Faça a transferência</p>
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between gap-2 p-3 rounded-xl bg-dark-50 border border-dark-100">
                      <div className="min-w-0">
                        <div className="text-[10px] uppercase tracking-wider text-dark-400 font-semibold mb-0.5 flex items-center gap-1">
                          <Building2 className="w-3 h-3" /> IBAN
                        </div>
                        <div className="font-mono font-bold text-sm text-dark-900 tracking-wider truncate">
                          0040 0000 1735 7484 10115
                        </div>
                      </div>
                      <button
                        onClick={() => { navigator.clipboard.writeText('004000001735748410115'); toast.success('IBAN copiado') }}
                        className="btn-icon flex-shrink-0"
                        aria-label="Copiar IBAN"
                      >
                        <Copy className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <div className="flex items-center justify-between gap-2 p-3 rounded-xl bg-dark-50 border border-dark-100">
                      <div className="min-w-0">
                        <div className="text-[10px] uppercase tracking-wider text-dark-400 font-semibold mb-0.5 flex items-center gap-1">
                          <Smartphone className="w-3 h-3" /> Express / Multicaixa Express
                        </div>
                        <div className="font-mono font-bold text-sm text-dark-900 tracking-wider">921 923 232</div>
                      </div>
                      <button
                        onClick={() => { navigator.clipboard.writeText('921923232'); toast.success('Telefone copiado') }}
                        className="btn-icon flex-shrink-0"
                        aria-label="Copiar telefone"
                      >
                        <Copy className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              </li>

              <li className="flex gap-3">
                <span className="w-7 h-7 rounded-full bg-primary-100 text-primary-700 flex items-center justify-center font-bold text-xs flex-shrink-0 ring-1 ring-primary-200">2</span>
                <div className="flex-1">
                  <p className="text-sm text-dark-700">
                    Use a <strong className="text-dark-900">referência única</strong> acima como descrição da transferência.
                  </p>
                </div>
              </li>

              <li className="flex gap-3">
                <span className="w-7 h-7 rounded-full bg-primary-100 text-primary-700 flex items-center justify-center font-bold text-xs flex-shrink-0 ring-1 ring-primary-200">3</span>
                <div className="flex-1">
                  <p className="text-sm text-dark-700">
                    Envie o comprovativo pelo WhatsApp com a sua referência.
                  </p>
                </div>
              </li>
            </ol>

            <div className="mt-7 space-y-3">
              <a
                href={whatsappUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center justify-center gap-2 w-full h-12 px-5 rounded-xl font-semibold bg-[#25D366] text-white hover:brightness-105 active:brightness-95 transition-all shadow-md hover:shadow-lg hover:-translate-y-px"
              >
                <MessageCircle className="w-4.5 h-4.5" />
                Enviar comprovativo no WhatsApp
                <ArrowRight className="w-4 h-4" />
              </a>
              <p className="text-center text-xs text-dark-400 flex items-center justify-center gap-1">
                <Clock className="w-3.5 h-3.5" />
                A validação demora até 1 hora útil. Verificamos automaticamente a cada 10 segundos.
              </p>
            </div>

            {payment?.status === 'pago' && (
              <div className="mt-5 pt-5 border-t border-dark-100">
                <Link to={`/project/${id}`}>
                  <Button variant="success" fullWidth size="lg" rightIcon={ArrowRight}>
                    Aceder ao {docType} liberado
                  </Button>
                </Link>
              </div>
            )}
          </motion.div>
        </motion.div>
      </PageLayout>
    </div>
  )
}
