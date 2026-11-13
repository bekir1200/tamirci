"use server";

import { AuthError } from "next-auth";
import { signIn } from "@/auth";
import { checkLocalLogin } from "@/lib/credentials";
import { clearRateLimit, consumeRateLimit } from "@/lib/rate-limit";

export type CredentialsSignInResult =
  | { ok: true; redirectTo: string }
  | { ok: false; error: string };

export async function signInWithCredentials(input: {
  email: string;
  password: string;
  redirectTo: string;
}): Promise<CredentialsSignInResult> {
  const redirectTo = input.redirectTo.startsWith("/") && !input.redirectTo.startsWith("//")
    ? input.redirectTo
    : "/panel";
  const email = input.email.trim().toLowerCase();

  // Hesap başına deneme sınırı: 15 dakikada en fazla 10 giriş denemesi.
  const allowed = await consumeRateLimit(`login:${email}`, 10, 15);
  if (!allowed) return { ok: false, error: "RateLimited" };

  try {
    const destination = await signIn("credentials", {
      email: input.email,
      password: input.password,
      redirectTo,
      redirect: false,
    });
    const destinationUrl = new URL(typeof destination === "string" ? destination : redirectTo, "https://auth.invalid");
    const authError = destinationUrl.searchParams.get("error");
    if (authError) return { ok: false, error: await explainFailure(email, input.password, authError) };
    await clearRateLimit(`login:${email}`);
    return { ok: true, redirectTo: typeof destination === "string" ? destination : redirectTo };
  } catch (error) {
    if (error instanceof AuthError) return { ok: false, error: await explainFailure(email, input.password, error.type) };
    throw error;
  }
}

// Doğru parolayla girilmiş ama e-postası doğrulanmamış hesabı ayrı bir mesajla belirtir.
async function explainFailure(email: string, password: string, authError: string) {
  if (authError !== "CredentialsSignin") return authError;
  const check = await checkLocalLogin(email, password);
  return check.status === "unverified" ? "EmailNotVerified" : authError;
}
