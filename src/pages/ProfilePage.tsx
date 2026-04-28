import { useState, type FormEvent } from 'react'
import { User } from 'lucide-react'
import { useAuth } from '../contexts/useAuth'
import { updateProfile } from '../services/profiles'
import { Input } from '../components/ui/Input'
import Button from '../components/ui/Button'
import { Card, CardHeader } from '../components/ui/Card'
import Badge from '../components/ui/Badge'
import { formatShiftStartDate, getCurrentShift } from '../lib/shifts'

export default function ProfilePage() {
  const { profile, user, refreshProfile } = useAuth()
  const currentShift = getCurrentShift(profile?.shift_start_date)

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

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!user) return
    setSaving(true)
    setError('')
    setSuccess(false)
    try {
      await updateProfile(user.id, {
        ...form,
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
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            <span className="text-sm text-gray-500">{user?.email}</span>
            {profile?.role === 'admin' && <Badge variant="purple">Admin</Badge>}
            {currentShift && <Badge variant="green">Heute: {currentShift}</Badge>}
          </div>
        </div>
      </div>

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
            hint="Wird in der App und in Kommentaren angezeigt"
          />
          <Input
            label="Abteilung"
            value="Grüne Schicht"
            readOnly
            className="bg-gray-50 text-gray-600"
          />
          <Input
            label="Startdatum deines Schichtzyklus"
            type="date"
            value={form.shift_start_date}
            onChange={set('shift_start_date')}
            required
            hint={`Aktuell gespeichert: ${formatShiftStartDate(profile?.shift_start_date)}. Die heutige Schicht wird automatisch aus SSSNN-----FFFNNNN----FFFSSS- berechnet.`}
          />

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
