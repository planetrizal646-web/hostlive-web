import Link from "next/link";
import type { User } from "@/lib/db";
import { NavLinks } from "./NavLinks";
import { SubmitButton } from "./SubmitButton";

export type NavItem = { href: string; label: string; icon: string };

const ADMIN_NAV: NavItem[] = [
  { href: "/dashboard", label: "Pantau live", icon: "◉" },
  { href: "/dashboard/sessions", label: "Semua sesi", icon: "≡" },
  { href: "/dashboard/hosts", label: "Kelola host", icon: "◍" },
  { href: "/dashboard/reports", label: "Rekap bulanan", icon: "▤" },
];

// Label pendek agar 3 menu muat satu baris di HP; judul halaman tetap panjang.
const HOST_NAV: NavItem[] = [
  { href: "/host", label: "Sesi", icon: "◉" },
  { href: "/host/performa", label: "Performa", icon: "▤" },
  { href: "/host/profil", label: "Profil", icon: "◍" },
];

export function Sidebar({ user }: { user: User }) {
  const items = user.role === "admin" ? ADMIN_NAV : HOST_NAV;
  return (
    <aside className="sidebar">
      <Link href={user.role === "admin" ? "/dashboard" : "/host"} className="brand">
        <span className="brand-mark">HL</span>
        <span>
          <span className="brand-name">Hostlive</span>
          <span className="brand-sub">Studio affiliate</span>
        </span>
      </Link>

      <span className="nav-group-label">{user.role === "admin" ? "Operasional" : "Hari ini"}</span>
      <NavLinks items={items} />

      <div className="sidebar-foot">
        <div className="who">
          <span className="avatar on-ink">{user.initials}</span>
          <span>
            <span className="who-name">{user.name}</span>
            <span className="who-role">{user.role === "admin" ? "Admin" : "Host"}</span>
          </span>
        </div>
        <form action="/logout" method="post">
          <SubmitButton className="logout-btn" pendingLabel="Keluar…">
            Keluar
          </SubmitButton>
        </form>
      </div>
    </aside>
  );
}

export function Topbar({ title, sub, children }: { title: string; sub?: string; children?: React.ReactNode }) {
  return (
    <header className="topbar">
      <div>
        <h1>{title}</h1>
        {sub ? <div className="topbar-sub">{sub}</div> : null}
      </div>
      <div className="spacer" />
      {children}
    </header>
  );
}

export function Shell({
  user,
  title,
  sub,
  actions,
  children,
}: {
  user: User;
  title: string;
  sub?: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="shell">
      <a href="#konten" className="skip">Lompat ke konten</a>
      <Sidebar user={user} />
      <main className="main">
        <Topbar title={title} sub={sub}>
          {actions}
        </Topbar>
        <div className="content" id="konten">{children}</div>
        <footer className="page-foot">Hostlive Dashboard v0.7.0 · Waktu Asia/Jakarta</footer>
      </main>
    </div>
  );
}
