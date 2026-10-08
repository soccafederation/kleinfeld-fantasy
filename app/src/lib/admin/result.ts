/** Einheitlicher Rückgabetyp für Admin-Server-Actions (useActionState-kompatibel). */
export type ActionState =
  | {
      ok: boolean;
      message?: string;
      error?: string;
      /** Optionale Nutzdaten (z. B. Vorschau-Zeilen, blocked_reason). */
      data?: unknown;
    }
  | undefined;

export type FormAction = (prev: ActionState, formData: FormData) => Promise<ActionState>;

export const fail = (error: string, data?: unknown): ActionState => ({ ok: false, error, data });
export const done = (message?: string, data?: unknown): ActionState => ({ ok: true, message, data });

export function str(fd: FormData, key: string, max = 500) {
  const v = fd.get(key);
  return typeof v === "string" ? v.trim().slice(0, max) : "";
}
export function num(fd: FormData, key: string): number | null {
  const v = str(fd, key, 40).replace(",", ".");
  if (v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}
export function int(fd: FormData, key: string): number | null {
  const n = num(fd, key);
  return n === null ? null : Math.trunc(n);
}
export function bool(fd: FormData, key: string) {
  const v = fd.get(key);
  return v === "on" || v === "true" || v === "1";
}
export function file(fd: FormData, key: string): File | null {
  const v = fd.get(key);
  return v instanceof File && v.size > 0 ? v : null;
}
