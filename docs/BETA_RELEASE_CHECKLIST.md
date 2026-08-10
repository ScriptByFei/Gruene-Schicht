# Beta-Freigabecheckliste

Phase 6 macht die App technisch beta-fähig. Sie veröffentlicht die App nicht automatisch.
Die Freigabe bleibt geschlossen, bis jede Pflichtzeile abgehakt und die Veröffentlichung
bewusst bestätigt wurde.

## 1. Verantwortlichkeit und Datenschutz

- [ ] Rechtlich verantwortliche Person/Firma und ladungsfähige Kontaktdaten festlegen.
- [ ] Datenschutzkontakt in der Beta-Umgebung eintragen.
- [ ] Datenschutzerklärung mit der tatsächlichen betrieblichen Nutzung und Rechtsgrundlage prüfen.
- [ ] Auftragsverarbeitungsvereinbarung (DPA/AVV) mit Supabase prüfen/abschließen.
- [ ] Frist für gelesene Benachrichtigungen festlegen; erst danach eine Löschroutine aktivieren.
- [ ] Datenexport und Kontolöschung mit einem entbehrlichen Testkonto prüfen.

## 2. Supabase-Staging

- [ ] Cloud-Migrationen und pgTAP-Tests sind aktuell und fehlerfrei.
- [ ] Security Advisor zeigt keine Warnungen oder Fehler.
- [ ] Öffentliche Auth-Registrierung ist im Supabase-Dashboard deaktiviert.
- [ ] E-Mail-Bestätigung, sichere Passwortänderung und Bot-Schutz sind aktiviert.
- [ ] Site URL und ausschließlich notwendige Redirect URLs auf die spätere Beta-Domain begrenzen.
- [ ] Es befinden sich keine echten Nutzer- oder Produktivdaten in lokalen Seeds/Testskripten.

## 3. Egress- und Kostenbremse

- [ ] Supabase Usage vor jeder Einladungswelle dokumentieren.
- [ ] Ab 50 % des monatlichen Egress-Limits wöchentlich prüfen.
- [ ] Ab 70 % keine zusätzlichen Beta-Einladungen senden.
- [ ] Ab 85 % Registrierung geschlossen lassen und Datenabrufe untersuchen.
- [ ] Ab 95 % Beta pausieren, bevor eine kostenpflichtige oder eingeschränkte Situation entsteht.
- [ ] Admin-Events laden kompakte Zähler; Details werden erst beim Aufklappen geladen.
- [ ] Kein Realtime, Web-Push, Analytics oder automatisches Polling aktivieren.

## 4. Frontend und Veröffentlichung

- [ ] Private `.env.beta.local` aus `.env.beta.example` erstellen.
- [ ] `npm run beta:check -- .env.beta.local` ist erfolgreich.
- [ ] `npm test`, `npm run lint` und `npm run build` sind erfolgreich.
- [ ] Anmeldung, Kalender, Events, Schichtanträge, Export und Admin-Status mobil geprüft.
- [ ] Nutzer bestätigt ausdrücklich Hosting-Anbieter, Domain und Veröffentlichung.
- [ ] Erst danach Frontend manuell veröffentlichen; geschlossene Beta startet ohne Selbstregistrierung.
