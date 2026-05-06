import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { Analytics } from '@vercel/analytics/next';
import { SpeedInsights } from '@vercel/speed-insights/next';
import "./globals.css";

/**
 * Configuración de la fuente principal de la aplicación.
 * Inter es una fuente sans-serif moderna y altamente legible,
 * ideal para interfaces de usuario de gestión y dashboards.
 */
// const inter = Inter({
//   subsets: ["latin"],
//   display: "swap",
//   variable: "--font-inter",
// });

export const metadata: Metadata = {
  title: {
    default: "DJI Agras Comercial",
    template: "%s | DJI Agras",
  },
  description:
    "Sistema de gestión comercial, capacitaciones y ROI para DJI Agras.",
};

/**
 * RootLayout: contenedor principal de la aplicación.
 * Aplica la fuente Inter globalmente y establece el idioma en español.
 */
export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body className="antialiased bg-background text-foreground min-h-screen">
        {children}
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
