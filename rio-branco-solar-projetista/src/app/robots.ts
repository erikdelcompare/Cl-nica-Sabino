import type { MetadataRoute } from "next";

// Nada deste sistema deve ser indexado (painel privado e propostas por link individual).
export default function robots(): MetadataRoute.Robots {
  return { rules: [{ userAgent: "*", disallow: "/" }] };
}
