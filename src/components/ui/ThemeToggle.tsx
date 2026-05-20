import { Moon, Sun } from 'lucide-react'
import { useTheme } from '../../contexts/useTheme'
import { cn } from '../../lib/cn'

interface ThemeToggleProps {
  className?: string
  showLabel?: boolean
}

export default function ThemeToggle({ className, showLabel = true }: ThemeToggleProps) {
  const { theme, toggleTheme } = useTheme()
  const isDark = theme === 'dark'

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={isDark ? 'Hellen Modus aktivieren' : 'Dunklen Modus aktivieren'}
      className={cn(
        'inline-flex items-center gap-1.5 rounded-lg px-2.5 py-2 text-sm font-medium transition-all',
        'text-gray-500 hover:text-gray-900 hover:bg-gray-100/80',
        'dark:text-emerald-400/70 dark:hover:text-emerald-300 dark:hover:bg-emerald-950/60',
        className
      )}
    >
      {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
      {showLabel && <span className="hidden sm:inline text-xs">{isDark ? 'Hell' : 'Dunkel'}</span>}
    </button>
  )
}
