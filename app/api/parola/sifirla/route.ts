import { NextResponse } from "next/server";
import { consumeAccountToken } from "@/lib/account-tokens";
import { setAccountPassword } from "@/lib/credentials";
import { DatabaseConfigurationError } from "@/lib/db";

export const runtime = "nodejs";

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Form bilgileri okunamadı." }, { status: 400 });
  }
  const values = (body ?? {}) as { token?: unknown; password?: unknown };
  const token = typeof values.token === "string" ? values.token : "";
  const password = typeof values.password === "string" ? values.password : "";

  if (password.length < 10 || password.length > 128) {
    return NextResponse.json({ error: "Parola 10 ile 128 karakter arasında olmalı." }, { status: 400 });
  }

  try {
    const userId = token ? await consumeAccountToken(token, "password_reset") : null;
    if (!userId) {
      return NextResponse.json({ error: "Bağlantı geçersiz veya süresi dolmuş. Yeni bir bağlantı iste." }, { status: 400 });
    }
    await setAccountPassword(userId, password);
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof DatabaseConfigurationError) {
      return NextResponse.json({ error: "Şu anda işlem yapılamıyor. Lütfen daha sonra tekrar dene." }, { status: 503 });
    }
    console.error("Password reset failed:", error instanceof Error ? error.message : "Unknown error");
    return NextResponse.json({ error: "Parola güncellenemedi. Biraz sonra tekrar dene." }, { status: 500 });
  }
}
