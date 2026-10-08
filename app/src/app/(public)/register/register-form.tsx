"use client";

import Link from "next/link";
import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { FieldError, Input, Label, Notice } from "@/components/ui/input";
import { registerAction } from "../auth/actions";

export function RegisterForm() {
  const [state, action, pending] = useActionState(registerAction, undefined);
  const fe = state?.fieldErrors ?? {};
  return (
    <form action={action} className="flex flex-col gap-4">
      {state?.error && <Notice kind="error">{state.error}</Notice>}
      <div>
        <Label htmlFor="username">Benutzername</Label>
        <Input id="username" name="username" autoComplete="username" required minLength={3} maxLength={20} placeholder="z. B. GoalMachine" aria-invalid={!!fe.username} />
        <p className="mt-1 text-xs text-muted-2">Erscheint öffentlich in der Rangliste. 3–20 Zeichen.</p>
        <FieldError>{fe.username}</FieldError>
      </div>
      <div>
        <Label htmlFor="email">E-Mail</Label>
        <Input id="email" name="email" type="email" autoComplete="email" required aria-invalid={!!fe.email} />
        <FieldError>{fe.email}</FieldError>
      </div>
      <div>
        <Label htmlFor="password">Passwort</Label>
        <Input id="password" name="password" type="password" autoComplete="new-password" required minLength={8} aria-invalid={!!fe.password} />
        <FieldError>{fe.password}</FieldError>
      </div>
      <label className="flex items-start gap-3 text-sm text-text-2">
        <input type="checkbox" name="terms" className="mt-1 h-4 w-4 accent-gold" required />
        <span>
          Ich akzeptiere die{" "}
          <Link href="/terms" className="text-gold underline-offset-2 hover:underline" target="_blank">
            Nutzungs- und Teilnahmebedingungen
          </Link>{" "}
          und habe die{" "}
          <Link href="/privacy" className="text-gold underline-offset-2 hover:underline" target="_blank">
            Datenschutzerklärung
          </Link>{" "}
          gelesen.
        </span>
      </label>
      <FieldError>{fe.terms}</FieldError>
      <Button type="submit" size="lg" disabled={pending} className="mt-2 w-full">
        {pending ? "Wird erstellt…" : "Kostenlos registrieren"}
      </Button>
    </form>
  );
}
