import Link from "next/link";
import { TricoloreBar } from "@/components/ui/tricolore";

export function LegalLayout({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-1 flex-col">
      <TricoloreBar />
      <header className="border-b border-border">
        <div className="mx-auto flex h-16 max-w-3xl items-center justify-between px-4">
          <Link href="/" className="display text-2xl">Kleinfeld <span className="text-gold">Fantasy</span></Link>
          <Link href="/login" className="text-sm font-semibold uppercase tracking-wide text-text-2 hover:text-text">Login</Link>
        </div>
      </header>
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-12">
        <h1 className="display text-5xl">{title}</h1>
        <div className="prose-kf mt-8 flex flex-col gap-4 text-text-2 [&_h2]:display-upright [&_h2]:mt-6 [&_h2]:text-2xl [&_h2]:text-text [&_strong]:text-text [&_ul]:list-disc [&_ul]:pl-5">{children}</div>
      </main>
      <footer className="border-t border-border py-6 text-center text-sm text-muted">
        <Link href="/imprint" className="mx-2 hover:text-text">Impressum</Link>·<Link href="/privacy" className="mx-2 hover:text-text">Datenschutz</Link>·<Link href="/terms" className="mx-2 hover:text-text">Teilnahmebedingungen</Link>
      </footer>
    </div>
  );
}

export function Placeholder({ what }: { what: string }) {
  return (
    <p className="rounded-sm border border-warning/50 bg-warning/10 px-3 py-2 text-sm text-text">
      <strong>[Platzhalter]</strong> {what} wird vor dem Launch durch den rechtlich geprüften Text ersetzt.
    </p>
  );
}
