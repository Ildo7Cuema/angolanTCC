import { motion } from 'framer-motion'
import { useId, useState } from 'react'

/**
 * Tabs — controlado ou não-controlado.
 *
 * Props:
 *  - tabs: [{ id, label, icon?, disabled? }]
 *  - value (controlado) | defaultValue
 *  - onChange(id)
 *  - variant: 'pill' | 'underline'
 *  - size: 'sm' | 'md'
 *  - fullWidth
 */
export default function Tabs({
  tabs = [],
  value,
  defaultValue,
  onChange,
  variant = 'pill',
  size = 'md',
  fullWidth = false,
  className = '',
}) {
  const [internal, setInternal] = useState(defaultValue ?? tabs[0]?.id)
  const active = value ?? internal
  // ID único por instância — evita colisão de `layoutId` quando há vários
  // <Tabs> simultâneos no mesmo viewport (caso contrário o Framer Motion
  // tenta animar a mesma "pílula" entre componentes diferentes).
  const layoutKey = useId()

  const handleClick = (id) => {
    if (value === undefined) setInternal(id)
    onChange?.(id)
  }

  const sizeCls = size === 'sm' ? 'h-9 px-3 text-xs gap-1.5' : 'h-10 px-4 text-sm gap-2'

  if (variant === 'underline') {
    return (
      <div className={`relative border-b border-dark-100 ${className}`}>
        <div className={`flex ${fullWidth ? 'w-full' : ''} overflow-x-auto scrollbar-hide`}>
          {tabs.map((t) => {
            const isActive = active === t.id
            return (
              <button
                key={t.id}
                onClick={() => !t.disabled && handleClick(t.id)}
                disabled={t.disabled}
                className={[
                  'relative inline-flex items-center justify-center whitespace-nowrap font-medium transition-colors',
                  sizeCls,
                  fullWidth ? 'flex-1' : '',
                  isActive ? 'text-primary-600' : 'text-dark-500 hover:text-dark-900',
                  t.disabled ? 'opacity-50 cursor-not-allowed' : '',
                ].join(' ')}
              >
                {t.icon && <t.icon className="w-4 h-4" />}
                {t.label}
                {isActive && (
                  <motion.span
                    layoutId={`tab-underline-${layoutKey}`}
                    className="absolute -bottom-px left-2 right-2 h-0.5 bg-primary-600 rounded-full"
                    transition={{ type: 'spring', stiffness: 380, damping: 32 }}
                  />
                )}
              </button>
            )
          })}
        </div>
      </div>
    )
  }

  // pill (default)
  return (
    <div
      className={[
        'relative inline-flex p-1 rounded-xl bg-dark-100/70 border border-dark-200/60',
        fullWidth ? 'w-full' : '',
        className,
      ].join(' ')}
      role="tablist"
    >
      {tabs.map((t) => {
        const isActive = active === t.id
        return (
          <button
            key={t.id}
            role="tab"
            aria-selected={isActive}
            disabled={t.disabled}
            onClick={() => !t.disabled && handleClick(t.id)}
            className={[
              'relative inline-flex items-center justify-center whitespace-nowrap font-medium rounded-lg transition-colors',
              sizeCls,
              fullWidth ? 'flex-1' : '',
              isActive ? 'text-dark-900' : 'text-dark-500 hover:text-dark-900',
              t.disabled ? 'opacity-50 cursor-not-allowed' : '',
            ].join(' ')}
          >
            {isActive && (
              <motion.span
                layoutId={`tab-pill-${layoutKey}`}
                className="absolute inset-0 rounded-lg bg-white shadow-sm border border-dark-200/40"
                transition={{ type: 'spring', stiffness: 380, damping: 32 }}
              />
            )}
            <span className="relative inline-flex items-center gap-1.5">
              {t.icon && <t.icon className="w-4 h-4" />}
              {t.label}
            </span>
          </button>
        )
      })}
    </div>
  )
}
