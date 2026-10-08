import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // pdfkit (usado por @react-pdf/renderer) carga sus fuentes estándar con
  // require() dinámico; Vercel no lo detecta solo, así que se incluye a mano.
  outputFileTracingIncludes: {
    "/cuenta/regalos/[id]/tarjeta": ["./node_modules/pdfkit/js/**/*"],
    "/admin/regalos/[id]/tarjeta": ["./node_modules/pdfkit/js/**/*"],
    "/admin/pedidos": ["./node_modules/pdfkit/js/**/*"],
    "/cuenta/experiencias": ["./node_modules/pdfkit/js/**/*"],
  },
  images: { remotePatterns: [{ protocol: "https", hostname: "images.unsplash.com" }] },
};

export default nextConfig;
