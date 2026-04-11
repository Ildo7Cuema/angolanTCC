import { GraduationCap } from 'lucide-react'
import { Link } from 'react-router-dom'

export default function Navbar({ children, backTo, backLabel, title, rightContent }) {
  return (
    <header className="glass fixed top-0 left-0 right-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3 min-w-0">
          {backTo ? (
            <Link
              to={backTo}
              className="flex items-center gap-2 text-slate-500 hover:text-slate-800 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
              </svg>
              {backLabel && <span className="text-sm font-medium hidden sm:inline">{backLabel}</span>}
            </Link>
          ) : (
            <Link to="/" className="flex items-center gap-2">
              <GraduationCap className="w-7 h-7 text-indigo-600" />
              <span className="text-lg font-display font-bold text-indigo-700">AngolaTCC AI</span>
            </Link>
          )}
          {title && (
            <>
              <div className="h-5 w-px bg-slate-200 flex-shrink-0" />
              <span className="text-sm font-medium text-slate-500 truncate">{title}</span>
            </>
          )}
          {children}
        </div>
        {rightContent && (
          <div className="flex items-center gap-3 flex-shrink-0">
            {rightContent}
          </div>
        )}
      </div>
    </header>
  )
}
