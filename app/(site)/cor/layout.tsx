import { ReactNode } from "react";
import { ColorThemeProvider } from "@/components/color-theme-context";

export default function CorLayout({ children }: { children: ReactNode }) {
  return <ColorThemeProvider>{children}</ColorThemeProvider>;
}
