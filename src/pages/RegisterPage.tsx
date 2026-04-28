import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { CalendarDays } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { Input } from '../components/ui/Input'
import Button from '../components/ui/Button'
import { SHIFT_PATTERN, SHIFT_LABELS, getShiftForDate, type ShiftCode } from '../lib/shifts'

export default function RegisterPage() {
  const navigate = useNavigate()

  const [form, setForm] = useState({
    name: '',
    display_name: '',
    email: '',
    password: '',
    shift_start_date: '',
  })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const set = (key: keyof typeof form) =>
    (e: React.ChangeEvent<HTMLInputElement>) =>
      setForm((prev) => ({ ...prev, [key]: e.target.value }))

  const previewShift: ShiftCode | null = form.shift_start_date
    ? getShiftForDate(form.shift_start_date)
    : null

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError('')

    if (form.password.length < 6) {
      setError('Passwort muss mindestens 6 Zeichen lang sein.')
      return
    }
    if (!form.shift_start_date) {
      setError('Bitte Startdatum der Schichtfolge eingeben.')
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
          department: 'Grüne Schicht',
          shift_start_date: form.shift_start_date,
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
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center px-4 py-8">
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

            {/* Shift start date */}
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-gray-700">
                Beginn der Schichtfolge
              </label>
              <input
                type="date"
                value={form.shift_start_date}
                onChange={set('shift_start_date')}
                required
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              />
              <p className="text-xs text-gray-500">
                Muster: <span className="font-mono">{SHIFT_PATTERN}</span> (28 Tage)
              </p>
              {previewShift && (
                <p className="text-xs text-emerald-700 bg-emerald-50 px-2 py-1 rounded-md">
                  Heute wärst du in: <strong>{SHIFT_LABELS[previewShift]}</strong>
                </p>
              )}
            </div>

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
              placeholder="Mindestens 6 Zeichen"
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

        <p className="mt-4 text-center text-sm text-gray-500">
          Bereits ein Konto?{' '}
          <Link to="/login" className="font-medium text-emerald-700 hover:text-emerald-800">
            Anmelden
          </Link>
        </p>
      </div>
    </div>
  )
}
