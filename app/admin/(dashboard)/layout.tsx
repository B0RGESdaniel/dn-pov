import { ReactNode } from "react";
import Link from "next/link";
import { BfcacheGuard } from "@/components/admin/bfcache-guard";
import { logout } from "../actions";

const NAV_ITEMS = [
  { href: "/admin/tags", label: "Tags" },
  { href: "/admin/fotos", label: "Fotos" },
];

export default function AdminDashboardLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <div>
      <BfcacheGuard />
      <nav className="flex items-center justify-between border-b border-border px-6 py-4">
        <div className="flex items-center gap-4">
          <span className="font-display text-sm text-foreground">Admin</span>
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="text-sm text-muted hover:text-foreground"
            >
              {item.label}
            </Link>
          ))}
        </div>

        <form action={logout}>
          <button type="submit" className="text-sm text-muted hover:text-foreground">
            Sair
          </button>
        </form>
      </nav>

      <main className="p-6">{children}</main>
    </div>
  );
}
