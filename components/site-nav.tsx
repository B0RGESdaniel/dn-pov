"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV_ITEMS = [
  { href: "/", label: "scroll" },
  { href: "/albuns", label: "álbuns" },
];

export function SiteNav() {
  const pathname = usePathname();

  return (
    <nav className="sticky top-0 z-20 flex items-center gap-2 border-b border-border bg-background px-4 py-3 sm:px-6">
      <Link href="/" className="mr-4 font-display text-base tracking-tight">
        dn-pov
      </Link>
      {NAV_ITEMS.map((item) => {
        const active = pathname === item.href;
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`rounded-sm px-3 py-1.5 font-mono text-[10px] uppercase tracking-widest ${
              active
                ? "bg-surface text-foreground"
                : "text-muted hover:text-foreground"
            }`}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
