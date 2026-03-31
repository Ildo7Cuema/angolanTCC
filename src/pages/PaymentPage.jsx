import { useEffect, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import { motion } from 'framer-motion'
import {
  CreditCard,
  Copy,
  ArrowRight,
  CheckCircle2,
  Clock,
  ArrowLeft,
  AlertCircle
} from 'lucide-react'
import toast from 'react-hot-toast'

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4 } }
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
    // Poll for payment status every 10 seconds
    const interval = setInterval(() => {
        fetchPaymentData(true)
    }, 10000)
    return () => clearInterval(interval)
  }, [id])

  const fetchPaymentData = async (silent = false) => {
    // Buscar projecto
    const { data: projData, error: projErr } = await supabase
      .from('projects')
      .select('title')
      .eq('id', id)
      .single()

    if (projErr || !projData) {
      if (!silent) toast.error('Projecto não encontrado')
      if (!silent) navigate('/dashboard')
      return
    }

    setProject(projData)

    // Buscar pagamento associado
    const { data: payData, error: payErr } = await supabase
      .from('payments')
      .select('*')
      .eq('project_id', id)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(1)

    if (payErr || !payData || payData.length === 0) {
      if (!silent) toast.error('Nenhum detalhe de pagamento encontrado. Crie o projecto novamente.')
      if (!silent) navigate('/dashboard')
      return
    }

    const currentPayment = payData[0]
    setPayment(currentPayment)
    setLoading(false)
    
    // Se foi pago enquanto estava na janela, redireccionar
    if (silent && payment && payment.status !== 'pago' && currentPayment.status === 'pago') {
        toast.success("Pagamento validado! O seu TCC já pode ser gerado.")
        navigate(`/project/${id}`)
    }
  }

  const handleCopy = () => {
    if (payment?.reference_code) {
      navigator.clipboard.writeText(payment.reference_code)
      toast.success('Referência copiada!')
    }
  }

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('pt-AO', {
      style: 'currency',
      currency: 'AOA',
      minimumFractionDigits: 2
    }).format(amount)
  }

  const whatsappMessage = encodeURIComponent(`Olá, realizei o pagamento do meu projecto.\n*Ref:* ${payment?.reference_code}\nPor favor, valide o meu acesso.`)
  const whatsappUrl = `https://wa.me/244921923232?text=${whatsappMessage}`

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
         <div className="loading-spinner w-10 h-10 border-4" />
      </div>
    )
  }

  return (
    <div className="min-h-screen">
      <header className="glass fixed top-0 left-0 right-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-3 flex items-center gap-4">
          <Link
            to="/dashboard"
            className="flex items-center gap-2 text-dark-400 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            <span className="text-sm font-medium">Voltar ao Dashboard</span>
          </Link>
          <div className="h-5 w-px bg-white/10" />
          <span className="text-sm font-medium text-dark-300">Pagamento</span>
        </div>
      </header>

      <main className="max-w-xl mx-auto px-6 pt-32 pb-12">
        <motion.div variants={fadeUp} initial="hidden" animate="visible" className="space-y-6">
          <div className="text-center mb-8">
            <div className="w-16 h-16 rounded-2xl bg-primary-500/10 flex items-center justify-center mx-auto mb-4">
              <CreditCard className="w-8 h-8 text-primary-400" />
            </div>
            <h1 className="text-2xl font-display font-bold">Resumo do Pedido</h1>
            <p className="text-dark-400 mt-2 text-sm max-w-sm mx-auto">
              Para liberar a geração por IA do seu TCC "{project?.title}", por favor realize o pagamento.
            </p>
          </div>

          <div className="glass-card rounded-2xl p-6 relative overflow-hidden">
            <div className="absolute top-0 left-0 w-1 h-full bg-primary-500" />
            
            <div className="flex justify-between items-center mb-4">
              <span className="text-dark-400 text-sm">Estado do Pagamento</span>
              {payment?.status === 'pago' ? (
                 <span className="inline-flex items-center gap-1.5 text-xs font-medium text-green-400 bg-green-400/10 px-2.5 py-1 rounded-full">
                   <CheckCircle2 className="w-3.5 h-3.5" /> Confirmado
                 </span>
              ) : payment?.status === 'rejeitado' ? (
                <span className="inline-flex items-center gap-1.5 text-xs font-medium text-red-400 bg-red-400/10 px-2.5 py-1 rounded-full">
                   <AlertCircle className="w-3.5 h-3.5" /> Rejeitado
                 </span>
              ) : (
                 <span className="inline-flex items-center gap-1.5 text-xs font-medium text-yellow-400 bg-yellow-400/10 px-2.5 py-1 rounded-full">
                   <Clock className="w-3.5 h-3.5" /> Pendente de Validação
                 </span>
              )}
            </div>

            <div className="mb-6">
              <p className="text-sm text-dark-400 mb-1">Valor a pagar</p>
              <p className="text-3xl font-display font-bold text-white tracking-tight">
                {formatCurrency(payment?.amount || 55000)}
              </p>
            </div>

            <div className="p-4 rounded-xl bg-dark-900 border border-white/5 space-y-3">
              <div>
                <p className="text-xs text-dark-500 mb-1">CÓDIGO DE REFERÊNCIA ÚNICA</p>
                <div className="flex items-center justify-between">
                  <span className="font-mono text-lg font-bold text-primary-300 tracking-wider">
                    {payment?.reference_code}
                  </span>
                  <button onClick={handleCopy} className="p-2 hover:bg-white/10 rounded-lg text-dark-400 transition-colors">
                    <Copy className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div className="glass-light rounded-2xl p-6">
            <h3 className="font-medium text-white mb-4">Como efectuar o pagamento?</h3>
            <ol className="space-y-4 text-sm text-dark-300">
              <li className="flex gap-3">
                <span className="w-6 h-6 rounded-full bg-primary-500/20 text-primary-400 flex items-center justify-center font-bold text-xs flex-shrink-0">1</span>
                <span>
                  Transfira o valor por Express ou depósito em conta:<br/>
                  IBAN: <strong className="text-primary-300 tracking-wider">0040 0000 1735 7484 10115</strong><br/>
                  Telefone (Express): <strong className="text-primary-300">921 923 232</strong>
                </span>
              </li>
              <li className="flex gap-3">
                <span className="w-6 h-6 rounded-full bg-primary-500/20 text-primary-400 flex items-center justify-center font-bold text-xs flex-shrink-0">2</span>
                <span>Copie a <strong>Referência Única</strong> acima.</span>
              </li>
              <li className="flex gap-3">
                <span className="w-6 h-6 rounded-full bg-primary-500/20 text-primary-400 flex items-center justify-center font-bold text-xs flex-shrink-0">3</span>
                Envie o comprovativo pelo WhatsApp mencionando a sua referência.
              </li>
            </ol>

            <div className="mt-8">
              <a 
                href={whatsappUrl} 
                target="_blank" 
                rel="noreferrer"
                className="btn-primary w-full py-4 rounded-xl flex items-center justify-center gap-2 font-medium"
              >
                Enviar Comprovativo no WhatsApp
                <ArrowRight className="w-4 h-4" />
              </a>
              <p className="text-center text-xs text-dark-500 mt-3 flex items-center justify-center gap-1">
                <Clock className="w-3.5 h-3.5" /> A validação pode demorar até 1 hora útil.
              </p>
            </div>

            {payment?.status === 'pago' && (
              <div className="mt-6">
                <Link to={`/project/${id}`} className="w-full py-4 rounded-xl flex items-center justify-center gap-2 font-medium bg-green-500/20 hover:bg-green-500/30 text-green-400 transition-colors border border-green-500/30">
                  Aceder ao TCC Liberado
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            )}
          </div>
        </motion.div>
      </main>
    </div>
  )
}
