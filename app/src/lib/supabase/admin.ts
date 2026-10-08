import "server-only";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";

/**
 * Service-Role-Client. Umgeht RLS. NUR für Engine-Läufe, Cron-Jobs und Admin-Server-Actions,
 * nachdem die Admin-Rolle des Aufrufers geprüft wurde. Niemals in Client-Code importieren
 * (server-only erzwingt das zur Build-Zeit).
 */
export function createAdminClient() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) throw new Error("SUPABASE_SERVICE_ROLE_KEY fehlt");
  return createSupabaseClient<Database>(process.env.NEXT_PUBLIC_SUPABASE_URL!, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
