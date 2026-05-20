import { forwardRef, type ButtonHTMLAttributes } from 'react'
import { cn } from '../../lib/cn'

const variants = {
  primary: 'bg-emerald-500 text-white hover:bg-emerald-400 active:bg-emerald-600 disabled:bg-emerald-800 disabled:text-emerald-600 dark:bg-emerald-600 dark:hover:bg-emerald-500',
  secondary: 'bg-white text-gray-700 border-2 border-gray-300 hover:bg-gray-50 active:bg-gray-100 disabled:opacity-50 dark:bg-[#0a160a] dark:text-emerald-200 dark:border-emerald-900/60 dark:hover:bg-emerald-950/40',
  danger: 'bg-red-600 text-white hover:bg-red-500 active:bg-red-700 disabled:bg-red-900 disabled:text-red-600',
  ghost: 'text-gray-600 hover:bg-gray-100 active:bg-gray-200 disabled:opacity-50 dark:text-emerald-300 dark:hover:bg-emerald-950/50',
  outline: 'border-2 border-emerald-500 text-emerald-600 hover:bg-emerald-50 disabled:opacity-50 dark:border-emerald-500 dark:text-emerald-400 dark:hover:bg-emerald-950/40',
}

const sizes = {
  sm: 'px-3 py-1.5 text-xs',
  md: 'px-4 py-2.5 text-sm',
  lg: 'px-6 py-3 text-sm',
}

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: keyof typeof variants
  size?: keyof typeof sizes
  loading?: boolean
  fullWidth?: boolean
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = 'primary', size = 'md', type = 'button', loading, fullWidth, className, children, disabled, ...props }, ref) => (
    <button
      ref={ref}
      type={type}
      disabled={disabled || loading}
      className={cn(
        'inline-flex items-center justify-center gap-2 rounded-xl font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed pixel-shadow',
        variants[variant],
        sizes[size],
        fullWidth && 'w-full',
        (variant === 'primary') && 'glow-green',
        className
      )}
      {...props}
    >
      {loading && (
        <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
      )}
      {children}
    </button>
  )
)

Button.displayName = 'Button'
export default Button
