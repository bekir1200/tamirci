"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { Activity, FileText, Menu, ReceiptText, ShieldCheck, Users, Wrench, X } from "lucide-react";
import type { AppRole } from "@/types/next-auth";

type Section = "requests" | "technicians" | "billing" | "users";

export default function PanelSidebar({ role, name, active }: { role: AppRole; name: string; active: Section }) {
  const [open, setOpen] = useState(false);
  const items: { href: string; label: string; icon: typeof Activity; section?: Section }[] = [
    { href: "/panel", label: "Genel bakış", icon: Activity },
    ...(role === "admin" || role === "staff" ? [
      { href: "/panel/talepler", label: "Talepler", icon: FileText, section: "requests" as const },
      { href: "/panel/ustalar", label: "Ustalar", icon: Users, section: "technicians" as const },
    ] : []),
    ...(role === "admin" || role === "technician" || role === "customer" ? [
      { href: "/panel/faturalar", label: role === "admin" ? "Fatura ve maliyetler" : "Faturalarım", icon: ReceiptText, section: "billing" as const },
    ] : []),
    ...(role === "admin" ? [{ href: "/admin/users", label: "Kullanıcı ve roller", icon: ShieldCheck, section: "users" as const }] : []),
    ...(role === "technician" ? [{ href: "/panel", label: "İşlerim", icon: Wrench }] : []),
  ];
  const roleLabel: Record<AppRole, string> = { admin: "Admin", staff: "Görevli", technician: "Usta", courier: "Kurye", customer: "Müşteri" };
  return <>
    <button className="subpage-menu" aria-label={open ? "Menüyü kapat" : "Menüyü aç"} onClick={() => setOpen((value) => !value)}>{open ? <X size={20}/> : <Menu size={20}/>}</button>
    {open && <button className="subpage-scrim" aria-label="Menüyü kapat" onClick={() => setOpen(false)}/>}
    <aside className={`subpage-sidebar ${open ? "is-open" : ""}`}>
      <Link className="subpage-brand" href="/panel" onClick={() => setOpen(false)}><Image src="/brand/alojetcep-emblem.png" alt="" width={38} height={38}/><span>AloJet<span>Cep</span></span></Link>
      <span className="subpage-nav-label">ÇALIŞMA ALANI</span>
      <nav aria-label="Panel menüsü">{items.map((item, index) => {
        const Icon = item.icon;
        return <Link key={`${item.href}-${index}`} className={`subpage-nav-link ${item.section === active ? "is-active" : ""}`} href={item.href} onClick={() => setOpen(false)}><Icon size={18}/><span>{item.label}</span></Link>;
      })}</nav>
      <div className="subpage-account"><span className="subpage-avatar">{name.split(/\s+/).map((part) => part[0]).slice(0, 2).join("").toLocaleUpperCase("tr-TR")}</span><span><strong>{name}</strong><small>{roleLabel[role]} hesabı</small></span></div>
    </aside>
  </>;
}
