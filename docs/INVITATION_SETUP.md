# Einladungen für die geschlossene Beta

Der Adminbereich erstellt einen teilbaren App-Link. Er enthält **kein** Zugangstoken und kann
per E-Mail oder WhatsApp verschickt werden. Die E-Mail-Adresse der Person muss vorher als
Neon-Auth-Konto angelegt sein. Danach fordert sie auf der Anmeldeseite einen eigenen,
kurzlebigen E-Mail-Link an und wählt im Dashboard ihre Wunsch-Schichtgruppe. Ein App-Admin
gibt die Gruppenzuordnung frei.

## Einmalig einrichten

1. Der Neon-Auth-Magic-Link-Plugin ist auf `main` bereits aktiviert: 15 Minuten Gültigkeit,
   **Sign-up per Magic Link deaktiviert** (`disable_sign_up=true`). Auch die allgemeine
   öffentliche Registrierung ist deaktiviert. Diese Einstellungen vor dem Rollout erneut prüfen.
2. Für die interne Beta Gmail-SMTP in Neon Auth konfigurieren und den Mailversand testen. Der
   geteilte Neon-Testversand ist keine verlässliche Produktionslösung.
3. Erst nach einem vollständigen Test in den GitHub-Repository-Variablen
   `VITE_EMAIL_LINK_ENABLED=true` setzen. Nach dem
   nächsten Pages-Build wird die E-Mail-Link-Anmeldung angezeigt.

Die benötigten Neon-Einstellungen sind in der [Magic-Link-Dokumentation](https://neon.com/docs/auth/guides/plugins/magic-link)
und der [Produktions-Checkliste](https://neon.com/docs/auth/production-checklist) beschrieben.
SMTP-Zugangsdaten gehören ausschließlich in die Neon-Konfiguration, niemals in `VITE_*`-Variablen
oder ins Repository.

### Gmail-SMTP für die interne Beta

1. Im Google-Konto `botmasga@gmail.com` die [Bestätigung in zwei Schritten](https://myaccount.google.com/security)
   aktivieren und anschließend unter [App-Passwörter](https://myaccount.google.com/apppasswords)
   ein eigenes App-Passwort für „Grüne Schicht / Neon Auth“ erzeugen. Ist die Option nicht
   verfügbar, können Kontorichtlinien oder erweiterter Kontoschutz sie verhindern.
2. In der Neon Console das Projekt `gruene-schicht`, Branch `main`, öffnen. Auf der
   **Branch overview** auf **Better Auth** gehen, **Configure Auth** öffnen und unter
   **Email provider** auf **Configure email provider** tippen. Dort den eigenen SMTP-Server
   auswählen und diese Werte eintragen:

   | Feld | Wert |
   | --- | --- |
   | Host | `smtp.gmail.com` |
   | Port | `587` (TLS/STARTTLS; alternativ `465` mit SSL/TLS) |
   | Username | `botmasga@gmail.com` |
   | Password | Das Google-**App-Passwort**, nicht das normale Kontopasswort |
   | Sender email | `botmasga@gmail.com` |
   | Sender name | `Grüne Schicht` |

3. Nach dem Speichern eine Testmail an das eigene Postfach senden, z. B. mit
   `npx neon@latest neon-auth config email-provider test --project-id curly-firefly-43993277 --branch main --recipient-email botmasga@gmail.com`.
   Eingang und Spamordner prüfen. Danach einen echten Magic-Link-Login mit einem bereits
   angelegten Konto testen. Erst wenn beides funktioniert, den Pages-Schalter einschalten.

Das App-Passwort ausschließlich direkt in Neon eintragen; nicht per Chat, GitHub, Screenshot
oder Shell-Kommando weitergeben. Das normale Google-Passwort niemals verwenden. Google rät von
App-Passwörtern als Dauerlösung ab; Gmail hat Versandlimits und kann verdächtige Nachrichten
blockieren. [Google: App-Passwörter](https://support.google.com/accounts/answer/185833),
[Neon: Custom SMTP](https://neon.com/docs/auth/production-checklist#email-provider).

Für den dauerhaften Betrieb empfehlen wir eine eigene Absenderdomain und Resend. Resend benötigt
eine verifizierte Domain; eine bloße `@gmail.com`-Adresse genügt dort nicht. Der kostenlose
Tarif umfasst derzeit 3.000 E-Mails pro Monat mit maximal 100 pro Tag.
[Resend: SMTP-Voraussetzungen](https://resend.com/docs/send-with-smtp) und
[Resend: Preise](https://resend.com/pricing). Alle Zugangsdaten direkt im jeweiligen Anbieter
und in Neon einrichten, nicht in Chat, GitHub oder Frontend-Konfiguration senden.

## Pro Person

Mit der Neon CLI ein Auth-Konto für die tatsächliche E-Mail-Adresse anlegen:

```bash
npx neon@latest neon-auth user create --branch main --email name@firma.de --name "Vorname Nachname"
```

Danach im Adminbereich „Einladung kopieren“, „E-Mail öffnen“ oder „WhatsApp öffnen“ nutzen.
Der Empfänger meldet sich mit genau der freigeschalteten E-Mail-Adresse an. Der Admin prüft
anschließend die angefragte Schichtgruppe.

Vor der ersten echten Einladung den kompletten Ablauf mit einem eigenen Testpostfach prüfen:
Konto anlegen → Link teilen → E-Mail-Link empfangen → anmelden → Gruppe anfragen → Admin-Freigabe
→ persönliche Kalenderansicht. Testkonten danach wieder entfernen.
