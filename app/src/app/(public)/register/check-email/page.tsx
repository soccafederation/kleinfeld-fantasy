import { AuthCard } from "@/components/layout/auth-card";
import { ResendButton } from "./resend-button";

export const metadata = { title: "E-Mail bestätigen" };

export default async function CheckEmailPage({ searchParams }: { searchParams: Promise<{ email?: string }> }) {
  const { email } = await searchParams;
  return (
    <AuthCard title="Fast geschafft" subtitle="Bestätige deine E-Mail-Adresse, dann geht es direkt zur Teamerstellung.">
      <p className="text-text-2">
        Wir haben einen Bestätigungslink an <strong className="text-text">{email ?? "deine E-Mail-Adresse"}</strong> geschickt. Bitte klicke den Link in der E-Mail an. Prüfe auch den Spam-Ordner.
      </p>
      {email && <ResendButton email={email} />}
    </AuthCard>
  );
}
