import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "CepTamir | Operasyon Merkezi",
  description: "Telefon tamir taleplerini ve usta yönlendirmelerini yönetin.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="tr">
      <body>{children}</body>
    </html>
  );
}
