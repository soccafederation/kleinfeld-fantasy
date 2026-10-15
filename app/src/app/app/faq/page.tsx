import { ChevronDown } from "lucide-react";
import { getAppContext } from "@/lib/data/context";
import { createClient } from "@/lib/supabase/server";
import { DEFAULT_RULES, describeRule, parseScoringRules } from "@/lib/rules";
import { Eyebrow } from "@/components/ui/tricolore";

export const metadata = { title: "FAQ" };

type QA = { q: string; a: React.ReactNode };

/** Häufige Fragen – alle Zahlen kommen aus den Regeln der aktiven Season. */
export default async function FaqPage() {
  const { ctx } = await getAppContext();
  const r = ctx?.rules ?? DEFAULT_RULES;
  const supabase = await createClient();
  const [{ data: version }, { data: defs }] = ctx
    ? await Promise.all([
        supabase.from("scoring_rule_versions").select("rules").eq("season_id", ctx.season.id).eq("is_active", true).maybeSingle(),
        supabase.from("stat_definitions").select("key, label_de"),
      ])
    : [{ data: null }, { data: [] }];
  const labels = Object.fromEntries((defs ?? []).map((d) => [d.key, d.label_de]));
  const scoring = parseScoringRules(version?.rules).rules.filter((x) => x.enabled !== false);
  const maxTransfers = r.transfers.free_per_round + r.transfers.max_extra;

  const sections: { title: string; items: QA[] }[] = [
    {
      title: "Team & Kader",
      items: [
        {
          q: "Wie baue ich mein Team?",
          a: (
            <>
              Unter <b>Mein Team</b> einen Teamnamen vergeben, dann die Plätze auf dem Spielfeld antippen und Spieler auswählen: {r.squad.GK} Torwart, {r.squad.FIELD} Feldspieler und {r.squad.BENCH} auf der Bank. Zum Schluss einen Kapitän wählen und speichern.
            </>
          ),
        },
        { q: "Wie viel Budget habe ich?", a: <>{r.budget_m} Mio. Jeder Spieler hat einen festen Marktwert, der sich aus seinem Kartenrating ergibt und während der Season gleich bleibt.</> },
        { q: "Wie viele Spieler darf ich von einem Team nehmen?", a: <>Maximal {r.max_per_club} Spieler aus demselben echten Team.</> },
        { q: "Was macht der Kapitän?", a: <>Seine Punkte zählen {r.captain_multiplier}-fach. Den Kapitän kannst du bis zur Deadline jederzeit wechseln, das kostet nichts.</> },
      ],
    },
    {
      title: "Bank & Nachrücken",
      items: [
        {
          q: "Sammeln die Bankspieler Punkte?",
          a: r.bench_counts ? (
            <>Ja, Bankspieler punkten in dieser Season mit.</>
          ) : r.auto_sub ? (
            <>Nur, wenn sie nachrücken. Spielt einer deiner Starter am Spieltag nicht, rückt automatisch ein Bankspieler nach, der gespielt hat – zuerst Bankplatz 1, dann Bankplatz 2. Torwart nur für Torwart, Feldspieler nur für Feldspieler.</>
          ) : (
            <>Nein, nur die Startelf punktet.</>
          ),
        },
        { q: "Was passiert, wenn mein Kapitän nicht spielt?", a: <>Dann entfällt der Kapitänsbonus. Der Bonus geht nicht auf den Nachrücker über.</> },
        { q: "Kann ich Spieler zwischen Bank und Startelf tauschen?", a: <>Ja, jederzeit bis zur Deadline und ohne Abzug. Spieler antippen → mit Bankspieler tauschen.</> },
      ],
    },
    {
      title: "Deadline & Transfers",
      items: [
        { q: "Bis wann muss mein Team stehen?", a: <>Die Deadline ist immer um 17:00 Uhr am Spieltag. Danach ist die Aufstellung für diesen Spieltag eingefroren, Änderungen gelten erst für den nächsten.</> },
        {
          q: "Wie viele Spieler kann ich pro Spieltag tauschen?",
          a: (
            <>
              Bis zur ersten Deadline beliebig viele. Danach sind {r.transfers.free_per_round} Wechsel pro Spieltag frei, jeder weitere kostet {r.transfers.penalty_points} Punkte – maximal {maxTransfers} Wechsel pro Spieltag. Nicht genutzte freie Wechsel {r.transfers.carry_over ? "werden angespart" : "verfallen"}. Als Wechsel zählt nur, wenn ein Spieler den Kader verlässt.
            </>
          ),
        },
        { q: "Kann ich einen Wechsel rückgängig machen?", a: <>Ja, bis zur Deadline. Holst du den alten Spieler zurück, entfällt auch ein eventueller Abzug.</> },
        { q: "Kann ich später noch einsteigen?", a: <>Ja, jederzeit. Deine Punkte zählen ab dem ersten Spieltag nach deinem Einstieg.</> },
      ],
    },
    {
      title: "Punkte & Ranking",
      items: [
        {
          q: "Wofür gibt es Punkte?",
          a: scoring.length ? (
            <>
              Für echte Leistungen am Spieltag:
              <ul className="mt-3 divide-y divide-border rounded border border-border">
                {scoring.map((rule, i) => {
                  const d = describeRule(rule, labels);
                  return (
                    <li key={i} className="flex items-center justify-between gap-4 px-3 py-2">
                      <span>{d.label}</span>
                      <span className={rule.points < 0 ? "num text-red" : "num text-gold"}>{d.pts}</span>
                    </li>
                  );
                })}
              </ul>
            </>
          ) : (
            <>Für echte Leistungen am Spieltag wie Tore, Assists, Dribblings und Paraden. Das Punktesystem wird vor dem ersten Spieltag veröffentlicht.</>
          ),
        },
        { q: "Wann gibt es die Punkte?", a: <>Nach jedem Spieltag, sobald die offiziellen Statistiken da sind – meist am Tag danach. Werden Statistiken nachträglich korrigiert, rechnen wir neu.</> },
        { q: "Was passiert bei Punktgleichheit?", a: <>Entscheidend sind nacheinander: Gesamtpunkte, Punkte am letzten Spieltag, weniger Transfers insgesamt, frühere Teamerstellung.</> },
      ],
    },
    {
      title: "Account",
      items: [
        { q: "Wie ändere ich mein Passwort?", a: <>Oben rechts auf dein Kürzel tippen → Profil.</> },
        { q: "Ich habe mein Passwort vergessen.", a: <>Melde dich bei Christoph, er setzt es dir neu.</> },
        { q: "Kann ich in mehreren Wettbewerben spielen?", a: <>Ja. Oben links auf „Kleinfeld Fantasy" tippen – dort siehst du alle Wettbewerbe und wechselst zwischen ihnen.</> },
      ],
    },
  ];

  return (
    <div className="space-y-8">
      <div>
        <Eyebrow>Hilfe</Eyebrow>
        <h1 className="display mt-2 text-4xl md:text-5xl">
          Häufige <span className="text-gold">Fragen</span>
        </h1>
        {ctx && <p className="mt-2 text-sm text-text-2">Regeln für {ctx.season.competition.name} · {ctx.season.name}</p>}
      </div>
      {sections.map((s) => (
        <section key={s.title}>
          <h2 className="eyebrow mb-3 text-muted">{s.title}</h2>
          <div className="divide-y divide-border overflow-hidden rounded border border-border bg-card">
            {s.items.map((item) => (
              <details key={item.q} className="group">
                <summary className="flex min-h-[52px] cursor-pointer list-none items-center justify-between gap-4 px-4 py-3 font-semibold hover:bg-card-hover [&::-webkit-details-marker]:hidden">
                  {item.q}
                  <ChevronDown className="h-4 w-4 shrink-0 text-muted transition group-open:rotate-180" />
                </summary>
                <div className="px-4 pb-4 text-sm leading-relaxed text-text-2">{item.a}</div>
              </details>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
