import { AdminShell } from "@/components/admin/admin-shell";
import { requireStaff } from "@/lib/auth";

export const metadata = { title: "Admin · Kleinfeld Fantasy" };

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const { profile } = await requireStaff();
  return <AdminShell profile={profile}>{children}</AdminShell>;
}
