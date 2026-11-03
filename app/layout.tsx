import type { Metadata } from "next";
import { VisitTracker } from "@/components/visit-tracker";
import "./globals.css";

export const metadata: Metadata = {
  title: "AloJetCep | Telefon tamirinde kolaylık",
  description: "Telefon arızan için sana yakın ustalara kontrollü yönlendirme ve şeffaf tamir süreci.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="tr">
      <body><VisitTracker />{children}</body>
    </html>
  );
}
