import { useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { AlertTriangle, Trash2, Info, X } from 'lucide-react'

const VARIANTS = {
  danger: {
    icon: Trash2,
    iconBg: 'bg-red-500/10',
    iconColor: 'text-red-400',
    alertBg: 'bg-red-500/5 border-red-500/20',
    alertText: 'text-red-400',
    confirmBg: 'bg-red-500/15 border-red-500/30 text-red-400 hover:bg-red-500/25',
  },
  warning: {
    icon: AlertTriangle,
    iconBg: 'bg-orange-500/10',
    iconColor: 'text-orange-400',
    alertBg: 'bg-orange-500/5 border-orange-500/20',
    alertText: 'text-orange-400',
    confirmBg: 'bg-orange-500/15 border-orange-500/30 text-orange-400 hover:bg-orange-500/25',
  },
  info: {
    icon: Info,
    iconBg: 'bg-blue-500/10',
    iconColor: 'text-blue-400',
    alertBg: 'bg-blue-500/5 border-blue-500/20',
    alertText: 'text-blue-400',
    confirmBg: 'bg-blue-500/15 border-blue-500/30 text-blue-400 hover:bg-blue-500/25',
  },
}

const overlayVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.2 } },
  exit: { opacity: 0, transition: { duration: 0.15 } },
}

const dialogVariants = {
  hidden: { opacity: 0, scale: 0.92, y: 12 },
  visible: { opacity: 1, scale: 1, y: 0, transition: { duration: 0.22, ease: 'easeOut' } },
  exit: { opacity: 0, scale: 0.94, y: 8, transition: { duration: 0.15 } },
}

/**
 * ConfirmDialog — modal de confirmação reutilizável.
 *
 * Props:
 *   open          boolean          — visibilidade do modal
 *   variant       'danger' | 'warning' | 'info'  — esquema de cor
 *   title         string           — título do modal
 *   message       string | node    — mensagem principal
 *   detail        string | node    — texto da caixa de destaque (opcional)
 *   confirmLabel  string           — texto do botão de confirmar
 *   cancelLabel   string           — texto do botão de cancelar
 *   loading       boolean          — estado de carregamento no botão confirmar
 *   onConfirm     () => void       — callback ao confirmar
 *   onCancel      () => void       — callback ao cancelar / fechar
 */
export default function ConfirmDialog({
  open,
  variant = 'danger',
  title = 'Confirmar acção',
  message,
  detail,
  confirmLabel = 'Confirmar',
  cancelLabel = 'Cancelar',
  loading = false,
  onConfirm,
  onCancel,
}) {
  const v = VARIANTS[variant] ?? VARIANTS.danger
  const Icon = v.icon

  const handleKeyDown = useCallback(
    (e) => {
      if (!open) return
      if (e.key === 'Escape') onCancel?.()
    },
    [open, onCancel]
  )

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [handleKeyDown])

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          key="overlay"
          variants={overlayVariants}
          initial="hidden"
          animate="visible"
          exit="exit"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm px-4"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) onCancel?.()
          }}
        >
          <motion.div
            key="dialog"
            variants={dialogVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            className="glass-card rounded-2xl p-8 max-w-md w-full shadow-2xl relative"
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="confirm-dialog-title"
            aria-describedby="confirm-dialog-desc"
          >
            {/* Botão fechar no canto */}
            <button
              onClick={onCancel}
              disabled={loading}
              className="absolute top-4 right-4 p-1.5 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-50 transition-all"
              aria-label="Fechar"
            >
              <X className="w-4 h-4" />
            </button>

            {/* Cabeçalho */}
            <div className="flex items-center gap-3 mb-4 pr-6">
              <div className={`p-3 rounded-xl ${v.iconBg} flex-shrink-0`}>
                <Icon className={`w-6 h-6 ${v.iconColor}`} />
              </div>
              <h3
                id="confirm-dialog-title"
                className="text-xl font-display font-bold text-slate-900 leading-tight"
              >
                {title}
              </h3>
            </div>

            {/* Mensagem principal */}
            {message && (
              <p
                id="confirm-dialog-desc"
                className="text-slate-500 mb-3 leading-relaxed"
              >
                {message}
              </p>
            )}

            {/* Caixa de destaque */}
            {detail && (
              <div className={`border rounded-xl px-4 py-3 mb-6 ${v.alertBg}`}>
                <p className={`text-sm font-medium flex items-center gap-2 ${v.alertText}`}>
                  <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                  {detail}
                </p>
              </div>
            )}

            {/* Acções */}
            <div className="flex gap-3 mt-6">
              <button
                onClick={onCancel}
                disabled={loading}
                className="flex-1 px-4 py-3 rounded-xl border border-slate-200 text-slate-500 hover:text-slate-900 hover:border-slate-200 transition-all text-sm font-medium"
              >
                {cancelLabel}
              </button>
              <button
                onClick={onConfirm}
                disabled={loading}
                className={`flex-1 px-4 py-3 rounded-xl border transition-all text-sm font-medium flex items-center justify-center gap-2 ${v.confirmBg}`}
              >
                {loading ? (
                  <div className="loading-spinner" />
                ) : (
                  <>
                    <Icon className="w-4 h-4" />
                    {confirmLabel}
                  </>
                )}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
