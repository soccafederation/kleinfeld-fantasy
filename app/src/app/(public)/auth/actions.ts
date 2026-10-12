"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { REGISTRATION_OPEN } from "@/lib/config";

const USERNAME_RE = /^[A-Za-z0-9_.-]{3,20}$/;

const registerSchema = z.object({
  username: z.string().regex(USERNAME_RE, "3–20 Zeichen, nur Buchstaben, Zahlen, Punkt, Minus, Unterstrich."),
  email: z.string().email("Bitte eine gültige E-Mail-Adresse eingeben."),
  password: z.string().min(8, "Mindestens 8 Zeichen."),
  terms: z.literal("on", { message: "Bitte den Nutzungsbedingungen zustimmen." }),
});

export type AuthState = { error?: string; fieldErrors?: Record<string, string>; success?: string } | undefined;

function siteUrl() {
  const explicit = process.env.NEXT_PUBLIC_SITE_URL;
  if (explicit) return explicit.replace(/\/$/, "");
  const vercel = process.env.VERCEL_PROJECT_PRODUCTION_URL;
  if (vercel) return `https://${vercel}`;
  return "http://localhost:3000";
}

export async function registerAction(_prev: AuthState, formData: FormData): Promise<AuthState> {
  if (!REGISTRATION_OPEN) return { error: "Die Registrierung ist geschlossen. Zugang nur auf Einladung." };
  const parsed = registerSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    const fe: Record<string, string> = {};
    for (const issue of parsed.error.issues) fe[String(issue.path[0])] = issue.message;
    return { fieldErrors: fe };
  }
  const { username, email, password } = parsed.data;
  const supabase = await createClient();

  const { data: available } = await supabase.rpc("username_available", { p_username: username });
  if (!available) return { fieldErrors: { username: "Dieser Benutzername ist bereits vergeben." } };

  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: `${siteUrl()}/auth/callback?next=/app`,
      data: { username, terms_accepted: true },
    },
  });
  if (error) {
    if (error.message.toLowerCase().includes("already registered")) return { fieldErrors: { email: "Für diese E-Mail existiert bereits ein Account." } };
    return { error: error.message };
  }
  redirect(`/register/check-email?email=${encodeURIComponent(email)}`);
}

export async function loginAction(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const identifier = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const next = String(formData.get("next") ?? "/app");
  if (!identifier || !password) return { error: "Bitte E-Mail oder Benutzername und Passwort eingeben." };
  const supabase = await createClient();

  // Login per Benutzername: E-Mail wird serverseitig aufgelöst und nie an den Browser gegeben.
  let email = identifier;
  if (!identifier.includes("@")) {
    const admin = createAdminClient();
    const { data: profile } = await admin.from("profiles").select("user_id").eq("username", identifier).maybeSingle();
    const resolved = profile ? (await admin.auth.admin.getUserById(profile.user_id)).data.user?.email : null;
    if (!resolved) return { error: "E-Mail/Benutzername oder Passwort ist falsch." };
    email = resolved;
  }
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    if (error.message.toLowerCase().includes("email not confirmed")) return { error: "Bitte bestätige zuerst deine E-Mail-Adresse. Wir haben dir einen Link geschickt." };
    return { error: "E-Mail/Benutzername oder Passwort ist falsch." };
  }
  redirect(next.startsWith("/") ? next : "/app");
}

export async function forgotPasswordAction(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const email = String(formData.get("email") ?? "").trim();
  if (!email) return { error: "Bitte E-Mail eingeben." };
  const supabase = await createClient();
  await supabase.auth.resetPasswordForEmail(email, { redirectTo: `${siteUrl()}/auth/callback?next=/reset-password` });
  // Immer Erfolg melden (keine Auskunft, ob E-Mail existiert)
  return { success: "Wenn ein Account existiert, haben wir dir einen Link zum Zurücksetzen geschickt." };
}

export async function resetPasswordAction(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const password = String(formData.get("password") ?? "");
  const confirm = String(formData.get("confirm") ?? "");
  if (password.length < 8) return { error: "Mindestens 8 Zeichen." };
  if (password !== confirm) return { error: "Die Passwörter stimmen nicht überein." };
  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password });
  if (error) return { error: error.message };
  redirect("/app?pw=1");
}

export async function resendConfirmationAction(email: string) {
  const supabase = await createClient();
  await supabase.auth.resend({ type: "signup", email, options: { emailRedirectTo: `${siteUrl()}/auth/callback?next=/app` } });
  return { ok: true };
}
