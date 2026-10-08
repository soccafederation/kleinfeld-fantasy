"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input, Label, Notice } from "@/components/ui/input";
import { changeUsernameAction, deleteAccountAction, exportMyDataAction, signOutAction, updateProfileAction } from "@/app/app/actions";

export function ProfileForms({
  profile,
  prefs,
  email,
}: {
  profile: { username: string; display_name: string | null; username_changed_at: string | null };
  prefs: { email_round_reminder: boolean; email_round_result: boolean };
  email: string;
}) {
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<{ kind: "error" | "success"; text: string } | null>(null);
  const [username, setUsername] = useState(profile.username);
  const [confirmDelete, setConfirmDelete] = useState(false);

  return (
    <div className="flex flex-col gap-4">
      {msg && <Notice kind={msg.kind}>{msg.text}</Notice>}

      <Card className="p-4">
        <div className="eyebrow">Account</div>
        <form
          className="mt-3 flex flex-col gap-4"
          action={(fd) =>
            start(async () => {
              const r = await updateProfileAction(fd);
              setMsg(r.ok ? { kind: "success", text: "Gespeichert." } : { kind: "error", text: r.error ?? "Fehler" });
            })
          }
        >
          <div>
            <Label htmlFor="display_name">Anzeigename</Label>
            <Input id="display_name" name="display_name" defaultValue={profile.display_name ?? ""} maxLength={40} placeholder="Optional" />
          </div>
          <div>
            <Label>E-Mail</Label>
            <Input value={email} disabled />
          </div>
          <fieldset className="flex flex-col gap-2">
            <legend className="mb-1.5 text-xs font-semibold uppercase tracking-[0.12em] text-muted">Benachrichtigungen</legend>
            <label className="flex items-center gap-3 text-sm"><input type="checkbox" name="email_round_reminder" defaultChecked={prefs.email_round_reminder} className="h-4 w-4 accent-gold" /> Erinnerung vor jeder Spieltags-Deadline</label>
            <label className="flex items-center gap-3 text-sm"><input type="checkbox" name="email_round_result" defaultChecked={prefs.email_round_result} className="h-4 w-4 accent-gold" /> Ergebnis nach jedem Spieltag</label>
            <p className="text-xs text-muted-2">Pflicht-Mails (Bestätigung, Passwort, Gewinnbenachrichtigung) kommen immer.</p>
          </fieldset>
          <Button type="submit" disabled={pending} className="self-start">Speichern</Button>
        </form>
      </Card>

      <Card className="p-4">
        <div className="eyebrow">Benutzername</div>
        <p className="mt-1 text-xs text-muted">Öffentlich sichtbar in Ranglisten. Änderbar alle 90 Tage.</p>
        <form
          className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-end"
          onSubmit={(e) => {
            e.preventDefault();
            start(async () => {
              const r = await changeUsernameAction(username);
              setMsg(r.ok ? { kind: "success", text: "Benutzername geändert." } : { kind: "error", text: r.error ?? "Fehler" });
            });
          }}
        >
          <div className="flex-1">
            <Label htmlFor="username">Neuer Benutzername</Label>
            <Input id="username" value={username} onChange={(e) => setUsername(e.target.value)} minLength={3} maxLength={20} pattern="[A-Za-z0-9_.\-]{3,20}" />
          </div>
          <Button type="submit" variant="secondary" disabled={pending || username === profile.username}>Ändern</Button>
        </form>
      </Card>

      <Card className="p-4">
        <div className="eyebrow">Daten & Account</div>
        <div className="mt-3 flex flex-wrap gap-3">
          <Button
            variant="secondary"
            disabled={pending}
            onClick={() =>
              start(async () => {
                const r = await exportMyDataAction();
                if (!r.ok) return setMsg({ kind: "error", text: r.error ?? "Export fehlgeschlagen" });
                const blob = new Blob([JSON.stringify(r.data, null, 2)], { type: "application/json" });
                const url = URL.createObjectURL(blob);
                const a = document.createElement("a");
                a.href = url; a.download = "kleinfeld-fantasy-export.json"; a.click();
                URL.revokeObjectURL(url);
              })
            }
          >
            Meine Daten exportieren (JSON)
          </Button>
          <form action={signOutAction}><Button type="submit" variant="ghost">Abmelden</Button></form>
        </div>
        <div className="mt-6 border-t border-border pt-4">
          {!confirmDelete ? (
            <Button variant="ghost" className="text-red hover:text-red-hover" onClick={() => setConfirmDelete(true)}>Account löschen</Button>
          ) : (
            <div className="flex flex-col gap-3">
              <Notice kind="error">Das löscht deinen Account, deine Teams und Transfers endgültig. Dein Teamname wird in Ranglisten anonymisiert. Das kann nicht rückgängig gemacht werden.</Notice>
              <div className="flex gap-3">
                <Button variant="danger" disabled={pending} onClick={() => start(async () => { const r = await deleteAccountAction(); if (r && !r.ok) setMsg({ kind: "error", text: r.error ?? "Löschen fehlgeschlagen" }); })}>Endgültig löschen</Button>
                <Button variant="secondary" onClick={() => setConfirmDelete(false)}>Abbrechen</Button>
              </div>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}
