import { ReactNode } from "react";
import { SiteNav } from "@/components/site-nav";
import { ColorTransitionProvider } from "@/components/color-transition";
import { ZoomTransitionProvider } from "@/components/zoom-transition";

export default function SiteLayout({ children }: { children: ReactNode }) {
  return (
    <ColorTransitionProvider>
      <ZoomTransitionProvider>
        <SiteNav />
        {children}
      </ZoomTransitionProvider>
    </ColorTransitionProvider>
  );
}
