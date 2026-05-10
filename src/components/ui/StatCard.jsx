/**
 * StatCard — métrica + ícone + variação opcional.
 *
 * Visual SaaS premium: ícone dentro de tile colorido, valor grande, label.
 */
import { TrendingUp, TrendingDown, Minus } from 'lucide-react'

const TONES = {
  primary: { bg: 'bg-primary-50',  fg: 'text-primary-600',  ring: 'ring-primary-100' },
  accent:  { bg: 'bg-accent-50',   fg: 'text-accent-600',   ring: 'ring-accent-100' },
  success: { bg: 'bg-success-50',  fg: 'text-success-600',  ring: 'ring-success-100' },
  warning: { bg: 'bg-warning-50',  fg: 'text-warning-600',  ring: 'ring-warning-100' },
  danger:  { bg: 'bg-danger-50',   fg: 'text-danger-600',   ring: 'ring-danger-100' },
  info:    { bg: 'bg-info-50',     fg: 'text-info-600',     ring: 'ring-info-100' },
  neutral: { bg: 'bg-dark-100',    fg: 'text-dark-700',     ring: 'ring-dark-200' },
}

export default function StatCard({
  label,
  value,
  icon: Icon,
  tone = 'primary',
  delta,            // number | null  → percentagem; positivo = ↑
  helperText,       // 'vs mês passado'
  className = '',
}) {
  const t = TONES[tone] ?? TONES.primary
  const DeltaIcon = delta == null ? Minus : delta > 0 ? TrendingUp : delta < 0 ? TrendingDown : Minus
  const deltaCls = delta == null
    ? 'text-dark-500 bg-dark-100'
    : delta > 0
      ? 'text-success-700 bg-success-50'
      : delta < 0
        ? 'text-danger-700 bg-danger-50'
        : 'text-dark-500 bg-dark-100'

  return (
    <div className={`glass-card p-5 sm:p-6 flex flex-col gap-4 ${className}`}>
      <div className="flex items-start justify-between">
        <p className="text-xs sm:text-sm font-medium text-dark-500 tracking-wide">
          {label}
        </p>
        {Icon && (
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center ring-1 ${t.bg} ${t.fg} ${t.ring}`}>
            <Icon className="w-5 h-5" aria-hidden />
          </div>
        )}
      </div>

      <div className="flex items-end justify-between gap-3">
        <h3 className="text-2xl sm:text-3xl font-display font-extrabold text-dark-900 tracking-tight leading-none">
          {value}
        </h3>
        {(delta != null || helperText) && (
          <div className="flex flex-col items-end gap-1">
            {delta != null && (
              <span className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full ${deltaCls}`}>
                <DeltaIcon className="w-3 h-3" />
                {Math.abs(delta).toFixed(0)}%
              </span>
            )}
            {helperText && (
              <span className="text-[11px] text-dark-400">{helperText}</span>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
