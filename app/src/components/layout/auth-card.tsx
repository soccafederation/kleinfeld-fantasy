import Link from "next/link";
import Image from "next/image";
import { TricoloreBar } from "@/components/ui/tricolore";

export function AuthCard({ title, subtitle, children, footer }: { title: string; subtitle?: string; children: React.ReactNode; footer?: React.ReactNode }) {
  return (
    <div className="relative flex min-h-dvh flex-1 flex-col">
      <TricoloreBar />
      <Image src="/brand/pitch-night.jpg" alt="" fill priority className="object-cover opacity-25" sizes="100vw" />
      <div className="absolute inset-0 bg-gradient-to-b from-ground/60 via-ground/80 to-ground" />
      <div className="relative mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-4 py-10">
        <Link href="/" className="display mb-8 block text-center text-3xl">
          Kleinfeld <span className="text-gold">Fantasy</span>
        </Link>
        <div className="rounded border border-border bg-card/95 p-6 shadow-kf backdrop-blur">
          <h1 className="display text-3xl">{title}</h1>
          {subtitle && <p className="mt-2 text-sm text-muted">{subtitle}</p>}
          <div className="mt-6">{children}</div>
        </div>
        {footer && <div className="mt-5 text-center text-sm text-muted">{footer}</div>}
        <div className="mt-10 flex items-center justify-center gap-2 text-[11px] uppercase tracking-[0.14em] text-muted-2">
          Powered by <Image src="/brand/dkfv-logo-small-white.png" alt="DKFV" width={60} height={21} className="h-4 w-auto opacity-80" />
        </div>
      </div>
    </div>
  );
}
