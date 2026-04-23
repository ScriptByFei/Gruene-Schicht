# Grüne Schicht

Event-Planungs-App für Firmen im Schichtbetrieb.

## Setup

1. Supabase-Projekt erstellen unter [supabase.com](https://supabase.com)
2. `supabase/schema.sql` im Supabase SQL-Editor ausführen
3. Umgebungsvariablen konfigurieren:

```bash
cp .env.example .env.local
# VITE_SUPABASE_URL und VITE_SUPABASE_ANON_KEY eintragen
```

4. Abhängigkeiten installieren und Dev-Server starten:

```bash
npm install
npm run dev
```

5. Ersten Nutzer registrieren, dann in Supabase die `role`-Spalte in `profiles` auf `admin` setzen.

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
