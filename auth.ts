import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import MicrosoftEntraID from "next-auth/providers/microsoft-entra-id";
import Credentials from "next-auth/providers/credentials";
import { findOrCreateOAuthAccount, verifyLocalAccount } from "@/lib/credentials";
import { recordDailyMetric } from "@/lib/analytics";

const googleConfigured = Boolean(process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET);
const microsoftConfigured = Boolean(
  process.env.AUTH_MICROSOFT_ENTRA_ID_ID && process.env.AUTH_MICROSOFT_ENTRA_ID_SECRET,
);

export const authSetup = {
  secretConfigured: Boolean(process.env.AUTH_SECRET),
  googleConfigured,
  microsoftConfigured,
};

const providers = [
  ...(googleConfigured ? [Google] : []),
  ...(microsoftConfigured
    ? [
        MicrosoftEntraID({
          issuer: process.env.AUTH_MICROSOFT_ENTRA_ID_ISSUER,
        }),
      ]
    : []),
  Credentials({
    id: "credentials",
    name: "E-posta ve parola",
    credentials: {
      email: { label: "E-posta", type: "email" },
      password: { label: "Parola", type: "password" },
    },
    async authorize(credentials) {
      if (typeof credentials.email !== "string" || typeof credentials.password !== "string") return null;
      const account = await verifyLocalAccount(credentials.email, credentials.password);
      if (!account) return null;
      return { id: account.id, name: account.name, email: account.email, role: account.role };
    },
  }),
];

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers,
  pages: { signIn: "/giris" },
  session: { strategy: "jwt" },
  callbacks: {
    async signIn({ user, account, profile }) {
      if (!account || account.type !== "oauth") return true;
      if (!user.email) return false;
      // Yalnızca sağlayıcının doğruladığını belirttiği e-postalar mevcut hesaba bağlanabilir.
      const providerVerified = account.provider === "google" && (profile as { email_verified?: unknown } | undefined)?.email_verified === true;
      const linkedUser = await findOrCreateOAuthAccount({
        provider: account.provider,
        providerAccountId: account.providerAccountId,
        email: user.email,
        name: user.name ?? user.email,
        emailVerified: providerVerified,
      });
      if (!linkedUser) return "/giris?error=OAuthAccountNotLinked";
      user.id = linkedUser.id;
      user.role = linkedUser.role;
      return true;
    },
    async jwt({ token, user }) {
      if (user) {
        token.sub = user.id;
        token.role = user.role;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user && token.sub && token.role) {
        session.user.id = token.sub;
        session.user.role = token.role;
      }
      return session;
    },
  },
  events: {
    async signIn() {
      try {
        await recordDailyMetric("sign_ins");
      } catch (error) {
        console.error("Daily sign-in metric could not be recorded", error instanceof Error ? error.message : "Unknown error");
      }
    },
  },
});
