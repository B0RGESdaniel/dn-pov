import type { NextConfig } from "next";
import withSerwistInit from "@serwist/next";

const r2PublicUrl = process.env.R2_PUBLIC_URL
  ? new URL(process.env.R2_PUBLIC_URL)
  : null;

const withSerwist = withSerwistInit({
  swSrc: "app/sw.ts",
  swDest: "public/sw.js",
  // Sem suporte a Turbopack ainda — só roda no build de produção
  // (`next build --webpack`); em dev fica desativado de propósito.
  disable: process.env.NODE_ENV !== "production",
});

const nextConfig: NextConfig = {
  // O Serwist injeta um `webpack()` no config (usado só no build de produção,
  // via `next build --webpack` — Turbopack ainda não é suportado). O Next 16
  // exige reconhecer isso explicitamente, senão quebra até o `next dev`
  // padrão (Turbopack), que nunca chega a rodar esse webpack().
  turbopack: {},
  // Libera o Fast Refresh/HMR e os chunks de dev quando acessado via túnel
  // (ngrok) pra testar em celular — sem isso o Next bloqueia como
  // cross-origin e a página carrega "pela metade" (JS não chega).
  allowedDevOrigins: ["*.ngrok-free.app"],
  images: {
    remotePatterns: r2PublicUrl
      ? [
          {
            protocol: r2PublicUrl.protocol.replace(":", "") as "http" | "https",
            hostname: r2PublicUrl.hostname,
            pathname: "/**",
          },
        ]
      : [],
  },
};

export default withSerwist(nextConfig);
