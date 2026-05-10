import { useEffect } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { X } from 'lucide-react'

/**
 * Modal — versão refinada do legacy Modal.
 * Em mobile vira bottom sheet; em desktop modal centrado.
 *
 * Mantém a API antiga: open, onClose, title, icon, children, maxWidth.
 */
export default function Modal({
  open,
  onClose,
  title,
  icon,
  children,
  maxWidth = 'max-w-md',
  dismissible = true,
}) {
  useEffect(() => {
    if (!open) return
    const onKey = (e) => { if (e.key === 'Escape' && dismissible) onClose?.() }
    document.addEventListener('keydown', onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = prev
    }
  }, [open, onClose, dismissible])

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-dark-900/45 backdrop-blur-sm sm:p-4"
          onClick={(e) => { if (dismissible && e.target === e.currentTarget) onClose?.() }}
        >
          <motion.div
            initial={{ y: 40, opacity: 0, scale: 0.98 }}
            animate={{ y: 0,  opacity: 1, scale: 1 }}
            exit   ={{ y: 20, opacity: 0, scale: 0.98 }}
            transition={{ type: 'spring', stiffness: 380, damping: 32 }}
            onClick={(e) => e.stopPropagation()}
            className={[
              'w-full bg-white sm:border border-t border-dark-100',
              'rounded-t-3xl sm:rounded-3xl shadow-2xl pb-safe sm:pb-0 p-6 sm:p-7',
              `sm:${maxWidth}`,
            ].join(' ')}
            role="dialog"
            aria-modal="true"
          >
            <div className="sm:hidden -mt-3 mb-3"><div className="sheet-handle" /></div>
            <div className="flex items-start justify-between gap-3 mb-4">
              {icon && <div className="flex-shrink-0">{icon}</div>}
              {dismissible && (
                <button
                  onClick={onClose}
                  className="btn-icon ml-auto"
                  aria-label="Fechar"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
            {title && (
              <h2 className="text-lg sm:text-xl font-display font-bold text-dark-900 mb-3">{title}</h2>
            )}
            {children}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
