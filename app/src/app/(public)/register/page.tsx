import Link from "next/link";
import { AuthCard } from "@/components/layout/auth-card";
import { RegisterForm } from "./register-form";
import { redirect } from "next/navigation";
import { REGISTRATION_OPEN } from "@/lib/config";

export const metadata = { title: "Registrieren" };

export default function RegisterPage() {
  if (!REGISTRATION_OPEN) redirect("/login");
  return (
    <AuthCard
      title="Team erstellen"
      subtitle="Kostenlos registrieren – in wenigen Minuten steht dein erstes Fantasy-Team."
      footer={
        <>
          Schon dabei?{" "}
          <Link href="/login" className="font-semibold text-gold">
            Anmelden
          </Link>
        </>
      }
    >
      <RegisterForm />
    </AuthCard>
  );
}
