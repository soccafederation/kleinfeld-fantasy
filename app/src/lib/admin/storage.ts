import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";

export type Bucket = "club-logos" | "player-images" | "prize-images" | "season-assets" | "imports";

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const IMAGE_TYPES = new Set(["image/png", "image/jpeg", "image/webp", "image/svg+xml", "image/gif"]);

function safeName(name: string) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

/** Lädt eine Datei in einen Bucket. Rückgabe: Pfad + öffentliche URL (bei öffentlichen Buckets). */
export async function uploadToBucket(bucket: Bucket, folder: string, file: File): Promise<{ ok: true; path: string; publicUrl: string } | { ok: false; error: string }> {
  if (bucket !== "imports") {
    if (!IMAGE_TYPES.has(file.type)) return { ok: false, error: "Nur PNG, JPG, WebP, SVG oder GIF erlaubt." };
    if (file.size > MAX_IMAGE_BYTES) return { ok: false, error: "Bild ist größer als 5 MB." };
  }
  const path = `${folder}/${Date.now()}-${safeName(file.name) || "datei"}`;
  const admin = createAdminClient();
  const bytes = Buffer.from(await file.arrayBuffer());
  const { error } = await admin.storage.from(bucket).upload(path, bytes, { contentType: file.type || "application/octet-stream", upsert: false });
  if (error) return { ok: false, error: `Upload fehlgeschlagen: ${error.message}` };
  const { data } = admin.storage.from(bucket).getPublicUrl(path);
  return { ok: true, path, publicUrl: data.publicUrl };
}
