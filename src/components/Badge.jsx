export default function Badge({ variant = 'neutral', children, className = '' }) {
  const variants = {
    success: 'badge-success',
    warning: 'badge-warning',
    error: 'badge-error',
    info: 'badge-info',
    neutral: 'badge-neutral',
  }

  return (
    <span className={`badge ${variants[variant] || variants.neutral} ${className}`}>
      {children}
    </span>
  )
}
