"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";

const HEX = /^#[0-9a-fA-F]{6}$/;

/** Hex-Textfeld mit Farbwähler; der Wert geht über das Textfeld ins Formular. */
export function ColorField({ id, name, defaultValue, placeholder }: { id: string; name: string; defaultValue?: string; placeholder?: string }) {
  const [value, setValue] = useState(defaultValue ?? "");
  return (
    <div className="flex items-center gap-2">
      <input
        type="color"
        aria-label="Farbe wählen"
        value={HEX.test(value) ? value : "#ffd400"}
        onChange={(e) => setValue(e.target.value)}
        className="h-11 w-12 shrink-0 cursor-pointer rounded-sm border border-border-strong bg-surface p-1"
      />
      <Input id={id} name={name} value={value} onChange={(e) => setValue(e.target.value)} placeholder={placeholder} maxLength={20} />
    </div>
  );
}
