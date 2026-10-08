"use client";

import Link from "next/link";
import { useActionState, useEffect, useRef, useState } from "react";
import { Button, type ButtonProps } from "@/components/ui/button";
import { Notice } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type { ActionState, FormAction } from "@/lib/admin/result";

type Props = {
  action: FormAction;
  children?: React.ReactNode;
  submitLabel: string;
  pendingLabel?: string;
  variant?: ButtonProps["variant"];
  size?: ButtonProps["size"];
  className?: string;
  buttonClassName?: string;
  /** Zweiter Schritt: Checkbox muss aktiv sein, bevor der Button freigeschaltet wird. */
  confirm?: string;
  /** Formular nach Erfolg zurücksetzen (z. B. "Anlegen"-Formulare). */
  resetOnSuccess?: boolean;
  /** Meldungen unterdrücken (wenn die Seite selbst Feedback zeigt). */
  silent?: boolean;
  /** Kompakte Darstellung: Button neben Inhalt, keine Abstände. */
  inline?: boolean;
  /** Link, der nach Erfolg in der Meldung angeboten wird. */
  successLink?: { href: string; label: string };
  /** Zusatzhinweis, wenn die Action mit data.blocked antwortet (z. B. blocked_reason). */
  blockedHint?: string;
};

export function ActionForm({
  action,
  children,
  submitLabel,
  pendingLabel,
  variant,
  size = "md",
  className,
  buttonClassName,
  confirm,
  resetOnSuccess,
  silent,
  inline,
  successLink,
  blockedHint,
}: Props) {
  const [state, formAction, pending] = useActionState(action, undefined);
  const [confirmed, setConfirmed] = useState(false);
  const [seenState, setSeenState] = useState<ActionState>(undefined);
  const formRef = useRef<HTMLFormElement>(null);

  // Nach erfolgreichem Submit Bestätigung zurücksetzen (State-Abgleich während des Renders)
  if (state !== seenState) {
    setSeenState(state);
    if (state?.ok && resetOnSuccess) setConfirmed(false);
  }

  useEffect(() => {
    if (state?.ok && resetOnSuccess) formRef.current?.reset();
  }, [state, resetOnSuccess]);

  const blocked = !!state && !state.ok && !!(state.data as { blocked?: boolean } | undefined)?.blocked;
  const feedback =
    !silent && state ? (
      state.ok ? (
        state.message || successLink ? (
          <Notice kind="success">
            {state.message}{" "}
            {successLink && (
              <Link href={successLink.href} className="font-semibold text-gold">
                {successLink.label} →
              </Link>
            )}
          </Notice>
        ) : null
      ) : (
        <Notice kind="error">
          {blocked && <strong className="block">Blockiert</strong>}
          {state.error ?? "Unbekannter Fehler."}
          {blocked && blockedHint && <span className="mt-1 block text-xs text-muted">{blockedHint}</span>}
        </Notice>
      )
    ) : null;

  return (
    <form ref={formRef} action={formAction} className={cn(inline ? "flex flex-wrap items-center gap-2" : "flex flex-col gap-4", className)}>
      {!inline && feedback}
      {children}
      {confirm && (
        <label className="flex min-h-11 cursor-pointer items-center gap-2 text-sm text-text-2">
          <input type="checkbox" className="h-5 w-5 accent-[var(--kf-gold)]" checked={confirmed} onChange={(e) => setConfirmed(e.target.checked)} />
          {confirm}
        </label>
      )}
      <Button type="submit" variant={variant} size={size} disabled={pending || (!!confirm && !confirmed)} className={buttonClassName}>
        {pending ? (pendingLabel ?? "Bitte warten…") : submitLabel}
      </Button>
      {inline && feedback}
    </form>
  );
}
