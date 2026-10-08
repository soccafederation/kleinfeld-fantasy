"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { resendConfirmationAction } from "../../auth/actions";

export function ResendButton({ email }: { email: string }) {
  const [sent, setSent] = useState(false);
  const [pending, start] = useTransition();
  return (
    <div className="mt-6">
      <Button variant="secondary" disabled={pending || sent} onClick={() => start(async () => { await resendConfirmationAction(email); setSent(true); })}>
        {sent ? "E-Mail erneut gesendet" : pending ? "Sende…" : "Link erneut senden"}
      </Button>
    </div>
  );
}
