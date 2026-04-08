import type { Metadata } from "next";
import { Inter } from "next/font/google";
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
    default: "Sistema de Garantías 2.0",
    template: "%s | Sistema de Garantías",
  },
  description:
    "Sistema de gestión de garantías y control de inventario para múltiples sucursales.",
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
      </body>
    </html>
  );
}
