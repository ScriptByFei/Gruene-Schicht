# Grüne Schicht

Event-Planungs-App für Firmen im Schichtbetrieb.

## Setup

1. Abhängigkeiten installieren:

```bash
npm install
```

2. Bei Neon anmelden und dieses Repository mit dem Projekt verbinden:

```bash
npx neon@latest auth
npx neon@latest link
```

3. Auth, Data API und die Umgebungsvariablen des aktuellen Branches bereitstellen:

```bash
npx neon@latest deploy
npx neon@latest env pull
npm run db:migrate
```

Vite übernimmt lokal ausschließlich die öffentlichen Auth- und Data-API-Endpunkte aus den von
Neon gesetzten Variablen; die Datenbank-Verbindungsstrings bleiben serverseitig.

Für neue Features wird passend zum Git-Branch ein kurzlebiger Neon-Branch verwendet:

```bash
npx neon@latest checkout dev-mein-feature --create
```

4. Dev-Server starten:

```bash
npm run dev
```

5. Einen lokalen Testnutzer registrieren und einem Betrieb als Admin zuordnen:

```bash
npm run make-admin -- name@firma.de
```

Die lokale Registrierung ist über `VITE_REGISTRATION_ENABLED=true` in `.env.local` verfügbar.
Für die spätere geschlossene Beta bleibt sie im Frontend und in Managed Better Auth eingeschränkt.

## Umgebungen

- **Lokal:** Die Vite-App läuft lokal und verwendet einen isolierten Neon-Branch.
- **Cloud:** Das Neon-Projekt „gruene-schicht“ in Frankfurt dient bis zur Beta als Backend.
  Öffentliche Registrierungen bleiben deaktiviert.
- **GitHub Pages:** Pushes auf `main` veröffentlichen die geprüfte Beta unter
  <https://scriptbyfei.github.io/Gruene-Schicht/>. Pull Requests führen weiterhin nur Tests,
  Lint und Build aus. App-Routen liegen dort im URL-Fragment (z. B.
  <https://scriptbyfei.github.io/Gruene-Schicht/#/login>), damit GitHub Pages beim Neuladen
  keine 404-Antwort für die Route liefert.

Die Cloud-Migrationshistorie entspricht den Dateien in `neon/migrations`. Der Pages-Workflow liest
die beiden öffentlichen Neon-Endpunkte sowie den Verantwortlichen und Datenschutzkontakt aus
GitHub-Repository-Variablen. Er bricht vor dem Build ab, wenn die Beta-Konfiguration unvollständig
ist.

## Tech-Stack

- React 19 + TypeScript
- Vite 8
- Tailwind CSS v4
- Neon (Lakebase Postgres + Managed Better Auth + Data API)
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

## Schichtplan

Alle vier Schichtgruppen folgen dem 28-Tage-Rhythmus `FFFSSS-SSSNN-----FFFNNNN----`.
Der jeweilige Starttag ist Tag 1 (`F`). Der Kalender zeigt alle Gruppen gemeinsam oder einzeln;
der farbige Punkt kennzeichnet die Gruppe, die Feldfarbe die Schichtart.

| Gruppe | Starttag |
|---|---|
| Rot | 27.04.2026 |
| Gelb | 13.04.2026 |
| Blau | 20.04.2026 |
| Grün | 04.05.2026 |

`F` = Frühschicht (gelb), `S` = Spätschicht (rot), `N` = Nachtschicht (blau),
`-` = frei (grau).

## Qualität

```bash
npm run lint
npm test
npm run build
```

## Geschlossene Beta

Vor einem Hosting werden `.env.beta.example` in eine private Beta-Konfiguration übernommen und
die Freigabesperren geprüft:

```bash
npm run beta:check -- .env.beta.local
```

Die vollständige manuelle Prüfung steht in
[`docs/BETA_RELEASE_CHECKLIST.md`](docs/BETA_RELEASE_CHECKLIST.md). Der Adminbereich lädt nur
kompakte Eventzähler; Umfragen und Vorschläge werden erst beim Aufklappen eines Events abgerufen.
Das Beta-Monitoring speichert keine Freitexte oder Stacktraces und arbeitet ohne Polling, Realtime,
Analytics oder Web-Push.
