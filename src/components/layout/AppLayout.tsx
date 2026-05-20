import { Link, NavLink, useNavigate } from 'react-router-dom'
import { CalendarDays, LayoutDashboard, LogOut, Settings, User } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/useAuth'
import { cn } from '../../lib/cn'
import ThemeToggle from '../ui/ThemeToggle'

const navItems = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/calendar', label: 'Kalender', icon: CalendarDays },
]

const adminNavItems = [
  { to: '/admin', label: 'Admin', icon: Settings },
]

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { profile, isAdmin } = useAuth()
  const navigate = useNavigate()

  const handleLogout = async () => {
    await supabase.auth.signOut()
    navigate('/login')
  }

  const items = isAdmin ? [...navItems, ...adminNavItems] : navItems

  return (
    <div className="min-h-screen flex flex-col transition-colors">
      {/* Top Nav – glass */}
      <header className="glass sticky top-0 z-30 transition-all border-b border-white/30 dark:border-emerald-900/25">
        <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between gap-4">
          <Link to="/dashboard" className="flex items-center gap-2.5">
            <img
              src={`${import.meta.env.BASE_URL}logo.svg`}
              alt="Grüne Schicht Logo"
              className="h-7 w-7"
            />
            <span className="font-pixel text-[9px] text-emerald-700 dark:text-emerald-400 leading-tight hidden sm:block">
              Grüne<br />Schicht
            </span>
          </Link>

          {/* Desktop nav */}
          <nav className="hidden sm:flex items-center gap-1">
            {items.map(({ to, label, icon: Icon }) => (
              <NavLink
                key={to}
                to={to}
                className={({ isActive }) =>
                  cn(
                    'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all',
                    isActive
                      ? 'bg-emerald-500/15 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300 pixel-shadow'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100/70 dark:text-slate-300 dark:hover:text-white dark:hover:bg-slate-700/50'
                  )
                }
              >
                <Icon className="w-3.5 h-3.5" />
                {label}
              </NavLink>
            ))}
          </nav>

          <div className="flex items-center gap-1">
            <ThemeToggle showLabel={false} />
            <Link
              to="/profile"
              aria-label="Profil öffnen"
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs text-gray-600 hover:text-gray-900 hover:bg-gray-100/70 dark:text-slate-300 dark:hover:text-white dark:hover:bg-slate-700/50 transition-all"
            >
              <User className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{profile?.display_name ?? 'Profil'}</span>
            </Link>
            <button
              onClick={handleLogout}
              aria-label="Abmelden"
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs text-gray-600 hover:text-red-600 hover:bg-red-50/70 dark:text-slate-300 dark:hover:text-red-400 dark:hover:bg-red-950/30 transition-all"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Abmelden</span>
            </button>
          </div>
        </div>
      </header>

      {/* Mobile Bottom Nav */}
      <nav className="sm:hidden fixed bottom-0 left-0 right-0 glass border-t border-white/30 dark:border-emerald-900/25 z-30">
        <div className={cn('grid h-16', isAdmin ? 'grid-cols-4' : 'grid-cols-3')}>
          {[
            { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
            { to: '/calendar', label: 'Kalender', icon: CalendarDays },
            { to: '/profile', label: 'Profil', icon: User },
            ...(isAdmin ? [{ to: '/admin', label: 'Admin', icon: Settings }] : []),
          ].map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                cn(
                  'flex flex-col items-center justify-center gap-1 text-[10px] font-medium transition-all',
                  isActive
                    ? 'text-emerald-600 dark:text-emerald-400'
                    : 'text-gray-500 dark:text-slate-300'
                )
              }
            >
              <Icon className="w-5 h-5" />
              {label}
            </NavLink>
          ))}
        </div>
      </nav>

      {/* Page content */}
      <main className="flex-1 max-w-5xl w-full mx-auto px-4 py-6 pb-24 sm:pb-6">
        {children}
      </main>
    </div>
  )
}
