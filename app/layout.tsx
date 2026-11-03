import type { Metadata } from "next";
import { VisitTracker } from "@/components/visit-tracker";
import "./globals.css";

export const metadata: Metadata = {
  title: "AloJetCep | Telefon tamirinde kolaylık",
  description: "Telefon arızan için sana yakın ustalara kontrollü yönlendirme ve şeffaf tamir süreci.",
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/brand/favicon-32.png", sizes: "32x32", type: "image/png" },
      { url: "/brand/favicon-16.png", sizes: "16x16", type: "image/png" },
    ],
    apple: "/apple-touch-icon.png",
  },
  manifest: "/site.webmanifest",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="tr">
      <body><VisitTracker />{children}</body>
    </html>
  );
}
