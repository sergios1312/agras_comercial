// ============================================================
// src/lib/search.ts — Motor de búsqueda por Score
// Especificación: search_engine_specification.md
//
// Jerarquía de prioridad (score menor = mayor prioridad visual):
//   1 → codigo          (máxima prioridad)
//   2 → nombre
//   3 → nombre_traducido
//   4 → codigo_sap / modelos_compatibles
//
// Comportamiento:
//   - Vacío → head(100) sin filtrar
//   - < 2 chars → [] (anti-spam)
//   - ≥ 2 chars → scoring completo, sort ascendente
// ============================================================
import type { RepuestoConStock, RepuestoConScore } from "@/types/database.types";

/**
 * Fase 1 — Normalización del término de búsqueda.
 * Aplica lowercase, trim y la RegEx de limpieza de sub-versiones numéricas.
 * Ej: "ABC.01" → "abc.", "LCD.12" → "lcd."
 */
function normalizarTermino(termino: string): string {
  return termino
    .toLowerCase()
    .trim()
    .replace(/\.\d{1,2}$/, ".");
}

/**
 * Fase 2 — Sistema de calificación de relevancia (Scoring System).
 *
 * La asignación es de SOBREESCRITURA sobre la marcha usando if secuenciales.
 * La última coincidencia exitosa (de menor a mayor prioridad) es la que
 * prevalece, garantizando que el score 1 (código exacto) siempre gane.
 *
 * Orden de evaluación (el último en confirmar sobreescribe):
 *   4 → codigo_sap / modelos_compatibles  (soporte técnico)
 *   3 → nombre_traducido                  (nombres alternativos)
 *   2 → nombre                            (nombre core)
 *   1 → codigo                            (identificador único — máxima prioridad)
 */
function calcularScore(repuesto: RepuestoConStock, cleanTerm: string): number {
  let _score = 0;

  // Nivel 4 — SAP & Compatibilidades
  const strSapMod =
    String(repuesto.codigo_sap ?? "") +
    " " +
    String(repuesto.modelos_compatibles ?? "");
  if (strSapMod.toLowerCase().includes(cleanTerm)) {
    _score = 4;
  }

  // Nivel 3 — Traducciones / Nombres alternativos
  if (String(repuesto.nombre_traducido ?? "").toLowerCase().includes(cleanTerm)) {
    _score = 3;
  }

  // Nivel 2 — Nombre core
  if (String(repuesto.nombre ?? "").toLowerCase().includes(cleanTerm)) {
    _score = 2;
  }

  // Nivel 1 — Código matriz (máxima prioridad, siempre sobreescribe)
  if (String(repuesto.codigo ?? "").toLowerCase().includes(cleanTerm)) {
    _score = 1;
  }

  return _score;
}

/**
 * Motor principal de búsqueda.
 *
 * @param catalogo  - Lista completa de repuestos con stock.
 * @param termino   - Texto ingresado por el usuario (sin normalizar).
 * @returns         - Lista filtrada y ordenada ascendentemente por _score.
 *
 * Optimizaciones UX:
 *   - Vacío / null → head(100) estático, sin procesar.
 *   - 1 char       → [] (validación anti-spam / advertencia implícita).
 *   - ≥ 2 chars    → scoring completo + filtro (_score > 0) + sort ASC.
 */
export function buscarRepuestos(
  catalogo: RepuestoConStock[],
  termino: string
): RepuestoConScore[] {
  // Standby / Paginación estática: sin término → primeros 100
  if (!termino || termino.trim() === "") {
    return catalogo.slice(0, 100).map((r) => ({ ...r, _score: 0 }));
  }

  const trimmed = termino.toLowerCase().trim();

  // Validación anti-spam: 1 solo carácter → 0 resultados
  if (trimmed.length < 2) {
    return [];
  }

  // Normalización completa (incluye regex de sub-versiones)
  const cleanTerm = trimmed.replace(/\.\d{1,2}$/, ".");

  // Scoring, filtrado y ordenamiento ascendente
  return catalogo
    .map((r) => ({ ...r, _score: calcularScore(r, cleanTerm) }))
    .filter((r) => r._score > 0)
    .sort((a, b) => a._score - b._score);
}
