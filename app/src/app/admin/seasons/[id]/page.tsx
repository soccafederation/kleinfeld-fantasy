import { requireStaff } from "@/lib/auth";
import { countTeamsForSeason, getAdminSeason } from "@/lib/admin/queries";
import { parseBranding, parseSeasonRules } from "@/lib/rules";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input, Label, Notice, Select } from "@/components/ui/input";
import { ActionForm } from "@/components/admin/action-form";
import { ColorField } from "@/components/admin/color-field";
import { updateSeasonAction, updateSeasonRulesAction } from "../../actions";

const STATUS_LABELS: Record<string, string> = { draft: "Entwurf", open: "Offen (Anmeldung)", live: "Live", completed: "Beendet", archived: "Archiviert" };

export default async function SeasonEditPage({ params }: { params: Promise<{ id: string }> }) {
  await requireStaff();
  const { id } = await params;
  const [season, teamCount] = await Promise.all([getAdminSeason(id), countTeamsForSeason(id)]);
  const rules = parseSeasonRules(season.rules);
  const brand = parseBranding(season.branding);

  return (
    <div className="grid gap-5 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>Stammdaten & Branding</CardTitle>
        </CardHeader>
        <CardContent>
          <ActionForm action={updateSeasonAction} submitLabel="Speichern" variant="secondary">
            <input type="hidden" name="id" value={season.id} />
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <Label htmlFor="name">Name</Label>
                <Input id="name" name="name" defaultValue={season.name} required minLength={2} />
              </div>
              <div>
                <Label htmlFor="slug">Slug</Label>
                <Input id="slug" name="slug" defaultValue={season.slug} />
              </div>
              <div>
                <Label htmlFor="status">Status</Label>
                <Select id="status" name="status" defaultValue={season.status}>
                  {Object.entries(STATUS_LABELS).map(([k, v]) => (
                    <option key={k} value={k}>
                      {v}
                    </option>
                  ))}
                </Select>
              </div>
              <div />
              <div>
                <Label htmlFor="starts_at">Start</Label>
                <Input id="starts_at" name="starts_at" type="date" defaultValue={season.starts_at ?? ""} />
              </div>
              <div>
                <Label htmlFor="ends_at">Ende</Label>
                <Input id="ends_at" name="ends_at" type="date" defaultValue={season.ends_at ?? ""} />
              </div>
            </div>
            <div className="eyebrow mt-2">Branding</div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <Label htmlFor="accent">Akzentfarbe</Label>
                <ColorField id="accent" name="accent" defaultValue={brand.accent} placeholder="#ffd400" />
              </div>
              <div>
                <Label htmlFor="accent_fg">Text auf Akzent</Label>
                <ColorField id="accent_fg" name="accent_fg" defaultValue={brand.accent_fg} placeholder="#0a0a0b" />
              </div>
              <div className="sm:col-span-2">
                <Label htmlFor="hero_image_url">Hero-Bild (URL)</Label>
                <Input id="hero_image_url" name="hero_image_url" defaultValue={brand.hero_image_url ?? ""} placeholder="https://…" />
              </div>
              <div className="sm:col-span-2">
                <Label htmlFor="hero_image">Hero-Bild hochladen (ersetzt URL)</Label>
                <Input id="hero_image" name="hero_image" type="file" accept="image/*" className="py-2 text-sm file:mr-3 file:rounded-sm file:border-0 file:bg-surface file:px-2 file:text-text-2" />
              </div>
            </div>
          </ActionForm>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Spielregeln</CardTitle>
          <span className="text-xs text-muted">{teamCount} Teams</span>
        </CardHeader>
        <CardContent>
          <ActionForm action={updateSeasonRulesAction} submitLabel="Regeln speichern" variant="secondary" confirm={teamCount > 0 ? "Ich habe verstanden, dass bestehende Teams betroffen sind." : undefined}>
            <input type="hidden" name="id" value={season.id} />
            {teamCount > 0 && (
              <Notice kind="error">
                Diese Season hat bereits {teamCount} Team{teamCount === 1 ? "" : "s"}. Änderungen an Budget, Kadergröße oder Club-Limit können bestehende Kader ungültig machen. Transfers und Punkte wirken erst ab der nächsten Berechnung.
              </Notice>
            )}
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              <Field label="Budget (Mio.)" name="budget_m" value={rules.budget_m} step="0.5" />
              <Field label="Kapitän ×" name="captain_multiplier" value={rules.captain_multiplier} step="0.5" />
              <Field label="Max. pro Club" name="max_per_club" value={rules.max_per_club} />
              <Field label="Torwart" name="squad_gk" value={rules.squad.GK} />
              <Field label="Feldspieler" name="squad_field" value={rules.squad.FIELD} />
              <Field label="Bank" name="squad_bench" value={rules.squad.BENCH} />
            </div>
            <div className="eyebrow mt-2">Transfers</div>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              <Field label="Frei pro Spieltag" name="free_per_round" value={rules.transfers.free_per_round} />
              <Field label="Abzug je extra" name="penalty_points" value={rules.transfers.penalty_points} step="0.5" />
              <Field label="Max. extra" name="max_extra" value={rules.transfers.max_extra} />
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              <Check label="Bankpunkte zählen" name="bench_counts" checked={rules.bench_counts} />
              <Check label="Auto-Einwechslung" name="auto_sub" checked={rules.auto_sub} />
              <Check label="Freie Transfers übertragen" name="carry_over" checked={rules.transfers.carry_over} />
              <div>
                <Label htmlFor="late_entry">Später Einstieg</Label>
                <Select id="late_entry" name="late_entry" defaultValue={rules.late_entry}>
                  <option value="allowed">erlaubt</option>
                  <option value="closed">geschlossen</option>
                </Select>
              </div>
            </div>
          </ActionForm>
        </CardContent>
      </Card>
    </div>
  );
}

function Field({ label, name, value, step }: { label: string; name: string; value: number; step?: string }) {
  return (
    <div>
      <Label htmlFor={name}>{label}</Label>
      <Input id={name} name={name} type="number" inputMode="decimal" step={step ?? "1"} min={0} defaultValue={value} required className="num" />
    </div>
  );
}

function Check({ label, name, checked }: { label: string; name: string; checked: boolean }) {
  return (
    <label className="flex min-h-11 items-center gap-2 text-sm">
      <input type="checkbox" name={name} defaultChecked={checked} className="h-5 w-5 accent-[var(--kf-gold)]" />
      {label}
    </label>
  );
}
