const TZ = "Europe/Berlin";

function tzOffsetMs(ts: number) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: TZ,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).formatToParts(new Date(ts));
  const get = (type: string) => Number(parts.find((p) => p.type === type)?.value ?? 0);
  const asUtc = Date.UTC(get("year"), get("month") - 1, get("day"), get("hour"), get("minute"), get("second"));
  return asUtc - Math.floor(ts / 1000) * 1000;
}

/** "YYYY-MM-DDTHH:mm" (datetime-local, Europe/Berlin) → ISO-String (UTC). */
export function berlinLocalToIso(local: string): string | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/.exec(local);
  if (!m) return null;
  const [, y, mo, d, h, mi] = m.map(Number);
  const guess = Date.UTC(y, mo - 1, d, h, mi);
  let ts = guess - tzOffsetMs(guess);
  const off2 = tzOffsetMs(ts);
  if (off2 !== tzOffsetMs(guess)) ts = guess - off2;
  return new Date(ts).toISOString();
}

/** ISO → "YYYY-MM-DDTHH:mm" in Europe/Berlin (für datetime-local Default-Werte). */
export function isoToBerlinLocal(iso: string | null | undefined): string {
  if (!iso) return "";
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: TZ,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).formatToParts(new Date(iso));
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "00";
  return `${get("year")}-${get("month")}-${get("day")}T${get("hour")}:${get("minute")}`;
}

/** Aktuelle Zeit in ms – Hilfsfunktion, damit Server Components nicht direkt Date.now() aufrufen. */
export function nowMs() {
  return Date.now();
}
