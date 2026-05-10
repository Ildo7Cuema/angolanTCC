import { GraduationCap, ChevronLeft } from 'lucide-react'
import { Link } from 'react-router-dom'

/**
 * Navbar — top bar premium, glass effect refinado.
 * API mantém-se compatível com a versão anterior:
 *   <Navbar backTo backLabel title rightContent>{children}</Navbar>
 *
 * Em mobile o título trunca elegantemente; o rightContent encolhe.
 */
export default function Navbar({ children, backTo, backLabel, title, rightContent, sticky = true }) {
  return (
    <header
      className={[
        sticky ? 'fixed top-0 left-0 right-0 z-40' : 'relative',
        'glass pt-safe',
      ].join(' ')}
    >
      <div className="container max-w-7xl px-3 sm:px-6 h-14 sm:h-16 flex items-center justify-between gap-3 min-w-0">
        {/* Left */}
        <div className="flex items-center gap-2.5 min-w-0 flex-1">
          {backTo ? (
            <Link
              to={backTo}
              aria-label={backLabel || 'Voltar'}
              className="btn-icon -ml-1.5"
            >
              <ChevronLeft className="w-5 h-5" />
            </Link>
          ) : (
            <Link to="/" className="flex items-center gap-2 group min-w-0">
              <span className="relative flex items-center justify-center w-8 h-8 rounded-xl bg-gradient-to-br from-primary-600 to-accent-600 text-white shadow-glow-sm transition-transform duration-300 group-hover:scale-105">
                <GraduationCap className="w-4.5 h-4.5" />
              </span>
              <span className="text-base sm:text-lg font-display font-bold tracking-tight text-dark-900 truncate">
                AngolaTCC <span className="text-primary-600">AI</span>
              </span>
            </Link>
          )}
          {title && (
            <>
              <div className="h-5 w-px bg-dark-200 flex-shrink-0 mx-1" />
              <span className="text-sm font-medium text-dark-500 truncate min-w-0">{title}</span>
            </>
          )}
          {children}
        </div>

        {/* Right */}
        {rightContent && (
          <div className="flex items-center gap-2 flex-shrink-0">
            {rightContent}
          </div>
        )}
      </div>
    </header>
  )
}
