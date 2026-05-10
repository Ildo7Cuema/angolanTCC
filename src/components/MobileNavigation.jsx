import { Link, useLocation } from 'react-router-dom'
import { motion } from 'framer-motion'
import { LayoutDashboard, Plus, User, ShieldCheck } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'

/**
 * MobileNavigation — bottom navigation estilo aplicação nativa.
 * Visível apenas em < md. Respeita safe-area-inset-bottom (iOS notch).
 *
 * Não aparece em rotas públicas / auth (login/register/landing) nem no editor (que usa sidebar própria).
 */
const HIDE_ON = ['/', '/login', '/register']

export default function MobileNavigation() {
  const { pathname } = useLocation()
  const { user } = useAuth()

  if (HIDE_ON.includes(pathname)) return null
  if (pathname.startsWith('/project/')) return null
  if (pathname.startsWith('/payment/')) return null
  if (!user) return null

  const isAdmin = user?.email === 'ildocuema@gmail.com'

  const items = [
    { id: 'dashboard', to: '/dashboard',   icon: LayoutDashboard, label: 'Início' },
    { id: 'new',       to: '/new-project', icon: Plus,            label: 'Novo', primary: true },
    isAdmin
      ? { id: 'admin', to: '/admin', icon: ShieldCheck, label: 'Admin' }
      : { id: 'profile', to: '/dashboard?profile=1', icon: User, label: 'Perfil' },
  ]

  return (
    <nav
      role="navigation"
      aria-label="Navegação principal"
      className="md:hidden fixed bottom-0 left-0 right-0 z-40 pb-safe pointer-events-none"
    >
      <div className="pointer-events-auto mx-3 max-w-md mb-2">
        <div className="rounded-2xl bg-white/85 backdrop-blur-xl border border-dark-100 shadow-lg flex items-center justify-around px-2 py-1.5">
          {items.map((it) => {
            const active = pathname === it.to.split('?')[0]
            const Icon = it.icon
            if (it.primary) {
              return (
                <Link
                  key={it.id}
                  to={it.to}
                  aria-label={it.label}
                  className="-mt-7 flex items-center justify-center"
                >
                  <motion.div
                    whileTap={{ scale: 0.92 }}
                    className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary-600 to-accent-600 text-white flex items-center justify-center shadow-glow"
                  >
                    <Icon className="w-6 h-6" />
                  </motion.div>
                </Link>
              )
            }
            return (
              <Link
                key={it.id}
                to={it.to}
                aria-label={it.label}
                aria-current={active ? 'page' : undefined}
                className="flex flex-col items-center justify-center gap-0.5 py-2 px-3 rounded-xl tap-feedback flex-1 min-w-0"
              >
                <Icon
                  className={`w-5 h-5 ${active ? 'text-primary-600' : 'text-dark-500'}`}
                  strokeWidth={active ? 2.4 : 2}
                />
                <span
                  className={`text-[10px] font-medium leading-none ${active ? 'text-primary-600' : 'text-dark-500'}`}
                >
                  {it.label}
                </span>
              </Link>
            )
          })}
        </div>
      </div>
    </nav>
  )
}
