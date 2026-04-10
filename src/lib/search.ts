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

// ─── Diccionario de Modelos Oficiales ────────────────────────
const MODELOS_OFICIALES = [
  "D12000IE", "D12000IEP", "D14000IE", "D6000",
  "RC(T20, T25, T40, T50)", "RC(T70, T100)",
  "T100", "T100(SS)", "T20P", "T20P(SS)", "T25", "T25(SS)",
  "T25P", "T25P(SS)", "T40", "T40(SS)", "T50", "T50(SS)", "T70P", "T70P(SS)"
].map(m => m.toLowerCase());

/**
 * Fase 1 — Normalización del término (Fuzzy Match de Tildes).
 * Elimina acentos/diacríticos, aplica lowercase, trim y la RegEx de sub-versiones.
 * Ej: "bátéríá" → "bateria", "ABC.01" → "abc."
 */
export function eliminarTildes(texto: string): string {
  if (!texto) return "";
  return texto.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

function normalizarTermino(termino: string): string {
  return eliminarTildes(termino)
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
  if (!cleanTerm) return 4; // Si la búsqueda principal está vacía (solo se buscaron modelos), damos base 4.

  let _score = 0;

  // Nivel 4 — SAP & Compatibilidades
  const strSapMod = eliminarTildes(
    String(repuesto.codigo_sap ?? "") + " " + String(repuesto.modelos_compatibles ?? "")
  ).toLowerCase();
  
  if (strSapMod.includes(cleanTerm)) {
    _score = 4;
  }

  // Nivel 3 — Traducciones / Nombres alternativos
  const strTrad = eliminarTildes(String(repuesto.nombre_traducido ?? "")).toLowerCase();
  if (strTrad.includes(cleanTerm)) {
    _score = 3;
  }

  // Nivel 2 — Nombre core
  const strNombre = eliminarTildes(String(repuesto.nombre ?? "")).toLowerCase();
  if (strNombre.includes(cleanTerm)) {
    _score = 2;
  }

  // Nivel 1 — Código matriz (máxima prioridad)
  const strCodigo = eliminarTildes(String(repuesto.codigo ?? "")).toLowerCase();
  if (strCodigo.includes(cleanTerm)) {
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

  const trimmed = termino.trim();

  // Validación anti-spam cruda: 1 solo carácter → 0 resultados
  if (trimmed.length < 2) {
    return [];
  }

  // Normalización completa (Quita tildes, lowercase, limpia decimales de versión)
  const queryNormalized = normalizarTermino(trimmed);

  // Aislamiento de Modelos (Smart Filtering)
  const rawTokens = queryNormalized.split(/\s+/).filter(Boolean);
  const textTokens: string[] = [];
  const modelTokens: string[] = [];

  for (const token of rawTokens) {
    // Si tiene 3 caracteres o más Y coincide como substring de la lista oficial de modelos
    if (token.length >= 3 && MODELOS_OFICIALES.some((m) => m.includes(token))) {
      modelTokens.push(token);
    } else {
      textTokens.push(token);
    }
  }

  const mainSearchTerm = textTokens.join(" ");

  // Si después de limpiar nos quedamos con nada válido (raro, pero posible si ponen solo de 2 letras que no sean modelos válidos etc)
  if (mainSearchTerm.length < 2 && modelTokens.length === 0) {
    return [];
  }

  // Scoring y Filtrado Dual
  return catalogo
    .map((r) => {
      let _score = 0;

      // Filtro estricto AND sobre los model tokens: 
      // El repuesto DEBE ser compatible con TODOS los modelos detectados en la búsqueda
      if (modelTokens.length > 0) {
        const strCompat = eliminarTildes(String(r.modelos_compatibles ?? "")).toLowerCase();
        const strSap = eliminarTildes(String(r.codigo_sap ?? "")).toLowerCase();
        
        // Cambio a OR (.some) según petición del usuario: 
        // Mostrará resultados si es compatible con AL MENOS UNO de los modelos detectados.
        const cumpleModelos = modelTokens.some((mt) => 
          strCompat.includes(mt) || strSap.includes(mt)
        );

        if (!cumpleModelos) {
          return { ...r, _score: 0 }; // Descarta repuesto
        }
      }

      // Calculamos score con el texto sobrante ("motor")
      _score = calcularScore(r, mainSearchTerm);

      return { ...r, _score };
    })
    .filter((r) => r._score > 0)
    .sort((a, b) => a._score - b._score);
}
