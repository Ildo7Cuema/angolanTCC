/**
 * Badge — pílula de status com variantes premium.
 * Mantém retro-compatibilidade com `<Badge variant="success">…</Badge>`.
 */
const VARIANTS = {
  success: 'badge-success',
  warning: 'badge-warning',
  error:   'badge-error',
  info:    'badge-info',
  neutral: 'badge-neutral',
  brand:   'text-primary-700 bg-primary-50 border border-primary-200',
  accent:  'text-accent-700  bg-accent-50  border border-accent-200',
}

export default function Badge({
  variant = 'neutral',
  icon: Icon,
  dot = false,
  size = 'md', // 'sm' | 'md'
  children,
  className = '',
  ...rest
}) {
  const sizeCls = size === 'sm' ? 'text-[10px] px-1.5 py-0.5' : 'text-xs px-2.5 py-1'
  return (
    <span
      className={['badge', VARIANTS[variant] ?? VARIANTS.neutral, sizeCls, className].join(' ')}
      {...rest}
    >
      {dot && <span className="w-1.5 h-1.5 rounded-full bg-current opacity-80" />}
      {Icon && <Icon className="w-3 h-3" aria-hidden />}
      {children}
    </span>
  )
}
