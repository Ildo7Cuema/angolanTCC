import { forwardRef, useId, useState } from 'react'
import { Eye, EyeOff, AlertCircle } from 'lucide-react'

/**
 * Premium Input — label, hint, error, leftIcon, rightIcon, password toggle.
 * Acessibilidade: aria-describedby + aria-invalid + label semântico.
 */
const Input = forwardRef(function Input(
  {
    label,
    hint,
    error,
    leftIcon: LeftIcon,
    rightIcon: RightIcon,
    rightSlot,
    type = 'text',
    className = '',
    wrapperClassName = '',
    id,
    required,
    ...rest
  },
  ref,
) {
  const auto = useId()
  const inputId = id || `in-${auto}`
  const hintId  = `${inputId}-hint`
  const errorId = `${inputId}-err`

  const [show, setShow] = useState(false)
  const isPassword = type === 'password'
  const effectiveType = isPassword ? (show ? 'text' : 'password') : type

  return (
    <div className={`w-full ${wrapperClassName}`}>
      {label && (
        <label
          htmlFor={inputId}
          className="block text-sm font-medium text-dark-700 mb-1.5"
        >
          {label}
          {required && <span className="text-danger-500 ml-0.5" aria-hidden>*</span>}
        </label>
      )}

      <div className="relative">
        {LeftIcon && (
          <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-dark-400">
            <LeftIcon className="w-4 h-4" aria-hidden />
          </span>
        )}

        <input
          ref={ref}
          id={inputId}
          type={effectiveType}
          required={required}
          aria-invalid={!!error || undefined}
          aria-describedby={[error ? errorId : null, hint ? hintId : null].filter(Boolean).join(' ') || undefined}
          className={[
            'input-field',
            LeftIcon ? 'pl-10' : '',
            (RightIcon || isPassword || rightSlot) ? 'pr-10' : '',
            error ? '!border-danger-500/70 focus:!border-danger-500 focus:!shadow-[0_0_0_4px_rgba(239,68,68,0.12)]' : '',
            className,
          ].join(' ')}
          {...rest}
        />

        {/* Right side: password toggle, custom slot or icon */}
        {isPassword ? (
          <button
            type="button"
            onClick={() => setShow((s) => !s)}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1.5 rounded-md text-dark-400 hover:text-dark-700 hover:bg-dark-100 transition-colors"
            aria-label={show ? 'Esconder senha' : 'Mostrar senha'}
          >
            {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        ) : rightSlot ? (
          <div className="absolute right-2 top-1/2 -translate-y-1/2">{rightSlot}</div>
        ) : RightIcon ? (
          <span className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-dark-400">
            <RightIcon className="w-4 h-4" aria-hidden />
          </span>
        ) : null}
      </div>

      {error ? (
        <p id={errorId} className="mt-1.5 text-xs text-danger-600 flex items-center gap-1.5">
          <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
          {error}
        </p>
      ) : hint ? (
        <p id={hintId} className="mt-1.5 text-xs text-dark-500">{hint}</p>
      ) : null}
    </div>
  )
})

export default Input
