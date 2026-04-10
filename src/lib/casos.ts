// ============================================================
// src/lib/casos.ts — Parser y Pipeline de datos de casos.csv
// SERVER ONLY — usa Node.js fs. No importar desde Client Components.
// Los tipos se importan desde @/types/casos.types para separar
// la capa de datos de la capa de presentación.
// ============================================================
import "server-only";
import fs from "fs";
import path from "path";
import { parse } from "csv-parse/sync";
import { contarDiasHabiles } from "@/lib/rtat";
import { PLAZOS_IDEALES, SUCURSALES_BANEADAS, TRABAJOS_BANEADOS, SUCURSALES_OFICIALES } from "@/types/casos.types";
import type { Caso, ClasificacionSLA } from "@/types/casos.types";

function parseDate(val: string): string | null {
  if (!val || val.trim() === "") return null;
  // Formato YYYY/MM/DD → ISO
  const clean = val.trim().replace(/\//g, "-");
  const d = new Date(clean);
  if (isNaN(d.getTime())) return null;
  return clean;
}

// ─── Clasificación SLA (§2 paso 5) ───────────────────────────
function clasificarSLA(
  rtat: number | null,
  tipoTrabajo: string,
  estadoGeneral: string
): ClasificacionSLA {
  if (estadoGeneral !== "CERRADO") return null;
  if (rtat === null) return null;
  const plazo = PLAZOS_IDEALES[tipoTrabajo];
  if (!plazo) return null;

  if (rtat <= plazo) return "A TIEMPO";
  if (rtat <= plazo * 2) return "APLAZADO";
  return "ATRASADO";
}

// ─── Periodo mensual ─────────────────────────────────────────
function periodoMensual(fechaSalida: string | null): string | null {
  if (!fechaSalida) return null;
  return fechaSalida.slice(0, 7); // YYYY-MM
}

// ─── Pipeline Principal (§2) ─────────────────────────────────
let casosCached: Caso[] | null = null;
let lastModified: number = 0;

export function cargarCasos(): Caso[] {
  const csvPath = path.join(process.cwd(), "casos.csv");
  
  let stats;
  try {
    stats = fs.statSync(csvPath);
  } catch (e) {
    return []; // Archivo no existe aún
  }

  // Retornar de memoria si el archivo no ha sido modificado
  if (casosCached && stats.mtimeMs === lastModified) {
    return casosCached;
  }

  const raw = fs.readFileSync(csvPath, "utf-8");
  
  // Parche preventivo para CSV de Lark: si usa ; en lugar de ,
  let delimitador = ",";
  const lineas = raw.split("\n");
  if (lineas.length > 0 && !lineas[0].includes(",") && lineas[0].includes(";")) {
    delimitador = ";";
  }

  // Utilizar csv-parse nativo para manejar correctamente saltos de línea en comillas.
  const records = parse(raw, {
    delimiter: delimitador,
    skip_empty_lines: true,
    relax_column_count: true,
  });

  if (records.length < 2) return [];

  const headers = records[0].map((h: string) => h.trim());

  // Índices de columnas clave
  const idx = (name: string) => headers.findIndex((h: string) => h === name);
  const I = {
    numeracion:   idx("Numeración"),
    estadoGen:    idx("ESTADO GENERAL"),
    desc:         idx("DESCRIPCIÓN"),
    sucursal:     idx("Sucursal DJI AGRAS - QTC:"),
    cliente:      idx("Cliente"),
    garantia:     idx("GARANTÍA"),
    estadoCaso:   idx("ESTADO DE CASO"),
    tipoTrabajo:  idx("TIPO DE TRABAJO"),
    fechaIngreso: idx("Fecha de ingreso"),
    fechaSalida:  idx("Fecha de salida"),
  };

  const hoy = new Date().toISOString().slice(0, 10);
  const casos: Caso[] = [];

  for (let i = 1; i < records.length; i++) {
    const cols = records[i].map((c: string) => c.trim());
    if (cols.length < 5) continue;

    const sucursalRaw = (cols[I.sucursal] ?? "");
    // Encuentra la sucursal buscando coincidencias en la lista oficial
    const sucursalMatch = SUCURSALES_OFICIALES.find((s) => sucursalRaw.toLowerCase().includes(s.toLowerCase()));
    
    if (!sucursalMatch) continue; // Descarta filas corruptas ("WhatsApp video", etc.)
    const sucursal = sucursalMatch;

    const tipoTrabajo = (cols[I.tipoTrabajo] ?? "").toUpperCase();
    const estadoGeneral = (cols[I.estadoGen] ?? "").toUpperCase();

    // ── Exclusiones (§1) ─────────────────────────────────────
    if (SUCURSALES_BANEADAS.some((s) => sucursal.toLowerCase().includes(s.toLowerCase()))) continue;
    if (TRABAJOS_BANEADOS.some((t) => tipoTrabajo.includes(t))) continue;

    // ── Limpieza de N° Caso Gestioo (§2) ─────────────────────
    let numRaw = (cols[I.numeracion] ?? "").trim();
    if (numRaw.includes(".")) numRaw = numRaw.split(".")[0];
    const numeracionCaso = numRaw ? numRaw.padStart(4, "0") : "0000";

    // ── Limpieza de campos (§2 pasos 1-2) ────────────────────
    let estadoCaso = (cols[I.estadoCaso] ?? "");
    if (!estadoCaso) estadoCaso = "SIN ESTADO";

    const fechaIngresoRaw = (cols[I.fechaIngreso] ?? "");
    const fechaSalidaRaw  = (cols[I.fechaSalida]  ?? "");

    const fechaIngreso = parseDate(fechaIngresoRaw);
    const fechaSalida  = parseDate(fechaSalidaRaw);

    // §2 paso 2: sin fecha de ingreso → NO INGRESADO
    let estadoFinal = estadoCaso;
    if (!fechaIngreso) estadoFinal = "NO INGRESADO";

    // ── RTAT (§2 paso 4) ─────────────────────────────────────
    let rtat: number | null = null;
    if (fechaIngreso) {
      const fechaFin = fechaSalida ?? hoy;
      const dias = contarDiasHabiles(fechaIngreso, fechaFin);
      rtat = dias >= 0 ? dias : null;
    }

    // ── Periodo Mensual (§2 paso 3) ──────────────────────────
    const periodo = periodoMensual(fechaSalida);

    // ── Clasificación SLA (§2 paso 5) ────────────────────────
    const sla = clasificarSLA(rtat, tipoTrabajo, estadoGeneral);

    casos.push({
      id:              i, // Usamos índice inmutable para evitar bugs de React con keys repetidas
      numeracionCaso,
      estadoGeneral:   estadoGeneral || "ABIERTO",
      descripcion:     (cols[I.desc] ?? ""),
      sucursal:        sucursal || "Sin sucursal",
      cliente:         (cols[I.cliente] ?? ""),
      garantia:        (cols[I.garantia] ?? ""),
      estadoCaso:      estadoFinal,
      tipoTrabajo:     tipoTrabajo || "SIN TIPO",
      fechaIngreso,
      fechaSalida,
      periodoMensual:  periodo,
      rtat,
      clasificacionSLA: sla,
    });
  }

  // Guardar en caché
  casosCached = casos;
  lastModified = stats.mtimeMs;

  return casos;
}
