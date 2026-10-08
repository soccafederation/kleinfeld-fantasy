import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** 15 → "15,0M", 9.5 → "9,5M" */
export function formatMillions(value: number | string | null | undefined) {
  if (value === null || value === undefined) return "–";
  const n = typeof value === "string" ? parseFloat(value) : value;
  return `${n.toLocaleString("de-DE", { minimumFractionDigits: 1, maximumFractionDigits: 1 })}M`;
}

/** 12.5 → "12,5" ; 7 → "7" */
export function formatPoints(value: number | string | null | undefined) {
  if (value === null || value === undefined) return "–";
  const n = typeof value === "string" ? parseFloat(value) : value;
  return n.toLocaleString("de-DE", { maximumFractionDigits: 2 });
}

export function formatDateTime(iso: string | null | undefined) {
  if (!iso) return "–";
  return new Intl.DateTimeFormat("de-DE", {
    weekday: "short",
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Europe/Berlin",
  }).format(new Date(iso));
}

export function formatDate(iso: string | null | undefined) {
  if (!iso) return "–";
  return new Intl.DateTimeFormat("de-DE", { day: "2-digit", month: "2-digit", year: "numeric", timeZone: "Europe/Berlin" }).format(
    new Date(iso),
  );
}

/** Restzeit bis Deadline, z. B. "2T 14:12" oder "03:41" oder "abgelaufen" */
export function formatCountdown(iso: string, now = Date.now()) {
  const diff = new Date(iso).getTime() - now;
  if (diff <= 0) return "abgelaufen";
  const totalMin = Math.floor(diff / 60000);
  const days = Math.floor(totalMin / 1440);
  const hours = Math.floor((totalMin % 1440) / 60);
  const mins = totalMin % 60;
  const hh = String(hours).padStart(2, "0");
  const mm = String(mins).padStart(2, "0");
  return days > 0 ? `${days}T ${hh}:${mm}` : `${hh}:${mm}`;
}

export function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");
}

export function slugify(input: string) {
  return input
    .toLowerCase()
    .replace(/ä/g, "ae")
    .replace(/ö/g, "oe")
    .replace(/ü/g, "ue")
    .replace(/ß/g, "ss")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}
