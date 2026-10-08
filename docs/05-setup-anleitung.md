# KLEINFELD FANTASY – Setup-Anleitung für die externen Dienste

Du brauchst vier Accounts. Rechne mit etwa 45 Minuten für alles. Am Ende hast du eine `.env.local`-Datei mit sechs Werten, die ich für die App brauche. Alle Dienste haben kostenlose Einstiegspläne – für den Launch reichen sie, danach lohnt bei Supabase und Vercel der Pro-Plan (je ~25 $/Monat).

**Grundregel für alle Accounts:** Mit der Firmen-E-Mail anlegen, die später auch den Betrieb verantwortet. Die Accounts sind das Eigentum an der Plattform.

---

## 1. GitHub (Code-Verwaltung) – 5 Minuten

GitHub speichert den Quellcode. Vercel baut später automatisch aus diesem Repository.

1. https://github.com → Account anlegen oder einloggen.
2. Oben rechts **„+" → „New repository"**.
3. Name: `kleinfeld-fantasy`. **Private** auswählen. Nichts weiter ankreuzen (keine README, kein .gitignore). → **Create repository**.
4. Mir den Repository-Namen nennen (z. B. `christophkoechy/kleinfeld-fantasy`). Ich lade den Code hoch.

---

## 2. Supabase (Datenbank, Login, Dateispeicher) – 15 Minuten

Supabase ist Postgres-Datenbank + Nutzerverwaltung + Dateispeicher in einem.

1. https://supabase.com → **Start your project** → mit GitHub einloggen (einfachste Variante).
2. **New organization** anlegen (Name: DKFV oder Kleinfeld Fantasy, Plan: Free reicht zum Start).
3. **New project**:
   - Name: `kleinfeld-fantasy`
   - Database Password: ein starkes Passwort generieren lassen und **im Passwortmanager speichern** (brauchst du nur für direkten DB-Zugriff).
   - Region: **Central EU (Frankfurt)** – DSGVO.
   - → **Create new project**. Dauert 1–2 Minuten.
4. Links **Project Settings (Zahnrad) → API**. Dort stehen drei Werte, die ich brauche:
   - **Project URL** → das ist `NEXT_PUBLIC_SUPABASE_URL`
   - **anon public** Key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - **service_role** Key (auf „Reveal" klicken) → `SUPABASE_SERVICE_ROLE_KEY`. **Dieser Schlüssel ist geheim** – nie in Chats außer an mich, nie in den Code, nie ins Frontend.
5. **Authentication → URL Configuration**:
   - Site URL: vorerst `http://localhost:3000` (ändern wir nach dem Vercel-Deploy auf die echte Domain).
   - Redirect URLs: `http://localhost:3000/**` eintragen; später zusätzlich `https://deine-domain.de/**`.
6. **Authentication → Providers → Email**: „Confirm email" **an** lassen (E-Mail-Verifizierung).
7. **Datenbank einrichten:** Links **SQL Editor → New query**. Ich gebe dir vier SQL-Dateien (`0001_schema.sql` … `0004_helpers.sql`) plus `seed.sql`. Jede Datei nacheinander komplett einfügen und **Run** klicken. Reihenfolge einhalten. Wenn alles grün ist: fertig. (`seed_demo.sql` nur, wenn du mit Beispieldaten testen willst – vor dem Launch löschen wir die wieder.)
8. **Deinen Admin-Zugang freischalten:** Erst in der App registrieren (sobald sie läuft), dann im SQL Editor:
   ```sql
   update profiles set role = 'admin' where username = 'DEIN_BENUTZERNAME';
   ```

---

## 3. Resend (E-Mail-Versand) – 10 Minuten

Resend verschickt die Transaktionsmails (Verifizierung, Passwort-Reset, Spieltagsergebnis, Gewinnbenachrichtigung). Kostenlos bis 3.000 Mails/Monat.

1. https://resend.com → **Sign up**.
2. **Domains → Add Domain**: deine Absenderdomain eintragen (z. B. `kleinfeld-fantasy.de` oder eine Subdomain wie `mail.kleinfeld-fantasy.de`).
3. Resend zeigt dir 3–4 DNS-Einträge (TXT für SPF/DKIM, MX). Diese bei deinem Domain-Anbieter (z. B. one.com) unter **DNS-Einstellungen** eintragen. Verifizierung dauert bis zu einer Stunde. Ohne verifizierte Domain kannst du nur an deine eigene Adresse senden.
4. **API Keys → Create API Key**: Name `kleinfeld-fantasy`, Permission „Sending access", Domain auswählen. Den Key kopieren → `RESEND_API_KEY`. Wird nur einmal angezeigt.
5. **Supabase soll über Resend mailen** (damit auch Verifizierungs- und Reset-Mails professionell aussehen und nicht am Supabase-Limit von 4 Mails/Stunde scheitern): In Supabase **Project Settings → Authentication → SMTP Settings** → „Enable Custom SMTP":
   - Host: `smtp.resend.com`
   - Port: `465`
   - Username: `resend`
   - Password: dein Resend-API-Key
   - Sender email: `noreply@deine-domain.de`, Sender name: `Kleinfeld Fantasy`

---

## 4. Vercel (Hosting) – 10 Minuten

Vercel baut und hostet die Next.js-App, bei jedem Code-Push automatisch.

1. https://vercel.com → **Sign up** mit GitHub.
2. **Add New → Project** → das Repository `kleinfeld-fantasy` auswählen → **Import**.
3. **Root Directory:** `app` (der Code liegt im Unterordner `app`). Framework wird automatisch als Next.js erkannt.
4. **Environment Variables** eintragen (Name = Wert):
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `RESEND_API_KEY`
   - `EMAIL_FROM` = `Kleinfeld Fantasy <noreply@deine-domain.de>`
   - `CRON_SECRET` = ein langes Zufallspasswort (z. B. 32 Zeichen aus dem Passwortmanager). Schützt die automatischen Deadline-Jobs.
   - `NEXT_PUBLIC_SITE_URL` = vorerst leer lassen, nach dem ersten Deploy die Vercel-URL bzw. deine Domain eintragen.
5. **Deploy**. Nach 2–3 Minuten hast du eine URL wie `kleinfeld-fantasy.vercel.app`.
6. **Eigene Domain:** Project → **Settings → Domains** → Domain eintragen → die angezeigten DNS-Einträge (A-Record / CNAME) bei deinem Domain-Anbieter setzen.
7. Danach in Supabase (Schritt 2.5) die Site URL und Redirect URLs auf die echte Domain umstellen.

**Cron-Jobs (Deadline-Lock, Erinnerungsmails):** Liegen als `vercel.json` im Code und werden automatisch eingerichtet. Im Hobby-Plan laufen Crons nur 1× täglich – für den Deadline-Lock zur Minute brauchen wir den **Pro-Plan** (20 $/Monat) oder du löst den Lock manuell im Admin-Dashboard aus (Button „Spieltag sperren"). Beides ist vorgesehen.

---

## 5. Was du mir danach gibst

Eine Datei `.env.local` (oder die Werte einzeln) mit:

```
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...
RESEND_API_KEY=re_...
EMAIL_FROM=Kleinfeld Fantasy <noreply@deine-domain.de>
CRON_SECRET=...
NEXT_PUBLIC_SITE_URL=https://deine-domain.de
```

Plus den GitHub-Repository-Namen. Dann verbinde ich alles und wir testen live.

---

## Kurz erklärt: Wer macht was im Betrieb?

| Dienst | Aufgabe | Wo du hinschaust |
|---|---|---|
| **Supabase** | Datenbank (alle Spieler, Teams, Punkte), Login, Bilder | Table Editor zum Nachsehen; SQL Editor für Notfälle |
| **Vercel** | Die Website selbst; baut neu bei jeder Code-Änderung | Deployments-Liste, Logs bei Fehlern |
| **Resend** | Verschickt E-Mails | Logs: wurde die Mail zugestellt? |
| **GitHub** | Code-Historie | Normalerweise gar nicht |
| **Admin-Dashboard der App** | Alles Fachliche: Spieler, Spieltage, Statistikimport, Punkte berechnen, Preise | Täglich im Spielbetrieb |
