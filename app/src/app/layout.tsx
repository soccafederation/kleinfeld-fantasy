import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import "./globals.css";

// Selbst gehostet (DSGVO: keine Anfragen an Google Fonts). Quelle: Saira (OFL), via Fontsource.
const saira = localFont({
  variable: "--font-saira",
  display: "swap",
  src: [
    { path: "../fonts/saira-variable.woff2", weight: "100 900", style: "normal" },
    { path: "../fonts/saira-variable-italic.woff2", weight: "100 900", style: "italic" },
  ],
});

const sairaCondensed = localFont({
  variable: "--font-saira-condensed",
  display: "swap",
  src: [
    { path: "../fonts/saira-condensed-600.woff2", weight: "600", style: "normal" },
    { path: "../fonts/saira-condensed-700.woff2", weight: "700", style: "normal" },
    { path: "../fonts/saira-condensed-800.woff2", weight: "800", style: "normal" },
    { path: "../fonts/saira-condensed-900.woff2", weight: "900", style: "normal" },
  ],
});

export const metadata: Metadata = {
  title: {
    default: "KLEINFELD FANTASY",
    template: "%s · KLEINFELD FANTASY",
  },
  description:
    "Stell dein Fantasy-Team aus den besten Kleinfeldfußballern zusammen, sammle Punkte mit echten Spielerleistungen und kämpfe um die Spitze der Rangliste.",
  applicationName: "Kleinfeld Fantasy",
  manifest: "/manifest.webmanifest",
  appleWebApp: { capable: true, title: "Kleinfeld Fantasy", statusBarStyle: "black-translucent" },
};

export const viewport: Viewport = {
  themeColor: "#0a0a0b",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="de" className={`${saira.variable} ${sairaCondensed.variable}`}>
      <body className="flex min-h-dvh flex-col bg-ground text-text">{children}</body>
    </html>
  );
}
