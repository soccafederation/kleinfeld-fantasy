"use client";

import { useActionState } from "react";
import { AuthCard } from "@/components/layout/auth-card";
import { Button } from "@/components/ui/button";
import { Input, Label, Notice } from "@/components/ui/input";
import { resetPasswordAction } from "../auth/actions";

export default function ResetPasswordPage() {
  const [state, action, pending] = useActionState(resetPasswordAction, undefined);
  return (
    <AuthCard title="Neues Passwort" subtitle="Wähle ein neues Passwort mit mindestens 8 Zeichen.">
      <form action={action} className="flex flex-col gap-4">
        {state?.error && <Notice kind="error">{state.error}</Notice>}
        <div>
          <Label htmlFor="password">Neues Passwort</Label>
          <Input id="password" name="password" type="password" autoComplete="new-password" required minLength={8} />
        </div>
        <div>
          <Label htmlFor="confirm">Passwort wiederholen</Label>
          <Input id="confirm" name="confirm" type="password" autoComplete="new-password" required minLength={8} />
        </div>
        <Button type="submit" size="lg" disabled={pending} className="w-full">
          {pending ? "Speichere…" : "Passwort speichern"}
        </Button>
      </form>
    </AuthCard>
  );
}
