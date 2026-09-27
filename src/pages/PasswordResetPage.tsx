import { useState, type FormEvent } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { emailLinkAuth } from '../lib/emailLinkAuth'
import { appRouteUrl } from '../lib/appRouteUrl'
import { Input } from '../components/ui/Input'
import Button from '../components/ui/Button'

function resetToken(routeSearch: string): string | null {
  return new URLSearchParams(routeSearch).get('token')
    ?? new URLSearchParams(window.location.search).get('token')
}

export default function PasswordResetPage() {
  const location = useLocation()
  const navigate = useNavigate()
  const invalidToken = new URLSearchParams(location.search).has('error')
    || new URLSearchParams(window.location.search).has('error')
  const token = invalidToken ? null : resetToken(location.search)

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmation, setConfirmation] = useState('')
  const [sent, setSent] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const requestReset = async (event: FormEvent) => {
    event.preventDefault()
    setError('')
    setLoading(true)
    try {
      const { error: requestError } = await emailLinkAuth.requestPasswordReset({
        email: email.trim(),
        redirectTo: `${window.location.origin}${appRouteUrl('/reset-password')}`,
      })
      if (requestError) throw requestError
      setSent(true)
    } catch {
      setError('Der Passwort-Link konnte nicht gesendet werden. Bitte versuche es später erneut.')
    } finally {
      setLoading(false)
    }
  }

  const savePassword = async (event: FormEvent) => {
    event.preventDefault()
    if (!token) return
    setError('')
    if (password !== confirmation) {
      setError('Die Passwörter stimmen nicht überein.')
      return
    }
    setLoading(true)
    try {
      const { error: resetError } = await emailLinkAuth.resetPassword({
        token,
        newPassword: password,
      })
      if (resetError) throw resetError
      setPassword('')
      setConfirmation('')
      navigate('/login', { replace: true, state: { passwordReset: true } })
    } catch {
      setError('Das Passwort konnte nicht gespeichert werden. Der Link ist möglicherweise abgelaufen. Fordere einen neuen an.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-sm glass rounded-2xl p-6 pixel-shadow">
        <h1 className="mb-3 text-lg font-semibold text-gray-900 dark:text-emerald-100">
          {token ? 'Neues Passwort festlegen' : 'Passwort einrichten oder zurücksetzen'}
        </h1>
        {token ? (
          <form onSubmit={savePassword} className="flex flex-col gap-4">
            <p className="text-xs text-gray-600 dark:text-slate-300">
              Wähle ein eigenes Passwort mit mindestens 12 Zeichen.
            </p>
            <Input label="Neues Passwort" type="password" value={password}
              onChange={(event) => setPassword(event.target.value)}
              autoComplete="new-password" minLength={12} maxLength={128} required autoFocus />
            <Input label="Passwort wiederholen" type="password" value={confirmation}
              onChange={(event) => setConfirmation(event.target.value)}
              autoComplete="new-password" minLength={12} maxLength={128} required />
            {error && <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">{error}</p>}
            <Button type="submit" loading={loading} fullWidth>Passwort speichern</Button>
          </form>
        ) : (
          <form onSubmit={requestReset} className="flex flex-col gap-4">
            <p className="text-xs text-gray-600 dark:text-slate-300">
              Gib deine freigeschaltete E-Mail-Adresse ein. Wir senden dir einen Link, mit dem du selbst ein Passwort festlegen kannst. Er ist 15 Minuten gültig.
            </p>
            {invalidToken && <p role="alert" className="rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800">
              Der Passwort-Link ist ungültig oder abgelaufen. Fordere einen neuen an.
            </p>}
            <Input label="E-Mail" type="email" value={email}
              onChange={(event) => { setEmail(event.target.value); setSent(false) }}
              autoComplete="email" placeholder="name@firma.de" required autoFocus />
            {sent && <p role="status" className="rounded-lg bg-emerald-50 px-3 py-2 text-xs text-emerald-800">
              Falls das Konto freigeschaltet ist, findest du den Passwort-Link gleich in deinem Postfach.
            </p>}
            {error && <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">{error}</p>}
            <Button type="submit" loading={loading} fullWidth>
              {sent ? 'Link erneut senden' : 'Passwort-Link senden'}
            </Button>
          </form>
        )}
        <Link to="/login" className="mt-5 block text-center text-xs text-gray-600 underline-offset-2 hover:underline dark:text-slate-300">
          Zurück zur Anmeldung
        </Link>
      </div>
    </div>
  )
}
