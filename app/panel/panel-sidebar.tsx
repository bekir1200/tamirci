"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { Activity, ArrowRight, CheckCircle2, FileText, Headphones, Menu, PackageCheck, ReceiptText, Settings2, ShieldCheck, Smartphone, Users, UserRound, Wrench, X } from "lucide-react";
import type { AppRole } from "@/types/next-auth";

type Section = "requests" | "technicians" | "billing" | "users";

export default function PanelSidebar({ role, name, active }: { role: AppRole; name: string; active: Section }) {
  const [open, setOpen] = useState(false);
  const items: { href: string; label: string; icon: typeof Activity; section?: Section }[] = role === "admin" || role === "staff" ? [
    { href: "/panel", label: "Genel Bakış", icon: Activity },
      { href: "/panel/talepler", label: "Talepler", icon: FileText, section: "requests" as const },
      { href: "/panel/ustalar", label: "Ustalar", icon: Users, section: "technicians" as const },
      { href: "/panel", label: "Müşteri ara", icon: Smartphone },
  ] : role === "technician" ? [
    { href: "/panel", label: "İşlerim", icon: Wrench },
    { href: "/panel", label: "İş geçmişim", icon: CheckCircle2 },
    { href: "/panel/faturalar", label: "Faturalarım", icon: ReceiptText, section: "billing" as const },
    { href: "/panel", label: "Profilim", icon: UserRound },
  ] : role === "courier" ? [
    { href: "/panel", label: "Teslimatlarım", icon: PackageCheck },
    { href: "/panel", label: "Tamamlananlar", icon: CheckCircle2 },
  ] : [
    { href: "/panel", label: "Cihazım", icon: Smartphone },
    { href: "/panel", label: "Talep geçmişi", icon: FileText },
    { href: "/panel/faturalar", label: "Faturalarım", icon: ReceiptText, section: "billing" as const },
  ];
  const roleLabel: Record<AppRole, string> = { admin: "Admin", staff: "Görevli", technician: "Usta", courier: "Kurye", customer: "Müşteri" };
  return <>
    <button className="icon-button subpage-menu" aria-label={open ? "Menüyü kapat" : "Menüyü aç"} onClick={() => setOpen((value) => !value)}>{open ? <X size={20}/> : <Menu size={20}/>}</button>
    {open && <button className="mobile-scrim" aria-label="Menüyü kapat" onClick={() => setOpen(false)}/>}
    <aside className={`sidebar ${open ? "sidebar-open" : ""}`}>
      <div className="brand"><Image className="brand-mark-image" src="/brand/alojetcep-emblem.png" alt="" width={40} height={40}/><span>AloJet<span className="brand-light">Cep</span></span><button className="icon-button nav-close" aria-label="Menüyü kapat" onClick={() => setOpen(false)}><X size={18}/></button></div>
      <div className="workspace-label">{role === "admin" ? "YÖNETİM" : role === "staff" ? "OPERASYON" : role === "technician" ? "USTA PANELİ" : role === "courier" ? "KURYE PANELİ" : "MÜŞTERİ"}</div>
      <nav className="main-nav" aria-label="Panel menüsü">{items.map((item, index) => {
        const Icon = item.icon;
        return <Link key={`${item.href}-${index}`} className={`nav-item ${item.section === active ? "active" : ""}`} href={item.href} onClick={() => setOpen(false)}><Icon size={18}/><span>{item.label}</span></Link>;
      })}</nav>
      {(role === "admin" || role === "staff") && <><div className="sidebar-divider"/><div className="workspace-label">YÖNETİM</div><nav className="main-nav" aria-label="Yönetim menüsü"><Link className="nav-item" href="/panel" onClick={() => setOpen(false)}><Activity size={18}/><span>Operasyon özeti</span></Link>{role === "admin" && <Link className={`nav-item ${active === "users" ? "active" : ""}`} href="/admin/users" onClick={() => setOpen(false)}><ShieldCheck size={18}/><span>Kullanıcı ve roller</span></Link>}{role === "admin" && <Link className={`nav-item ${active === "billing" ? "active" : ""}`} href="/panel/faturalar" onClick={() => setOpen(false)}><ReceiptText size={18}/><span>Fatura ve maliyetler</span></Link>}<Link className="nav-item" href="/panel" onClick={() => setOpen(false)}><Settings2 size={18}/><span>Hesabım</span></Link></nav></>}
      <div className="sidebar-bottom"><div className="help-card"><span className="help-icon"><Headphones size={17}/></span><div><strong>Yardıma mı ihtiyacın var?</strong><span>Destek ekibine ulaş</span></div><ArrowRight size={15}/></div><Link className="profile-row" href="/panel" onClick={() => setOpen(false)}><span className="avatar avatar-self">{name.split(/\s+/).map((part) => part[0]).slice(0, 2).join("").toLocaleUpperCase("tr-TR")}</span><span className="profile-copy"><strong>{name}</strong><small>{roleLabel[role]} hesabı</small></span></Link></div>
    </aside>
  </>;
}
