import { Link } from 'react-router-dom'
import { ShieldCheck } from 'lucide-react'
import type { ReactNode } from 'react'
import { legalNoticeComplete, runtimeConfig } from '../lib/runtimeConfig'
import { Card, CardHeader } from '../components/ui/Card'

export default function PrivacyPage() {
  return (
    <main className="min-h-screen bg-gray-50 px-4 py-10 dark:bg-slate-950">
      <div className="mx-auto max-w-2xl">
        <Link to="/login" className="text-sm font-medium text-emerald-700 hover:text-emerald-800">
          ← Zur Anmeldung
        </Link>
        <div className="mt-6 flex items-center gap-3">
          <div className="rounded-xl bg-emerald-100 p-3 dark:bg-emerald-950">
            <ShieldCheck className="h-6 w-6 text-emerald-700 dark:text-emerald-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Datenschutz</h1>
            <p className="text-sm text-gray-500">Transparenz für die geschlossene Beta</p>
          </div>
        </div>

        {!legalNoticeComplete && (
          <div className="mt-6 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            Beta-Freigabe noch nicht möglich: Verantwortlicher und Datenschutzkontakt müssen vor der Veröffentlichung eingetragen werden.
          </div>
        )}

        <Card className="mt-6">
          <CardHeader title="Verantwortlicher" />
          <p className="mt-4 text-sm text-gray-700 dark:text-gray-300">
            {runtimeConfig.legalOperatorName || 'Noch nicht für die Beta eingetragen'}
          </p>
          <p className="mt-1 text-sm text-gray-700 dark:text-gray-300">
            {runtimeConfig.legalContactEmail || 'Datenschutzkontakt noch nicht eingetragen'}
          </p>
        </Card>

        <Card className="mt-4 space-y-5 text-sm text-gray-700 dark:text-gray-300">
          <Section title="Welche Daten werden verarbeitet?">
            Konto- und Profildaten, Betriebs- und Schichtgruppenzuordnung, Eventteilnahmen,
            Abstimmungen, Vorschläge, Schichtanträge und In-App-Benachrichtigungen. Das sparsame
            Fehlermonitoring speichert nur einen festen Fehlercode, die App-Route, Betriebs- und
            Nutzer-ID sowie den Zeitpunkt – keine Freitexte, E-Mail-Adressen oder Gerätekopien.
          </Section>
          <Section title="Wofür werden die Daten genutzt?">
            Ausschließlich für Anmeldung, Schicht- und Eventplanung, notwendige Zusammenarbeit,
            Betriebssicherheit und die kontrollierte Verbesserung der Beta. Es gibt keine Werbung
            und kein Tracking zu Marketingzwecken.
          </Section>
          <Section title="Wo liegen die Daten?">
            Die zentrale Datenbank und Anmeldung werden über das Supabase-Projekt in der Region
            Frankfurt (EU) betrieben. Auf deinem Gerät speichert die App zuletzt synchronisierte
            Identitäts-, Kalender- und Benachrichtigungsdaten bis zu 30 Tage für die Offline-Nutzung.
          </Section>
          <Section title="Deine Rechte und Kontrolle">
            Im Profil kannst du deine gespeicherten Daten als JSON-Datei exportieren und dein Konto
            löschen. Die Löschung des letzten aktiven Betriebsadmins wird verhindert, bis ein zweiter
            Admin bestimmt wurde. Zusätzlich kannst du dich wegen Auskunft, Berichtigung,
            Einschränkung oder Widerspruch an den oben genannten Kontakt wenden.
          </Section>
          <Section title="Aufbewahrung">
            Daten werden für die Dauer des Kontos und der betrieblichen Nutzung gespeichert.
            Gelöschte Konten werden samt personenbezogener Zuordnungen entfernt. Gelesene
            Benachrichtigungen werden in der Beta zunächst nicht automatisch gelöscht; eine
            verbindliche Frist wird vor dem öffentlichen Betrieb mit dem Verantwortlichen festgelegt.
          </Section>
        </Card>
      </div>
    </main>
  )
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section>
      <h2 className="font-semibold text-gray-900 dark:text-gray-100">{title}</h2>
      <p className="mt-1 leading-6">{children}</p>
    </section>
  )
}
