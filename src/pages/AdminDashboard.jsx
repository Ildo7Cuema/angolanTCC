import { useState, useEffect, useCallback, useMemo } from 'react'
import { supabase } from '../lib/supabase'
import { motion } from 'framer-motion'
import {
  Users, FileText, CreditCard, Banknote, CheckCircle, XCircle, Clock,
  Activity, AlertTriangle, Calendar, RotateCcw, Shield, TrendingUp,
  BarChart2, RefreshCw, Copy, Undo2, Trash2, Search,
} from 'lucide-react'
import toast from 'react-hot-toast'
import ConfirmDialog from '../components/ConfirmDialog'
import Navbar from '../components/Navbar'
import PageLayout from '../components/PageLayout'
import Tabs from '../components/ui/Tabs'
import StatCard from '../components/ui/StatCard'
import { Skeleton } from '../components/ui/Skeleton'
import EmptyState from '../components/ui/EmptyState'
import Button from '../components/ui/Button'

const fadeUp = {
  hidden:  { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.16, 1, 0.3, 1] } },
}

// ─── Helpers ────────────────────────────────────────────────────────────────
function getLastNDays(n) {
  const days = []
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(); d.setDate(d.getDate() - i)
    days.push(d.toISOString().split('T')[0])
  }
  return days
}
function formatDate(dateStr) {
  if (!dateStr) return '—'
  return new Date(dateStr).toLocaleDateString('pt-AO', {
    day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
  })
}
function formatCurrency(value) {
  return `Kz ${new Intl.NumberFormat('pt-AO', {
    minimumFractionDigits: 2, maximumFractionDigits: 2,
  }).format(value || 0)}`
}

// ─── Mini bar chart ────────────────────────────────────────────────────────
function MiniBarChart({ data }) {
  const max = Math.max(...data.map((d) => d.count), 1)
  return (
    <div className="flex items-end gap-1 h-32 sm:h-40 w-full">
      {data.map((d, i) => (
        <div key={i} className="flex-1 flex flex-col items-center gap-1 group relative">
          <div
            className="w-full rounded-t-md bg-gradient-to-t from-primary-600 to-accent-500 group-hover:from-accent-600 group-hover:to-accent-400 transition-all duration-300 min-h-[3px] shadow-sm"
            style={{ height: `${Math.max((d.count / max) * 100, 4)}%` }}
          />
          <div className="absolute -top-9 left-1/2 -translate-x-1/2 bg-dark-900 text-white text-xs rounded-lg px-2.5 py-1 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-10 shadow-lg font-medium">
            {d.label}: <strong>{d.count}</strong>
          </div>
        </div>
      ))}
    </div>
  )
}

// ─── Status pill ───────────────────────────────────────────────────────────
function StatusPill({ status }) {
  const map = {
    pendente:  { cls: 'badge-warning', icon: Clock, text: 'Pendente' },
    pago:      { cls: 'badge-success', icon: CheckCircle, text: 'Aprovado' },
    rejeitado: { cls: 'badge-error',   icon: XCircle, text: 'Rejeitado' },
  }
  const m = map[status] || map.pendente
  const I = m.icon
  return (
    <span className={`badge ${m.cls}`}>
      <I className="w-3.5 h-3.5" /> {m.text}
    </span>
  )
}

// ─── Main ──────────────────────────────────────────────────────────────────
export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState('overview')
  const [stats, setStats] = useState({
    total_users: 0, total_projects: 0, total_revenue: 0,
    pending_payments: 0, stats_since: null,
  })
  const [payments, setPayments] = useState([])
  const [accessStats, setAccessStats] = useState({
    today: 0, month: 0, year: 0, daily_breakdown: [],
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
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')

  const fetchDashboardData = useCallback(async (silent = false) => {
    try {
      if (!silent) setLoading(true); else setRefreshing(true)

      const [statsRes, paymentsRes, accessRes] = await Promise.all([
        supabase.rpc('get_dashboard_stats'),
        supabase.from('payments')
          .select(`id, amount, reference_code, status, created_at, user_id, project_id, projects(title)`)
          .order('created_at', { ascending: false }),
        supabase.rpc('get_access_stats'),
      ])

      if (statsRes.error) {
        console.error('Stats error:', statsRes.error)
        toast.error('Erro ao carregar métricas. Verifique se as migrações SQL foram aplicadas.')
      } else if (statsRes.data) setStats(statsRes.data)

      if (!paymentsRes.error) setPayments(paymentsRes.data || [])
      if (!accessRes.error && accessRes.data) setAccessStats(accessRes.data)
    } catch (err) { console.error(err) }
    finally { setLoading(false); setRefreshing(false) }
  }, [])

  useEffect(() => { fetchDashboardData() }, [fetchDashboardData])

  // ─── Actions ──────────────────────────────────────────────────────────
  const handleResetStats = async () => {
    setResetting(true)
    try {
      const { error } = await supabase.rpc('reset_dashboard_stats')
      if (error) { toast.error('Erro ao zerar período: ' + error.message); return }
      toast.success('Período de estatísticas reiniciado.')
      setShowResetModal(false); fetchDashboardData(true)
    } catch { toast.error('Falha inesperada.') }
    finally { setResetting(false) }
  }

  const updatePaymentStatus = async (paymentId, newStatus) => {
    try {
      const { error } = await supabase.from('payments').update({ status: newStatus }).eq('id', paymentId)
      if (error) { toast.error('Erro ao actualizar pagamento: ' + error.message); return }
      const labels = { pago: 'Aprovado', rejeitado: 'Rejeitado', pendente: 'Pendente' }
      toast.success(`Pagamento marcado como "${labels[newStatus] ?? newStatus}".`)
      fetchDashboardData(true)
    } catch { toast.error('Falha inesperada.') }
  }

  const handleDeletePayment = async () => {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      const { error } = await supabase.from('payments').delete().eq('id', deleteTarget.id)
      if (error) { toast.error('Erro ao eliminar pagamento: ' + error.message); return }
      toast.success('Pagamento eliminado.')
      setDeleteTarget(null); fetchDashboardData(true)
    } catch { toast.error('Falha inesperada.') }
    finally { setDeleting(false) }
  }

  const handleBulkDelete = async () => {
    if (selectedIds.length === 0) return
    setBulkDeleting(true)
    try {
      const { error } = await supabase.from('payments').delete().in('id', selectedIds)
      if (error) { toast.error('Erro ao eliminar: ' + error.message); return }
      toast.success(`${selectedIds.length} pagamento(s) eliminado(s).`)
      setSelectedIds([]); setShowBulkDeleteModal(false); fetchDashboardData(true)
    } catch { toast.error('Falha inesperada.') }
    finally { setBulkDeleting(false) }
  }

  const toggleSelect = (id) =>
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]))
  const toggleSelectAll = () =>
    setSelectedIds((prev) => (prev.length === filteredPayments.length ? [] : filteredPayments.map((p) => p.id)))

  const copyReference = (ref) => {
    navigator.clipboard.writeText(ref).then(
      () => toast.success('Referência copiada!'),
      () => toast.error('Não foi possível copiar.')
    )
  }

  // ─── Derived ──────────────────────────────────────────────────────────
  const last14Days = getLastNDays(14)
  const breakdownMap = {}
  ;(accessStats.daily_breakdown || []).forEach((d) => { breakdownMap[d.date] = d.count })
  const chartData = last14Days.map((date) => ({
    date,
    count: breakdownMap[date] || 0,
    label: new Date(date + 'T12:00:00').toLocaleDateString('pt-AO', { day: '2-digit', month: 'short' }),
  }))

  const filteredPayments = useMemo(() => {
    return payments.filter((p) => {
      const sm = !search ||
        p.reference_code?.toLowerCase().includes(search.toLowerCase()) ||
        p.projects?.title?.toLowerCase().includes(search.toLowerCase())
      const fm = statusFilter === 'all' || p.status === statusFilter
      return sm && fm
    })
  }, [payments, search, statusFilter])

  // ─── Render ────────────────────────────────────────────────────────────
  return (
    <>
      <ConfirmDialog
        open={showResetModal} variant="warning"
        title="Zerar período de métricas"
        message="Esta acção redefine o início do período de contagem para o momento actual. Os cards passarão a mostrar apenas registos a partir de agora."
        detail="Os dados históricos não serão eliminados."
        confirmLabel="Confirmar" cancelLabel="Cancelar"
        loading={resetting} onConfirm={handleResetStats} onCancel={() => setShowResetModal(false)}
      />

      <ConfirmDialog
        open={!!deleteTarget} variant="danger"
        title="Eliminar pagamento"
        message={
          deleteTarget
            ? <>Eliminar o pagamento com referência <span className="font-mono text-dark-900 font-semibold">{deleteTarget.reference_code}</span>?</>
            : null
        }
        detail="Esta acção é irreversível."
        confirmLabel="Eliminar" cancelLabel="Cancelar"
        loading={deleting} onConfirm={handleDeletePayment} onCancel={() => setDeleteTarget(null)}
      />

      <ConfirmDialog
        open={showBulkDeleteModal} variant="danger"
        title="Eliminar seleccionados"
        message={<>Eliminar <span className="text-dark-900 font-bold">{selectedIds.length}</span> pagamento(s)?</>}
        detail="Esta acção é irreversível."
        confirmLabel={`Eliminar ${selectedIds.length}`} cancelLabel="Cancelar"
        loading={bulkDeleting} onConfirm={handleBulkDelete} onCancel={() => setShowBulkDeleteModal(false)}
      />

      <div className="min-h-screen">
        <Navbar
          backTo="/dashboard"
          backLabel="Voltar"
          rightContent={
            <>
              <button
                onClick={() => fetchDashboardData(true)}
                disabled={refreshing}
                className="btn-icon"
                title="Actualizar"
                aria-label="Actualizar"
              >
                <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin text-primary-600' : ''}`} />
              </button>
              <span className="hidden sm:inline-flex items-center gap-1.5 text-xs font-semibold px-3 h-9 rounded-lg bg-primary-50 text-primary-700 ring-1 ring-primary-200">
                <Shield className="w-3.5 h-3.5" /> Admin
              </span>
            </>
          }
        />

        <PageLayout maxWidth="max-w-7xl">
          {/* Title */}
          <motion.div variants={fadeUp} initial="hidden" animate="visible" className="mb-6 sm:mb-8">
            <span className="eyebrow"><Shield className="w-3.5 h-3.5" /> CONSOLE ADMIN</span>
            <h1 className="mt-3 text-3xl sm:text-4xl font-display font-extrabold tracking-tight text-dark-900">
              Painel de Controlo
            </h1>
            <p className="text-dark-500 text-sm sm:text-base mt-1.5">
              Métricas, acessos e gestão de pagamentos da AngolaTCC AI.
            </p>
          </motion.div>

          {/* Tabs */}
          <div className="mb-6 sm:mb-8">
            <Tabs
              variant="pill"
              value={activeTab}
              onChange={setActiveTab}
              tabs={[
                { id: 'overview', label: 'Visão Geral', icon: BarChart2 },
                { id: 'access',   label: 'Acessos',     icon: Activity },
                { id: 'payments', label: 'Pagamentos',  icon: CreditCard },
              ]}
            />
          </div>

          {/* ════ TAB 1 — OVERVIEW ════ */}
          {activeTab === 'overview' && (
            <motion.div variants={fadeUp} initial="hidden" animate="visible">
              {/* Period bar */}
              <div className="glass-card p-4 sm:p-5 mb-5 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2 text-sm text-dark-600">
                  <Calendar className="w-4 h-4 text-primary-600 flex-shrink-0" />
                  <span>
                    Período activo desde:{' '}
                    <span className="text-dark-900 font-semibold">
                      {loading ? '—' : formatDate(stats.stats_since)}
                    </span>
                  </span>
                </div>
                <Button
                  variant="ghost" size="sm" leftIcon={RotateCcw}
                  onClick={() => setShowResetModal(true)}
                  className="!text-warning-700 hover:!bg-warning-50"
                >Zerar período</Button>
              </div>

              {/* Stats grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-8">
                {loading ? (
                  Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-32 rounded-2xl" />)
                ) : (
                  <>
                    <StatCard label="Utilizadores"          value={stats.total_users}    icon={Users}      tone="info"    />
                    <StatCard label="Projectos / TCCs"      value={stats.total_projects} icon={FileText}   tone="primary" />
                    <StatCard label="Receita total"         value={formatCurrency(stats.total_revenue)} icon={Banknote} tone="success" />
                    <StatCard label="Pagamentos pendentes" value={stats.pending_payments} icon={CreditCard} tone="warning" />
                  </>
                )}
              </div>

              {/* Resumo de acessos */}
              <div className="glass-card p-5 sm:p-6">
                <h2 className="text-base sm:text-lg font-display font-bold text-dark-900 mb-4 flex items-center gap-2">
                  <Activity className="w-5 h-5 text-primary-600" /> Resumo de acessos
                </h2>
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { v: accessStats.today, l: 'Hoje',      tone: 'bg-info-50 text-info-700' },
                    { v: accessStats.month, l: 'Este mês',  tone: 'bg-primary-50 text-primary-700' },
                    { v: accessStats.year,  l: 'Este ano',  tone: 'bg-success-50 text-success-700' },
                  ].map((s) => (
                    <div key={s.l} className={`text-center p-4 sm:p-5 rounded-2xl ${s.tone} ring-1 ring-current/10`}>
                      <p className="text-2xl sm:text-3xl font-display font-extrabold tracking-tight">{s.v}</p>
                      <p className="text-xs sm:text-sm font-medium opacity-80 mt-1">{s.l}</p>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          )}

          {/* ════ TAB 2 — ACCESS ════ */}
          {activeTab === 'access' && (
            <motion.div variants={fadeUp} initial="hidden" animate="visible">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 mb-6">
                <StatCard label="Acessos hoje"     value={accessStats.today} icon={Activity} tone="info"
                  helperText={new Date().toLocaleDateString('pt-AO', { day: '2-digit', month: 'long' })} />
                <StatCard label="Acessos este mês" value={accessStats.month} icon={TrendingUp} tone="primary"
                  helperText={new Date().toLocaleDateString('pt-AO', { month: 'long', year: 'numeric' })} />
                <StatCard label="Acessos este ano" value={accessStats.year}  icon={BarChart2} tone="success"
                  helperText={String(new Date().getFullYear())} />
              </div>

              <div className="glass-card p-5 sm:p-6">
                <div className="flex items-start justify-between flex-wrap gap-2 mb-5">
                  <div>
                    <h2 className="text-base sm:text-lg font-display font-bold text-dark-900 flex items-center gap-2">
                      <BarChart2 className="w-5 h-5 text-primary-600" />
                      Acessos · últimos 14 dias
                    </h2>
                    <p className="text-xs sm:text-sm text-dark-500 mt-0.5">
                      Cada barra representa os logins registados num dia.
                    </p>
                  </div>
                  <span className="badge badge-info">
                    Total: {chartData.reduce((acc, d) => acc + d.count, 0)}
                  </span>
                </div>

                {chartData.every((d) => d.count === 0) ? (
                  <EmptyState
                    icon={Activity} size="sm"
                    title="Sem acessos registados"
                    description="Os logins serão registados automaticamente."
                  />
                ) : (
                  <>
                    <MiniBarChart data={chartData} />
                    <div className="flex gap-1 mt-2">
                      {chartData.map((d, i) => (
                        <div
                          key={i}
                          className={`flex-1 text-center text-[9px] text-dark-400 ${i % 2 === 0 ? 'opacity-100' : 'opacity-0'}`}
                        >{d.label}</div>
                      ))}
                    </div>
                  </>
                )}
              </div>
            </motion.div>
          )}

          {/* ════ TAB 3 — PAYMENTS ════ */}
          {activeTab === 'payments' && (
            <motion.div variants={fadeUp} initial="hidden" animate="visible">
              {/* Toolbar */}
              <div className="flex flex-col sm:flex-row gap-3 mb-4">
                <div className="relative flex-1">
                  <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-dark-400 pointer-events-none" />
                  <input
                    type="text"
                    placeholder="Pesquisar por referência ou projecto…"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="input-field pl-10 h-11"
                  />
                </div>
                <Tabs
                  size="sm"
                  value={statusFilter}
                  onChange={setStatusFilter}
                  tabs={[
                    { id: 'all',       label: 'Todos' },
                    { id: 'pendente',  label: 'Pendentes' },
                    { id: 'pago',      label: 'Aprovados' },
                    { id: 'rejeitado', label: 'Rejeitados' },
                  ]}
                />
              </div>

              {/* Bulk actions */}
              {selectedIds.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
                  className="flex flex-wrap items-center justify-between gap-3 bg-danger-50 border border-danger-100 rounded-2xl px-4 py-3 mb-3"
                >
                  <span className="text-sm text-danger-700 font-semibold">
                    {selectedIds.length} pagamento(s) seleccionado(s)
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setSelectedIds([])}
                      className="btn-ghost text-xs"
                    >Limpar</button>
                    <Button
                      size="sm" variant="danger"
                      leftIcon={Trash2}
                      onClick={() => setShowBulkDeleteModal(true)}
                    >Eliminar</Button>
                  </div>
                </motion.div>
              )}

              {/* Table desktop */}
              <div className="glass-card p-0 overflow-hidden hidden md:block">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-dark-50/60 text-dark-500 border-b border-dark-100">
                      <tr>
                        <th className="px-4 py-3.5 w-10">
                          <input
                            type="checkbox"
                            checked={filteredPayments.length > 0 && selectedIds.length === filteredPayments.length}
                            ref={(el) => { if (el) el.indeterminate = selectedIds.length > 0 && selectedIds.length < filteredPayments.length }}
                            onChange={toggleSelectAll}
                            className="w-4 h-4 rounded border-dark-300 accent-primary-600 cursor-pointer"
                            title="Seleccionar todos"
                          />
                        </th>
                        <th className="px-4 py-3.5 font-semibold text-xs uppercase tracking-wider">Referência</th>
                        <th className="px-4 py-3.5 font-semibold text-xs uppercase tracking-wider">Projecto</th>
                        <th className="px-4 py-3.5 font-semibold text-xs uppercase tracking-wider">Valor</th>
                        <th className="px-4 py-3.5 font-semibold text-xs uppercase tracking-wider">Data</th>
                        <th className="px-4 py-3.5 font-semibold text-xs uppercase tracking-wider">Estado</th>
                        <th className="px-4 py-3.5 font-semibold text-xs uppercase tracking-wider text-right">Acções</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-dark-100">
                      {loading ? (
                        Array.from({ length: 5 }).map((_, i) => (
                          <tr key={i}><td colSpan="7" className="p-3"><Skeleton className="h-10" /></td></tr>
                        ))
                      ) : filteredPayments.length === 0 ? (
                        <tr><td colSpan="7" className="p-0">
                          <EmptyState
                            icon={CreditCard} size="sm"
                            title="Nenhum pagamento"
                            description={search || statusFilter !== 'all' ? 'Ajuste os filtros para ver mais resultados.' : 'Não existem pagamentos registados.'}
                          />
                        </td></tr>
                      ) : (
                        filteredPayments.map((p) => (
                          <tr
                            key={p.id}
                            className={`transition-colors ${selectedIds.includes(p.id) ? 'bg-primary-50/40' : 'hover:bg-dark-50/40'}`}
                          >
                            <td className="px-4 py-3">
                              <input
                                type="checkbox"
                                checked={selectedIds.includes(p.id)}
                                onChange={() => toggleSelect(p.id)}
                                className="w-4 h-4 rounded border-dark-300 accent-primary-600 cursor-pointer"
                              />
                            </td>
                            <td className="px-4 py-3 font-mono font-semibold text-dark-900 text-xs">{p.reference_code}</td>
                            <td className="px-4 py-3 text-dark-700 max-w-[220px] truncate">{p.projects?.title || <span className="italic text-dark-400">Projecto eliminado</span>}</td>
                            <td className="px-4 py-3 font-semibold text-dark-900 whitespace-nowrap">{formatCurrency(p.amount)}</td>
                            <td className="px-4 py-3 text-dark-500 whitespace-nowrap text-xs">{new Date(p.created_at).toLocaleDateString('pt-AO')}</td>
                            <td className="px-4 py-3"><StatusPill status={p.status} /></td>
                            <td className="px-4 py-3">
                              <div className="flex items-center justify-end gap-1">
                                <button onClick={() => copyReference(p.reference_code)} className="btn-icon w-8 h-8" title="Copiar referência">
                                  <Copy className="w-3.5 h-3.5" />
                                </button>
                                {p.status === 'pendente' && (
                                  <>
                                    <button onClick={() => updatePaymentStatus(p.id, 'pago')} className="btn-icon w-8 h-8 !text-success-600 hover:!bg-success-50" title="Aprovar">
                                      <CheckCircle className="w-4 h-4" />
                                    </button>
                                    <button onClick={() => updatePaymentStatus(p.id, 'rejeitado')} className="btn-icon w-8 h-8 !text-danger-600 hover:!bg-danger-50" title="Rejeitar">
                                      <XCircle className="w-4 h-4" />
                                    </button>
                                  </>
                                )}
                                {p.status === 'pago' && (
                                  <button onClick={() => updatePaymentStatus(p.id, 'pendente')} className="btn-icon w-8 h-8 !text-warning-600 hover:!bg-warning-50" title="Reverter">
                                    <Undo2 className="w-3.5 h-3.5" />
                                  </button>
                                )}
                                {p.status === 'rejeitado' && (
                                  <>
                                    <button onClick={() => updatePaymentStatus(p.id, 'pago')} className="btn-icon w-8 h-8 !text-success-600 hover:!bg-success-50" title="Aprovar">
                                      <CheckCircle className="w-4 h-4" />
                                    </button>
                                    <button onClick={() => updatePaymentStatus(p.id, 'pendente')} className="btn-icon w-8 h-8 !text-warning-600 hover:!bg-warning-50" title="Reverter">
                                      <Undo2 className="w-3.5 h-3.5" />
                                    </button>
                                  </>
                                )}
                                <button onClick={() => setDeleteTarget(p)} className="btn-icon w-8 h-8 !text-danger-500 hover:!bg-danger-50" title="Eliminar">
                                  <Trash2 className="w-3.5 h-3.5" />
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

              {/* Cards mobile */}
              <div className="md:hidden space-y-3">
                {loading ? (
                  Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-32 rounded-2xl" />)
                ) : filteredPayments.length === 0 ? (
                  <EmptyState icon={CreditCard} title="Nenhum pagamento" />
                ) : (
                  filteredPayments.map((p) => (
                    <div key={p.id} className={`glass-card p-4 ${selectedIds.includes(p.id) ? 'ring-2 ring-primary-300' : ''}`}>
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <input
                            type="checkbox"
                            checked={selectedIds.includes(p.id)}
                            onChange={() => toggleSelect(p.id)}
                            className="w-4 h-4 rounded border-dark-300 accent-primary-600 cursor-pointer flex-shrink-0"
                          />
                          <p className="font-mono font-bold text-sm text-dark-900 truncate">{p.reference_code}</p>
                        </div>
                        <StatusPill status={p.status} />
                      </div>
                      <p className="text-sm text-dark-700 mb-1 line-clamp-1">{p.projects?.title || <span className="italic text-dark-400">Projecto eliminado</span>}</p>
                      <div className="flex items-center justify-between mt-2 pt-2 border-t border-dark-100">
                        <span className="font-semibold text-dark-900">{formatCurrency(p.amount)}</span>
                        <span className="text-xs text-dark-400">{new Date(p.created_at).toLocaleDateString('pt-AO')}</span>
                      </div>
                      <div className="flex flex-wrap gap-1.5 mt-3 pt-3 border-t border-dark-100">
                        <button onClick={() => copyReference(p.reference_code)} className="btn-ghost text-xs flex items-center gap-1.5">
                          <Copy className="w-3.5 h-3.5" /> Copiar
                        </button>
                        {p.status !== 'pago' && (
                          <button onClick={() => updatePaymentStatus(p.id, 'pago')} className="text-xs px-3 py-1.5 rounded-lg bg-success-50 text-success-700 font-semibold flex items-center gap-1.5">
                            <CheckCircle className="w-3.5 h-3.5" /> Aprovar
                          </button>
                        )}
                        {p.status === 'pendente' && (
                          <button onClick={() => updatePaymentStatus(p.id, 'rejeitado')} className="text-xs px-3 py-1.5 rounded-lg bg-danger-50 text-danger-700 font-semibold flex items-center gap-1.5">
                            <XCircle className="w-3.5 h-3.5" /> Rejeitar
                          </button>
                        )}
                        {p.status === 'pago' && (
                          <button onClick={() => updatePaymentStatus(p.id, 'pendente')} className="text-xs px-3 py-1.5 rounded-lg bg-warning-50 text-warning-700 font-semibold flex items-center gap-1.5">
                            <Undo2 className="w-3.5 h-3.5" /> Reverter
                          </button>
                        )}
                        <button onClick={() => setDeleteTarget(p)} className="text-xs px-3 py-1.5 rounded-lg bg-danger-50 text-danger-600 font-semibold flex items-center gap-1.5 ml-auto">
                          <Trash2 className="w-3.5 h-3.5" /> Eliminar
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </motion.div>
          )}
        </PageLayout>
      </div>
    </>
  )
}
