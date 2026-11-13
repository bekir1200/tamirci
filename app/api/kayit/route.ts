import { NextResponse } from "next/server";
import { createAccountToken } from "@/lib/account-tokens";
import { registerLocalAccount } from "@/lib/credentials";
import { DatabaseConfigurationError } from "@/lib/db";
import { mailConfigured, sendMail, siteUrl } from "@/lib/mail";
import { clientIp, consumeRateLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";

function isEmail(value: string) {
  return value.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Form bilgileri okunamadı." }, { status: 400 });
  }

  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Form bilgileri geçersiz." }, { status: 400 });
  }

  const values = body as Record<string, unknown>;
  const name = typeof values.name === "string" ? values.name.trim() : "";
  const email = typeof values.email === "string" ? values.email.trim() : "";
  const password = typeof values.password === "string" ? values.password : "";

  if (name.length < 2 || name.length > 80) {
    return NextResponse.json({ error: "Ad soyad 2 ile 80 karakter arasında olmalı." }, { status: 400 });
  }
  if (!isEmail(email)) {
    return NextResponse.json({ error: "Geçerli bir e-posta adresi gir." }, { status: 400 });
  }
  if (password.length < 10 || password.length > 128) {
    return NextResponse.json({ error: "Parola 10 ile 128 karakter arasında olmalı." }, { status: 400 });
  }

  try {
    const allowed = await consumeRateLimit(`signup:${clientIp(request)}`, 5, 60);
    if (!allowed) {
      return NextResponse.json({ error: "Çok fazla deneme yapıldı. Bir süre sonra tekrar dene." }, { status: 429 });
    }

    const verificationRequired = mailConfigured();
    const result = await registerLocalAccount({ name, email, password, verified: !verificationRequired });
    if (!result.ok) {
      return NextResponse.json({ error: "Bu e-posta adresiyle bir hesap zaten var." }, { status: 409 });
    }

    if (verificationRequired) {
      const token = await createAccountToken(result.account.id, "email_verify", 60 * 24);
      const link = `${siteUrl(request)}/api/dogrula?token=${encodeURIComponent(token)}`;
      try {
        await sendMail({
          to: result.account.email,
          subject: "AloJetCep hesabını doğrula",
          text: `Merhaba ${result.account.name},\n\nHesabını doğrulamak için bu bağlantıyı aç (24 saat geçerli):\n${link}\n\nBu hesabı sen açmadıysan bu e-postayı yok sayabilirsin.`,
        });
      } catch (error) {
        console.error("Verification mail failed:", error instanceof Error ? error.message : "Unknown error");
      }
    }
    return NextResponse.json({ ok: true, verificationRequired }, { status: 201 });
  } catch (error) {
    if (error instanceof DatabaseConfigurationError) {
      return NextResponse.json(
        { error: "Kayıt şu anda kullanılamıyor. Lütfen daha sonra tekrar dene." },
        { status: 503 },
      );
    }
    console.error("Account registration failed:", error instanceof Error ? error.message : "Unknown error");
    return NextResponse.json({ error: "Hesap oluşturulamadı. Biraz sonra tekrar dene." }, { status: 500 });
  }
}
