"use client";

import Link, { useLinkStatus } from "next/link";
import { usePathname } from "next/navigation";
import type { NavItem } from "./Shell";

/** Indikator halus saat navigasi masih menunggu; harus berada di dalam <Link> */
function Pending() {
  const { pending } = useLinkStatus();
  return <span className="nav-pending" data-pending={pending || undefined} aria-hidden="true" />;
}

export function NavLinks({ items }: { items: NavItem[] }) {
  const pathname = usePathname();
  return (
    <nav className="nav-main" aria-label="Menu utama">
      {items.map((item) => {
        const active = pathname === item.href;
        return (
          <Link
            key={item.href}
            href={item.href}
            className="nav-link"
            aria-label={item.label}
            aria-current={active ? "page" : undefined}
          >
            <span className="nav-icon" aria-hidden="true">
              {item.icon}
            </span>
            <span className="nav-label">{item.label}</span>
            <Pending />
          </Link>
        );
      })}
    </nav>
  );
}
