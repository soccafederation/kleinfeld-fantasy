import Link from "next/link";
import { AuthCard } from "@/components/layout/auth-card";
import { RegisterForm } from "./register-form";

export const metadata = { title: "Registrieren" };

export default function RegisterPage() {
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
