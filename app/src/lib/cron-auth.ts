import type { NextRequest } from "next/server";

/** Vercel Cron sendet `Authorization: Bearer <CRON_SECRET>`; manuelle Aufrufe müssen denselben Header setzen. */
export function isCronAuthorized(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  return request.headers.get("authorization") === `Bearer ${secret}`;
}
