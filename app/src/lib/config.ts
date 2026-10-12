/**
 * Geschlossene Runde: Registrierung aus, Startseite = Login, Seite nicht indexierbar.
 * Wieder öffnen: in Vercel NEXT_PUBLIC_REGISTRATION_OPEN=true setzen + Redeploy
 * (und in Supabase „Allow new users to sign up" wieder einschalten).
 */
export const REGISTRATION_OPEN = process.env.NEXT_PUBLIC_REGISTRATION_OPEN === "true";
