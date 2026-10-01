import { ReactNode } from "react";
import { logout } from "../actions";

// Links de "Tags" e "Fotos" entram aqui nas próximas etapas.
export default function AdminDashboardLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <div>
      <nav className="flex items-center justify-between border-b border-border px-6 py-4">
        <div className="flex items-center gap-4">
          <span className="font-display text-sm text-foreground">Admin</span>
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
