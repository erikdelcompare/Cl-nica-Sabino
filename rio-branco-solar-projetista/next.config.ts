import type { NextConfig } from "next";

// Cabeçalhos aplicados a todas as rotas.
const cabecalhosGerais = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(self), microphone=(), geolocation=()" },
  // O sistema inteiro é privado: nada deve ser indexado.
  { key: "X-Robots-Tag", value: "noindex, nofollow, noarchive, nosnippet, noimageindex" },
];

// Rotas da proposta pública: o token está na URL, então nunca enviamos referrer
// nem deixamos intermediários guardarem cópia.
const cabecalhosProposta = [
  { key: "Referrer-Policy", value: "no-referrer" },
  { key: "Cache-Control", value: "private, no-store, max-age=0" },
];

const nextConfig: NextConfig = {
  poweredByHeader: false,
  // Painel privado e propostas por token: tudo é renderizado por requisição.
  cacheComponents: false,
  turbopack: {
    root: process.cwd(),
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
  async headers() {
    return [
      { source: "/:path*", headers: cabecalhosGerais },
      { source: "/p/:path*", headers: cabecalhosProposta },
      { source: "/api/p/:path*", headers: cabecalhosProposta },
    ];
  },
};

export default nextConfig;
