import { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import {
  ArrowLeft,
  Users,
  FileText,
  CreditCard,
  Banknote,
  CheckCircle,
  XCircle,
  Clock,
  Activity,
  AlertTriangle,
  Calendar,
  RotateCcw,
  Shield,
  TrendingUp,
  BarChart2,
  RefreshCw,
  Copy,
  Undo2,
  Trash2,
} from 'lucide-react'
import toast from 'react-hot-toast'
import ConfirmDialog from '../components/ConfirmDialog'

const TABS = ['Visão Geral', 'Acessos ao Sistema', 'Pagamentos']

// ─── Helpers ────────────────────────────────────────────────────────────────

function getLastNDays(n) {
  const days = []
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date()
    d.setDate(d.getDate() - i)
    days.push(d.toISOString().split('T')[0])
  }
  return days
}

function formatDate(dateStr) {
  if (!dateStr) return '—'
  return new Date(dateStr).toLocaleDateString('pt-AO', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function formatCurrency(value) {
  return `Kz ${new Intl.NumberFormat('pt-AO', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value || 0)}`
}

// ─── Sub-components ──────────────────────────────────────────────────────────


function StatCard({ label, value, icon: Icon, colorClass, bgClass }) {
  return (
    <div className={`glass-card rounded-2xl p-6 border-l-4 ${colorClass}`}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-dark-400 mb-1">{label}</p>
          <h3 className="text-3xl font-bold text-white">{value}</h3>
        </div>
        <div className={`p-3 rounded-xl ${bgClass}`}>
          <Icon className="w-6 h-6" />
        </div>
      </div>
    </div>
  )
}

function MiniBarChart({ data }) {
  const max = Math.max(...data.map((d) => d.count), 1)
  return (
    <div className="flex items-end gap-[3px] h-24 w-full">
      {data.map((d, i) => (
        <div key={i} className="flex-1 flex flex-col items-center gap-1 group relative">
          <div
            className="w-full rounded-t-sm bg-primary-500/50 group-hover:bg-primary-400 transition-colors duration-150 min-h-[2px]"
            style={{ height: `${Math.max((d.count / max) * 100, 4)}%` }}
          />
          {/* Tooltip on hover */}
          <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-dark-800 text-white text-xs rounded px-2 py-1 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-10 shadow border border-white/10">
            {d.label}: {d.count}
          </div>
        </div>
      ))}
    </div>
  )
}

// ─── Main Component ──────────────────────────────────────────────────────────

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState(0)
  const [stats, setStats] = useState({
    total_users: 0,
    total_projects: 0,
    total_revenue: 0,
    pending_payments: 0,
    stats_since: null,
  })
  const [payments, setPayments] = useState([])
  const [accessStats, setAccessStats] = useState({
    today: 0,
    month: 0,
    year: 0,
    daily_breakdown: [],
  })
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [showResetModal, setShowResetModal] = useState(false)
  const [resetting, setResetting] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [deleting, setDeleting] = useState(false)
  const [selectedIds, setSelectedIds] = useState([])
  const [showBulkDeleteModal, setShowBulkDeleteModal] = useState(false)
  const [bulkDeleting, setBulkDeleting] = useState(false)

  const fetchDashboardData = useCallback(async (silent = false) => {
    try {
      if (!silent) setLoading(true)
      else setRefreshing(true)

      const [statsRes, paymentsRes, accessRes] = await Promise.all([
        supabase.rpc('get_dashboard_stats'),
        supabase
          .from('payments')
          .select(`id, amount, reference_code, status, created_at, user_id, project_id, projects(title)`)
          .order('created_at', { ascending: false }),
        supabase.rpc('get_access_stats'),
      ])

      if (statsRes.error) {
        console.error('Stats error:', statsRes.error)
        toast.error('Erro ao carregar métricas. Certifica-te de que as migrações SQL foram aplicadas.')
      } else if (statsRes.data) {
        setStats(statsRes.data)
      }

      if (!paymentsRes.error) setPayments(paymentsRes.data || [])

      if (!accessRes.error && accessRes.data) {
        setAccessStats(accessRes.data)
      }
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useEffect(() => {
    fetchDashboardData()
  }, [fetchDashboardData])

  const handleResetStats = async () => {
    setResetting(true)
    try {
      const { error } = await supabase.rpc('reset_dashboard_stats')
      if (error) {
        toast.error('Erro ao zerar período: ' + error.message)
        return
      }
      toast.success('Período de estatísticas reiniciado com sucesso.')
      setShowResetModal(false)
      fetchDashboardData(true)
    } catch (err) {
      toast.error('Falha inesperada.')
    } finally {
      setResetting(false)
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
      const labels = { pago: 'Aprovado', rejeitado: 'Rejeitado', pendente: 'Pendente' }
      toast.success(`Pagamento marcado como "${labels[newStatus] ?? newStatus}".`)
      fetchDashboardData(true)
    } catch (err) {
      toast.error('Falha inesperada.')
    }
  }

  const handleDeletePayment = async () => {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      const { error } = await supabase.from('payments').delete().eq('id', deleteTarget.id)
      if (error) {
        toast.error('Erro ao eliminar pagamento: ' + error.message)
        return
      }
      toast.success('Pagamento eliminado com sucesso.')
      setDeleteTarget(null)
      fetchDashboardData(true)
    } catch (err) {
      toast.error('Falha inesperada.')
    } finally {
      setDeleting(false)
    }
  }

  const handleBulkDelete = async () => {
    if (selectedIds.length === 0) return
    setBulkDeleting(true)
    try {
      const { error } = await supabase.from('payments').delete().in('id', selectedIds)
      if (error) {
        toast.error('Erro ao eliminar pagamentos: ' + error.message)
        return
      }
      toast.success(`${selectedIds.length} pagamento(s) eliminado(s) com sucesso.`)
      setSelectedIds([])
      setShowBulkDeleteModal(false)
      fetchDashboardData(true)
    } catch (err) {
      toast.error('Falha inesperada.')
    } finally {
      setBulkDeleting(false)
    }
  }

  const toggleSelect = (id) =>
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]))

  const toggleSelectAll = () =>
    setSelectedIds((prev) => (prev.length === payments.length ? [] : payments.map((p) => p.id)))

  const copyReference = (ref) => {
    navigator.clipboard.writeText(ref).then(
      () => toast.success('Referência copiada!'),
      () => toast.error('Não foi possível copiar.')
    )
  }

  // Build bar chart data for last 14 days
  const last14Days = getLastNDays(14)
  const breakdownMap = {}
  ;(accessStats.daily_breakdown || []).forEach((d) => {
    breakdownMap[d.date] = d.count
  })
  const chartData = last14Days.map((date) => ({
    date,
    count: breakdownMap[date] || 0,
    label: new Date(date + 'T12:00:00').toLocaleDateString('pt-AO', {
      day: '2-digit',
      month: 'short',
    }),
  }))

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="loading-spinner" />
      </div>
    )
  }

  return (
    <>
      {/* Modal — Zerar período de métricas */}
      <ConfirmDialog
        open={showResetModal}
        variant="warning"
        title="Zerar Período de Métricas"
        message="Esta acção redefine o início do período de contagem para o momento actual. Os cards passarão a mostrar apenas os registos a partir de agora."
        detail="Dados históricos não serão eliminados."
        confirmLabel="Confirmar"
        cancelLabel="Cancelar"
        loading={resetting}
        onConfirm={handleResetStats}
        onCancel={() => setShowResetModal(false)}
      />

      {/* Modal — Eliminar pagamento individual */}
      <ConfirmDialog
        open={!!deleteTarget}
        variant="danger"
        title="Eliminar Pagamento"
        message={
          deleteTarget
            ? <>Tens a certeza que queres eliminar o pagamento com referência <span className="font-mono text-white font-medium">{deleteTarget.reference_code}</span>?</>
            : null
        }
        detail="Esta acção é irreversível. O registo será permanentemente eliminado."
        confirmLabel="Eliminar"
        cancelLabel="Cancelar"
        loading={deleting}
        onConfirm={handleDeletePayment}
        onCancel={() => setDeleteTarget(null)}
      />

      {/* Modal — Eliminação em massa */}
      <ConfirmDialog
        open={showBulkDeleteModal}
        variant="danger"
        title="Eliminar Seleccionados"
        message={<>Tens a certeza que queres eliminar <span className="text-white font-bold">{selectedIds.length}</span> pagamento(s) seleccionado(s)?</>}
        detail="Esta acção é irreversível. Os registos serão permanentemente eliminados."
        confirmLabel={`Eliminar ${selectedIds.length}`}
        cancelLabel="Cancelar"
        loading={bulkDeleting}
        onConfirm={handleBulkDelete}
        onCancel={() => setShowBulkDeleteModal(false)}
      />

      <div className="min-h-screen pb-16">
        {/* ── Header ── */}
        <header className="glass sticky top-0 z-40">
          <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
            <Link
              to="/dashboard"
              className="flex items-center gap-2 text-dark-400 hover:text-white transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
              <span className="text-sm font-medium">Voltar ao Dashboard</span>
            </Link>

            <div className="flex items-center gap-4">
              <button
                onClick={() => fetchDashboardData(true)}
                disabled={refreshing}
                className="flex items-center gap-2 text-dark-400 hover:text-white transition-colors text-sm"
                title="Actualizar dados"
              >
                <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin text-primary-400' : ''}`} />
              </button>
              <div className="flex items-center gap-2">
                <Shield className="w-4 h-4 text-primary-400" />
                <span className="text-sm font-medium text-primary-400">Admin Activo</span>
              </div>
            </div>
          </div>
        </header>

        <main className="max-w-7xl mx-auto px-6 pt-10">
          {/* ── Page Title ── */}
          <div className="mb-8">
            <h1 className="text-4xl font-display font-bold text-white mb-1">Painel de Controlo</h1>
            <p className="text-dark-300">Gestão completa da plataforma AngolanTCC AI.</p>
          </div>

          {/* ── Tabs ── */}
          <div className="flex gap-1 p-1 bg-white/5 rounded-xl mb-8 w-fit">
            {TABS.map((tab, i) => (
              <button
                key={tab}
                onClick={() => setActiveTab(i)}
                className={`px-5 py-2.5 rounded-lg text-sm font-medium transition-all ${
                  activeTab === i
                    ? 'bg-primary-500 text-white shadow-lg'
                    : 'text-dark-300 hover:text-white'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>

          {/* ══════════════════════════════════════════════════════════════
              TAB 1 — VISÃO GERAL
          ══════════════════════════════════════════════════════════════ */}
          {activeTab === 0 && (
            <div>
              {/* Period info bar */}
              <div className="glass-card rounded-xl px-5 py-3.5 mb-6 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2 text-sm text-dark-300">
                  <Calendar className="w-4 h-4 text-primary-400 flex-shrink-0" />
                  <span>
                    Período activo a contar desde:{' '}
                    <span className="text-white font-semibold">{formatDate(stats.stats_since)}</span>
                  </span>
                </div>
                <button
                  onClick={() => setShowResetModal(true)}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg bg-orange-500/10 border border-orange-500/20 text-orange-400 hover:bg-orange-500/20 transition-all text-sm font-medium"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  Zerar Período
                </button>
              </div>

              {/* Stats Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
                <StatCard
                  label="Total Utilizadores"
                  value={stats.total_users}
                  icon={Users}
                  colorClass="border-l-blue-500"
                  bgClass="bg-blue-500/10 text-blue-400"
                />
                <StatCard
                  label="Total Projectos (TCCs)"
                  value={stats.total_projects}
                  icon={FileText}
                  colorClass="border-l-purple-500"
                  bgClass="bg-purple-500/10 text-purple-400"
                />
                <div className="glass-card rounded-2xl p-6 border-l-4 border-l-green-500">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-sm font-medium text-dark-400 mb-1">Receita Total</p>
                      <h3 className="text-2xl font-bold text-white">{formatCurrency(stats.total_revenue)}</h3>
                    </div>
                    <div className="p-3 rounded-xl bg-green-500/10 text-green-400">
                      <Banknote className="w-6 h-6" />
                    </div>
                  </div>
                </div>
                <StatCard
                  label="Pagamentos Pendentes"
                  value={stats.pending_payments}
                  icon={CreditCard}
                  colorClass="border-l-yellow-500"
                  bgClass="bg-yellow-500/10 text-yellow-400"
                />
              </div>

              {/* Quick access stats summary */}
              <div className="glass-card rounded-2xl p-6 mb-6">
                <h2 className="text-lg font-display font-semibold text-white mb-4 flex items-center gap-2">
                  <Activity className="w-5 h-5 text-primary-400" />
                  Resumo de Acessos
                </h2>
                <div className="grid grid-cols-3 gap-4">
                  <div className="text-center p-4 bg-white/5 rounded-xl">
                    <p className="text-3xl font-bold text-white mb-1">{accessStats.today}</p>
                    <p className="text-sm text-dark-400">Hoje</p>
                  </div>
                  <div className="text-center p-4 bg-white/5 rounded-xl">
                    <p className="text-3xl font-bold text-white mb-1">{accessStats.month}</p>
                    <p className="text-sm text-dark-400">Este Mês</p>
                  </div>
                  <div className="text-center p-4 bg-white/5 rounded-xl">
                    <p className="text-3xl font-bold text-white mb-1">{accessStats.year}</p>
                    <p className="text-sm text-dark-400">Este Ano</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ══════════════════════════════════════════════════════════════
              TAB 2 — ACESSOS AO SISTEMA
          ══════════════════════════════════════════════════════════════ */}
          {activeTab === 1 && (
            <div>
              {/* Period cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <div className="glass-card rounded-2xl p-6 border-l-4 border-l-sky-500">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-sm font-medium text-dark-400 mb-1">Acessos Hoje</p>
                      <h3 className="text-4xl font-bold text-white">{accessStats.today}</h3>
                      <p className="text-xs text-dark-500 mt-1">
                        {new Date().toLocaleDateString('pt-AO', { day: '2-digit', month: 'long', year: 'numeric' })}
                      </p>
                    </div>
                    <div className="p-3 rounded-xl bg-sky-500/10 text-sky-400">
                      <Activity className="w-6 h-6" />
                    </div>
                  </div>
                </div>

                <div className="glass-card rounded-2xl p-6 border-l-4 border-l-violet-500">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-sm font-medium text-dark-400 mb-1">Acessos Este Mês</p>
                      <h3 className="text-4xl font-bold text-white">{accessStats.month}</h3>
                      <p className="text-xs text-dark-500 mt-1">
                        {new Date().toLocaleDateString('pt-AO', { month: 'long', year: 'numeric' })}
                      </p>
                    </div>
                    <div className="p-3 rounded-xl bg-violet-500/10 text-violet-400">
                      <TrendingUp className="w-6 h-6" />
                    </div>
                  </div>
                </div>

                <div className="glass-card rounded-2xl p-6 border-l-4 border-l-emerald-500">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-sm font-medium text-dark-400 mb-1">Acessos Este Ano</p>
                      <h3 className="text-4xl font-bold text-white">{accessStats.year}</h3>
                      <p className="text-xs text-dark-500 mt-1">{new Date().getFullYear()}</p>
                    </div>
                    <div className="p-3 rounded-xl bg-emerald-500/10 text-emerald-400">
                      <BarChart2 className="w-6 h-6" />
                    </div>
                  </div>
                </div>
              </div>

              {/* Daily bar chart — last 14 days */}
              <div className="glass-card rounded-2xl p-6">
                <h2 className="text-lg font-display font-semibold text-white mb-1 flex items-center gap-2">
                  <BarChart2 className="w-5 h-5 text-primary-400" />
                  Acessos — Últimos 14 Dias
                </h2>
                <p className="text-sm text-dark-400 mb-6">Cada barra representa os logins registados num dia.</p>

                {chartData.every((d) => d.count === 0) ? (
                  <div className="flex flex-col items-center justify-center py-12 text-dark-500">
                    <Activity className="w-10 h-10 mb-3 opacity-30" />
                    <p className="text-sm">Nenhum acesso registado nos últimos 14 dias.</p>
                    <p className="text-xs mt-1 opacity-60">Os acessos serão registados automaticamente a cada login.</p>
                  </div>
                ) : (
                  <>
                    <MiniBarChart data={chartData} />
                    {/* X-axis labels */}
                    <div className="flex gap-[3px] mt-2">
                      {chartData.map((d, i) => (
                        <div
                          key={i}
                          className={`flex-1 text-center text-[9px] text-dark-500 ${
                            i % 2 === 0 ? 'opacity-100' : 'opacity-0'
                          }`}
                        >
                          {d.label}
                        </div>
                      ))}
                    </div>
                  </>
                )}

                {/* Legend */}
                <div className="mt-6 pt-4 border-t border-white/5 flex flex-wrap gap-6 text-sm text-dark-400">
                  <span className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-sm bg-primary-500/60 inline-block" />
                    Logins por dia
                  </span>
                  <span>
                    Total no período:{' '}
                    <span className="text-white font-semibold">
                      {chartData.reduce((acc, d) => acc + d.count, 0)}
                    </span>
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* ══════════════════════════════════════════════════════════════
              TAB 3 — PAGAMENTOS
          ══════════════════════════════════════════════════════════════ */}
          {activeTab === 2 && (
            <div>
              <h2 className="text-2xl font-display font-semibold mb-6 flex items-center gap-2">
                <CreditCard className="w-6 h-6 text-primary-400" />
                Gestão de Pagamentos
              </h2>

              {/* Barra de acções em massa */}
              {selectedIds.length > 0 && (
                <div className="flex items-center justify-between bg-red-500/10 border border-red-500/20 rounded-xl px-5 py-3 mb-3">
                  <span className="text-sm text-red-300 font-medium">
                    {selectedIds.length} pagamento(s) seleccionado(s)
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setSelectedIds([])}
                      className="text-xs text-dark-400 hover:text-white transition-colors px-3 py-1.5 rounded-lg hover:bg-white/5"
                    >
                      Limpar selecção
                    </button>
                    <button
                      onClick={() => setShowBulkDeleteModal(true)}
                      className="flex items-center gap-2 px-4 py-1.5 rounded-lg bg-red-500/20 border border-red-500/30 text-red-400 hover:bg-red-500/30 transition-all text-sm font-medium"
                    >
                      <Trash2 className="w-4 h-4" />
                      Eliminar seleccionados
                    </button>
                  </div>
                </div>
              )}

              <div className="glass-card rounded-2xl overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-white/5 text-dark-300 border-b border-white/10">
                      <tr>
                        <th className="px-4 py-4 w-10">
                          <input
                            type="checkbox"
                            checked={payments.length > 0 && selectedIds.length === payments.length}
                            ref={(el) => {
                              if (el) el.indeterminate = selectedIds.length > 0 && selectedIds.length < payments.length
                            }}
                            onChange={toggleSelectAll}
                            className="w-4 h-4 rounded border-white/20 bg-white/5 accent-primary-500 cursor-pointer"
                            title="Seleccionar todos"
                          />
                        </th>
                        <th className="px-4 py-4 font-medium">Ref. Pagamento</th>
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
                          <td colSpan="7" className="px-6 py-10 text-center text-dark-400">
                            Nenhum pagamento encontrado.
                          </td>
                        </tr>
                      ) : (
                        payments.map((p) => (
                          <tr
                            key={p.id}
                            className={`hover:bg-white/5 transition-colors ${selectedIds.includes(p.id) ? 'bg-primary-500/5' : ''}`}
                          >
                            <td className="px-4 py-4">
                              <input
                                type="checkbox"
                                checked={selectedIds.includes(p.id)}
                                onChange={() => toggleSelect(p.id)}
                                className="w-4 h-4 rounded border-white/20 bg-white/5 accent-primary-500 cursor-pointer"
                              />
                            </td>
                            <td className="px-4 py-4 font-mono text-dark-200 text-xs">{p.reference_code}</td>
                            <td className="px-6 py-4 text-dark-200 max-w-[200px] truncate">
                              {p.projects?.title || 'Projecto Eliminado'}
                            </td>
                            <td className="px-6 py-4 font-medium text-white">{formatCurrency(p.amount)}</td>
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
                              <div className="flex items-center justify-end gap-1">
                                {/* Copiar referência — disponível em todos os estados */}
                                <button
                                  onClick={() => copyReference(p.reference_code)}
                                  className="p-2 text-dark-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
                                  title="Copiar Referência"
                                >
                                  <Copy className="w-4 h-4" />
                                </button>

                                {p.status === 'pendente' && (
                                  <>
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
                                  </>
                                )}

                                {p.status === 'pago' && (
                                  <button
                                    onClick={() => updatePaymentStatus(p.id, 'pendente')}
                                    className="p-2 text-yellow-400 hover:bg-yellow-400/10 rounded-lg transition-colors"
                                    title="Reverter para Pendente"
                                  >
                                    <Undo2 className="w-4 h-4" />
                                  </button>
                                )}

                                {p.status === 'rejeitado' && (
                                  <>
                                    <button
                                      onClick={() => updatePaymentStatus(p.id, 'pago')}
                                      className="p-2 text-green-400 hover:bg-green-400/10 rounded-lg transition-colors"
                                      title="Aprovar Pagamento"
                                    >
                                      <CheckCircle className="w-5 h-5" />
                                    </button>
                                    <button
                                      onClick={() => updatePaymentStatus(p.id, 'pendente')}
                                      className="p-2 text-yellow-400 hover:bg-yellow-400/10 rounded-lg transition-colors"
                                      title="Reverter para Pendente"
                                    >
                                      <Undo2 className="w-4 h-4" />
                                    </button>
                                  </>
                                )}

                                <button
                                  onClick={() => setDeleteTarget(p)}
                                  className="p-2 text-red-400 hover:bg-red-400/10 rounded-lg transition-colors"
                                  title="Eliminar Pagamento"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </>
  )
}
