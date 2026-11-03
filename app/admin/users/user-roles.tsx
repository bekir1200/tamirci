"use client";

import { useState } from "react";
import { LoaderCircle, Save, Shield } from "lucide-react";

type UserRow = {
  id: string; name: string; email: string; role: string; shopName: string; city: string;
  district: string; shopAddress: string; shopPhone: string; specialties: string[]; available: boolean; isActive: boolean;
};

const roles = [
  ["customer", "Müşteri"], ["staff", "Görevli"], ["admin", "Admin"],
  ["technician", "Usta"], ["courier", "Kurye"],
];

export default function UserRoles({ initialUsers, adminId }: { initialUsers: UserRow[]; adminId: string }) {
  const [users, setUsers] = useState(initialUsers);
  const [specialtyDrafts, setSpecialtyDrafts] = useState<Record<string, string>>(() => Object.fromEntries(initialUsers.map((user) => [user.id, user.specialties.join(", ")])));
  const [savingId, setSavingId] = useState("");
  const [notice, setNotice] = useState("");

  async function save(user: UserRow) {
    setSavingId(user.id);
    setNotice("");
    try {
      const response = await fetch("/api/admin/users", {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: user.id, role: user.role, profile: {
          shopName: user.shopName, shopAddress: user.shopAddress, shopPhone: user.shopPhone, city: user.city, district: user.district, specialties: (specialtyDrafts[user.id] ?? "").split(",").map((item) => item.trim()).filter(Boolean).slice(0, 20),
        } }),
      });
      const result = await response.json() as { error?: string };
      if (!response.ok) throw new Error(result.error ?? "Değişiklik kaydedilemedi.");
      setNotice(`${user.name} için rol ve profil kaydedildi.`);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Değişiklik kaydedilemedi.");
    } finally {
      setSavingId("");
    }
  }

  function update(userId: string, changes: Partial<UserRow>) {
    setUsers((current) => current.map((user) => user.id === userId ? { ...user, ...changes } : user));
  }

  return (
    <div className="admin-user-list">
      <div className="admin-user-list-heading"><div><strong>{users.length} kullanıcı</strong><span>Yeni kayıtlar varsayılan olarak müşteri rolüyle açılır.</span></div><Shield size={20}/></div>
      {notice && <p className="admin-users-notice" role="status">{notice}</p>}
      {users.length === 0 ? <div className="admin-users-empty">Henüz kayıtlı kullanıcı yok.</div> : users.map((user) => (
        <article className="admin-user-card" key={user.id}>
          <div className="admin-user-summary"><span className="admin-user-avatar">{user.name.split(/\s+/).map((part) => part[0]).join("").slice(0, 2).toLocaleUpperCase("tr-TR")}</span><div><strong>{user.name}</strong><span>{user.email}</span></div><span className={`admin-user-state ${user.isActive ? "active" : "inactive"}`}>{user.isActive ? "Aktif" : "Kapalı"}</span></div>
          <div className="admin-user-fields">
            <label>Rol<select value={user.role} onChange={(event) => update(user.id, { role: event.target.value })}>{roles.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
            {user.role === "technician" && <>
              <label>Atölye adı<input value={user.shopName} maxLength={120} onChange={(event) => update(user.id, { shopName: event.target.value })} placeholder="Atölye adı"/></label>
              <label>Atölye telefonu<input type="tel" value={user.shopPhone} maxLength={20} onChange={(event) => update(user.id, { shopPhone: event.target.value })} placeholder="Telefon numarası"/></label>
              <label>Atölye adresi<input value={user.shopAddress} maxLength={300} onChange={(event) => update(user.id, { shopAddress: event.target.value })} placeholder="Açık adres"/></label>
              <label>Şehir<input value={user.city} maxLength={50} onChange={(event) => update(user.id, { city: event.target.value })} placeholder="İl"/></label>
              <label>İlçe<input value={user.district} maxLength={50} onChange={(event) => update(user.id, { district: event.target.value })} placeholder="İlçe"/></label>
              <label className="admin-user-specialties">Uzmanlıklar<input value={specialtyDrafts[user.id] ?? ""} maxLength={240} onChange={(event) => setSpecialtyDrafts((current) => ({ ...current, [user.id]: event.target.value }))} placeholder="Ekran, iPhone, Samsung"/></label>
            </>}
          </div>
          <div className="admin-user-actions"><small>{user.id === adminId ? "Yönetici hesabın" : "Değişiklikler kaydedildiğinde uygulanır"}</small><button className="button button-primary" onClick={() => void save(user)} disabled={Boolean(savingId)}>{savingId === user.id ? <LoaderCircle className="credentials-spinner" size={17}/> : <><Save size={16}/> Kaydet</>}</button></div>
        </article>
      ))}
    </div>
  );
}
