import { LegalLayout, Placeholder } from "../legal-layout";

export const metadata = { title: "Datenschutzerklärung" };

export default function PrivacyPage() {
  return (
    <LegalLayout title="Datenschutz">
      <Placeholder what="Die Datenschutzerklärung" />
      <h2>Welche Daten wir verarbeiten</h2>
      <ul>
        <li><strong>Account:</strong> Benutzername, E-Mail-Adresse, Passwort (gehasht), Zeitpunkt der Zustimmung zu den Bedingungen.</li>
        <li><strong>Spiel:</strong> Fantasy-Teamname, Kaderauswahl, Transfers, Punkte und Platzierungen. Benutzername und Teamname sind in Ranglisten öffentlich sichtbar; die E-Mail-Adresse nie.</li>
        <li><strong>Technisch:</strong> Server-Logs des Hosting-Anbieters (Vercel), Sitzungs-Cookies für den Login.</li>
      </ul>
      <h2>Dienstleister</h2>
      <ul>
        <li>Supabase (Datenbank und Login, Serverstandort Frankfurt, EU)</li>
        <li>Vercel (Hosting)</li>
        <li>Resend (Versand von Transaktions-E-Mails)</li>
      </ul>
      <h2>Deine Rechte</h2>
      <p>Du kannst deine Daten jederzeit im Profil als JSON exportieren und deinen Account selbst löschen. Dabei werden deine persönlichen Daten entfernt und dein Teamname in Ranglisten anonymisiert. Weitere Rechte (Auskunft, Berichtigung, Widerspruch) kannst du per E-Mail an [datenschutz@domain.de] ausüben.</p>
      <h2>E-Mails</h2>
      <p>Pflicht-E-Mails: Bestätigung der Adresse, Passwort zurücksetzen, Gewinnbenachrichtigung. Optionale E-Mails (Spieltagserinnerung, Spieltagsergebnis) kannst du im Profil abschalten.</p>
    </LegalLayout>
  );
}
