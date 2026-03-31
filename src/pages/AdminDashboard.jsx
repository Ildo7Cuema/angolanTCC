import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import {
  ArrowLeft,
  Users,
  FileText,
  CreditCard,
  DollarSign,
  CheckCircle,
  XCircle,
  Clock,
} from 'lucide-react'
import toast from 'react-hot-toast'

export default function AdminDashboard() {
  const [stats, setStats] = useState({
    total_users: 0,
    total_projects: 0,
    total_revenue: 0,
    pending_payments: 0,
  })
  const [payments, setPayments] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchDashboardData()
  }, [])

  async function fetchDashboardData() {
    try {
      setLoading(true)

      // 1. Fetch Stats via RPC
      const { data: statsData, error: statsError } = await supabase.rpc('get_dashboard_stats')
      if (statsError) {
        console.error('Error fetching stats:', statsError)
        toast.error('Erro ao carregar métricas. Certifica-te de que as tabelas de admin foram criadas.')
      } else if (statsData) {
        setStats(statsData)
      }

      // 2. Fetch Payments
      const { data: paymentsData, error: paymentsError } = await supabase
        .from('payments')
        .select(`
          id,
          amount,
          reference_code,
          status,
          created_at,
          user_id,
          project_id,
          projects(title)
        `)
        .order('created_at', { ascending: false })

      if (paymentsError) {
        console.error('Error fetching payments:', paymentsError)
      } else {
        setPayments(paymentsData || [])
      }

    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const updatePaymentStatus = async (paymentId, newStatus) => {
    try {
      const { error } = await supabase
        .from('payments')
        .update({ status: newStatus })
        .eq('id', paymentId)

      if (error) {
        toast.error('Erro ao actualizar pagamento: ' + error.message)
        return
      }

      toast.success(`Pagamento marcado como ${newStatus}.`)
      fetchDashboardData()
    } catch (err) {
      toast.error('Falha inesperada.')
    }
  }

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('pt-AO', {
      style: 'currency',
      currency: 'AOA',
    }).format(value || 0)
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="loading-spinner" />
      </div>
    )
  }

  return (
    <div className="min-h-screen pb-12">
      {/* Top bar */}
      <header className="glass sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link
              to="/dashboard"
              className="flex items-center gap-2 text-dark-400 hover:text-white transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
              <span className="text-sm font-medium">Voltar para Dashboard Regular</span>
            </Link>
          </div>
          <div className="flex items-center gap-3">
            <div className="h-2 w-2 rounded-full bg-primary-400 animate-pulse" />
            <span className="text-sm font-medium text-primary-400">Admin Activo</span>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 pt-12">
        <div className="mb-10">
          <h1 className="text-4xl font-display font-bold text-white mb-2">Painel de Controlo</h1>
          <p className="text-dark-300">Visão geral e gestão de pagamentos da plataforma.</p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
          {/* Stat 1 */}
          <div className="glass-card rounded-2xl p-6 border-l-4 border-l-blue-500">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-medium text-dark-400 mb-1">Total Utilizadores</p>
                <h3 className="text-3xl font-bold text-white">{stats.total_users}</h3>
              </div>
              <div className="p-3 rounded-xl bg-blue-500/10 text-blue-500">
                <Users className="w-6 h-6" />
              </div>
            </div>
          </div>

          {/* Stat 2 */}
          <div className="glass-card rounded-2xl p-6 border-l-4 border-l-purple-500">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-medium text-dark-400 mb-1">Total Projectos (TCCs)</p>
                <h3 className="text-3xl font-bold text-white">{stats.total_projects}</h3>
              </div>
              <div className="p-3 rounded-xl bg-purple-500/10 text-purple-500">
                <FileText className="w-6 h-6" />
              </div>
            </div>
          </div>

          {/* Stat 3 */}
          <div className="glass-card rounded-2xl p-6 border-l-4 border-l-green-500">
             <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-medium text-dark-400 mb-1">Receita Total</p>
                <h3 className="text-2xl font-bold text-white">{formatCurrency(stats.total_revenue)}</h3>
              </div>
              <div className="p-3 rounded-xl bg-green-500/10 text-green-500">
                <DollarSign className="w-6 h-6" />
              </div>
            </div>
          </div>

          {/* Stat 4 */}
          <div className="glass-card rounded-2xl p-6 border-l-4 border-l-yellow-500">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-medium text-dark-400 mb-1">Pagamentos Pendentes</p>
                <h3 className="text-3xl font-bold text-white">{stats.pending_payments}</h3>
              </div>
              <div className="p-3 rounded-xl bg-yellow-500/10 text-yellow-500">
                <CreditCard className="w-6 h-6" />
              </div>
            </div>
          </div>
        </div>

        {/* Payments List */}
        <div>
          <h2 className="text-2xl font-display font-semibold mb-6 flex items-center gap-2">
            <CreditCard className="w-6 h-6 text-primary-400" />
            Gestão de Pagamentos
          </h2>
          
          <div className="glass-card rounded-2xl overflow-hidden">
             <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-white/5 text-dark-300 border-b border-white/10">
                    <tr>
                      <th className="px-6 py-4 font-medium">Ref. Pagamento</th>
                      <th className="px-6 py-4 font-medium">Projecto (TCC)</th>
                      <th className="px-6 py-4 font-medium">Valor</th>
                      <th className="px-6 py-4 font-medium">Data</th>
                      <th className="px-6 py-4 font-medium">Estado</th>
                      <th className="px-6 py-4 font-medium text-right">Acções</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {payments.length === 0 ? (
                      <tr>
                        <td colSpan="6" className="px-6 py-8 text-center text-dark-400">
                          Nenhum pagamento encontrado.
                        </td>
                      </tr>
                    ) : (
                      payments.map((p) => (
                        <tr key={p.id} className="hover:bg-white/5 transition-colors">
                          <td className="px-6 py-4 font-mono text-dark-200">
                            {p.reference_code}
                          </td>
                          <td className="px-6 py-4 text-dark-200 max-w-[200px] truncate">
                            {p.projects?.title || 'Projecto Eliminado'}
                          </td>
                          <td className="px-6 py-4 font-medium text-white">
                            {formatCurrency(p.amount)}
                          </td>
                          <td className="px-6 py-4 text-dark-400">
                            {new Date(p.created_at).toLocaleDateString('pt-AO')}
                          </td>
                          <td className="px-6 py-4">
                            {p.status === 'pendente' && (
                              <span className="inline-flex items-center gap-1 text-yellow-400 bg-yellow-400/10 px-2.5 py-1 rounded-full text-xs font-medium border border-yellow-400/20">
                                <Clock className="w-3.5 h-3.5" /> Pendente
                              </span>
                            )}
                            {p.status === 'pago' && (
                              <span className="inline-flex items-center gap-1 text-green-400 bg-green-400/10 px-2.5 py-1 rounded-full text-xs font-medium border border-green-400/20">
                                <CheckCircle className="w-3.5 h-3.5" /> Aprovado
                              </span>
                            )}
                            {p.status === 'rejeitado' && (
                              <span className="inline-flex items-center gap-1 text-red-400 bg-red-400/10 px-2.5 py-1 rounded-full text-xs font-medium border border-red-400/20">
                                <XCircle className="w-3.5 h-3.5" /> Rejeitado
                              </span>
                            )}
                          </td>
                          <td className="px-6 py-4 text-right">
                            {p.status === 'pendente' ? (
                              <div className="flex items-center justify-end gap-2">
                                <button
                                  onClick={() => updatePaymentStatus(p.id, 'pago')}
                                  className="p-2 text-green-400 hover:bg-green-400/10 rounded-lg transition-colors"
                                  title="Aprovar Pagamento"
                                >
                                  <CheckCircle className="w-5 h-5" />
                                </button>
                                <button
                                  onClick={() => updatePaymentStatus(p.id, 'rejeitado')}
                                  className="p-2 text-red-400 hover:bg-red-400/10 rounded-lg transition-colors"
                                  title="Rejeitar Pagamento"
                                >
                                  <XCircle className="w-5 h-5" />
                                </button>
                              </div>
                            ) : (
                               <span className="text-dark-500 text-xs italic">S/ Acção</span>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
             </div>
          </div>
        </div>
      </main>
    </div>
  )
}
