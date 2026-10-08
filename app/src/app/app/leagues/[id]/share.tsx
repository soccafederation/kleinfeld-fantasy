"use client";

import { useState } from "react";
import { Copy, Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export function ShareCode({ code, link }: { code: string; link: string }) {
  const [copied, setCopied] = useState(false);
  async function copy(text: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {}
  }
  async function share() {
    const data = { title: "Kleinfeld Fantasy", text: `Tritt meiner Liga bei – Code ${code}`, url: link };
    if (typeof navigator !== "undefined" && "share" in navigator) {
      try { await navigator.share(data); return; } catch {}
    }
    copy(`${data.text} ${link}`);
  }
  return (
    <Card className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
      <div>
        <div className="eyebrow text-[10px]">Einladungscode</div>
        <div className="num text-3xl tracking-[0.2em]">{code}</div>
      </div>
      <div className="flex gap-2">
        <Button size="sm" variant="secondary" onClick={() => copy(code)}><Copy /> {copied ? "Kopiert" : "Code kopieren"}</Button>
        <Button size="sm" variant="secondary" onClick={share}><Share2 /> Teilen</Button>
      </div>
    </Card>
  );
}
