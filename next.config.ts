import type { NextConfig } from "next";

const r2PublicUrl = process.env.R2_PUBLIC_URL
  ? new URL(process.env.R2_PUBLIC_URL)
  : null;

const nextConfig: NextConfig = {
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

export default nextConfig;
