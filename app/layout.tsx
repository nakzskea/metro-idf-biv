import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Prochains passages",
  description: "Temps réel métro et tram en Île-de-France",
  appleWebApp: { title: "Passages", statusBarStyle: "default" },
};

export const viewport: Viewport = { themeColor: "#d9dde2" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <body>{children}</body>
    </html>
  );
}