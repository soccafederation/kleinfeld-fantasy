"use client";

import { useCallback, useEffect, useMemo, useState, useSyncExternalStore, useTransition } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, Check, Lock, Pencil } from "lucide-react";
import { Pitch, PitchSlot, type PitchPlayer } from "@/components/fantasy/pitch";
import { Countdown } from "@/components/fantasy/countdown";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input, Label, Notice } from "@/components/ui/input";
import { Eyebrow } from "@/components/ui/tricolore";
import { saveRosterAction, type SaveRosterResult } from "@/app/app/actions";
import type { MyTeam, PlayerRow, Round } from "@/lib/data/season";
import type { SeasonRules } from "@/lib/rules";
import { cn, formatPoints } from "@/lib/utils";
import { BudgetBar } from "./budget-bar";
import { PlayerPicker } from "./player-picker";
import { PlayerActionSheet } from "./player-action-sheet";
import { Sheet } from "./sheet";
import { Stepper } from "./stepper";
import { CaptainSection, SummaryList, TransferCounter } from "./sections";
import {
  clearDraft,
  draftFromTeam,
  draftKey,
  isDraftComplete,
  loadDraft,
  missingSlots,
  placePlayer,
  removePlayer,
  sameDraft,
  setCaptain,
  storeDraft,
  swapSlots,
  totalValue,
  type Draft,
  type SlotRef,
} from "./draft";

export type TeamBuilderProps = {
  players: PlayerRow[];
  myTeam: MyTeam | null;
  rules: SeasonRules;
  nextRound: Round | null;
  seasonId: string;
  onboarding: boolean;
};

const noop = () => () => {};
const useMounted = () => useSyncExternalStore(noop, () => true, () => false);

export function TeamBuilder(props: TeamBuilderProps) {
  const mounted = useMounted();
  if (!mounted) {
    return <div className="h-[420px] animate-pulse rounded border border-border bg-card" aria-busy />;
  }
  return <TeamBuilderInner {...props} />;
}

function TeamBuilderInner({ players, myTeam, rules, nextRound, seasonId, onboarding }: TeamBuilderProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const byId = useMemo(() => new Map(players.map((p) => [p.id, p])), [players]);
  const serverDraft = useMemo(() => draftFromTeam(myTeam), [myTeam]);
  const serverKey = draftKey(serverDraft);
  const isOnboarding = onboarding || !myTeam || !myTeam.team.is_complete;
  const locked = nextRound === null;

  // Entwurf: im Onboarding zuerst der lokale Zwischenstand, sonst der Serverstand.
  const [draft, setDraft] = useState<Draft>(() => {
    if (isOnboarding) {
      const local = loadDraft(seasonId);
      if (local && local.players.every((p) => byId.has(p.season_player_id))) return local;
    }
    return serverDraft;
  });
  // Server ist Wahrheit: ändert sich der Serverstand (nach Speichern/Refresh), Entwurf übernehmen.
  const [seenKey, setSeenKey] = useState(serverKey);
  if (seenKey !== serverKey) {
    setSeenKey(serverKey);
    setDraft(serverDraft);
  }

  const [validated, setValidated] = useState<{ key: string; res: SaveRosterResult } | null>(null);
  const [validating, setValidating] = useState(false);
  const [pickerRef, setPickerRef] = useState<SlotRef | null>(null);
  const [actionId, setActionId] = useState<string | null>(null);
  const [confirmPenalty, setConfirmPenalty] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [editName, setEditName] = useState(false);

  const dirty = !sameDraft(draft, serverDraft);
  const spent = totalValue(draft, byId);
  const missing = missingSlots(draft, rules);
  const complete = isDraftComplete(draft, rules);
  const key = draftKey(draft);
  // Anzeige nimmt das letzte Ergebnis, Speichern nur ein Ergebnis zum aktuellen Entwurf.
  const validation = validated?.res ?? null;
  const validationFresh = validated?.key === key;

  // Entwurf lokal sichern (nur Onboarding).
  useEffect(() => {
    if (!isOnboarding || saved) return;
    storeDraft(seasonId, draft);
  }, [draft, isOnboarding, seasonId, saved]);

  // Dry-Run gegen den Server, entprellt.
  useEffect(() => {
    if (locked || saved) return;
    if (draft.players.length === 0 && !draft.name.trim()) return;
    let cancelled = false;
    const k = draftKey(draft);
    const t = setTimeout(() => {
      setValidating(true);
      saveRosterAction({ seasonId, teamName: draft.name, players: draft.players, captain: draft.captain, dryRun: true })
        .then((res) => {
          if (!cancelled) setValidated({ key: k, res });
        })
        .finally(() => {
          if (!cancelled) setValidating(false);
        });
    }, 450);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [draft, seasonId, locked, saved]);

  const nameValid = draft.name.trim().length >= 3 && draft.name.trim().length <= 30;
  const errors = (validation?.errors ?? []).filter((e) => !(e.startsWith("Teamname") && !draft.name.trim()));
  const canSave = !locked && !pending && nameValid && complete && !!draft.captain && validationFresh && validation?.ok === true && (!isOnboarding ? dirty : true);

  const doSave = useCallback(() => {
    setSaveError(null);
    startTransition(async () => {
      const res = await saveRosterAction({ seasonId, teamName: draft.name, players: draft.players, captain: draft.captain, dryRun: false });
      if (!res.ok) {
        setSaveError(res.errors.join(" "));
        setValidated({ key: draftKey(draft), res });
        return;
      }
      setConfirmPenalty(false);
      setEditName(false);
      if (isOnboarding && res.complete) {
        clearDraft(seasonId);
        setSaved(true);
      }
      router.refresh();
    });
  }, [draft, seasonId, isOnboarding, router]);

  const onSaveClick = () => {
    if (!isOnboarding && (validation?.penalty ?? 0) > 0) {
      setConfirmPenalty(true);
      return;
    }
    doSave();
  };

  const pitchPlayers: PitchPlayer[] = draft.players.flatMap((e) => {
    const p = byId.get(e.season_player_id);
    if (!p) return [];
    return [
      {
        id: p.id,
        name: p.player.display_name,
        shortName: p.player.last_name || p.player.display_name,
        club: p.team.club.short_name,
        imageUrl: p.player.image_url,
        slot: e.slot,
        slotOrder: e.slot_order,
        points: isOnboarding ? null : p.stats.total_points,
        value: p.market_value_m,
        isCaptain: draft.captain === p.id,
      },
    ];
  });

  const openTransfer = (id: string) => {
    const e = draft.players.find((p) => p.season_player_id === id);
    setActionId(null);
    if (e) setPickerRef({ slot: e.slot, index: e.slot_order });
  };

  if (saved) {
    return (
      <Card accent="gold" className="p-6 text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center bg-gold text-gold-fg skew">
          <Check className="h-7 w-7" />
        </div>
        <h2 className="display mt-4 text-3xl">Team steht</h2>
        <p className="mt-2 text-sm text-text-2">
          „{draft.name.trim()}“ ist gespeichert. Bis zur Deadline kannst du jederzeit nachjustieren.
        </p>
        <Button className="mt-5 w-full" onClick={() => router.push("/app")}>
          Zum Dashboard
        </Button>
      </Card>
    );
  }

  const stepsDone = [nameValid, complete, !!draft.captain, false];

  return (
    <div className="space-y-4">
      {isOnboarding ? (
        <Stepper done={stepsDone} />
      ) : (
        <Card className="p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <Eyebrow>Mein Team</Eyebrow>
              {editName ? (
                <div className="mt-1 flex items-center gap-2">
                  <Input value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} maxLength={30} autoFocus aria-label="Teamname" />
                  <Button variant="secondary" size="icon" onClick={() => setEditName(false)} aria-label="Fertig">
                    <Check />
                  </Button>
                </div>
              ) : (
                <button type="button" onClick={() => !locked && setEditName(true)} className="mt-1 flex min-h-[44px] items-center gap-2 text-left" disabled={locked}>
                  <span className="display truncate text-2xl">{draft.name}</span>
                  {!locked && <Pencil className="h-4 w-4 shrink-0 text-muted" />}
                </button>
              )}
            </div>
            <div className="shrink-0 text-right">
              {nextRound ? (
                <>
                  <div className="text-[10px] uppercase tracking-wider text-muted">Deadline Spieltag {nextRound.number}</div>
                  <Countdown deadline={nextRound.deadline_at} className="num text-xl text-gold" />
                </>
              ) : (
                <span className="inline-flex items-center gap-1 text-xs text-muted">
                  <Lock className="h-3.5 w-3.5" /> Gesperrt
                </span>
              )}
            </div>
          </div>
          <BudgetBar spent={spent} budget={rules.budget_m} className="mt-4" />
        </Card>
      )}

      {locked && (
        <Notice kind="info">
          Aktuell ist keine Spieltagsrunde offen – dein Kader ist eingefroren. Sobald der nächste Spieltag angelegt ist, kannst du wieder wechseln.
        </Notice>
      )}

      {isOnboarding && (
        <Card className="p-4">
          <Label htmlFor="team-name">1 · Teamname</Label>
          <Input
            id="team-name"
            value={draft.name}
            onChange={(e) => setDraft({ ...draft, name: e.target.value })}
            placeholder="z. B. Bolzplatz Legenden"
            maxLength={30}
            disabled={locked}
          />
          <p className={cn("mt-1.5 text-xs", draft.name && !nameValid ? "text-red" : "text-muted")}>3–30 Zeichen · {draft.name.trim().length}/30</p>
        </Card>
      )}

      <section>
        {isOnboarding && (
          <div className="mb-2 flex items-center justify-between">
            <Label className="mb-0">2 · Spieler wählen</Label>
            <span className="text-xs text-muted">Platz antippen</span>
          </div>
        )}
        <Pitch
          players={pitchPlayers}
          emptySlots={rules.squad}
          pointsLabel="Saison"
          renderAction={(slot, index, p) => (
            <PitchSlot
              player={p}
              pointsLabel="Saison"
              onClick={locked && !p ? undefined : () => (p ? setActionId(p.id) : setPickerRef({ slot, index }))}
            />
          )}
        />
        {isOnboarding && <BudgetBar spent={spent} budget={rules.budget_m} className="mt-3" />}
      </section>

      {isOnboarding && (
        <Card className="p-4">
          <Label className="mb-2">3 · Kapitän</Label>
          <CaptainSection draft={draft} byId={byId} multiplier={rules.captain_multiplier} onPick={(id) => setDraft(setCaptain(draft, id))} disabled={locked} />
        </Card>
      )}

      <Card className="p-4">
        {isOnboarding && <Label className="mb-2">4 · Bestätigen</Label>}
        <SummaryList missing={missing} errors={errors} captain={!!draft.captain} complete={complete} validating={validating} />
        {!isOnboarding && validation && (
          <TransferCounter transfers={validation.transfers ?? 0} free={validation.free_transfers ?? rules.transfers.free_per_round} penalty={validation.penalty ?? 0} penaltyEach={rules.transfers.penalty_points} />
        )}
        {saveError && (
          <div className="mt-3">
            <Notice kind="error">{saveError}</Notice>
          </div>
        )}
        <div className="mt-4 flex gap-2">
          {!isOnboarding && (
            <Button variant="secondary" className="flex-1" disabled={!dirty || pending} onClick={() => setDraft(serverDraft)}>
              Verwerfen
            </Button>
          )}
          <Button className="flex-1" disabled={!canSave} onClick={onSaveClick}>
            {pending ? "Speichert …" : isOnboarding ? "Team speichern" : "Änderungen speichern"}
          </Button>
        </div>
      </Card>

      <PlayerPicker
        open={pickerRef !== null}
        onOpenChange={(o) => !o && setPickerRef(null)}
        slotRef={pickerRef}
        draft={draft}
        players={players}
        byId={byId}
        rules={rules}
        onPick={(id) => {
          if (pickerRef) setDraft(placePlayer(draft, pickerRef, id));
          setPickerRef(null);
        }}
      />

      <PlayerActionSheet
        playerId={actionId}
        onOpenChange={(o) => !o && setActionId(null)}
        draft={draft}
        byId={byId}
        locked={locked}
        onCaptain={(id) => {
          setDraft(setCaptain(draft, id));
          setActionId(null);
        }}
        onSwap={(a, b) => {
          setDraft(swapSlots(draft, a, b));
          setActionId(null);
        }}
        onTransfer={openTransfer}
        onRemove={(id) => {
          setDraft(removePlayer(draft, id));
          setActionId(null);
        }}
      />

      <Sheet
        open={confirmPenalty}
        onOpenChange={setConfirmPenalty}
        title="Transfers mit Abzug"
        footer={
          <div className="flex gap-2">
            <Button variant="secondary" className="flex-1" onClick={() => setConfirmPenalty(false)} disabled={pending}>
              Zurück
            </Button>
            <Button className="flex-1" onClick={doSave} disabled={pending}>
              {pending ? "Speichert …" : "Trotzdem speichern"}
            </Button>
          </div>
        }
      >
        <div className="flex items-start gap-3 rounded border border-red/40 bg-red/10 p-3 text-sm">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-red" />
          <p>
            Du machst {validation?.transfers ?? 0} Transfers, {validation?.free_transfers ?? 0} davon sind frei. Für jeden weiteren werden {formatPoints(rules.transfers.penalty_points)} Punkte abgezogen – insgesamt{" "}
            <span className="num text-red">−{formatPoints(validation?.penalty ?? 0)}</span> Punkte am Spieltag {nextRound?.number}.
          </p>
        </div>
        <p className="mt-3 text-xs text-muted">Bis zur Deadline kannst du Transfers wieder rückgängig machen – der Abzug entfällt dann.</p>
      </Sheet>
    </div>
  );
}
