import { useState } from 'react'
import { Copy, Mail, MessageCircle } from 'lucide-react'
import Button from '../ui/Button'
import { Card, CardHeader } from '../ui/Card'
import { appRouteUrl } from '../../lib/appRouteUrl'
import { runtimeConfig } from '../../lib/runtimeConfig'

export default function InvitationSharingCard() {
  const [copied, setCopied] = useState(false)
  const [error, setError] = useState('')
  const localHost = ['localhost', '127.0.0.1'].includes(window.location.hostname)
  const loginUrl = localHost ? '' : `${window.location.origin}${appRouteUrl('/login')}`
  const message = loginUrl
    ? `Du bist zu Grüne Schicht eingeladen: ${loginUrl}\nMelde dich mit deiner freigeschalteten E-Mail-Adresse an und wähle anschließend deine Schichtgruppe. Ein Admin prüft deine Zuordnung.`
    : ''

  const copyMessage = async () => {
    try {
      await navigator.clipboard.writeText(message)
      setCopied(true)
      setError('')
    } catch {
      setError('Kopieren ist hier nicht verfügbar. Bitte öffne die veröffentlichte App.')
    }
  }

  return (
    <Card className="mb-6">
      <CardHeader title="Mitarbeitende einladen" subtitle="App-Link per E-Mail oder WhatsApp teilen." />
      <p className="mt-4 text-sm text-gray-600 dark:text-slate-300">
        Konten müssen vor dem Versand für die geschlossene Beta freigeschaltet sein. Der Link enthält
        kein Zugangstoken; nur ein zuvor angelegtes Konto kann einen persönlichen Anmeldelink anfordern.
      </p>
      {!runtimeConfig.emailLinkEnabled && (
        <p className="mt-2 text-xs text-amber-700">
          E-Mail-Anmeldung ist noch nicht aktiviert. Bis dahin benötigen Eingeladene ein bestehendes Passwortkonto.
        </p>
      )}
      {loginUrl ? (
        <div className="mt-4 flex flex-wrap gap-2">
          <Button size="sm" onClick={copyMessage}><Copy className="mr-1.5 h-4 w-4" />{copied ? 'Text kopiert' : 'Einladung kopieren'}</Button>
          <a href={`mailto:?subject=${encodeURIComponent('Einladung zu Grüne Schicht')}&body=${encodeURIComponent(message)}`}
            className="inline-flex items-center rounded-lg border border-gray-200 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">
            <Mail className="mr-1.5 h-4 w-4" />E-Mail öffnen
          </a>
          <a href={`https://wa.me/?text=${encodeURIComponent(message)}`} target="_blank" rel="noopener noreferrer"
            className="inline-flex items-center rounded-lg border border-gray-200 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">
            <MessageCircle className="mr-1.5 h-4 w-4" />WhatsApp öffnen
          </a>
        </div>
      ) : (
        <p className="mt-3 text-xs text-gray-500">Teilen ist erst auf der veröffentlichten Seite verfügbar.</p>
      )}
      {error && <p role="alert" className="mt-2 text-xs text-red-600">{error}</p>}
    </Card>
  )
}
