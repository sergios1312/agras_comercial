// ============================================================
// src/lib/casos.ts — Parser y Pipeline de datos de casos.csv
// SERVER ONLY — usa Node.js fs. No importar desde Client Components.
// Los tipos se importan desde @/types/casos.types para separar
// la capa de datos de la capa de presentación.
// ============================================================
import "server-only";
import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/admin";
import { contarDiasHabiles } from "@/lib/rtat";
import { PLAZOS_IDEALES, SUCURSALES_BANEADAS, TRABAJOS_BANEADOS } from "@/types/casos.types";
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

// Se eliminó cargarCasos() sincrónica porque ahora todo se procesa
// desde el panel de cliente (con db) o vía base de datos directamente.

// ─── Lector de Casos desde Base de Datos ─────────────────────
export async function obtenerCasosDesdeDB(): Promise<Caso[]> {
  const supabase = createAdminClient();
  const rawClient = supabase as any;
  const hoy = new Date().toISOString().slice(0, 10);

  const casosList: Caso[] = [];
  let from = 0;
  const step = 1000;

  while (true) {
    const { data: casosDB, error } = await rawClient
      .from("casos")
      .select("*, sucursales(nombre_ciudad), equipo")
      .order("numeracion_caso", { ascending: false })
      .range(from, from + step - 1);

    if (error) {
      console.error("Error obteniendo casos desde DB:", error);
      break;
    }

    if (!casosDB || casosDB.length === 0) break;

    for (const row of casosDB) {
      if (row.numeracion_caso === "0000") continue; // Ignorar el caso genérico de ventas en estadísticas

      const rtat = row.fecha_ingreso ? contarDiasHabiles(row.fecha_ingreso, row.fecha_salida ?? hoy) : null;
      const rtatFinal = rtat !== null && rtat >= 0 ? rtat : null;

      const periodo = periodoMensual(row.fecha_salida);
      const sla = clasificarSLA(rtatFinal, row.tipo_trabajo || "", row.estado_general || "");

      const sucursalNombre = row.sucursales ? row.sucursales.nombre_ciudad : "Sin sucursal";

      casosList.push({
        id: row.id,
        numeracionCaso: row.numeracion_caso,
        estadoGeneral: row.estado_general || "ABIERTO",
        descripcion: row.descripcion || "",
        sucursal: sucursalNombre,
        cliente: row.cliente || "",
        equipo: row.equipo || "",
        garantia: row.garantia || "",
        estadoCaso: row.estado_caso || "SIN ESTADO",
        tipoTrabajo: row.tipo_trabajo || "SIN TIPO",
        fechaIngreso: row.fecha_ingreso || null,
        fechaSalida: row.fecha_salida || null,
        periodoMensual: periodo,
        rtat: rtatFinal,
        clasificacionSLA: sla,
      });
    }

    if (casosDB.length < step) break;
    from += step;
  }

  return casosList;
}
