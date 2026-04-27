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
  AlertCircle,
} from 'lucide-react'
import toast from 'react-hot-toast'
import Navbar from '../components/Navbar'

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
    const interval = setInterval(() => {
        fetchPaymentData(true)
    }, 10000)
    return () => clearInterval(interval)
  }, [id])

  const fetchPaymentData = async (silent = false) => {
    const { data: projData, error: projErr } = await supabase
      .from('projects')
      .select('title, sections')
      .eq('id', id)
      .single()

    if (projErr || !projData) {
      if (!silent) toast.error('Projecto não encontrado')
      if (!silent) navigate('/dashboard')
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

    if (payErr || !payData || payData.length === 0) {
      if (!silent) toast.error('Nenhum detalhe de pagamento encontrado. Crie o projecto novamente.')
      if (!silent) navigate('/dashboard')
      return
    }

    const currentPayment = payData[0]
    setPayment(currentPayment)
    setLoading(false)
    
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

  const docType = project?.sections?.projectType === 'anteprojecto' ? 'Ante-Projecto' : 'TCC'
  const whatsappMessage = encodeURIComponent(`Olá, realizei o pagamento do meu ${docType}.\n*Ref:* ${payment?.reference_code}\n*Valor:* ${payment?.amount ? new Intl.NumberFormat('pt-AO', { style: 'currency', currency: 'AOA', minimumFractionDigits: 2 }).format(payment.amount) : ''}\nPor favor, valide o meu acesso.`)
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
      <Navbar
        backTo="/dashboard"
        backLabel="Voltar ao Dashboard"
        title="Pagamento"
      />

      <main className="max-w-xl mx-auto px-6 pt-32 pb-12">
        <motion.div variants={fadeUp} initial="hidden" animate="visible" className="space-y-6">
          <div className="text-center mb-8">
            <div className="w-16 h-16 rounded-2xl bg-indigo-50 flex items-center justify-center mx-auto mb-4">
              <CreditCard className="w-8 h-8 text-indigo-600" />
            </div>
            <h1 className="text-2xl font-display font-bold text-slate-900">Resumo do Pedido</h1>
            <p className="text-slate-500 mt-2 text-sm max-w-sm mx-auto">
              Para liberar a geração por IA do seu {project?.sections?.projectType === 'anteprojecto' ? 'Ante-Projecto' : 'TCC'}{' '}
              <span className="text-slate-900 font-medium">"{project?.title}"</span>, por favor realize o pagamento abaixo.
            </p>
          </div>

          <div className="glass-card rounded-2xl p-6 relative overflow-hidden">
            <div className="absolute top-0 left-0 w-1 h-full bg-indigo-600" />
            
            <div className="flex justify-between items-center mb-4">
              <span className="text-slate-500 text-sm">Estado do Pagamento</span>
              {payment?.status === 'pago' ? (
                 <span className="badge badge-success">
                   <CheckCircle2 className="w-3.5 h-3.5" /> Confirmado
                 </span>
              ) : payment?.status === 'rejeitado' ? (
                <span className="badge badge-error">
                   <AlertCircle className="w-3.5 h-3.5" /> Rejeitado
                 </span>
              ) : (
                 <span className="badge badge-warning">
                   <Clock className="w-3.5 h-3.5" /> Pendente de Validação
                 </span>
              )}
            </div>

            <div className="mb-6">
              <div className="flex items-center gap-2 mb-1">
                <p className="text-sm text-slate-500">Valor a pagar</p>
                <span className="badge badge-info">
                  {project?.sections?.projectType === 'anteprojecto' ? 'Ante-Projecto' : 'TCC / Monografia'}
                </span>
              </div>
              <p className="text-3xl font-display font-bold text-slate-900 tracking-tight">
                {formatCurrency(payment?.amount || 35000)}
              </p>
            </div>

            <div className="p-4 rounded-xl bg-surface-950 border border-slate-200 space-y-3">
              <div>
                <p className="text-xs text-slate-400 mb-1">CÓDIGO DE REFERÊNCIA ÚNICA</p>
                <div className="flex items-center justify-between">
                  <span className="font-mono text-lg font-bold text-indigo-500 tracking-wider">
                    {payment?.reference_code}
                  </span>
                  <button onClick={handleCopy} className="p-2 hover:bg-slate-100 rounded-lg text-slate-500 transition-colors">
                    <Copy className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div className="glass-light rounded-2xl p-6">
            <h3 className="font-medium text-slate-900 mb-4">Como efectuar o pagamento?</h3>
            <ol className="space-y-4 text-sm text-slate-500">
              <li className="flex gap-3">
                <span className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center font-bold text-xs flex-shrink-0">1</span>
                <span>
                  Transfira o valor por Express ou depósito em conta:<br/>
                  IBAN: <strong className="text-indigo-500 tracking-wider">0040 0000 1735 7484 10115</strong><br/>
                  Telefone (Express): <strong className="text-indigo-500">921 923 232</strong>
                </span>
              </li>
              <li className="flex gap-3">
                <span className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center font-bold text-xs flex-shrink-0">2</span>
                <span>Copie a <strong>Referência Única</strong> acima.</span>
              </li>
              <li className="flex gap-3">
                <span className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center font-bold text-xs flex-shrink-0">3</span>
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
              <p className="text-center text-xs text-slate-400 mt-3 flex items-center justify-center gap-1">
                <Clock className="w-3.5 h-3.5" /> A validação pode demorar até 1 hora útil.
              </p>
            </div>

            {payment?.status === 'pago' && (
              <div className="mt-6">
                <Link to={`/project/${id}`} className="w-full py-4 rounded-xl flex items-center justify-center gap-2 font-medium bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 transition-colors border border-emerald-500/30">
                  Aceder ao {docType} Liberado
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
