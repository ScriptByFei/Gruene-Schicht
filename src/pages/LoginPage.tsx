import { useState, type FormEvent } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { client } from '../lib/neon'
import { Input } from '../components/ui/Input'
import Button from '../components/ui/Button'
import ThemeToggle from '../components/ui/ThemeToggle'
import { runtimeConfig } from '../lib/runtimeConfig'
import { appRouteUrl } from '../lib/appRouteUrl'
import { emailLinkAuth } from '../lib/emailLinkAuth'

export default function LoginPage() {
  const location = useLocation()
  const from = (location.state as { from?: { pathname: string } })?.from?.pathname ?? '/dashboard'

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [method, setMethod] = useState<'email-link' | 'password'>(
    runtimeConfig.emailLinkEnabled ? 'email-link' : 'password'
  )
  const [linkSent, setLinkSent] = useState(false)

  const handleEmailLink = async (e: FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const { error: sendError } = await emailLinkAuth.signIn.magicLink({
        email: email.trim(),
        callbackURL: `${window.location.origin}${appRouteUrl(from)}`,
      })
      if (sendError) throw sendError
      setLinkSent(true)
    } catch {
      setError('Der Anmeldelink konnte nicht gesendet werden. Prüfe deine E-Mail-Adresse oder wende dich an den Admin.')
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    const { error } = await client.auth.signInWithPassword({ email, password })
    setLoading(false)
    if (error) {
      setError('E-Mail oder Passwort ist falsch.')
      return
    }
    window.location.replace(appRouteUrl(from))
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4">
      <div className="absolute right-4 top-4">
        <ThemeToggle />
      </div>

      <div className="w-full max-w-sm">
        {/* Brand */}
        <div className="flex flex-col items-center mb-10">
          <div className="relative mb-6">
            <div className="w-16 h-16 bg-emerald-500 rounded-2xl flex items-center justify-center pixel-shadow glow-green">
              <img
                src={`${import.meta.env.BASE_URL}logo.svg`}
                alt="Grüne Schicht"
                className="w-10 h-10 brightness-0 invert"
              />
            </div>
          </div>
          <h1 className="font-pixel text-[11px] text-emerald-700 dark:text-emerald-400 text-center leading-loose tracking-widest mb-2">
            GRÜNE<br />SCHICHT
          </h1>
          <p className="text-xs text-gray-400 dark:text-emerald-700 tracking-wider uppercase mt-1">
            Event-Planung · Schichtbetrieb
          </p>
        </div>

        {/* Card */}
        <div className="glass rounded-2xl p-6 pixel-shadow">
          <h2 className="text-sm font-semibold text-gray-800 dark:text-emerald-100 mb-5 tracking-wide">
            Anmelden
          </h2>

          {runtimeConfig.emailLinkEnabled && (
            <div className="mb-5 flex gap-2 rounded-xl bg-gray-100 p-1 dark:bg-slate-800" role="group" aria-label="Anmeldemethode">
              <button type="button" onClick={() => { setMethod('email-link'); setError('') }}
                aria-pressed={method === 'email-link'}
                className={`flex-1 rounded-lg px-3 py-2 text-xs font-medium ${method === 'email-link' ? 'bg-white text-emerald-800 shadow-sm dark:bg-slate-700 dark:text-emerald-300' : 'text-gray-600 dark:text-slate-300'}`}>
                E-Mail-Link
              </button>
              <button type="button" onClick={() => { setMethod('password'); setError('') }}
                aria-pressed={method === 'password'}
                className={`flex-1 rounded-lg px-3 py-2 text-xs font-medium ${method === 'password' ? 'bg-white text-emerald-800 shadow-sm dark:bg-slate-700 dark:text-emerald-300' : 'text-gray-600 dark:text-slate-300'}`}>
                Passwort
              </button>
            </div>
          )}

          {method === 'email-link' ? (
            <form onSubmit={handleEmailLink} className="flex flex-col gap-4">
              <p className="text-xs text-gray-600 dark:text-slate-300">
                Gib die freigeschaltete E-Mail-Adresse ein. Du erhältst einen zeitlich begrenzten Anmeldelink.
              </p>
              <Input label="E-Mail" type="email" value={email} onChange={(e) => { setEmail(e.target.value); setLinkSent(false) }}
                placeholder="name@firma.de" required autoFocus />
              {linkSent && <p role="status" className="rounded-lg bg-emerald-50 px-3 py-2 text-xs text-emerald-800">
                Falls das Konto freigeschaltet ist, findest du den Anmeldelink gleich in deinem Postfach.
              </p>}
              {error && <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-600">{error}</p>}
              <Button type="submit" loading={loading} fullWidth size="lg" className="mt-1">
                {linkSent ? 'Link erneut senden' : 'Anmeldelink senden'}
              </Button>
            </form>
          ) : (
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <Input label="E-Mail" type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                placeholder="name@firma.de" required autoFocus />
              <Input label="Passwort" type="password" value={password} onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••" required />
              {error && <p role="alert" className="text-xs text-red-500 bg-red-50/80 dark:bg-red-950/40 px-3 py-2 rounded-lg border border-red-200 dark:border-red-900/50">{error}</p>}
              <Button type="submit" loading={loading} fullWidth size="lg" className="mt-1">Anmelden</Button>
            </form>
          )}
        </div>

        {runtimeConfig.registrationEnabled ? (
          <p className="mt-4 text-center text-xs text-gray-400 dark:text-emerald-700">
            Noch kein Konto?{' '}
            <Link to="/register" className="font-medium text-emerald-600 dark:text-emerald-400 hover:text-emerald-500">
              Registrieren
            </Link>
          </p>
        ) : (
          <p className="mt-4 text-center text-xs text-gray-500 dark:text-gray-400">
            Geschlossene Beta · Konten werden nur nach Einladung freigeschaltet.
          </p>
        )}
        <p className="mt-3 text-center text-xs">
          <Link to="/privacy" className="text-gray-500 underline-offset-2 hover:underline dark:text-gray-400">
            Datenschutz
          </Link>
        </p>
      </div>
    </div>
  )
}
