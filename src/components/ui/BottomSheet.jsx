import { useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X } from 'lucide-react'

/**
 * BottomSheet — modal nativo de mobile (slide-up).
 * Em desktop comporta-se como modal centrado normal (max-w configurável).
 *
 * Props:
 *  - open
 *  - onClose
 *  - title
 *  - children
 *  - mobileOnly  (se true, em desktop usa overlay-modal centrado)
 *  - maxWidth    (desktop)
 *  - dismissible (default true)
 *  - showHandle  (default true em mobile)
 */
export default function BottomSheet({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  maxWidth = 'max-w-lg',
  dismissible = true,
  showHandle = true,
  className = '',
}) {
  useEffect(() => {
    if (!open) return
    const onKey = (e) => { if (e.key === 'Escape' && dismissible) onClose?.() }
    document.addEventListener('keydown', onKey)
    // bloqueia scroll do body
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
          key="ovl"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-[100] bg-dark-900/40 backdrop-blur-sm flex items-end sm:items-center justify-center sm:p-4"
          onMouseDown={(e) => {
            if (dismissible && e.target === e.currentTarget) onClose?.()
          }}
        >
          <motion.div
            key="sheet"
            initial={{ y: '100%', opacity: 0.5 }}
            animate={{ y: 0,        opacity: 1   }}
            exit={{    y: '100%', opacity: 0   }}
            transition={{ type: 'spring', stiffness: 320, damping: 32, mass: 0.7 }}
            drag={dismissible ? 'y' : false}
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0, bottom: 0.4 }}
            onDragEnd={(_, info) => {
              if (info.offset.y > 120 || info.velocity.y > 600) onClose?.()
            }}
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby={title ? 'sheet-title' : undefined}
            className={[
              'w-full sm:w-auto bg-white sm:rounded-2xl rounded-t-3xl border-t border-x sm:border border-dark-100',
              'shadow-2xl pb-safe',
              `sm:${maxWidth}`,
              'sm:max-h-[88vh] max-h-[92vh] flex flex-col',
              className,
            ].join(' ')}
          >
            {/* drag handle (apenas mobile) */}
            {showHandle && (
              <div className="pt-2.5 pb-1 sm:hidden">
                <div className="sheet-handle" />
              </div>
            )}

            {/* header */}
            {(title || dismissible) && (
              <div className="px-5 pt-4 pb-3 sm:pt-6 flex items-start gap-3">
                <div className="flex-1 min-w-0">
                  {title && (
                    <h2 id="sheet-title" className="text-lg font-display font-bold text-dark-900">
                      {title}
                    </h2>
                  )}
                  {description && (
                    <p className="text-sm text-dark-500 mt-0.5">{description}</p>
                  )}
                </div>
                {dismissible && (
                  <button
                    onClick={onClose}
                    className="btn-icon"
                    aria-label="Fechar"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
            )}

            {/* body */}
            <div className="px-5 pb-5 sm:pb-6 overflow-y-auto flex-1 min-h-0">
              {children}
            </div>

            {/* footer (sticky) */}
            {footer && (
              <div className="px-5 pt-3 pb-4 sm:pb-5 border-t border-dark-100 bg-white/80 backdrop-blur-md sticky bottom-0">
                {footer}
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
