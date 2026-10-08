import { LegalLayout, Placeholder } from "../legal-layout";

export const metadata = { title: "Impressum" };

export default function ImprintPage() {
  return (
    <LegalLayout title="Impressum">
      <Placeholder what="Das Impressum (Betreiber, Anschrift, Vertretungsberechtigte, Kontakt, Registereintrag, USt-ID)" />
      <h2>Angaben gemäß § 5 DDG</h2>
      <p>[Betreiber: Deutscher Kleinfeld-Fußball-Verband / Gesellschaft]<br />[Straße, Hausnummer]<br />[PLZ Ort]</p>
      <h2>Kontakt</h2>
      <p>E-Mail: [kontakt@domain.de]</p>
      <h2>Verantwortlich für den Inhalt</h2>
      <p>[Name, Anschrift]</p>
    </LegalLayout>
  );
}
