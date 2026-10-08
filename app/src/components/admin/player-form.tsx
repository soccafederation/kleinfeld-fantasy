import { Input, Label, Select } from "@/components/ui/input";
import type { SeasonPlayerRow, SeasonTeamRow } from "@/lib/admin/queries";

const STATUS: { value: string; label: string }[] = [
  { value: "active", label: "Aktiv" },
  { value: "injured", label: "Verletzt" },
  { value: "unavailable", label: "Nicht verfügbar" },
  { value: "left", label: "Verlassen" },
];

/** Felder für Spieler anlegen/bearbeiten (Server Component, in ActionForm einbetten). */
export function PlayerFields({ seasonId, teams, row, defaultTeamId }: { seasonId: string; teams: SeasonTeamRow[]; row?: SeasonPlayerRow; defaultTeamId?: string }) {
  const k = row?.id ?? "new";
  return (
    <>
      <input type="hidden" name="season_id" value={seasonId} />
      {row && (
        <>
          <input type="hidden" name="season_player_id" value={row.id} />
          <input type="hidden" name="player_id" value={row.player_id} />
        </>
      )}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <div>
          <Label htmlFor={`first-${k}`}>Vorname</Label>
          <Input id={`first-${k}`} name="first_name" defaultValue={row?.player?.first_name ?? ""} />
        </div>
        <div>
          <Label htmlFor={`last-${k}`}>Nachname</Label>
          <Input id={`last-${k}`} name="last_name" defaultValue={row?.player?.last_name ?? ""} required />
        </div>
        <div className="col-span-2 sm:col-span-1">
          <Label htmlFor={`display-${k}`}>Anzeigename</Label>
          <Input id={`display-${k}`} name="display_name" defaultValue={row?.player?.display_name ?? ""} placeholder="leer = Vor- + Nachname" />
        </div>
        <div>
          <Label htmlFor={`team-${k}`}>Team</Label>
          <Select id={`team-${k}`} name="season_team_id" defaultValue={row?.season_team_id ?? defaultTeamId ?? ""} required>
            <option value="" disabled>
              Wählen…
            </option>
            {teams.map((t) => (
              <option key={t.id} value={t.id}>
                {t.club?.short_name} · {t.display_name ?? t.club?.name}
              </option>
            ))}
          </Select>
        </div>
        <div>
          <Label htmlFor={`pos-${k}`}>Position</Label>
          <Select id={`pos-${k}`} name="position" defaultValue={row?.position ?? "FIELD"}>
            <option value="GK">Torwart (GK)</option>
            <option value="FIELD">Feldspieler</option>
          </Select>
        </div>
        <div>
          <Label htmlFor={`status-${k}`}>Status</Label>
          <Select id={`status-${k}`} name="status" defaultValue={row?.status ?? "active"}>
            {STATUS.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </Select>
        </div>
        <div>
          <Label htmlFor={`shirt-${k}`}>Rückennummer</Label>
          <Input id={`shirt-${k}`} name="shirt_number" type="number" inputMode="numeric" min={0} max={99} defaultValue={row?.shirt_number ?? ""} className="num" />
        </div>
        <div>
          <Label htmlFor={`mv-${k}`}>Marktwert (Mio.)</Label>
          <Input id={`mv-${k}`} name="market_value_m" type="number" inputMode="decimal" step="0.5" min={0} defaultValue={row ? Number(row.market_value_m) : 5} required className="num" />
        </div>
        <div className="col-span-2 sm:col-span-1">
          <Label htmlFor={`img-${k}`}>Bild</Label>
          <Input id={`img-${k}`} name="image" type="file" accept="image/*" className="py-2 text-sm file:mr-3 file:rounded-sm file:border-0 file:bg-surface file:px-2 file:text-text-2" />
        </div>
      </div>
    </>
  );
}
