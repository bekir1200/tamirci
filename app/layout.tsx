import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AloJetCep | Telefon tamirinde kolaylık",
  description: "Telefon arızan için sana yakın ustalara kontrollü yönlendirme ve şeffaf tamir süreci.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="tr">
      <body>{children}</body>
    </html>
  );
}
