import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Experiencias Ecuador y el Mundo",
  description: "Para disfrutar y regalar: experiencias de viaje para ti y para regalar.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
