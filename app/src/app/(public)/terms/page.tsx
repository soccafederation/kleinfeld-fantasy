import { LegalLayout, Placeholder } from "../legal-layout";
import { createClient } from "@/lib/supabase/server";
import { parseSeasonRules } from "@/lib/rules";

export const metadata = { title: "Teilnahmebedingungen" };

export default async function TermsPage() {
  const supabase = await createClient();
  const { data: season } = await supabase.from("seasons").select("*").in("status", ["open", "live"]).order("created_at").limit(1).maybeSingle();
  const r = parseSeasonRules(season?.rules);
  return (
    <LegalLayout title="Nutzungs- und Teilnahmebedingungen">
      <Placeholder what="Der rechtliche Rahmen (Veranstalter, Teilnahmeberechtigung, Haftung, Gewinnspielrecht)" />
      <h2>Spielregeln (aktuell gültig)</h2>
      <ul>
        <li>Budget: {r.budget_m} Mio. Fantasy Credits je Wettbewerb.</li>
        <li>Kader: {r.squad.GK} Torwart, {r.squad.FIELD} Feldspieler, {r.squad.BENCH} Ersatzspieler. Ersatzspieler erzielen {r.bench_counts ? "" : "keine "}Punkte.</li>
        <li>Maximal {r.max_per_club} Spieler eines realen Teams.</li>
        <li>Kapitän: Punkte zählen {r.captain_multiplier}-fach. Die Kapitänswahl ist bis zur Deadline änderbar.</li>
        <li>Transfers: {r.transfers.free_per_round} kostenlose Transfers pro Spieltag, danach −{r.transfers.penalty_points} Punkte je weiterem Transfer (maximal {r.transfers.max_extra} weitere). Nicht genutzte Transfers verfallen{r.transfers.carry_over ? " nicht" : ""}.</li>
        <li>Deadline: Nach Ablauf der Spieltags-Deadline ist die Aufstellung eingefroren. Änderungen wirken erst auf den nächsten Spieltag.</li>
        <li>Punkte werden ausschließlich aus offiziell veröffentlichten Statistiken berechnet. Nachträgliche Korrekturen der Liga führen zu einer Neuberechnung; Korrekturen werden kenntlich gemacht.</li>
        <li>Punktgleichheit: 1. Gesamtpunkte, 2. Punkte des letzten Spieltags, 3. weniger Transfers insgesamt, 4. frühere Teamerstellung.</li>
        <li>Späteinstieg ist jederzeit möglich; Punkte zählen ab dem ersten Spieltag nach dem Beitritt.</li>
      </ul>
      <h2>Fairplay</h2>
      <p>Ein Account pro Person. Teamnamen dürfen nicht beleidigend, diskriminierend oder irreführend sein; der Veranstalter kann Teamnamen ändern und Accounts bei Verstößen sperren.</p>
      <h2>Preise</h2>
      <p>Preise für den Spieltagssieger und die Saisonwertung werden vor Saisonstart veröffentlicht. Gewinner werden per E-Mail benachrichtigt. Eine Barauszahlung ist ausgeschlossen. Mitarbeitende des Veranstalters sind von Sachpreisen ausgeschlossen.</p>
    </LegalLayout>
  );
}
