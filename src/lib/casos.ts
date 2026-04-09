// ============================================================
// src/lib/casos.ts — Parser y Pipeline de datos de casos.csv
// SERVER ONLY — usa Node.js fs. No importar desde Client Components.
// Los tipos se importan desde @/types/casos.types para separar
// la capa de datos de la capa de presentación.
// ============================================================
import "server-only";
import fs from "fs";
import path from "path";
import { contarDiasHabiles } from "@/lib/rtat";
import { PLAZOS_IDEALES, SUCURSALES_BANEADAS, TRABAJOS_BANEADOS, SUCURSALES_OFICIALES } from "@/types/casos.types";
import type { Caso, ClasificacionSLA } from "@/types/casos.types";

// ─── CSV Simple Parser ───────────────────────────────────────
function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === "," && !inQuotes) {
      result.push(current.trim());
      current = "";
    } else {
      current += char;
    }
  }
  result.push(current.trim());
  return result;
}

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
export function cargarCasos(): Caso[] {
  const csvPath = path.join(process.cwd(), "casos.csv");
  const raw = fs.readFileSync(csvPath, "utf-8");
  const lines = raw.split("\n").filter((l) => l.trim() !== "");

  if (lines.length < 2) return [];

  const headers = parseCSVLine(lines[0]);

  // Índices de columnas clave
  const idx = (name: string) => headers.findIndex((h) => h.trim() === name);
  const I = {
    num:          idx("Numeración"),
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

  for (let i = 1; i < lines.length; i++) {
    const cols = parseCSVLine(lines[i]);
    if (cols.length < 5) continue;

    const sucursalRaw = (cols[I.sucursal] ?? "").trim();
    // Encuentra la sucursal buscando coincidencias en la lista oficial
    const sucursalMatch = SUCURSALES_OFICIALES.find((s) => sucursalRaw.toLowerCase().includes(s.toLowerCase()));
    
    if (!sucursalMatch) continue; // Descarta filas corruptas ("WhatsApp video", etc.)
    const sucursal = sucursalMatch;

    const tipoTrabajo = (cols[I.tipoTrabajo] ?? "").trim().toUpperCase();
    const estadoGeneral = (cols[I.estadoGen] ?? "").trim().toUpperCase();

    // ── Exclusiones (§1) ─────────────────────────────────────
    if (SUCURSALES_BANEADAS.some((s) => sucursal.toLowerCase().includes(s.toLowerCase()))) continue;
    if (TRABAJOS_BANEADOS.some((t) => tipoTrabajo.includes(t))) continue;

    // ── Limpieza de campos (§2 pasos 1-2) ────────────────────
    let estadoCaso = (cols[I.estadoCaso] ?? "").trim();
    if (!estadoCaso) estadoCaso = "SIN ESTADO";

    const fechaIngresoRaw = (cols[I.fechaIngreso] ?? "").trim();
    const fechaSalidaRaw  = (cols[I.fechaSalida]  ?? "").trim();

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
      id:              Number(cols[I.num]) || i,
      estadoGeneral:   estadoGeneral || "ABIERTO",
      descripcion:     (cols[I.desc] ?? "").trim(),
      sucursal:        sucursal || "Sin sucursal",
      cliente:         (cols[I.cliente] ?? "").trim(),
      garantia:        (cols[I.garantia] ?? "").trim(),
      estadoCaso:      estadoFinal,
      tipoTrabajo:     tipoTrabajo || "SIN TIPO",
      fechaIngreso,
      fechaSalida,
      periodoMensual:  periodo,
      rtat,
      clasificacionSLA: sla,
    });
  }

  return casos;
}
