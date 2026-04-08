// ============================================================
// src/lib/search.ts — Motor de búsqueda por Score (Blueprint §3)
// Score: 4=SAP/modelos | 3=nombre_traducido | 2=nombre | 1=codigo
// ============================================================
import type { RepuestoConStock, RepuestoConScore } from "@/types/database.types";

function normalizar(texto: string | null | undefined): string {
  return (texto ?? "").toLowerCase().trim();
}

/**
 * Detecta si el término de búsqueda es un valor decimal (ej. "1.5")
 * para aplicar coincidencia exacta en el código.
 */
function esDecimal(termino: string): boolean {
  return /^\d+[.,]\d+$/.test(termino.trim());
}

/**
 * Calcula el score de relevancia de un repuesto para un término de búsqueda.
 * Retorna 0 si no hay ninguna coincidencia.
 */
export function calcularScore(
  repuesto: RepuestoConStock,
  termino: string
): number {
  const t = normalizar(termino);
  if (!t) return 1; // sin término = mostrar todo con score base

  let score = 0;

  // Score 4: código SAP o modelos compatibles
  if (normalizar(repuesto.codigo_sap).includes(t)) score = Math.max(score, 4);
  if (normalizar(repuesto.modelos_compatibles).includes(t))
    score = Math.max(score, 4);

  // Score 3: nombre traducido (inglés/otro idioma)
  if (normalizar(repuesto.nombre_traducido).includes(t))
    score = Math.max(score, 3);

  // Score 2: nombre en español
  if (normalizar(repuesto.nombre).includes(t)) score = Math.max(score, 2);

  // Score 1: código de repuesto puro
  if (esDecimal(t)) {
    // Coincidencia exacta para decimales (evitar falsos positivos)
    if (normalizar(repuesto.codigo) === t) score = Math.max(score, 1);
  } else {
    if (normalizar(repuesto.codigo).includes(t)) score = Math.max(score, 1);
  }

  return score;
}

/**
 * Filtra y rankea un catálogo de repuestos por relevancia.
 * Retorna solo los items con score > 0, ordenados de mayor a menor score.
 */
export function buscarRepuestos(
  catalogo: RepuestoConStock[],
  termino: string
): RepuestoConScore[] {
  if (!termino.trim()) {
    return catalogo.map((r) => ({ ...r, score: 1 }));
  }

  return catalogo
    .map((r) => ({ ...r, score: calcularScore(r, termino) }))
    .filter((r) => r.score > 0)
    .sort((a, b) => b.score - a.score);
}
