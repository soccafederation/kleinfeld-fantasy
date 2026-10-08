"use client";

import Link from "next/link";
import { useActionState } from "react";
import { AuthCard } from "@/components/layout/auth-card";
import { Button } from "@/components/ui/button";
import { Input, Label, Notice } from "@/components/ui/input";
import { forgotPasswordAction } from "../auth/actions";

export default function ForgotPasswordPage() {
  const [state, action, pending] = useActionState(forgotPasswordAction, undefined);
  return (
    <AuthCard title="Passwort zurücksetzen" subtitle="Wir schicken dir einen Link zum Zurücksetzen." footer={<Link href="/login" className="font-semibold text-gold">Zurück zum Login</Link>}>
      <form action={action} className="flex flex-col gap-4">
        {state?.error && <Notice kind="error">{state.error}</Notice>}
        {state?.success && <Notice kind="success">{state.success}</Notice>}
        <div>
          <Label htmlFor="email">E-Mail</Label>
          <Input id="email" name="email" type="email" autoComplete="email" required />
        </div>
        <Button type="submit" size="lg" disabled={pending} className="w-full">
          {pending ? "Sende…" : "Link anfordern"}
        </Button>
      </form>
    </AuthCard>
  );
}
