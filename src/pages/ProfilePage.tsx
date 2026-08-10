import { useEffect, useState, type FormEvent } from 'react'
import { Download, Smartphone, User } from 'lucide-react'
import { useAuth } from '../contexts/useAuth'
import { useTheme } from '../contexts/useTheme'
import { updateProfile } from '../services/profiles'
import { Input } from '../components/ui/Input'
import Button from '../components/ui/Button'
import { Card, CardHeader } from '../components/ui/Card'
import Badge from '../components/ui/Badge'
import { formatShiftStartDate, getCurrentShift } from '../lib/shifts'

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>
}

export default function ProfilePage() {
  const { profile, user, isAdmin, shiftGroup, refreshProfile } = useAuth()
  const { theme, setTheme } = useTheme()
  const currentShift = getCurrentShift(shiftGroup?.anchor_date, new Date(), shiftGroup?.pattern)

  const [form, setForm] = useState({
    name: profile?.name ?? '',
    display_name: profile?.display_name ?? '',
  })
  const [saving, setSaving] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [isInstalled, setIsInstalled] = useState(
    () => window.matchMedia('(display-mode: standalone)').matches
  )

  useEffect(() => {
    const handleInstallPrompt = (event: Event) => {
      event.preventDefault()
      setInstallPrompt(event as BeforeInstallPromptEvent)
    }
    const handleInstalled = () => {
      setInstallPrompt(null)
      setIsInstalled(true)
    }

    window.addEventListener('beforeinstallprompt', handleInstallPrompt)
    window.addEventListener('appinstalled', handleInstalled)
    return () => {
      window.removeEventListener('beforeinstallprompt', handleInstallPrompt)
      window.removeEventListener('appinstalled', handleInstalled)
    }
  }, [])

  const handleInstall = async () => {
    if (!installPrompt) return
    await installPrompt.prompt()
    const choice = await installPrompt.userChoice
    if (choice.outcome === 'accepted') setInstallPrompt(null)
  }

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
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            <span className="text-sm text-gray-500">{user?.email}</span>
            {isAdmin && <Badge variant="purple">Admin</Badge>}
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
          <div className="rounded-xl border border-gray-200 bg-gray-50 px-3 py-3 text-sm">
            <p className="text-xs font-medium uppercase tracking-wider text-gray-500">Schichtgruppe</p>
            <p className="mt-1 font-medium text-gray-900">
              {shiftGroup ? `${shiftGroup.name} Schicht` : 'Noch nicht zugeordnet'}
            </p>
            {shiftGroup && (
              <p className="mt-1 text-xs text-gray-500">
                Ankerdatum: {formatShiftStartDate(shiftGroup.anchor_date)} · Rhythmus: {shiftGroup.pattern}
              </p>
            )}
            <p className="mt-1 text-xs text-gray-400">Die Zuordnung verwaltet ein Admin deines Betriebs.</p>
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

      <Card className="mt-4">
        <CardHeader title="Darstellung" subtitle="Wähle zwischen normalem Modus und Dark Mode." />
        <div className="mt-5 grid grid-cols-2 gap-3">
          <Button
            variant={theme === 'light' ? 'primary' : 'secondary'}
            onClick={() => setTheme('light')}
            fullWidth
          >
            Normal
          </Button>
          <Button
            variant={theme === 'dark' ? 'primary' : 'secondary'}
            onClick={() => setTheme('dark')}
            fullWidth
          >
            Dark Mode
          </Button>
        </div>
      </Card>

      <Card className="mt-4">
        <CardHeader
          title="App auf dem Gerät"
          subtitle="Schneller öffnen und bereits synchronisierte Schichten auch offline ansehen."
        />
        <div className="mt-5 flex items-start gap-3 rounded-xl bg-emerald-50 px-4 py-3">
          <Smartphone className="mt-0.5 h-5 w-5 shrink-0 text-emerald-700" />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-emerald-900">
              {isInstalled ? 'Grüne Schicht ist installiert.' : 'Als App installieren'}
            </p>
            {!isInstalled && !installPrompt && (
              <p className="mt-1 text-xs text-emerald-700">
                Öffne das Browser-Menü und wähle „Zum Home-Bildschirm“ oder „App installieren“.
              </p>
            )}
          </div>
        </div>
        {installPrompt && !isInstalled && (
          <Button className="mt-4" fullWidth onClick={() => void handleInstall()}>
            <Download className="h-4 w-4" />
            App installieren
          </Button>
        )}
      </Card>
    </div>
  )
}
