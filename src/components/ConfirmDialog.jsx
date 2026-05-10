import { useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { AlertTriangle, Trash2, Info, X, Loader2 } from 'lucide-react'

const VARIANTS = {
  danger: {
    icon: Trash2,
    iconBg: 'bg-danger-50',
    iconColor: 'text-danger-600',
    alertBg: 'bg-danger-50/80 border-danger-100',
    alertText: 'text-danger-700',
    confirmCls: 'bg-gradient-to-br from-danger-600 to-danger-500 text-white shadow-md hover:shadow-lg hover:-translate-y-px',
  },
  warning: {
    icon: AlertTriangle,
    iconBg: 'bg-warning-50',
    iconColor: 'text-warning-600',
    alertBg: 'bg-warning-50/80 border-warning-100',
    alertText: 'text-warning-700',
    confirmCls: 'bg-gradient-to-br from-warning-600 to-warning-500 text-white shadow-md hover:shadow-lg hover:-translate-y-px',
  },
  info: {
    icon: Info,
    iconBg: 'bg-info-50',
    iconColor: 'text-info-600',
    alertBg: 'bg-info-50/80 border-info-100',
    alertText: 'text-info-700',
    confirmCls: 'bg-gradient-to-br from-info-600 to-info-500 text-white shadow-md hover:shadow-lg hover:-translate-y-px',
  },
}

const overlay = {
  hidden:  { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.18 } },
  exit:    { opacity: 0, transition: { duration: 0.14 } },
}

/**
 * ConfirmDialog premium — em mobile sobe como bottom sheet,
 * em desktop aparece como modal centrado com spring animation.
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
      if (e.key === 'Escape' && !loading) onCancel?.()
    },
    [open, onCancel, loading],
  )

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown)
    if (open) {
      const prev = document.body.style.overflow
      document.body.style.overflow = 'hidden'
      return () => {
        document.removeEventListener('keydown', handleKeyDown)
        document.body.style.overflow = prev
      }
    }
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [handleKeyDown, open])

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          key="ovl"
          variants={overlay}
          initial="hidden"
          animate="visible"
          exit="exit"
          className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-dark-900/50 backdrop-blur-sm sm:p-4"
          onMouseDown={(e) => {
            if (!loading && e.target === e.currentTarget) onCancel?.()
          }}
        >
          <motion.div
            key="dlg"
            initial={{ y: '100%', opacity: 0.6, scale: 1 }}
            animate={{ y: 0,        opacity: 1,   scale: 1 }}
            exit   ={{ y: '100%', opacity: 0,   scale: 0.98 }}
            transition={{ type: 'spring', stiffness: 360, damping: 32, mass: 0.7 }}
            drag="y"
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0, bottom: 0.4 }}
            onDragEnd={(_, info) => {
              if (!loading && (info.offset.y > 120 || info.velocity.y > 600)) onCancel?.()
            }}
            className={[
              'w-full sm:max-w-md bg-white border-t sm:border border-dark-100',
              'rounded-t-3xl sm:rounded-3xl shadow-2xl pb-safe sm:pb-0',
              'p-6 sm:p-7 relative',
            ].join(' ')}
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="cd-title"
            aria-describedby="cd-desc"
          >
            {/* drag handle (mobile) */}
            <div className="sm:hidden -mt-3 mb-3"><div className="sheet-handle" /></div>

            {/* close */}
            <button
              onClick={onCancel}
              disabled={loading}
              className="absolute top-4 right-4 btn-icon"
              aria-label="Fechar"
            >
              <X className="w-4 h-4" />
            </button>

            {/* head */}
            <div className="flex items-center gap-3.5 mb-4 pr-8">
              <div className={`p-3 rounded-2xl flex-shrink-0 ring-1 ring-inset ring-current/10 ${v.iconBg}`}>
                <Icon className={`w-6 h-6 ${v.iconColor}`} />
              </div>
              <h3
                id="cd-title"
                className="text-lg sm:text-xl font-display font-bold text-dark-900 leading-tight"
              >
                {title}
              </h3>
            </div>

            {message && (
              <p id="cd-desc" className="text-dark-600 text-sm leading-relaxed mb-3">
                {message}
              </p>
            )}

            {detail && (
              <div className={`border rounded-xl px-4 py-3 mb-5 ${v.alertBg}`}>
                <p className={`text-sm font-medium flex items-start gap-2 ${v.alertText}`}>
                  <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                  <span>{detail}</span>
                </p>
              </div>
            )}

            {/* actions */}
            <div className="flex flex-col-reverse sm:flex-row gap-2.5 mt-6">
              <button
                onClick={onCancel}
                disabled={loading}
                className="flex-1 h-11 px-4 rounded-xl border border-dark-200 text-dark-700 hover:bg-dark-50 transition-all text-sm font-medium disabled:opacity-50"
              >
                {cancelLabel}
              </button>
              <button
                onClick={onConfirm}
                disabled={loading}
                className={`flex-1 h-11 px-4 rounded-xl transition-all text-sm font-semibold flex items-center justify-center gap-2 ${v.confirmCls} disabled:opacity-60`}
              >
                {loading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
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
