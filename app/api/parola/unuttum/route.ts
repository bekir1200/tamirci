import { NextResponse } from "next/server";
import { createAccountToken } from "@/lib/account-tokens";
import { findActiveAccountByEmail } from "@/lib/credentials";
import { DatabaseConfigurationError } from "@/lib/db";
import { mailConfigured, sendMail, siteUrl } from "@/lib/mail";
import { clientIp, consumeRateLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";

// Hesap var veya yok, yanıt aynıdır; e-posta adreslerinin sınanmasını engeller.
const genericResponse = { ok: true, message: "E-posta adresin kayıtlıysa parola sıfırlama bağlantısı gönderildi." };

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Form bilgileri okunamadı." }, { status: 400 });
  }
  const email = body && typeof body === "object" && typeof (body as { email?: unknown }).email === "string"
    ? ((body as { email: string }).email).trim().toLowerCase()
    : "";
  if (email.length < 3 || email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: "Geçerli bir e-posta adresi gir." }, { status: 400 });
  }

  try {
    const ipAllowed = await consumeRateLimit(`reset-ip:${clientIp(request)}`, 10, 60);
    const emailAllowed = await consumeRateLimit(`reset-email:${email}`, 3, 60);
    if (!ipAllowed || !emailAllowed) {
      return NextResponse.json({ error: "Çok fazla deneme yapıldı. Bir süre sonra tekrar dene." }, { status: 429 });
    }

    if (mailConfigured()) {
      const account = await findActiveAccountByEmail(email);
      if (account) {
        const token = await createAccountToken(account.id, "password_reset", 60);
        const link = `${siteUrl(request)}/parola-sifirla/yeni?token=${encodeURIComponent(token)}`;
        try {
          await sendMail({
            to: account.email,
            subject: "AloJetCep parola sıfırlama",
            text: `Parolanı sıfırlamak için bu bağlantıyı aç (1 saat geçerli):\n${link}\n\nBu isteği sen yapmadıysan bu e-postayı yok sayabilirsin; parolan değişmez.`,
          });
        } catch (error) {
          console.error("Reset mail failed:", error instanceof Error ? error.message : "Unknown error");
        }
      }
    }
    return NextResponse.json(genericResponse);
  } catch (error) {
    if (error instanceof DatabaseConfigurationError) {
      return NextResponse.json({ error: "Şu anda işlem yapılamıyor. Lütfen daha sonra tekrar dene." }, { status: 503 });
    }
    console.error("Password reset request failed:", error instanceof Error ? error.message : "Unknown error");
    return NextResponse.json({ error: "İşlem tamamlanamadı. Biraz sonra tekrar dene." }, { status: 500 });
  }
}
