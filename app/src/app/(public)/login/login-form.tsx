"use client";

import Link from "next/link";
import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input, Label, Notice } from "@/components/ui/input";
import { loginAction } from "../auth/actions";

export function LoginForm({ next, linkError }: { next?: string; linkError?: boolean }) {
  const [state, action, pending] = useActionState(loginAction, undefined);
  return (
    <form action={action} className="flex flex-col gap-4">
      <input type="hidden" name="next" value={next ?? "/app"} />
      {linkError && <Notice kind="error">Der Link ist ungültig oder abgelaufen. Bitte neu anfordern.</Notice>}
      {state?.error && <Notice kind="error">{state.error}</Notice>}
      <div>
        <Label htmlFor="email">E-Mail</Label>
        <Input id="email" name="email" type="email" autoComplete="email" required />
      </div>
      <div>
        <div className="flex items-center justify-between">
          <Label htmlFor="password">Passwort</Label>
          <Link href="/forgot-password" className="mb-1.5 text-xs text-muted hover:text-gold">
            Passwort vergessen?
          </Link>
        </div>
        <Input id="password" name="password" type="password" autoComplete="current-password" required />
      </div>
      <Button type="submit" size="lg" disabled={pending} className="mt-2 w-full">
        {pending ? "Anmelden…" : "Anmelden"}
      </Button>
    </form>
  );
}
