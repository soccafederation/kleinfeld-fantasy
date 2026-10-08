"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input, Label, Notice } from "@/components/ui/input";
import { createLeagueAction, joinLeagueAction } from "@/app/app/actions";

export function LeagueForms({ seasonId }: { seasonId: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<{ kind: "error" | "success"; text: string } | null>(null);
  const [name, setName] = useState("");
  const [code, setCode] = useState("");

  return (
    <div className="grid gap-4 md:grid-cols-2">
      <Card className="p-4">
        <div className="display-upright text-lg">Liga gründen</div>
        <form
          className="mt-3 flex flex-col gap-3"
          onSubmit={(e) => {
            e.preventDefault();
            start(async () => {
              const res = await createLeagueAction(seasonId, name);
              if (!res.ok) return setMsg({ kind: "error", text: res.error ?? "Fehler" });
              setMsg({ kind: "success", text: `Liga erstellt. Einladungscode: ${res.invite_code}` });
              setName("");
              router.refresh();
            });
          }}
        >
          <div>
            <Label htmlFor="league-name">Name</Label>
            <Input id="league-name" value={name} onChange={(e) => setName(e.target.value)} minLength={3} maxLength={40} required placeholder="z. B. Büro-Liga" />
          </div>
          <Button type="submit" disabled={pending}>Gründen</Button>
        </form>
      </Card>
      <Card className="p-4">
        <div className="display-upright text-lg">Liga beitreten</div>
        <form
          className="mt-3 flex flex-col gap-3"
          onSubmit={(e) => {
            e.preventDefault();
            start(async () => {
              const res = await joinLeagueAction(code);
              if (!res.ok) return setMsg({ kind: "error", text: res.error ?? "Fehler" });
              setMsg({ kind: "success", text: "Du bist der Liga beigetreten." });
              setCode("");
              router.refresh();
            });
          }}
        >
          <div>
            <Label htmlFor="league-code">Einladungscode</Label>
            <Input id="league-code" value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} maxLength={8} required placeholder="8 Zeichen" className="num tracking-[0.2em]" />
          </div>
          <Button type="submit" variant="secondary" disabled={pending}>Beitreten</Button>
        </form>
      </Card>
      {msg && <div className="md:col-span-2"><Notice kind={msg.kind}>{msg.text}</Notice></div>}
    </div>
  );
}
