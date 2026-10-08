import "server-only";
import { Resend } from "resend";

/**
 * Transaktions-E-Mails über Resend.
 * Auth-Mails (Bestätigung, Passwort-Reset) verschickt Supabase selbst – per Custom SMTP ebenfalls über Resend
 * (siehe Setup-Anleitung). Hier: Spieltagserinnerung, Spieltagsergebnis, Gewinnbenachrichtigung.
 */
type SendResult = { ok: boolean; error?: string };

function client() {
  const key = process.env.RESEND_API_KEY;
  if (!key) return null;
  return new Resend(key);
}

const FROM = () => process.env.EMAIL_FROM ?? "Kleinfeld Fantasy <onboarding@resend.dev>";
const SITE = () => (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").replace(/\/$/, "");

async function send(to: string, subject: string, html: string, text: string): Promise<SendResult> {
  const resend = client();
  if (!resend) return { ok: false, error: "RESEND_API_KEY ist nicht gesetzt." };
  const { error } = await resend.emails.send({ from: FROM(), to, subject, html, text });
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

function layout(title: string, bodyHtml: string, cta?: { label: string; href: string }) {
  return `<!doctype html><html lang="de"><body style="margin:0;background:#0a0a0b;color:#ffffff;font-family:Arial,Helvetica,sans-serif">
<div style="max-width:560px;margin:0 auto;padding:32px 20px">
  <div style="height:5px;background:linear-gradient(90deg,#0a0a0b 0 33.3%,#e30613 33.3% 66.6%,#ffd400 66.6%)"></div>
  <p style="font-size:22px;font-weight:900;font-style:italic;text-transform:uppercase;margin:24px 0 8px;letter-spacing:-.01em">Kleinfeld <span style="color:#ffd400">Fantasy</span></p>
  <h1 style="font-size:28px;font-weight:900;text-transform:uppercase;margin:0 0 20px;line-height:1">${title}</h1>
  <div style="font-size:16px;line-height:1.55;color:#d4d4d8">${bodyHtml}</div>
  ${cta ? `<p style="margin:28px 0"><a href="${cta.href}" style="display:inline-block;background:#ffd400;color:#0a0a0b;text-decoration:none;font-weight:800;text-transform:uppercase;letter-spacing:.06em;padding:14px 24px">${cta.label}</a></p>` : ""}
  <p style="font-size:12px;color:#6e6e76;margin-top:40px">Du erhältst diese E-Mail, weil du bei Kleinfeld Fantasy registriert bist. Optionale Benachrichtigungen kannst du in deinem Profil abstellen: ${SITE()}/app/profile</p>
</div></body></html>`;
}

export async function sendPrizeEmail(opts: { to: string; username: string; prizeTitle: string; seasonName: string }): Promise<SendResult> {
  const subject = `Glückwunsch, ${opts.username} – du hast gewonnen!`;
  const html = layout(
    "Du hast gewonnen",
    `<p>Hallo ${opts.username},</p><p>du hast in <strong style="color:#fff">${opts.seasonName}</strong> den Preis <strong style="color:#ffd400">${opts.prizeTitle}</strong> gewonnen.</p><p>Wir melden uns in Kürze mit den Details zur Übergabe. Antworte einfach auf diese E-Mail, falls du Fragen hast.</p>`,
    { label: "Zur Rangliste", href: `${SITE()}/app/leaderboard` },
  );
  const text = `Hallo ${opts.username},\n\ndu hast in ${opts.seasonName} den Preis "${opts.prizeTitle}" gewonnen. Wir melden uns mit den Details.\n\n${SITE()}/app/leaderboard`;
  return send(opts.to, subject, html, text);
}

export async function sendRoundReminderEmail(opts: { to: string; username: string; roundName: string; deadlineText: string; seasonName: string }): Promise<SendResult> {
  const subject = `${opts.roundName}: Deadline ${opts.deadlineText}`;
  const html = layout(
    "Deadline rückt näher",
    `<p>Hallo ${opts.username},</p><p>die Deadline für <strong style="color:#fff">${opts.roundName}</strong> (${opts.seasonName}) ist am <strong style="color:#ffd400">${opts.deadlineText}</strong>.</p><p>Prüfe deine Aufstellung, setze deinen Kapitän und nutze deine freien Transfers.</p>`,
    { label: "Mein Team öffnen", href: `${SITE()}/app/team` },
  );
  const text = `Hallo ${opts.username},\n\ndie Deadline für ${opts.roundName} (${opts.seasonName}) ist am ${opts.deadlineText}. Prüfe deine Aufstellung: ${SITE()}/app/team`;
  return send(opts.to, subject, html, text);
}

export async function sendRoundResultEmail(opts: {
  to: string;
  username: string;
  roundName: string;
  seasonName: string;
  points: number;
  rank: number;
  totalManagers: number;
  rankDelta: number | null;
}): Promise<SendResult> {
  const pts = opts.points.toLocaleString("de-DE", { maximumFractionDigits: 2 });
  const delta = opts.rankDelta == null ? "" : opts.rankDelta > 0 ? `Du hast dich um ${opts.rankDelta} Plätze verbessert.` : opts.rankDelta < 0 ? `Du hast ${Math.abs(opts.rankDelta)} Plätze verloren.` : "Deine Platzierung ist unverändert.";
  const subject = `${pts} Punkte! ${opts.roundName} ist gewertet`;
  const html = layout(
    `${pts} Points!`,
    `<p>Hallo ${opts.username},</p><p>${opts.roundName} in ${opts.seasonName} ist ausgewertet.</p><p style="font-size:20px;color:#fff">Du bist auf <strong style="color:#ffd400">Platz ${opts.rank} von ${opts.totalManagers}</strong>.</p><p>${delta}</p>`,
    { label: "Zum Dashboard", href: `${SITE()}/app` },
  );
  const text = `Hallo ${opts.username},\n\n${opts.roundName} ist gewertet: ${pts} Punkte. Du bist auf Platz ${opts.rank} von ${opts.totalManagers}. ${delta}\n\n${SITE()}/app`;
  return send(opts.to, subject, html, text);
}
