import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Json } from "@/lib/database.types";

/**
 * Audit-Eintrag schreiben. audit_logs hat keine Insert-Policy für authenticated,
 * deshalb immer über den Service-Role-Client (nur nach requireStaff() aufrufen).
 */
export async function writeAudit(opts: {
  actorId: string;
  entity: string;
  entityId?: string | null;
  action: string;
  before?: Json | null;
  after?: Json | null;
}) {
  const admin = createAdminClient();
  await admin.from("audit_logs").insert({
    actor_id: opts.actorId,
    entity: opts.entity,
    entity_id: opts.entityId ?? null,
    action: opts.action,
    before: opts.before ?? null,
    after: opts.after ?? null,
  });
}
