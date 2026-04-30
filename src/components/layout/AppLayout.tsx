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
    <div className="min-h-screen bg-gray-50 dark:bg-slate-950 flex flex-col transition-colors">
      {/* Top Nav */}
      <header className="bg-white dark:bg-slate-900 border-b border-gray-200 dark:border-slate-800 sticky top-0 z-30 transition-colors">
        <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between gap-4">
          <Link to="/dashboard" className="flex items-center gap-2.5 font-semibold text-gray-900 dark:text-white">
            <img
              src={`${import.meta.env.BASE_URL}logo.svg`}
              alt="Grüne Schicht Logo"
              className="h-8 w-8"
            />
            <span className="text-sm tracking-wide">Grüne Schicht</span>
          </Link>

          {/* Desktop nav */}
          <nav className="hidden sm:flex items-center gap-1">
            {items.map(({ to, label, icon: Icon }) => (
              <NavLink
                key={to}
                to={to}
                className={({ isActive }) =>
                  cn(
                    'flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors',
                    isActive
                      ? 'bg-emerald-50 text-emerald-700'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                  )
                }
              >
                <Icon className="w-4 h-4" />
                {label}
              </NavLink>
            ))}
          </nav>

          <div className="flex items-center gap-1.5">
            <ThemeToggle showLabel={false} />
            <Link
              to="/profile"
              aria-label="Profil öffnen"
              className="flex items-center gap-1.5 px-3 py-2 rounded-md text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 transition-colors"
            >
              <User className="w-4 h-4" />
              <span className="hidden sm:inline">{profile?.display_name ?? 'Profil'}</span>
            </Link>
            <button
              onClick={handleLogout}
              aria-label="Abmelden"
              className="flex items-center gap-1.5 px-3 py-2 rounded-md text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 transition-colors"
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:inline">Abmelden</span>
            </button>
          </div>
        </div>
      </header>

      {/* Mobile Bottom Nav */}
      <nav className="sm:hidden fixed bottom-0 left-0 right-0 bg-white dark:bg-slate-900 border-t border-gray-200 dark:border-slate-800 z-30">
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
                  'flex flex-col items-center justify-center gap-1 text-xs font-medium transition-colors',
                  isActive ? 'text-emerald-700 bg-emerald-50/60' : 'text-gray-600'
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
