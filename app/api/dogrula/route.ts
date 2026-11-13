import { NextResponse } from "next/server";
import { consumeAccountToken } from "@/lib/account-tokens";
import { markEmailVerified } from "@/lib/credentials";

export const runtime = "nodejs";

// E-postadaki doğrulama bağlantısı. Token tek kullanımlıktır.
export async function GET(request: Request) {
  const token = new URL(request.url).searchParams.get("token") ?? "";
  const userId = token ? await consumeAccountToken(token, "email_verify") : null;
  if (!userId) return NextResponse.redirect(new URL("/giris?error=VerificationFailed", request.url));
  await markEmailVerified(userId);
  return NextResponse.redirect(new URL("/giris?verified=1", request.url));
}
