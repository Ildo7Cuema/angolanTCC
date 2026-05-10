import { forwardRef } from 'react'
import { Loader2 } from 'lucide-react'

const VARIANTS = {
  primary:
    'bg-gradient-to-br from-primary-600 to-primary-500 text-white shadow-glow-sm hover:shadow-glow active:shadow-glow-sm hover:-translate-y-px hover:brightness-105 active:translate-y-0 active:brightness-95',
  secondary:
    'bg-white text-dark-900 border border-dark-200 hover:border-dark-300 hover:bg-dark-50 hover:-translate-y-px shadow-xs hover:shadow-sm',
  outline:
    'bg-transparent text-primary-600 border border-primary-300/60 hover:bg-primary-50 hover:border-primary-500/70',
  ghost:
    'bg-transparent text-dark-600 hover:bg-dark-100/70 hover:text-dark-900',
  danger:
    'bg-gradient-to-br from-danger-600 to-danger-500 text-white shadow-sm hover:shadow-md hover:-translate-y-px',
  success:
    'bg-gradient-to-br from-success-600 to-success-500 text-white shadow-sm hover:shadow-md hover:-translate-y-px',
  glass:
    'bg-white/70 backdrop-blur-xl text-dark-900 border border-dark-200/70 hover:bg-white shadow-sm',
}

const SIZES = {
  xs: 'h-8 px-3 text-xs gap-1.5 rounded-lg',
  sm: 'h-9 px-3.5 text-sm gap-1.5 rounded-lg',
  md: 'h-11 px-5 text-sm gap-2 rounded-xl',
  lg: 'h-12 px-6 text-base gap-2 rounded-xl',
  xl: 'h-14 px-7 text-base gap-2.5 rounded-2xl',
}

/**
 * Premium Button — variants + sizes + loading + icon support.
 * Designed for tap target compliance (>= 44px on md+).
 */
const Button = forwardRef(function Button(
  {
    variant = 'primary',
    size = 'md',
    className = '',
    leftIcon: LeftIcon,
    rightIcon: RightIcon,
    loading = false,
    disabled = false,
    fullWidth = false,
    type = 'button',
    children,
    ...rest
  },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      disabled={disabled || loading}
      className={[
        'group relative inline-flex items-center justify-center font-semibold',
        'transition-all duration-200 ease-spring select-none',
        'disabled:opacity-55 disabled:cursor-not-allowed disabled:translate-y-0 disabled:shadow-none disabled:filter disabled:grayscale-[10%]',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-400 focus-visible:ring-offset-2 focus-visible:ring-offset-white',
        VARIANTS[variant] ?? VARIANTS.primary,
        SIZES[size] ?? SIZES.md,
        fullWidth ? 'w-full' : '',
        className,
      ].join(' ')}
      {...rest}
    >
      {loading ? (
        <Loader2 className="w-4 h-4 animate-spin" aria-hidden />
      ) : (
        LeftIcon && <LeftIcon className="w-4 h-4 -ml-0.5" aria-hidden />
      )}
      {children && <span className="truncate">{children}</span>}
      {!loading && RightIcon && <RightIcon className="w-4 h-4 -mr-0.5" aria-hidden />}
    </button>
  )
})

export default Button
