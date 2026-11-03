"use server";

import { AuthError } from "next-auth";
import { signIn } from "@/auth";

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

  try {
    const destination = await signIn("credentials", {
      email: input.email,
      password: input.password,
      redirectTo,
      redirect: false,
    });
    const destinationUrl = new URL(typeof destination === "string" ? destination : redirectTo, "https://auth.invalid");
    const authError = destinationUrl.searchParams.get("error");
    if (authError) return { ok: false, error: authError };
    return { ok: true, redirectTo: typeof destination === "string" ? destination : redirectTo };
  } catch (error) {
    if (error instanceof AuthError) return { ok: false, error: error.type };
    throw error;
  }
}
