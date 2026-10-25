-- ============================================================================
-- ICON LEAGUE SEASON 5 – echte Kader (Stand 17.10.2026, Quelle: theiconleague.com)
-- 1) Alle bisherigen Fantasy-Kader zurücksetzen (Teamnamen bleiben, Spieler raus)
-- 2) Test-/Demospieler entfernen
-- 3) Clubs: offizielle Namen + Wappen
-- 4) 155 Spieler aus 11 Teams (Protatos hat noch keinen Kader veröffentlicht)
--    Marktwert aus Kartenrating (OVR): 70 = 3,0 Mio. … 89 = 24,0 Mio.
-- 5) Regel: max. 2 Spieler pro Club
-- Im Supabase SQL Editor komplett ausführen.
-- ============================================================================
do $$
declare v_season uuid; r record; v_player uuid; v_team uuid;
begin
  select s.id into v_season from seasons s join competitions c on c.id = s.competition_id
  where c.slug = 'icon-league' and s.slug = 'season-5';
  if v_season is null then raise exception 'Season 5 nicht gefunden'; end if;

  -- 1) Fantasy-Kader zurücksetzen
  delete from fantasy_lineups where round_id in (select id from fantasy_rounds where season_id = v_season);
  delete from fantasy_transfers where fantasy_team_id in (select id from fantasy_teams where season_id = v_season);
  delete from fantasy_rosters where fantasy_team_id in (select id from fantasy_teams where season_id = v_season);
  update fantasy_teams set is_complete = false, captain_season_player_id = null where season_id = v_season;

  -- 2) Alte Spieler entfernen
  delete from season_players where season_id = v_season;
  delete from players p where not exists (select 1 from season_players sp where sp.player_id = p.id);

  -- 3) Clubs
  update clubs set name = 'Berlin Underdogs', logo_url = 'https://images.ctfassets.net/m4vfhoz81zvx/5QNq5GVibzEPf95ULjJzhA/7d08350876d6dfb4af175ae0ce772e8d/Team_Berlin_Underdogs.png' where id = (select c.id from clubs c join season_teams st on st.club_id = c.id where st.season_id = v_season and c.short_name = 'BUD');
  update clubs set name = 'Buzz Club', logo_url = 'https://images.ctfassets.net/m4vfhoz81zvx/63RxjRCEzFJo7FxgDSL4Ni/a00cad8e5ae759b288d6980c3e92fd45/Team_Buzz_Club.png' where id = (select c.id from clubs c join season_teams st on st.club_id = c.id where st.season_id = v_season and c.short_name = 'BUZZ');
  update clubs set name = 'DNA Athletics', logo_url = 'https://images.ctfassets.net/m4vfhoz81zvx/1usE96GgbbkhXMUCWOb1hC/5fee62dc858caf691b6e278fc334c7cf/DNA.png' where id = (select c.id from clubs c join season_teams st on st.club_id = c.id where st.season_id = v_season and c.short_name = 'DNA');
  update clubs set name = 'Eintracht Spandau', logo_url = 'https://images.ctfassets.net/m4vfhoz81zvx/lhT5Gh1VATTkxBqI8hOVY/460e1075a3680dd2e5bebacbb51cf9f1/Eintracht_Spandau.png' where id = (select c.id from clubs c join season_teams st on st.club_id = c.id where st.season_id = v_season and c.short_name = 'ESP');
  update clubs set name = 'FC Berlin City', logo_url = 'https://images.ctfassets.net/m4vfhoz81zvx/25jZC38mFv4ovJ9Q41bFtU/49fe96be84f9d39580418d964b29983d/Team_FC_Berlin_City.png' where id = (select c.id from clubs c join season_teams st on st.club_id = c.id where st.season_id = v_season and c.short_name = 'FCBC');
  update clubs set name = 'FC OneFootball', logo_url = 'https://images.ctfassets.net/m4vfhoz81zvx/708lBHiLufFeHfTYi6JhsT/2df268dbb2bf6eb693cd10bfd7d0c77a/FCOF_LogoS3.png' where id = (select c.id from clubs c join season_teams st on st.club_id = c.id where st.season_id = v_season and c.short_name = 'OFC');
  update clubs set name = 'FOKUS Eagles', logo_url = 'https://images.ctfassets.net/m4vfhoz81zvx/39OMn1to7basYPVmgpAvZL/1c705ae89f454dad3008348f9ee0cfe1/Team_Fokus_Eagles.png' where id = (select c.id from clubs c join season_teams st on st.club_id = c.id where st.season_id = v_season and c.short_name = 'FOK');
  update clubs set name = 'Plyrs United', logo_url = 'https://images.ctfassets.net/m4vfhoz81zvx/5cuYP1KCY8X4SCbIiNpiaq/9d32989f8398e25c3b2d09b3c5a71c41/Team_Plyrs_United.png' where id = (select c.id from clubs c join season_teams st on st.club_id = c.id where st.season_id = v_season and c.short_name = 'PLY');
  update clubs set name = 'Protatos', logo_url = 'https://images.ctfassets.net/m4vfhoz81zvx/7n0DPpRlpQ0sMPbCnvfWT8/7ba7ed8bc7bb13829b4b8970bb0ad4d4/protatos_black.png' where id = (select c.id from clubs c join season_teams st on st.club_id = c.id where st.season_id = v_season and c.short_name = 'PRO');
  update clubs set name = 'The Pack FC', logo_url = 'https://images.ctfassets.net/m4vfhoz81zvx/1NgkCtwg7lKG5cbAUXIJ82/323431b621584bb0812a6fc950f8b102/Team_The_Pack_Football_Club.png' where id = (select c.id from clubs c join season_teams st on st.club_id = c.id where st.season_id = v_season and c.short_name = 'PACK');
  update clubs set name = 'Two Stripes United', logo_url = 'https://images.ctfassets.net/m4vfhoz81zvx/2ZN90r4DiZZy57KBFqTzMQ/8649054a93d2dfdb81fcf6f1f90c6b5b/Team_Two_Stripes_United.png' where id = (select c.id from clubs c join season_teams st on st.club_id = c.id where st.season_id = v_season and c.short_name = 'TSU');
  update clubs set name = 'Wontorriors FC', logo_url = 'https://images.ctfassets.net/m4vfhoz81zvx/25GfBJT0EcgkY3BC4WcPKt/20dadc92418c326165657eabbca9d5a3/Wontorriors_neu.png' where id = (select c.id from clubs c join season_teams st on st.club_id = c.id where st.season_id = v_season and c.short_name = 'WON');

  -- 4) Spieler
  for r in select * from (values
    ('BUD', 'Ilias', 'Anan', 'FIELD', 82, 12.5, 7, 'ilias-anan', 'https://images.ctfassets.net/m4vfhoz81zvx/2sxM7HeLPsT06gVdH1Y8fT/8cf810ceed104584c7d935327743b17a/BERLIN-UNDERDOGS_07_Ilias-Anan-1.png', false),
    ('BUD', 'Mussa Mohand', 'Arifi', 'FIELD', 75, 6.0, 32, 'mussa-mohand-arifi', 'https://images.ctfassets.net/m4vfhoz81zvx/49fL4PRW9Uinp9GvQuP2XF/63801587d6354a2b5f806c4546c47845/BERLIN-UNDERDOGS_06_Mussa-Arifi-1.png', false),
    ('BUD', 'Antonio', 'Brandt', 'GK', 86, 18.0, 28, 'antonio-brandt', null, false),
    ('BUD', 'Berkant', 'Canbulut', 'FIELD', 78, 8.0, 68, 'berkant-canbulut', null, false),
    ('BUD', 'Stefan', 'Federer', 'FIELD', 77, 7.5, 42, 'stefan-federer', 'https://images.ctfassets.net/m4vfhoz81zvx/3hs5F7tCjDxQDLtTJDa97l/25676c2c29219e9ab7f371146a2ff6d5/BERLIN-UNDERDOGS_09_Stefan-Fediser-1.png', false),
    ('BUD', 'Jonas', 'Hoffmann', 'FIELD', 73, 4.5, 41, 'jonas-hoffmann', 'https://images.ctfassets.net/m4vfhoz81zvx/1g31urjrLWVOGdEOXyE681/8326f7b0d15d959cc72a361d4397b1dc/Hoffmann.png', false),
    ('BUD', 'Raffael', 'Kobrowski', 'FIELD', 81, 11.5, 23, 'raffael-kobrowski', null, false),
    ('BUD', 'Yevhen', 'Puhach', 'FIELD', 79, 9.0, 25, 'yevhen-puhach', null, false),
    ('BUD', 'Jure', 'Pusic', 'FIELD', 83, 14.0, 11, 'jure-pusic', null, false),
    ('BUD', 'Kenan', 'Sanar', 'FIELD', 78, 8.0, 31, 'kenan-sanar', null, false),
    ('BUD', 'Fabian', 'Schulz', 'FIELD', 75, 6.0, 15, 'fabian-schulz', 'https://images.ctfassets.net/m4vfhoz81zvx/7BwyahVL8NE2IXSTz85XTV/9c93758b4a224518fdf6664edec3980e/BERLIN-UNDERDOGS_10_Fabian-Schulz-1.png', false),
    ('BUD', 'Patrick', 'Siefkes', 'GK', 70, 3.0, 30, 'patrick-siefkes', null, false),
    ('BUD', 'Pavlos', 'Wiegels', 'GK', 78, 8.0, 1, 'pavlos-wiegels', 'https://images.ctfassets.net/m4vfhoz81zvx/5N1yZ2EBwt1WsFKaS0agHx/15e9b3c1c80f72430aa716a8cdaa7214/BERLIN-UNDERDOGS_04_Pavlos-Wiegels-1.png', false),
    ('BUD', 'Stefan', 'Winkel', 'FIELD', 84, 15.5, 8, 'stefan-winkel', 'https://images.ctfassets.net/m4vfhoz81zvx/5KVTJGLs0RkRGMZeNFu3kz/3e140589a6415ab02bbfb23b8e267cb8/BERLIN-UNDERDOGS_08_Stefan-Winkel-1.png', false),
    ('BUZZ', 'Amir', 'Ahmadi', 'FIELD', 76, 6.5, 29, 'liridon-krasniq', null, false),
    ('BUZZ', 'Mert', 'Aras', 'FIELD', 76, 6.5, 27, 'mert-aras', null, false),
    ('BUZZ', 'Lejis', 'Bukvic', 'FIELD', 76, 6.5, 25, 'lejis-bukvic', null, false),
    ('BUZZ', 'Mustapha', 'Chahrour', 'FIELD', 81, 11.5, 11, 'mustapha-chahrour', 'https://images.ctfassets.net/m4vfhoz81zvx/5n0vUJhvVAbx2CpDAfKj8b/2b760f118beebfefbf1686655df649fe/BUZZ-CLUB_05_Mustapha-Chahrour-1.png', false),
    ('BUZZ', 'Elias', 'Derwein', 'GK', 78, 8.0, 1, 'elias-derwein', 'https://images.ctfassets.net/m4vfhoz81zvx/6v1JSiRHCC9aQQqBgEb4oG/394ec64bfecfcff28f765975ea06c212/Derwein_SCBuergeramt_1.png', false),
    ('BUZZ', 'Michel', 'Eickschläger', 'FIELD', 74, 5.0, 17, 'michael-eickschlager', null, false),
    ('BUZZ', 'Edonis', 'Gashi', 'FIELD', 76, 6.5, 33, 'orkan-savas', null, false),
    ('BUZZ', 'Malte', 'Istock', 'FIELD', 73, 4.5, 23, 'malte-istock', null, false),
    ('BUZZ', 'Dylan', 'Kuetedy', 'FIELD', 73, 4.5, 8, 'dylan-kuetedy', null, false),
    ('BUZZ', 'Julian', 'Mehl', 'GK', 82, 12.5, 12, 'julian-mehl', 'https://images.ctfassets.net/m4vfhoz81zvx/lZVLZkpbsMaW3noDCw7aY/0a53ce91ecf77301be953b0006cb38dd/BUZZ-CLUB_02_Julian-Mehl-1.png', false),
    ('BUZZ', 'Eleazer', 'Mensah', 'FIELD', 76, 6.5, 2, 'eleazer-mensah', null, false),
    ('BUZZ', 'Hischem', 'Metidji', 'FIELD', 83, 14.0, 18, 'hischem-metidji', 'https://images.ctfassets.net/m4vfhoz81zvx/5QqsS45XVglgGfsiZt6acX/efd9bfe3ccbb67df87199e94b24ebd98/BUZZ-CLUB_08_Hischem-Metidui-1.png', false),
    ('BUZZ', 'Roberto', 'Sandu', 'FIELD', 80, 10.5, 7, 'roberto-sandu', null, false),
    ('BUZZ', 'Danijel', 'Suntic', 'FIELD', 77, 7.5, 5, 'danijel-suntic', 'https://images.ctfassets.net/m4vfhoz81zvx/77mDYJZFVXoPX4ofFicgCR/1f5457ce2af728ae81f8a8f464893d0f/BUZZ-CLUB_03_Danijel-Suntic-1.png', false),
    ('BUZZ', 'Dominik', 'Wanner', 'FIELD', 80, 10.5, 6, 'dion-mehmetukaj', null, false),
    ('BUZZ', 'Yoel', 'Yilma', 'FIELD', 77, 7.5, 10, 'yoel-yilma', 'https://images.ctfassets.net/m4vfhoz81zvx/456BjtC3yzo2LBpPe7dMVr/de7910aad8653a6dc955ec3c804f1171/Yoel_Yilma.png', false),
    ('DNA', 'Ergi', 'Alihoxha', 'FIELD', 80, 10.5, 11, 'ergil-alihoxha', null, false),
    ('DNA', 'Nico', 'Antonitsch', 'FIELD', 77, 7.5, 55, 'nico-antonitsch', 'https://images.ctfassets.net/m4vfhoz81zvx/12DbGmGPmipStQoKB32jZP/22af24ca8ba85e4450f561a5cca429d6/DNA_04_Nico-Antonitsch-1.png', false),
    ('DNA', 'Furkan', 'Ars', 'FIELD', 78, 8.0, 24, 'furkan-ars', 'https://images.ctfassets.net/m4vfhoz81zvx/4BpbwvkXIDJU6MvlTJTR8I/0e3d815ea02bde8144b44f3071a6da99/PLAYERS-UNITED_09_Furkan_Ars-1.png', false),
    ('DNA', 'Jean Daniel', 'Atohoun', 'GK', 80, 10.5, 36, 'jean-daniel-atohoun', null, false),
    ('DNA', 'Ayoub', 'Boukhari', 'FIELD', 85, 16.5, 17, 'ayoub-boukhari', 'https://images.ctfassets.net/m4vfhoz81zvx/4p8phV8ecLHZjKL8A2l3IG/5af4a1d866322f3ab242691bd2975735/Boukhari.png', false),
    ('DNA', 'Amar', 'Cekic', 'FIELD', 87, 20.0, 30, 'amar-cekic', 'https://images.ctfassets.net/m4vfhoz81zvx/35HXFedYbYoqEZGBWmixhD/5bdf2226c0cf745d487e9eeb47448e3d/_DSC3470.png', false),
    ('DNA', 'Soufian', 'Charraoui', 'FIELD', 86, 18.0, 8, 'soufian-charraoui', 'https://images.ctfassets.net/m4vfhoz81zvx/3Fcny2jvXtZxjXVmwxuLFj/c6898c6d04e66437a03efc0cb864b75f/charraoui.png', false),
    ('DNA', 'Petar', 'Gluhakovic', 'FIELD', 78, 8.0, 20, 'petar-gluhakovic', 'https://images.ctfassets.net/m4vfhoz81zvx/3JgyS70lcwvU1Qg5vcb2Qg/73cfb2bcb1ef928bc2aaf5754174d7ce/DNA_09_Petar-Gluhakovic-1.png', false),
    ('DNA', 'Oliver', 'Gorgiev', 'FIELD', 74, 5.0, 46, 'oliver-gorgiev', 'https://images.ctfassets.net/m4vfhoz81zvx/27grD9U0K1b3AAPNkmNUbQ/2a9a67c99f2665426189c8f8de265b82/DNA_11_Oliver-Gorgiev-1.png', false),
    ('DNA', 'Zinedine', 'Hukporti', 'FIELD', 80, 10.5, 7, 'zinedine-hukporti', null, false),
    ('DNA', 'Anthony-Jerome', 'König Janin', 'FIELD', 72, 4.0, 10, 'anthony-jerome-janin', 'https://images.ctfassets.net/m4vfhoz81zvx/5FA1TJlgHJ1XoIjXyoyIaK/29786d1592cd958282dc9c44523d7e83/DNA_06_Anthony-Jerome-Javin-1.png', false),
    ('DNA', 'Daniel', 'Luxbacher', 'FIELD', 74, 5.0, 21, 'daniel-luxbacher', 'https://images.ctfassets.net/m4vfhoz81zvx/3N1elX9QqnswnKE3zwvqZu/c619fe1ad6496c165aabeab262424f36/DNA_08_Daniel-Luxbacher-1.png', false),
    ('DNA', 'Fabio', 'Rasic', 'GK', 70, 3.0, 1, 'fabio-rasic', null, false),
    ('DNA', 'Daniel', 'Sudar', 'FIELD', 85, 16.5, 77, 'daniel-sudar', null, false),
    ('DNA', 'Julian', 'von Haacke', 'FIELD', 79, 9.0, 44, 'julian-von-haacke', null, false),
    ('ESP', 'Alper', 'Aksoy', 'FIELD', 76, 6.5, 44, 'alper-aksoy', null, false),
    ('ESP', 'Leevi', 'Andress', 'GK', 76, 6.5, 22, 'leevi-andress', 'https://images.ctfassets.net/m4vfhoz81zvx/WuUFwblKIORE0yR7u6biX/1a2f9c6ead500cb024f8bbfa87adb905/EINTRACHT_SPANDAU_03_Leevi-Andress-1.png', false),
    ('ESP', 'Vedat', 'Düzgüner', 'FIELD', 75, 6.0, null, 'vedat-duzguner', null, true),
    ('ESP', 'Gaspard', 'Fehlinger', 'FIELD', 78, 8.0, 9, 'gaspard-fehlinger', null, false),
    ('ESP', 'Christian', 'Gawe', 'FIELD', 76, 6.5, 28, 'christian-gawe', null, false),
    ('ESP', 'Tim', 'Häußler', 'FIELD', 76, 6.5, 14, 'tim-haussler', null, false),
    ('ESP', 'Norbert', 'Jaszczak', 'FIELD', 86, 18.0, 10, 'norbert-jaszczak', 'https://images.ctfassets.net/m4vfhoz81zvx/5h67noq8qNU6Az3iw3tZQE/ac5272317551a94da8de02b9a454934e/EINTRACHT_SPANDAU_12_Norbert-Jaszoak-1.png', false),
    ('ESP', 'Paul', 'Kohlstädt', 'FIELD', 83, 14.0, 18, 'paul-kohlstadt', 'https://images.ctfassets.net/m4vfhoz81zvx/ocC6genpxM9bigJBJuxzK/23744e8ec9aa12c71a9121a81db6ef79/EINTRACHT_SPANDAU_10_Paul-Kohlstaedt-1.png', false),
    ('ESP', 'Daniel', 'Krasucki', 'FIELD', 74, 5.0, 99, 'daniel-krasucki', null, false),
    ('ESP', 'John', 'Lenkeit', 'FIELD', 76, 6.5, 37, 'john-lenkeit', null, false),
    ('ESP', 'Eudel', 'Monteiro', 'FIELD', 76, 6.5, 21, 'eudel-monteiro', null, false),
    ('ESP', 'Felix', 'Müller', 'FIELD', 76, 6.5, 26, 'felix-muller', null, false),
    ('ESP', 'Ali', 'Wazneh', 'FIELD', 83, 14.0, 7, 'ali-wazneh', null, false),
    ('ESP', 'Pascal', 'Wiewrodt', 'GK', 81, 11.5, 12, 'pascal-wiewrodt', 'https://images.ctfassets.net/m4vfhoz81zvx/1XiRkiwpIuSRMbhJJHIYxS/60dd2659b65a296ed3f51efc83f75bb2/wiewrodt.png', false),
    ('ESP', 'Dominik', 'Wüst', 'FIELD', 79, 9.0, 23, 'dominik-wust', 'https://images.ctfassets.net/m4vfhoz81zvx/1rSPSJ1q40B4WF3kYXOg5r/55c1e89da37fbe35b6fa074c06688736/DNA_13_Dominik-Wuest-1.png', false),
    ('ESP', 'Halil Ibrahim', 'Yilmaz', 'FIELD', 81, 11.5, 11, 'halil-ibrahim-yilmaz', 'https://images.ctfassets.net/m4vfhoz81zvx/l932fE206OkpjaA71tAGS/d8fe4af034be40d75185fd96edd3b7e3/DNA_14_Ibrahim-Yilmaz-1.png', false),
    ('ESP', 'Philipp', 'Zeiger', 'FIELD', 76, 6.5, 5, 'philipp-zeiger', null, false),
    ('FCBC', 'Fouad', 'Aghnima', 'FIELD', 83, 14.0, 19, 'fouad-aghnima', 'https://images.ctfassets.net/m4vfhoz81zvx/5aHOy7DTCyjPO7YWO1yhsc/0b2bca2bd95ae900ba2014d0a37737fb/FC-BERLIN-CITY_02_Fouard-Agnihma-1.png', false),
    ('FCBC', 'Erich', 'Berko', 'FIELD', 78, 8.0, 39, 'erich-berko', null, false),
    ('FCBC', 'Semih', 'Cakmakci', 'GK', 77, 7.5, 32, 'semih-cakmakci', null, false),
    ('FCBC', 'Maximilian', 'Grünberg', 'FIELD', 84, 15.5, 27, 'maximilian-grunberg', 'https://images.ctfassets.net/m4vfhoz81zvx/FQTZG1u339hRecFFLo3pu/e651947c301aad8fdd3c652245cd8e6d/FC-BERLIN-CITY_03_Maximilian-Gru%C3%8C_nberg-1.png', false),
    ('FCBC', 'Shawn', 'Kauter', 'FIELD', 79, 9.0, 25, 'shawn-kauter', 'https://images.ctfassets.net/m4vfhoz81zvx/24gyK4uMxSif2ZhfoFBR1G/fdff5674e25378351e3ad5319c316375/FC-BERLIN-CITY_05_Shawn-Krauter-1.png', false),
    ('FCBC', 'Enes', 'Küc', 'FIELD', 87, 20.0, 10, 'enes-kuc', null, false),
    ('FCBC', 'Okan Adil', 'Kurt', 'FIELD', 78, 8.0, 8, 'okan-adil-kurt', null, false),
    ('FCBC', 'Gian-Luca', 'Reck', 'GK', 84, 15.5, 1, 'gian-luca-reck', null, false),
    ('FCBC', 'Nick', 'Salihamidzic', 'FIELD', 79, 9.0, 7, 'nick-salihamidzic', null, false),
    ('FCBC', 'Michele', 'Zinnà', 'FIELD', 77, 7.5, 11, 'michele-zinna', null, false),
    ('OFC', 'Aisa Mohand', 'Arifi', 'FIELD', 82, 12.5, 22, 'aisa-mohand-arifi', null, false),
    ('OFC', 'Joseph', 'Dalal', 'FIELD', 76, 6.5, 4, 'joseph-dalal', null, false),
    ('OFC', 'Amir', 'Farhadi', 'FIELD', 76, 6.5, 6, 'amir-farhadi', null, false),
    ('OFC', 'Jan', 'Fauseweh', 'GK', 79, 9.0, 1, 'jan-fauseweh', null, false),
    ('OFC', 'Tarik', 'Hadziavdic', 'FIELD', 79, 9.0, 8, 'tarik-hadziavdic', null, false),
    ('OFC', 'Staas', 'Mitko', 'FIELD', 76, 6.5, 19, 'staas-mitko', 'https://images.ctfassets.net/m4vfhoz81zvx/5xUdmcGt42vBgjLfRhMl4P/865b9c2e5407f50e16afd4ec8385ac8e/PlayerImage_TIL_P10149.png', false),
    ('OFC', 'Amed', 'Öncel', 'FIELD', 77, 7.5, 17, 'amed-oncel', null, false),
    ('OFC', 'Nedzad', 'Plavci', 'FIELD', 84, 15.5, 10, 'nedzad-plavci', 'https://images.ctfassets.net/m4vfhoz81zvx/1akNbRoGjtoY3JzkZMxY27/376da619e8794ccbcca6e6c5603dd6e5/ONE-FOOTBALL_06_Medzad-Plavci-1.png', false),
    ('OFC', 'Mehmet Can', 'Senocak', 'FIELD', 80, 10.5, 77, 'mehmet-can-senocak', null, false),
    ('OFC', 'Kenan', 'Smajlovic', 'FIELD', 76, 6.5, 33, 'kenan-smajlovic', null, false),
    ('OFC', 'Cihan', 'Ucar', 'FIELD', 76, 6.5, 61, 'cihan-ucar', null, false),
    ('OFC', 'Ben', 'Zöllner', 'GK', 76, 6.5, 99, 'ben-zollner', 'https://images.ctfassets.net/m4vfhoz81zvx/5HoFg4cmlqhbHft1Qzw2Gd/bc485d8f73f2acd7aa7df16cadd16044/Zoellner_3.png', false),
    ('FOK', 'Fatih', 'Baca', 'FIELD', 82, 12.5, 8, 'fatih-baca', 'https://images.ctfassets.net/m4vfhoz81zvx/5BecN8AudmkfFa5VPKcPzk/8eebc3c2bf745a047c21b6b9c68681bd/FOKUS-EAGLES_06_Fatih-1.png', false),
    ('FOK', 'Christopher', 'Bachleitner', 'FIELD', 80, 10.5, 21, 'christopher-bachleitner', null, false),
    ('FOK', 'Panzu', 'Ernesto', 'FIELD', 78, 8.0, 17, 'panzu-ernesto', null, false),
    ('FOK', 'Aaron', 'Herzog', 'FIELD', 78, 8.0, 7, 'aaron-herzog', 'https://images.ctfassets.net/m4vfhoz81zvx/1yYB5AAytn1enP2ngTRFPZ/8a012ddb3449ce5f8ad10bddf16ef030/FOKUS-EAGLES_Herzog.png', false),
    ('FOK', 'Andrea', 'Hoxha', 'GK', 87, 20.0, 12, 'andrea-hoxha', 'https://images.ctfassets.net/m4vfhoz81zvx/4HbbJ2pZuvviJpdCi4O9L/65222677a7c000b05b2a50f95e45d12b/FOKUS-EAGLES_12_Andrea-Hoxha-_.png', false),
    ('FOK', 'Denis', 'Hoxha', 'FIELD', 81, 11.5, 6, 'denis-hoxha', 'https://images.ctfassets.net/m4vfhoz81zvx/3nt55nOxFvXD9VDioP230d/3267b7314c6fdd6462b0c3af77924348/FOKUS-EAGLES_08_Denis-Hoxke-1.png', false),
    ('FOK', 'Ivan', 'Knezevic', 'FIELD', 80, 10.5, 20, 'ivan-knezevic', null, false),
    ('FOK', 'Atakan', 'Koyuncuoglu', 'FIELD', 78, 8.0, 9, 'atakan-koyuncuoglu', 'https://images.ctfassets.net/m4vfhoz81zvx/1I2G9yfgL7pRUbW9tgFsYX/da8867994dbfdfb1dfc9474c2e0fa6cc/Atakan.png', false),
    ('FOK', 'Mischa', 'Kurghinyan', 'FIELD', 72, 4.0, 11, 'mischa-kurghinyan', 'https://images.ctfassets.net/m4vfhoz81zvx/7yGU54Ev0slVjHEMNAEvjU/15c7cdbcc043186a493f1aa6d32946bb/FOKUS-EAGLES_07_Misha-Kurghinyan-1.png', false),
    ('FOK', 'Marlon', 'Morgenstern', 'FIELD', 80, 10.5, 4, 'marlon-morgenstern', 'https://images.ctfassets.net/m4vfhoz81zvx/5BgTGjr3Ci80wzUoYASbRC/b667cd39a1aad7d94cc81eff5cf23029/Marlon.png', false),
    ('FOK', 'Ian', 'Prescott Claus', 'FIELD', 86, 18.0, 29, 'ian-prescott', null, false),
    ('FOK', 'Nils', 'Schätzle', 'FIELD', 81, 11.5, 23, 'nils-schatzle', 'https://images.ctfassets.net/m4vfhoz81zvx/3o2zGRpMj9KkFBhRUhq6j9/a7706a703699c0669cbbacb97e954d62/Schaetzle.png', false),
    ('FOK', 'Emincan', 'Tekin', 'FIELD', 89, 24.0, 24, 'emincan-tekin', 'https://images.ctfassets.net/m4vfhoz81zvx/6QeNuB0g7G2PVwCwfTXLrs/44d7187facffb2f68d82d3860cb370c2/FOKUS-EAGLES_01_Ennican-Tekin-1.png', false),
    ('FOK', 'Robin', 'Traboulsi', 'FIELD', 76, 6.5, 27, 'robin-traboulsi', 'https://images.ctfassets.net/m4vfhoz81zvx/2AiFw6fgu63sJ7ulRFft0n/da5a17c77da2e37db280dc393a36f665/FOKUS-EAGLES_14_Robin-Traboulsi-1.png', false),
    ('FOK', 'Orhan', 'Yildirim', 'FIELD', 76, 6.5, 70, 'orhan-yildirim', 'https://images.ctfassets.net/m4vfhoz81zvx/1qsd39Zn827W2VyNTpuVql/0e52caa1770e2a3c2b98e388d8dbd296/FOKUS-EAGLES_11_Orkhan-Yildirim-1.png', false),
    ('PLY', 'Suad', 'Ak', 'FIELD', 86, 18.0, 61, 'suad-ak', null, false),
    ('PLY', 'Filip', 'Anic', 'FIELD', 70, 3.0, 3, 'filip-anic', 'https://images.ctfassets.net/m4vfhoz81zvx/5DRCL2Eg1AfCsUSsU1Pwlc/01c1fb2205cc12ad0f933bada19e1dff/PLAYERS-UNITED_07_Filip-Anic-1.png', false),
    ('PLY', 'Antonio', 'Asanovic', 'FIELD', 82, 12.5, 19, 'antonio-asanovic', null, false),
    ('PLY', 'Diego', 'Demme', 'FIELD', 81, 11.5, 31, 'diego-demme', null, false),
    ('PLY', 'Niko', 'Gießelmann', 'FIELD', 81, 11.5, 7, 'niko-giesselmann', null, false),
    ('PLY', 'Timo', 'Habel', 'GK', 76, 6.5, 15, 'timo-habel', 'https://images.ctfassets.net/m4vfhoz81zvx/7o7w3QbweT27jwY5ll7Oq4/89c465ab0d8bcb7e2a0c5d88afa9520f/PLAYERS-UNITED_02_Timo-Hebel-1.png', false),
    ('PLY', 'Marcel', 'Halstenberg', 'FIELD', 88, 22.0, 23, 'marcel-halstenberg', null, false),
    ('PLY', 'Hassan', 'Jaber', 'FIELD', 78, 8.0, 17, 'hassan-jaber', null, false),
    ('PLY', 'Kilian', 'Neufeld', 'GK', 75, 6.0, 11, 'kilian-neufeld', null, false),
    ('PLY', 'Ivan', 'Peko', 'FIELD', 83, 14.0, 4, 'ivan-peko', 'https://images.ctfassets.net/m4vfhoz81zvx/oJGHkieOT9urAIDpR44E7/7f29771d1e2a3b1acce1eefbf7d2f1ca/PLAYERS-UNITED_08_Ivan-Peko-1.png', false),
    ('PLY', 'Antonio', 'Repic', 'FIELD', 79, 9.0, 46, 'antonio-repic', 'https://images.ctfassets.net/m4vfhoz81zvx/1btxReRkQYGYQIAm7tHMl6/e80daada85ac96db6fa905087a410ca7/PLYRS-UNITED_03_Antonio_Repic-1.png', false),
    ('PLY', 'Josip', 'Sesar', 'FIELD', 84, 15.5, 10, 'josip-sesar', 'https://images.ctfassets.net/m4vfhoz81zvx/7JZIwMFvBDx5gboTcNc4tF/223fd37fc641a90c83c8876a25211c83/PLAYERS-UNITED_04_Josip-Sesar-1.png', false),
    ('PLY', 'Muhammet', 'Sözer', 'FIELD', 85, 16.5, 39, 'muhammet-sozer', 'https://images.ctfassets.net/m4vfhoz81zvx/4EckuMMiCRzjXFT9FRYMru/9e1130b6b01fcf2c4fbc52a3bb024c10/PLAYERS-UNITED_13_Muhammet-Soezer-.png', false),
    ('PLY', 'Filip', 'Vasilj', 'GK', 75, 6.0, 12, 'filip-vasilj', null, false),
    ('PLY', 'Erhan', 'Yilmaz', 'FIELD', 82, 12.5, 94, 'erhan-yilmaz', null, false),
    ('PACK', 'Marcos', 'Alvarez', 'FIELD', 84, 15.5, 10, 'marcos-alvarez', 'https://images.ctfassets.net/m4vfhoz81zvx/2hdMYVeCydPOQOFPTZpovr/bc18ca7a45742a9d8a7533e114f00cab/THE-PACK_09_Marcos-Alvarez-1.png', false),
    ('PACK', 'Haydar', 'Bayram', 'GK', 81, 11.5, 34, 'haydar-bayram', null, false),
    ('PACK', 'Robin', 'Brüseke', 'GK', 81, 11.5, 32, 'robin-bruseke', 'https://images.ctfassets.net/m4vfhoz81zvx/6JImIZcRJfeYbtDoiRiziv/8aa7627b5e0dc1452dbd45c5b2232e7d/Brueseke_3.png', false),
    ('PACK', 'Daniel', 'Caligiuri', 'FIELD', 82, 12.5, 18, 'daniel-caligiuri', 'https://images.ctfassets.net/m4vfhoz81zvx/57fdZD9jhxAouzGLKoBzg7/707386bf27534ade09e2f1978e5a291a/Caligiuri.png', false),
    ('PACK', 'Benedict', 'Chandra', 'FIELD', 79, 9.0, 6, 'benedict-chandra', null, false),
    ('PACK', 'Christian', 'Derflinger', 'FIELD', 84, 15.5, 11, 'christian-derflinger', 'https://images.ctfassets.net/m4vfhoz81zvx/3C4AYUn8bBxlz39wCTzt7b/9116cf348bc4cc439377bc6e4b6429c2/THE-PACK_04_Christian-Deflinger-1.png', false),
    ('PACK', 'Konstantin', 'Fries', 'FIELD', 83, 14.0, 7, 'konstantin-fries', null, false),
    ('PACK', 'Edison', 'Mazreku', 'FIELD', 77, 7.5, 17, 'edison-mazreku', null, false),
    ('PACK', 'Abdenbi', 'Oubelkhiri', 'FIELD', 81, 11.5, 22, 'abel-oubelkhiri', null, false),
    ('PACK', 'Patrick', 'Papachristodoulou', 'FIELD', 70, 3.0, 15, 'patrick-papachristodoulou', 'https://images.ctfassets.net/m4vfhoz81zvx/4iCYcP68th0uNuru2PCVTW/6fe05257637cb3545eabaef5a430cf73/THE-PACK_08_Patrick-Papachristodalow-1.png', false),
    ('PACK', 'Valdet', 'Rama', 'FIELD', 78, 8.0, 19, 'valdet-rama', 'https://images.ctfassets.net/m4vfhoz81zvx/4uAXLjXpJkejAaFiYqj5fB/b8b6d6df8cf89f9fe9a05374a4bc26e9/THE-PACK_05_Valdet-Rouma-1.png', false),
    ('PACK', 'Julian', 'Riedel', 'FIELD', 74, 5.0, 3, 'julian-riedel', null, false),
    ('PACK', 'Hamza', 'Salman', 'FIELD', 76, 6.5, 98, 'hamza-salman', 'https://images.ctfassets.net/m4vfhoz81zvx/x5XmbmkU5yHFCVtzJgaJE/6fb44d57e4f79e780105c74a91654aed/THE-PACK_07_Hamza-Salman-1.png', false),
    ('PACK', 'Justin', 'Sauermilch', 'FIELD', 83, 14.0, 28, 'justin-sauermlich', 'https://images.ctfassets.net/m4vfhoz81zvx/GVXOWGqYbYbg8sCc1mCge/6a102004c8949d519306f4b93d182c10/THE-PACK_01_Justin-Sauermilch-1.png', false),
    ('PACK', 'Noah Elijah', 'Tomson', 'FIELD', 83, 14.0, 70, 'noah-elijah-tomson', 'https://images.ctfassets.net/m4vfhoz81zvx/2ULUFVgpzMNbjhxaDi6Jcl/8bd918edb0e8d067c15b8f5f33412c56/THE-PACK_14_Noah-Tomson-1__.png', false),
    ('PACK', 'Johann', 'von Knebel', 'FIELD', 86, 18.0, 8, 'johann-von-kebel', null, false),
    ('TSU', 'Kaies', 'Alaisame', 'FIELD', 85, 16.5, 97, 'kais-alaisame', 'https://images.ctfassets.net/m4vfhoz81zvx/6m1H87WTbaEqZFxqyrunDj/9242fc9bbeb67daf6864aa611a5c4d29/TWO-STRIPES-UNITED_03_Icailes-Ardiseme-1.png', false),
    ('TSU', 'Ricardo', 'Antonaci', 'FIELD', 75, 6.0, 22, 'ricardo-antonaci', 'https://images.ctfassets.net/m4vfhoz81zvx/6LwlhKGTR3KmPivULdpSFD/88a4a34a2be4ff0da8fe9b60fdd30f02/TWO-STRIPES-UNITED_08_Ricardo-Antonaci-1.png', false),
    ('TSU', 'Kian', 'Assadolahi', 'FIELD', 77, 7.5, 11, 'kian-assadolahi', 'https://images.ctfassets.net/m4vfhoz81zvx/4aEBQQbrrX8Hx6yZ06CHsp/da08a4ec62bf3fe3d0aaf91c005d6dd6/TWO-STRIPES-UNITED_06_nicht-Alex-Taach-1.png', false),
    ('TSU', 'Joel', 'Bustamante', 'FIELD', 79, 9.0, 81, 'joel-bustamante', null, false),
    ('TSU', 'Bilal', 'El Morabiti', 'FIELD', 82, 12.5, 17, 'bilal-el-morabiti', 'https://images.ctfassets.net/m4vfhoz81zvx/4adZiX63XA1AOsLx76wGSf/cdafebdc22e81900777e979f87fbfef9/TWO-STRIPES-UNITED_01_Bilal-El-Morabiti-1.png', false),
    ('TSU', 'Liridon', 'Krasniqi', 'FIELD', 84, 15.5, 8, 'liridon-krasniqi', null, false),
    ('TSU', 'Gabriel', 'Oliveira', 'FIELD', 79, 9.0, 29, 'gabriel-oliveira', 'https://images.ctfassets.net/m4vfhoz81zvx/5NRndWRNQz1QO5oBjVWn0x/b8b7e9dcc125a5d459a8b9afa088b0c8/TWO-STRIPES-UNITED_11_Gabriel-Oliveira-1.png', false),
    ('TSU', 'Sarwar', 'Osse', 'FIELD', 78, 8.0, 77, 'sarwar-osse', null, false),
    ('TSU', 'Vendim', 'Sinani', 'FIELD', 82, 12.5, 23, 'vendim-sinani', 'https://images.ctfassets.net/m4vfhoz81zvx/4TaiKK5eRZKM353TplEOf0/84b1004778f20928b1b2907ec285ac30/TWO-STRIPES-UNITED_02_Vendim-Sinani-1.png', false),
    ('TSU', 'Alex', 'Taach', 'GK', 85, 16.5, 25, 'alex-taach', 'https://images.ctfassets.net/m4vfhoz81zvx/7xqlU5TMhwvyQxiVex8kJ6/07feae576926d462e995baa6b49bc4ef/TWO-STRIPES-UNITED_06_Alex-Taach-1.png', false),
    ('TSU', 'Cain', 'Zaunbrecher', 'FIELD', 77, 7.5, 7, 'cain-zaunbrecher', null, false),
    ('WON', 'Marvin', 'Büyüksakarya', 'FIELD', 77, 7.5, 14, 'marvin-buyuksakarya', 'https://images.ctfassets.net/m4vfhoz81zvx/6xOa37M8cJQFUMUOG0PFYZ/c014af3b9ee653fcb4cd71019df3c7dc/WONTORRIORS_03_Marvin-Buyiksakarya-1.png', false),
    ('WON', 'Theodoros', 'Ganitis', 'FIELD', 76, 6.5, 15, 'theodoros-ganitis', null, false),
    ('WON', 'Emirkaan', 'Güzel', 'FIELD', 76, 6.5, 11, 'emirkaan-guzel', 'https://images.ctfassets.net/m4vfhoz81zvx/4a1q5umIHPz4jiZO2NSaDD/c5057de2eaac2950bccb26c6b79b6435/Emirkaan_Guezel_1.png', false),
    ('WON', 'Colin', 'Haupt', 'FIELD', 78, 8.0, 27, 'colin-haupt', 'https://images.ctfassets.net/m4vfhoz81zvx/1ppAtgA2qQC2nirJosJ8M1/578ed196ebca0b6bb52a635f74b3a8f1/Haupt_3.png', false),
    ('WON', 'Mohamed', 'Karma', 'FIELD', 76, 6.5, 41, 'mohamed-karma', 'https://images.ctfassets.net/m4vfhoz81zvx/5gj5a1RrtngE2acr0aYEcX/3fea33c23df8ba719080635e8e86c8fa/Karma.png', false),
    ('WON', 'Tom', 'Köster', 'GK', 76, 6.5, 22, 'tom-koster', 'https://images.ctfassets.net/m4vfhoz81zvx/broYZC1iImbjMucgXmyb1/d5acf1e267490ae8a659131091f892d2/WONTORRIORS_01_Tom-Koester-1.png', false),
    ('WON', 'Max', 'Kruse', 'FIELD', 85, 16.5, 10, 'max-kruse', null, false),
    ('WON', 'Zhi-Gin', 'Lam', 'FIELD', 80, 10.5, 17, 'zhi-gin-lam', 'https://images.ctfassets.net/m4vfhoz81zvx/0DUi0FHgddbhEnyC468pi/a5e2d77a281cece0762589c603ab08d1/Lam_3.png', false),
    ('WON', 'Mattia', 'Maggio', 'FIELD', 83, 14.0, 33, 'matthia-maggio', 'https://images.ctfassets.net/m4vfhoz81zvx/1raJhDCJBcfs8i8vTKg2Hg/ff6da4a2efbafb110b8ee926ca4ab875/WONTORRIORS_09_Mattia-Messio-1.png', false),
    ('WON', 'Carlos', 'Neves', 'FIELD', 80, 10.5, 77, 'carlos-neves', null, false),
    ('WON', 'Deniz', 'Öztürk', 'FIELD', 78, 8.0, 37, 'deniz-ozturk', null, false),
    ('WON', 'Erciyes', 'Palo', 'FIELD', 74, 5.0, 5, 'erciyes-palo', 'https://images.ctfassets.net/m4vfhoz81zvx/1bU4KQlGy1AvcjNspmfdpe/ed1b2c4a3af879c4a043fd26f1fb0020/WONTORRIORS_08_Erciyes-Palo-1.png', false),
    ('WON', 'Jeppe', 'Waschko', 'FIELD', 76, 6.5, 8, 'jeppe-waschko', null, false),
    ('WON', 'Max', 'Wendt', 'GK', 82, 12.5, 1, 'max-wendt', 'https://images.ctfassets.net/m4vfhoz81zvx/7kFAEtqtapbfG4MDdU2iko/1579df6c047a5b4995e019a91a53ac15/Wendt.png', false)
  ) as x(team, first_name, last_name, pos, ovr, value_m, shirt, icon_slug, image_url, rating_missing) loop
    select st.id into v_team from season_teams st join clubs c on c.id = st.club_id
    where st.season_id = v_season and c.short_name = r.team;
    if v_team is null then raise exception 'Team % fehlt', r.team; end if;
    insert into players (first_name, last_name, display_name, image_url, external_refs)
    values (r.first_name, r.last_name, r.first_name || ' ' || r.last_name, r.image_url,
            jsonb_build_object('icon_slug', r.icon_slug, 'rating', r.ovr, 'rating_missing', r.rating_missing))
    returning id into v_player;
    insert into season_players (season_id, player_id, season_team_id, position, shirt_number, market_value_m)
    values (v_season, v_player, v_team, r.pos::player_position, r.shirt, r.value_m);
  end loop;

  -- 5) Regel
  update seasons set rules = rules || '{"max_per_club": 2}'::jsonb where id = v_season;
end $$;

-- Kontrolle: 11 Teams mit Spielern, Protatos 0
select c.short_name, c.name, count(sp.id) as spieler, coalesce(round(avg(sp.market_value_m), 1), 0) as avg_mio
from season_teams st join clubs c on c.id = st.club_id
join seasons s on s.id = st.season_id join competitions co on co.id = s.competition_id
left join season_players sp on sp.season_team_id = st.id
where co.slug = 'icon-league' and s.slug = 'season-5'
group by c.short_name, c.name order by c.name;
