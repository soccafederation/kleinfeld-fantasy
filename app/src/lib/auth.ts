import "server-only";
import { redirect } from "next/navigation";
import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import type { Tables } from "@/lib/database.types";

export type Profile = Tables<"profiles">;

/** Eingeloggter Nutzer + Profil (pro Request gecacht). */
export const getCurrentUser = cache(async () => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { user: null, profile: null as Profile | null };
  const { data: profile } = await supabase.from("profiles").select("*").eq("user_id", user.id).maybeSingle();
  return { user, profile };
});

export async function requireUser() {
  const { user, profile } = await getCurrentUser();
  if (!user || !profile) redirect("/login");
  return { user, profile };
}

export async function requireStaff() {
  const { user, profile } = await requireUser();
  if (profile.role !== "admin" && profile.role !== "editor") redirect("/app");
  return { user, profile };
}

export async function requireAdmin() {
  const { user, profile } = await requireUser();
  if (profile.role !== "admin") redirect("/admin");
  return { user, profile };
}
