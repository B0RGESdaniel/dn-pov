import type { Metadata, Viewport } from "next";
import { Caveat, Fraunces, Poppins } from "next/font/google";
import { SerwistProvider } from "@serwist/next/react";
import "./globals.css";

const poppins = Poppins({
  variable: "--font-poppins",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

// Só usada no texto de `memory` escrito nas polaroids de /memorias
// (font-handwritten), dando um ar de anotação manuscrita.
const caveat = Caveat({
  variable: "--font-caveat",
  subsets: ["latin"],
  weight: ["600", "700"],
  display: "swap",
});

// Só usada na tela de /mural (font-fraunces).
const fraunces = Fraunces({
  variable: "--font-fraunces-serif",
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "dn-pov",
  description: "Arquivo pessoal de fotos",
  appleWebApp: {
    capable: true,
    title: "dn-pov",
    statusBarStyle: "black-translucent",
  },
};

export const viewport: Viewport = {
  themeColor: "#141414",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="pt-BR"
      data-scroll-behavior="smooth"
      className={`${poppins.variable} ${caveat.variable} ${fraunces.variable} h-full scroll-smooth antialiased`}
    >
      <body className="min-h-full flex flex-col overflow-x-hidden bg-background text-foreground font-sans">
        <SerwistProvider swUrl="/sw.js">{children}</SerwistProvider>
      </body>
    </html>
  );
}
