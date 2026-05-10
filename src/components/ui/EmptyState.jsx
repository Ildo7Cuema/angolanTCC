import { motion } from 'framer-motion'

/**
 * EmptyState — placeholder para listas vazias / sem-resultados.
 * Visual moderno: ícone num círculo gradiente, título, descrição, CTA opcional.
 */
export default function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className = '',
  size = 'md', // 'sm' | 'md' | 'lg'
}) {
  const SIZES = {
    sm: { wrap: 'py-10', circle: 'w-14 h-14', icon: 'w-6 h-6', title: 'text-base', desc: 'text-sm' },
    md: { wrap: 'py-16', circle: 'w-20 h-20', icon: 'w-9 h-9', title: 'text-xl',  desc: 'text-sm' },
    lg: { wrap: 'py-20', circle: 'w-24 h-24', icon: 'w-11 h-11', title: 'text-2xl', desc: 'text-base' },
  }
  const s = SIZES[size] ?? SIZES.md

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      className={`text-center ${s.wrap} ${className}`}
    >
      {Icon && (
        <div
          className={`mx-auto ${s.circle} rounded-full flex items-center justify-center mb-5 bg-gradient-to-br from-primary-50 to-accent-50 ring-1 ring-primary-100`}
        >
          <Icon className={`${s.icon} text-primary-500`} aria-hidden />
        </div>
      )}
      {title && (
        <h3 className={`${s.title} font-display font-bold text-dark-900`}>{title}</h3>
      )}
      {description && (
        <p className={`${s.desc} text-dark-500 mt-2 max-w-md mx-auto leading-relaxed`}>
          {description}
        </p>
      )}
      {action && <div className="mt-6 flex justify-center">{action}</div>}
    </motion.div>
  )
}
