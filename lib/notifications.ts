import "server-only";
import { query } from "@/lib/db";
import { mailConfigured, sendMail } from "@/lib/mail";

const statusMessages: Record<string, { subject: string; text: string }> = {
  in_repair: { subject: "Tamir işlemin başladı", text: "Cihazın tamir sürecine alındı." },
  waiting_customer: { subject: "Onayın bekleniyor", text: "Ekip işlem için onayını bekliyor. Panelinden talebini inceleyebilirsin." },
  waiting_parts: { subject: "Parça bekleniyor", text: "Tamir için gereken parça bekleniyor. Gelişmeleri sana bildireceğiz." },
  ready_for_delivery: { subject: "Cihazın hazır", text: "Tamir tamamlandı; cihazın teslimat için hazır." },
  cancelled: { subject: "Talebin iptal edildi", text: "Talebin iptal edildi. Sorunuz varsa ekibimizle iletişime geçebilirsin." },
};

// Talep durumu değiştiğinde müşteriye e-posta gönderir. Hata talep işlemini bozmaz.
export async function notifyCustomerOfStatus(requestId: string, status: string) {
  const template = statusMessages[status];
  if (!template || !mailConfigured()) return;
  try {
    const result = await query<{ customer_email: string | null; reference: string; device: string }>(
      `SELECT customer_email, reference, device FROM repair_requests WHERE id = $1`,
      [requestId],
    );
    const row = result.rows[0];
    if (!row?.customer_email) return;
    await sendMail({
      to: row.customer_email,
      subject: `${template.subject} (${row.reference})`,
      text: `Merhaba,\n\n${row.device} için talep no ${row.reference}: ${template.text}\n\nTalebini AloJetCep panelinden takip edebilirsin.`,
    });
  } catch (error) {
    console.error("Customer notification failed:", error instanceof Error ? error.message : "Unknown error");
  }
}
