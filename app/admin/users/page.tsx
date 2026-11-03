import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, ShieldCheck } from "lucide-react";
import { AuthenticationRequiredError, PermissionDeniedError, getCurrentUser } from "@/lib/authorization";
import { query } from "@/lib/db";
import UserRoles from "./user-roles";
import PanelSidebar from "@/app/panel/panel-sidebar";

export const dynamic = "force-dynamic";

export default async function AdminUsersPage() {
  let admin;
  try {
    admin = await getCurrentUser(["admin"]);
  } catch (error) {
    if (error instanceof AuthenticationRequiredError) redirect("/giris?next=%2Fadmin%2Fusers");
    if (error instanceof PermissionDeniedError) redirect("/panel");
    throw error;
  }

  const [result, dailyMetrics] = await Promise.all([
    query(
      `SELECT id, full_name, email, role, shop_name, shop_address, shop_phone, city, district, specialties, available, is_active, created_at
       FROM users ORDER BY created_at DESC LIMIT 500`,
    ),
    query<{ metric_date: string; visits: string; sign_ins: string }>(
      `WITH calendar AS (
         SELECT generate_series(
           (now() AT TIME ZONE 'Europe/Istanbul')::date - 29,
           (now() AT TIME ZONE 'Europe/Istanbul')::date,
           interval '1 day'
         )::date AS metric_date
       )
       SELECT to_char(calendar.metric_date, 'YYYY-MM-DD') AS metric_date,
              coalesce(metrics.visits, 0)::text AS visits,
              coalesce(metrics.sign_ins, 0)::text AS sign_ins
       FROM calendar LEFT JOIN daily_site_metrics metrics USING (metric_date)
       ORDER BY calendar.metric_date DESC`,
    ),
  ]);
  const todayMetrics = dailyMetrics.rows[0];

  return (
    <div className="subpage-layout"><PanelSidebar role="admin" name={admin.name} active="users"/><main className="admin-users-page subpage-main">
      <header className="admin-users-header">
        <Link className="admin-users-back" href="/panel"><ArrowLeft size={17}/> Panele dön</Link>
      </header>
      <section className="admin-users-main">
        <div className="admin-users-intro"><span className="request-eyebrow"><ShieldCheck size={16}/> YÖNETİM</span><h1>Kullanıcılar ve roller</h1><p>Kayıtlı kişilere görevlerine uygun erişim ver.</p></div>
        <section className="admin-analytics" aria-labelledby="admin-analytics-title">
          <div className="admin-analytics-heading"><div><span className="request-eyebrow">GÜNLÜK İSTATİSTİKLER</span><h2 id="admin-analytics-title">Site ziyaretleri</h2><p>Türkiye saatine göre son 30 gün.</p></div></div>
          <div className="admin-analytics-totals"><article><span>Bugünkü ziyaret oturumları</span><strong>{Number(todayMetrics?.visits ?? 0).toLocaleString("tr-TR")}</strong></article><article><span>Bugünkü başarılı girişler</span><strong>{Number(todayMetrics?.sign_ins ?? 0).toLocaleString("tr-TR")}</strong></article></div>
          <div className="admin-analytics-table-wrap"><table className="admin-analytics-table"><thead><tr><th scope="col">Tarih</th><th scope="col">Ziyaret oturumu</th><th scope="col">Başarılı giriş</th></tr></thead><tbody>{dailyMetrics.rows.map((day) => <tr key={day.metric_date}><th scope="row">{new Intl.DateTimeFormat("tr-TR", { dateStyle: "long", timeZone: "UTC" }).format(new Date(`${day.metric_date}T12:00:00Z`))}</th><td>{Number(day.visits).toLocaleString("tr-TR")}</td><td>{Number(day.sign_ins).toLocaleString("tr-TR")}</td></tr>)}</tbody></table></div>
          <p className="admin-analytics-note">Ziyaret sayısı, her tarayıcı sekmesinde günlük oturumu sayar; tek kişi farklı sekme veya cihaz kullanırsa birden fazla sayılabilir. IP adresi veya sayfa gezinme geçmişi saklanmaz.</p>
        </section>
        <UserRoles initialUsers={result.rows.map((row) => ({
          id: String(row.id), name: String(row.full_name), email: String(row.email), role: String(row.role),
          shopName: row.shop_name ? String(row.shop_name) : "", shopAddress: row.shop_address ? String(row.shop_address) : "", shopPhone: row.shop_phone ? String(row.shop_phone) : "", city: row.city ? String(row.city) : "",
          district: row.district ? String(row.district) : "", specialties: Array.isArray(row.specialties) ? row.specialties.map(String) : [],
          available: Boolean(row.available), isActive: Boolean(row.is_active),
        }))} adminId={admin.id}/>
      </section>
    </main></div>
  );
}
