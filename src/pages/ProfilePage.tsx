import { useState, type FormEvent } from 'react'
import { User } from 'lucide-react'
import { useAuth } from '../contexts/useAuth'
import { updateProfile } from '../services/profiles'
import { Input } from '../components/ui/Input'
import Button from '../components/ui/Button'
import { Card, CardHeader } from '../components/ui/Card'
import Badge from '../components/ui/Badge'
import { SHIFT_PATTERN, SHIFT_LABELS, SHIFT_COLORS, getTodayShift, getWeekOverview } from '../lib/shifts'

const DAY_NAMES = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So']

export default function ProfilePage() {
  const { profile, user, refreshProfile } = useAuth()

  const [form, setForm] = useState({
    name: profile?.name ?? '',
    display_name: profile?.display_name ?? '',
    shift_start_date: profile?.shift_start_date ?? '',
  })
  const [saving, setSaving] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')

  const set = (key: keyof typeof form) =>
    (e: React.ChangeEvent<HTMLInputElement>) =>
      setForm((prev) => ({ ...prev, [key]: e.target.value }))

  const todayShift = form.shift_start_date ? getTodayShift(form.shift_start_date) : null
  const weekOverview = form.shift_start_date ? getWeekOverview(form.shift_start_date) : []

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!user) return
    setSaving(true)
    setError('')
    setSuccess(false)
    try {
      await updateProfile(user.id, {
        name: form.name,
        display_name: form.display_name,
        shift_start_date: form.shift_start_date || null,
      })
      await refreshProfile()
      setSuccess(true)
      setTimeout(() => setSuccess(false), 3000)
    } catch {
      setError('Profil konnte nicht gespeichert werden.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="max-w-lg">
      <div className="mb-6 flex items-center gap-3">
        <div className="w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center">
          <User className="w-6 h-6 text-emerald-700" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-gray-900">{profile?.display_name ?? 'Mein Profil'}</h1>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-sm text-gray-500">{user?.email}</span>
            {profile?.role === 'admin' && <Badge variant="purple">Admin</Badge>}
          </div>
        </div>
      </div>

      {/* Today's shift */}
      {todayShift && (
        <Card className="mb-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wider font-medium mb-1">Heute</p>
              <p className="text-lg font-semibold text-gray-900">{SHIFT_LABELS[todayShift]}</p>
            </div>
            <span className={`text-2xl font-bold px-4 py-2 rounded-xl ${SHIFT_COLORS[todayShift]}`}>
              {todayShift === '-' ? 'Frei' : todayShift}
            </span>
          </div>

          {weekOverview.length > 0 && (
            <div className="mt-4 grid grid-cols-7 gap-1">
              {weekOverview.map(({ date, shift }, i) => (
                <div key={i} className="flex flex-col items-center gap-1">
                  <span className="text-xs text-gray-400">{DAY_NAMES[date.getDay() === 0 ? 6 : date.getDay() - 1]}</span>
                  <span className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold ${i === 0 ? SHIFT_COLORS[shift] : 'bg-gray-50 text-gray-600'}`}>
                    {shift}
                  </span>
                </div>
              ))}
            </div>
          )}
        </Card>
      )}

      <Card>
        <CardHeader title="Profil bearbeiten" />
        <form onSubmit={handleSubmit} className="mt-5 flex flex-col gap-4">
          <Input
            label="Vollständiger Name"
            value={form.name}
            onChange={set('name')}
            required
          />
          <Input
            label="Anzeigename"
            value={form.display_name}
            onChange={set('display_name')}
            required
            hint="Wird in der App angezeigt"
          />

          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-gray-700">
              Beginn der Schichtfolge
            </label>
            <input
              type="date"
              value={form.shift_start_date}
              onChange={set('shift_start_date')}
              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
            />
            <p className="text-xs text-gray-400 font-mono">{SHIFT_PATTERN}</p>
          </div>

          {success && (
            <p className="text-sm text-emerald-700 bg-emerald-50 px-3 py-2 rounded-lg">
              Profil erfolgreich gespeichert.
            </p>
          )}
          {error && (
            <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{error}</p>
          )}

          <Button type="submit" loading={saving} className="self-end">
            Speichern
          </Button>
        </form>
      </Card>
    </div>
  )
}
