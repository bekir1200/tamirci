import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, ShieldCheck, Wrench } from "lucide-react";
import { AuthenticationRequiredError, PermissionDeniedError, getCurrentUser } from "@/lib/authorization";
import { query } from "@/lib/db";
import UserRoles from "./user-roles";

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

  const result = await query(
    `SELECT id, full_name, email, role, shop_name, shop_address, shop_phone, city, district, specialties, available, is_active, created_at
     FROM users ORDER BY created_at DESC LIMIT 500`,
  );

  return (
    <main className="admin-users-page">
      <header className="admin-users-header">
        <Link className="landing-brand" href="/panel"><span className="landing-brand-icon"><Wrench size={19}/></span><span>AloJetCep<span className="landing-brand-dot">.</span></span></Link>
        <Link className="admin-users-back" href="/panel"><ArrowLeft size={17}/> Panele dön</Link>
      </header>
      <section className="admin-users-main">
        <div className="admin-users-intro"><span className="request-eyebrow"><ShieldCheck size={16}/> YÖNETİM</span><h1>Kullanıcılar ve roller</h1><p>Kayıtlı kişilere görevlerine uygun erişim ver.</p></div>
        <UserRoles initialUsers={result.rows.map((row) => ({
          id: String(row.id), name: String(row.full_name), email: String(row.email), role: String(row.role),
          shopName: row.shop_name ? String(row.shop_name) : "", shopAddress: row.shop_address ? String(row.shop_address) : "", shopPhone: row.shop_phone ? String(row.shop_phone) : "", city: row.city ? String(row.city) : "",
          district: row.district ? String(row.district) : "", specialties: Array.isArray(row.specialties) ? row.specialties.map(String) : [],
          available: Boolean(row.available), isActive: Boolean(row.is_active),
        }))} adminId={admin.id}/>
      </section>
    </main>
  );
}
