import { useState, type FormEvent } from 'react'
import { User } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { updateProfile } from '../services/profiles'
import { Input, Select } from '../components/ui/Input'
import Button from '../components/ui/Button'
import { Card, CardHeader } from '../components/ui/Card'
import Badge from '../components/ui/Badge'
import type { ShiftGroup } from '../types'

const shiftGroups: ShiftGroup[] = ['Früh', 'Spät', 'Nacht', 'Tagschicht', 'Sonstige']

export default function ProfilePage() {
  const { profile, user, refreshProfile } = useAuth()

  const [form, setForm] = useState({
    name: profile?.name ?? '',
    display_name: profile?.display_name ?? '',
    department: profile?.department ?? '',
    shift_group: (profile?.shift_group ?? 'Tagschicht') as ShiftGroup,
  })
  const [saving, setSaving] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')

  const set = (key: keyof typeof form) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      setForm((prev) => ({ ...prev, [key]: e.target.value }))

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!user) return
    setSaving(true)
    setError('')
    setSuccess(false)
    try {
      await updateProfile(user.id, form)
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
            value={form.department}
            onChange={set('department')}
            required
          />
          <Select
            label="Schichtgruppe"
            value={form.shift_group}
            onChange={set('shift_group')}
            options={shiftGroups.map((s) => ({ value: s, label: s }))}
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
