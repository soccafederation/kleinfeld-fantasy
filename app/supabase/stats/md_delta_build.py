"""Spieltag-Statistik aus kumulierten Icon-League-Werten: aktuell minus Vorstand -> SQL.

Aufruf: python3 md_delta_build.py <spieltag> <kumuliert_neu.csv> <kumuliert_vorher.csv> <out.sql>
CSV-Format wie md1_raw.csv (Semikolon, Header name;team;slug;pos;appearances;...).
Nur Spieler mit appearances-Zuwachs >= 1 werden eingetragen.
"""
import csv, sys

TEAM = {
    "berlin-underdogs": "BUD", "buzz-club": "BUZZ", "dna-athletics": "DNA", "eintracht-spandau": "ESP",
    "fc-berlin-city": "FCBC", "fc-onefootball": "OFC", "fokus-eagles": "FOK", "plyrs-united": "PLY",
    "protatos": "PRO", "the-pack-fc": "PACK", "two-stripes-united": "TSU", "wontorriors-fc": "WON",
}
KEYS = ["appearances", "goals", "assists", "shots", "dribbles_success", "dribbles", "fouls_suffered",
        "passes_success", "passes", "passes_failed", "tackles_won", "clearances", "fouls", "yellow", "red",
        "saves", "ball_actions"]


def load(path):
    with open(path, newline="", encoding="utf-8") as f:
        return {r["slug"]: r for r in csv.DictReader(f, delimiter=";")}


def main(md, new_path, old_path, out_path):
    new, old = load(new_path), load(old_path)
    rows, warn = [], []
    for slug, r in new.items():
        o = old.get(slug, {})
        d = {k: int(float(r.get(k) or 0)) - int(float(o.get(k) or 0)) for k in KEYS}
        if d["appearances"] < 1:
            if any(d[k] for k in KEYS):
                warn.append(f"{r['name']}: Werte geändert ohne neues Spiel {d}")
            continue
        neg = {k: v for k, v in d.items() if v < 0}
        if neg:
            warn.append(f"{r['name']}: negative Differenz {neg} (auf 0 gesetzt)")
            for k in neg:
                d[k] = 0
        if r["team"] not in TEAM:
            warn.append(f"{r['name']}: unbekanntes Team {r['team']}")
            continue
        rows.append((TEAM[r["team"]], r["name"], d))
    rows.sort(key=lambda x: (x[0], x[1]))

    t = f"md{md}_in"
    esc = lambda s: s.replace("'", "''")
    vals = ",\n".join(f"  ('{tm}', '{esc(n)}', '{k}', {d[k]})" for tm, n, d in rows for k in KEYS)
    goals = sum(d["goals"] for _, _, d in rows)
    sql = f"""-- Spieltag {md}: Statistiken ({len(rows)} Spieler x {len(KEYS)} Werte) eintragen, freigeben, Punkte berechnen.
-- Werte = Icon-League-Gesamtwerte nach Spieltag {md} minus Stand nach Spieltag {md - 1}.
-- Komplett im Supabase SQL Editor ausführen (bei Nachfrage "Run without RLS").
select lock_due_rounds();

create temp table {t} (team text, full_name text, stat_key text, value numeric);
insert into {t} values
{vals};

insert into player_round_statistics (round_id, season_player_id, stat_key, value, status)
select r.id, sp.id, i.stat_key, i.value, 'published'
from {t} i
join clubs c on c.short_name = i.team
join season_teams st on st.club_id = c.id
join seasons s on s.id = st.season_id and s.slug = 'season-5'
join season_players sp on sp.season_team_id = st.id
join players p on p.id = sp.player_id and lower(p.display_name) = lower(i.full_name)
join fantasy_rounds r on r.season_id = s.id and r.number = {md}
on conflict (round_id, season_player_id, stat_key) do update set value = excluded.value, status = 'published';

select compute_round(r.id, true) as ergebnis
from fantasy_rounds r join seasons s on s.id = r.season_id
where s.slug = 'season-5' and r.number = {md};

-- Kontrolle: nicht zugeordnete Spieler (nur Hero-Spieler erwartet) + Summen + Top 10 Manager
select 'nicht zugeordnet' as info, i.team || ' ' || i.full_name as wert
from (select distinct team, full_name from {t}) i
where not exists (
  select 1 from season_players sp join players p on p.id = sp.player_id
  join season_teams st on st.id = sp.season_team_id join clubs c on c.id = st.club_id
  join seasons s on s.id = sp.season_id
  where s.slug = 'season-5' and c.short_name = i.team and lower(p.display_name) = lower(i.full_name))
union all
select 'Spieler / Tore (erwartet {len(rows)} / {goals}, abzgl. Heros)',
       count(distinct prs.season_player_id)::text || ' / ' || sum(case when prs.stat_key = 'goals' then prs.value else 0 end)::text
from player_round_statistics prs join fantasy_rounds r on r.id = prs.round_id
join seasons s on s.id = r.season_id where s.slug = 'season-5' and r.number = {md}
union all
select * from (
  select 'Manager ' || coalesce(ft.name, '?'), fts.total_points::text
  from fantasy_team_scores fts join fantasy_rounds r on r.id = fts.round_id
  join seasons s on s.id = r.season_id join fantasy_teams ft on ft.id = fts.fantasy_team_id
  where s.slug = 'season-5' and r.number = {md} order by fts.total_points desc limit 10) top;
drop table {t};
"""
    open(out_path, "w", encoding="utf-8").write(sql)
    print(f"{len(rows)} Spieler, {goals} Tore -> {out_path}")
    for w in warn:
        print("WARN", w)


if __name__ == "__main__":
    main(int(sys.argv[1]), sys.argv[2], sys.argv[3], sys.argv[4])
