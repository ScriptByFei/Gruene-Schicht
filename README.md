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
| `/register` | Öffentlich |
| `/dashboard` | Eingeloggt |
| `/events/:id` | Eingeloggt |
| `/profile` | Eingeloggt |
| `/admin` | Nur Admins |

## Qualität

```bash
npm run lint
npm test
npm run build
```
