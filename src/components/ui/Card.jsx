import { forwardRef } from 'react'

/**
 * Premium Card — base + variants + interactive states.
 *
 * Variants:
 *  - default  → glass-card
 *  - premium  → gradient border on hover
 *  - flat     → sem sombra, apenas border
 *  - elevated → sombra forte, sem hover
 *  - subtle   → fundo super soft
 */
const VARIANTS = {
  default:  'glass-card',
  premium:  'premium-card',
  flat:     'bg-white border border-dark-100 rounded-2xl',
  elevated: 'bg-white border border-dark-100 rounded-2xl shadow-lg',
  subtle:   'bg-dark-50/60 border border-dark-100/60 rounded-2xl',
}

const PADDINGS = {
  none: '',
  sm:   'p-4',
  md:   'p-5',
  lg:   'p-6 sm:p-7',
  xl:   'p-7 sm:p-8',
}

const Card = forwardRef(function Card(
  {
    variant = 'default',
    padding = 'lg',
    interactive = false,
    onClick,
    className = '',
    children,
    as: Tag = 'div',
    ...rest
  },
  ref,
) {
  const isInteractive = interactive || !!onClick
  return (
    <Tag
      ref={ref}
      onClick={onClick}
      className={[
        VARIANTS[variant] ?? VARIANTS.default,
        PADDINGS[padding] ?? PADDINGS.lg,
        isInteractive
          ? 'cursor-pointer transition-transform duration-300 ease-spring hover:-translate-y-0.5 active:translate-y-0'
          : '',
        className,
      ].join(' ')}
      {...rest}
    >
      {children}
    </Tag>
  )
})

export function CardHeader({ icon: Icon, title, subtitle, action, className = '' }) {
  return (
    <header className={`flex items-start justify-between gap-3 ${className}`}>
      <div className="flex items-start gap-3 min-w-0">
        {Icon && (
          <div className="w-10 h-10 rounded-xl bg-primary-50 text-primary-600 flex items-center justify-center flex-shrink-0">
            <Icon className="w-5 h-5" />
          </div>
        )}
        <div className="min-w-0">
          {title && (
            <h3 className="text-base font-display font-semibold text-dark-900 truncate">{title}</h3>
          )}
          {subtitle && (
            <p className="text-sm text-dark-500 mt-0.5 line-clamp-2">{subtitle}</p>
          )}
        </div>
      </div>
      {action && <div className="flex-shrink-0">{action}</div>}
    </header>
  )
}

export function CardBody({ className = '', children }) {
  return <div className={className}>{children}</div>
}

export function CardFooter({ className = '', children }) {
  return (
    <footer className={`pt-4 mt-4 border-t border-dark-100 ${className}`}>
      {children}
    </footer>
  )
}

export default Card
