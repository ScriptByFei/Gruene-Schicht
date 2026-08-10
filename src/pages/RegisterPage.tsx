import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { CalendarDays } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { Input, Select } from '../components/ui/Input'
import Button from '../components/ui/Button'
import ThemeToggle from '../components/ui/ThemeToggle'
import { SHIFT_PATTERN, SHIFT_TEAM_OPTIONS, getShiftTeamLabel } from '../lib/shifts'

export default function RegisterPage() {
  const navigate = useNavigate()

  const [form, setForm] = useState({
    name: '',
    display_name: '',
    shift_start_date: '',
    email: '',
    password: '',
  })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const set = (key: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((prev) => ({ ...prev, [key]: e.target.value }))

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError('')

    if (form.password.length < 8) {
      setError('Passwort muss mindestens 8 Zeichen lang sein.')
      return
    }

    setLoading(true)
    const { error } = await supabase.auth.signUp({
      email: form.email,
      password: form.password,
      options: {
        data: {
          name: form.name,
          display_name: form.display_name,
          shift_start_date: form.shift_start_date || null,
        },
      },
    })
    setLoading(false)

    if (error) {
      setError(error.message)
      return
    }

    navigate('/dashboard')
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-950 flex flex-col items-center justify-center px-4 py-8 transition-colors">
      <div className="absolute right-4 top-4">
        <ThemeToggle />
      </div>
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center mb-8">
          <div className="w-12 h-12 bg-emerald-600 rounded-xl flex items-center justify-center mb-4">
            <CalendarDays className="w-6 h-6 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Grüne Schicht</h1>
          <p className="mt-1 text-sm text-gray-500">Konto erstellen</p>
        </div>

        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-5">Registrieren</h2>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <Input
              label="Vollständiger Name"
              value={form.name}
              onChange={set('name')}
              placeholder="Max Mustermann"
              required
              autoFocus
            />
            <Input
              label="Anzeigename"
              value={form.display_name}
              onChange={set('display_name')}
              placeholder="Max"
              required
              hint="Wird im System angezeigt"
            />
            <Select
              label="Schicht"
              value={form.shift_start_date}
              onChange={(e) => setForm((prev) => ({ ...prev, shift_start_date: e.target.value }))}
              options={SHIFT_TEAM_OPTIONS}
              required
            />
            <p className="-mt-2 text-xs text-gray-500">
              {form.shift_start_date
                ? `${getShiftTeamLabel(form.shift_start_date)} · Rhythmus: ${SHIFT_PATTERN}`
                : 'Wähle Rot, Gelb, Blau oder Grün. Das Startdatum wird automatisch gesetzt.'}
            </p>
            <Input
              label="E-Mail"
              type="email"
              value={form.email}
              onChange={set('email')}
              placeholder="name@firma.de"
              required
            />
            <Input
              label="Passwort"
              type="password"
              value={form.password}
              onChange={set('password')}
              placeholder="Mindestens 8 Zeichen"
              required
            />

            {error && (
              <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{error}</p>
            )}

            <Button type="submit" loading={loading} fullWidth size="lg" className="mt-1">
              Konto erstellen
            </Button>
          </form>
        </div>

        <p className="mt-4 text-center text-xs text-gray-500">
          Nach der Registrierung muss dein Konto einem Betrieb zugeordnet werden.
        </p>
        <p className="mt-2 text-center text-sm text-gray-500">
          Bereits ein Konto?{' '}
          <Link to="/login" className="font-medium text-emerald-700 hover:text-emerald-800">
            Anmelden
          </Link>
        </p>
      </div>
    </div>
  )
}
