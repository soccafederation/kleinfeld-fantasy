import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Stripe } from "@/components/ui/tricolore";
import { Badge } from "@/components/ui/badge";
import { AdminSideNav, AdminTopTabs } from "./admin-nav";
import type { Profile } from "@/lib/auth";

export function AdminShell({ children, profile }: { children: React.ReactNode; profile: Profile }) {
  return (
    <div className="flex min-h-dvh flex-1 flex-col bg-ground text-text">
      <div aria-hidden className="h-[5px] tricolore" />
      <header className="sticky top-0 z-30 border-b border-border bg-ground/95 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-7xl items-center justify-between gap-3 px-4">
          <div className="flex min-w-0 items-center gap-2">
            <Stripe />
            <span className="display truncate text-lg">
              Admin <span className="text-muted">·</span> Kleinfeld <span className="text-gold">Fantasy</span>
            </span>
          </div>
          <div className="flex items-center gap-3">
            <span className="hidden items-center gap-2 text-xs text-muted sm:flex">
              {profile.username} <Badge variant={profile.role === "admin" ? "gold" : "outline"}>{profile.role}</Badge>
            </span>
            <Link href="/app" className="flex h-9 items-center gap-1.5 rounded-sm border border-border-strong px-2.5 text-[11px] font-semibold uppercase tracking-wider text-text-2 hover:text-text">
              <ArrowLeft className="h-3.5 w-3.5" /> Zur App
            </Link>
          </div>
        </div>
      </header>
      <div className="mx-auto flex w-full max-w-7xl flex-1 gap-8 px-4 pb-16 pt-4 md:pt-6">
        <AdminSideNav />
        <main className="min-w-0 flex-1">
          <AdminTopTabs />
          {children}
        </main>
      </div>
    </div>
  );
}

export function PageHeader({ title, eyebrow, actions, children }: { title: string; eyebrow?: string; actions?: React.ReactNode; children?: React.ReactNode }) {
  return (
    <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div>
        {eyebrow && <div className="eyebrow mb-1">{eyebrow}</div>}
        <h1 className="display text-3xl">{title}</h1>
        {children && <div className="mt-1 text-sm text-muted">{children}</div>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

export function Empty({ children }: { children: React.ReactNode }) {
  return <p className="rounded-sm border border-dashed border-border px-3 py-6 text-center text-sm text-muted">{children}</p>;
}

export function Stat({ label, value, hint }: { label: string; value: React.ReactNode; hint?: React.ReactNode }) {
  return (
    <div className="rounded border border-border bg-card px-4 py-3">
      <div className="eyebrow">{label}</div>
      <div className="num mt-1 text-2xl">{value}</div>
      {hint && <div className="mt-1 text-xs text-muted">{hint}</div>}
    </div>
  );
}
