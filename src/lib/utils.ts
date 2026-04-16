// ============================================================
// src/lib/utils.ts — Utilidades genéricas compartidas
// ============================================================
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/** Fusiona clases de Tailwind de forma segura (elimina conflictos). */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

/** Formatea una fecha ISO a formato local es-PE */
export function formatDate(isoString: string, includeTime: boolean = false): string {
  const options: Intl.DateTimeFormatOptions = {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: "America/Lima",
  };
  
  if (includeTime) {
    options.hour = "2-digit";
    options.minute = "2-digit";
  }

  return new Intl.DateTimeFormat("es-PE", options).format(new Date(isoString));
}

/** Formatea un número como moneda en Soles (PEN) */
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("es-PE", {
    style: "currency",
    currency: "PEN",
    minimumFractionDigits: 2,
  }).format(amount);
}

/** Verifica que un string sea exactamente 4 dígitos numéricos */
export function esNumeroCasoValido(valor: string): boolean {
  return /^\d{4}$/.test(valor.trim());
}

/** Genera un ID temporal único para el carrito */
export function generarIdTemporal(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}
