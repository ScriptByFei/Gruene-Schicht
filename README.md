# Grüne Schicht

Event-Planungs-App für Firmen im Schichtbetrieb.

## Setup

1. Docker Desktop starten und die lokale Supabase-Umgebung aufbauen:

```bash
supabase start
supabase db reset
```

2. Lokale Umgebungsvariablen konfigurieren:

```bash
cp .env.example .env.local
# Die lokalen Werte aus `supabase status --output env` eintragen
```

3. Abhängigkeiten installieren und Dev-Server starten:

```bash
npm install
npm run dev
```

4. Einen lokalen Testnutzer registrieren und einem Betrieb als Admin zuordnen:

```bash
npm run make-admin -- name@firma.de
```

Die lokale Registrierung ist über `VITE_REGISTRATION_ENABLED=true` in `.env.local` verfügbar.
Für die spätere geschlossene Beta bleibt sie im Frontend und zusätzlich in Supabase Auth deaktiviert.

## Umgebungen

- **Lokal:** App und Supabase laufen auf dem eigenen Rechner. Hier finden Entwicklung,
  Testregistrierungen und Testdaten statt.
- **Cloud:** Das Supabase-Projekt „Grüne Schicht“ dient bis zur Beta nur als Staging-Umgebung.
  Öffentliche Registrierungen bleiben deaktiviert.
- **GitHub:** Pushes und Pull Requests führen nur Tests, Lint und Build aus. Es gibt während der
  Entwicklung keine automatische Veröffentlichung über GitHub Pages.

Die Cloud-Migrationshistorie entspricht den Dateien in `supabase/migrations`. Vor einer späteren
Beta-Veröffentlichung werden zuerst Migrationen und Sicherheitsprüfungen angewendet, danach wird
das Frontend bewusst manuell veröffentlicht.

## Tech-Stack

- React 19 + TypeScript
- Vite 8
- Tailwind CSS v4
- Supabase (Auth + PostgreSQL)
- React Router v7
- Lucide React

## Routen

| Route | Zugang |
|---|---|
| `/login` | Öffentlich |
| `/register` | Öffentlich, Formular nur bei lokal aktivierter Registrierung |
| `/privacy` | Öffentlich |
| `/dashboard` | Eingeloggt |
| `/calendar` | Eingeloggt |
| `/requests` | Eingeloggt |
| `/events/:id` | Eingeloggt |
| `/notifications` | Eingeloggt |
| `/profile` | Eingeloggt |
| `/admin` | Nur Admins |

## Qualität

```bash
npm run lint
npm test
npm run build
```

## Geschlossene Beta

Phase 6 ist technisch abgeschlossen, veröffentlicht die App aber nicht. Vor einem Hosting werden
`.env.beta.example` in eine private Beta-Konfiguration übernommen und die Freigabesperren geprüft:

```bash
npm run beta:check -- .env.beta.local
```

Die vollständige manuelle Prüfung steht in
[`docs/BETA_RELEASE_CHECKLIST.md`](docs/BETA_RELEASE_CHECKLIST.md). Der Adminbereich lädt nur
kompakte Eventzähler; Umfragen und Vorschläge werden erst beim Aufklappen eines Events abgerufen.
Das Beta-Monitoring speichert keine Freitexte oder Stacktraces und arbeitet ohne Polling, Realtime,
Analytics oder Web-Push.
