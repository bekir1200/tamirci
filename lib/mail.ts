import "server-only";

// E-posta gönderimi Resend API üzerinden yapılır. RESEND_API_KEY ve MAIL_FROM
// tanımlı değilse gönderim devre dışıdır; bu durumda e-posta doğrulama istenmez.
export function mailConfigured() {
  return Boolean(process.env.RESEND_API_KEY && process.env.MAIL_FROM);
}

export class MailNotConfiguredError extends Error {
  constructor() {
    super("Mail is not configured");
    this.name = "MailNotConfiguredError";
  }
}

export async function sendMail(input: { to: string; subject: string; text: string }) {
  if (!mailConfigured()) throw new MailNotConfiguredError();
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: process.env.MAIL_FROM,
      to: [input.to],
      subject: input.subject,
      text: input.text,
    }),
  });
  if (!response.ok) throw new Error(`Mail provider responded with ${response.status}`);
}

export function siteUrl(request: Request) {
  return process.env.NEXT_PUBLIC_SITE_URL || new URL(request.url).origin;
}
