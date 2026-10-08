import Link from "next/link";
import { AuthCard } from "@/components/layout/auth-card";
import { LoginForm } from "./login-form";

export const metadata = { title: "Login" };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string; error?: string }> }) {
  const sp = await searchParams;
  return (
    <AuthCard
      title="Willkommen zurück"
      subtitle="Melde dich an und führe dein Team zum Titel."
      footer={
        <>
          Noch kein Account?{" "}
          <Link href="/register" className="font-semibold text-gold">
            Jetzt kostenlos registrieren
          </Link>
        </>
      }
    >
      <LoginForm next={sp.next} linkError={sp.error === "link"} />
    </AuthCard>
  );
}
