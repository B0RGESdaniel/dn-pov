import { ReactNode } from "react";
import { SiteNav } from "@/components/site-nav";
import { ColorTransitionProvider } from "@/components/color-transition";

export default function SiteLayout({ children }: { children: ReactNode }) {
  return (
    <ColorTransitionProvider>
      <SiteNav />
      {children}
    </ColorTransitionProvider>
  );
}
