import type { Metadata } from "next";
import { DM_Sans, Manrope } from "next/font/google";
import { VisitTracker } from "@/components/visit-tracker";
import "./globals.css";

const dmSans = DM_Sans({ subsets: ["latin", "latin-ext"], weight: ["400", "500", "600", "700"], variable: "--font-dm-sans", display: "swap" });
const manrope = Manrope({ subsets: ["latin", "latin-ext"], weight: ["400", "500", "600", "700", "800"], variable: "--font-manrope", display: "swap" });

const title = "AloJetCep | Telefon tamirinde kolaylık";
const description = "Telefon arızan için sana yakın ustalara kontrollü yönlendirme ve şeffaf tamir süreci.";

export const metadata: Metadata = {
  ...(process.env.NEXT_PUBLIC_SITE_URL ? { metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL) } : {}),
  title,
  description,
  openGraph: { title, description, type: "website", locale: "tr_TR", siteName: "AloJetCep", images: [{ url: "/brand/alojetcep-logo.png" }] },
  twitter: { card: "summary", title, description },
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
    <html lang="tr" className={`${dmSans.variable} ${manrope.variable}`}>
      <body><VisitTracker />{children}</body>
    </html>
  );
}
