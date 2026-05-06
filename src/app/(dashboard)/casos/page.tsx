import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import type { Metadata } from "next";
import { createAdminClient } from "@/utils/supabase/admin";
import { CasosClientWrapper } from "@/components/casos/CasosClientWrapper";
import { contarDiasHabiles } from "@/lib/rtat";
import { PLAZOS_IDEALES } from "@/types/casos.types";
import type { ClasificacionSLA } from "@/types/casos.types";
import type { CasoUI } from "@/components/casos/CasosClientWrapper";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Casos | Sistema de Garantías",
  description: "Gestión completa de casos de garantía con seguimiento de ingreso y salida.",
};

function clasificarSLA(rtat: number | null, tipoTrabajo: string): ClasificacionSLA {
  if (rtat === null) return null;
  const plazo = PLAZOS_IDEALES[tipoTrabajo];
  if (!plazo) return null;
  if (rtat <= plazo) return "A TIEMPO";
  if (rtat <= plazo * 2) return "APLAZADO";
  return "ATRASADO";
}

export default async function CasosPage() {
  const user = await getSession();
  if (!user) redirect("/login");

  const isAdmin = user.role === "admin";
  const db = createAdminClient() as any;
  const hoy = new Date().toISOString().slice(0, 10);

  // ── Sucursales para el formulario ────────────────────────────
  const { data: sucursalesData } = await db
    .from("sucursales")
    .select("id, nombre_ciudad")
    .order("nombre_ciudad");

  const sucursales = (sucursalesData ?? []) as { id: number; nombre_ciudad: string }[];

  // ── Carga de casos ───────────────────────────────────────────
  const casosRaw: any[] = [];
  let from = 0;
  const step = 1000;

  while (true) {
    let query = db
      .from("casos")
      .select("*, sucursales(id, nombre_ciudad)")
      .eq("estado_sistema", "activo")
      .order("numeracion_caso", { ascending: false })
      .range(from, from + step - 1);

    // Filtrar por sucursal para usuarios no-admin
    if (!isAdmin && user.id_db) {
      query = query.eq("sucursal_id", user.id_db);
    }

    const { data, error } = await query;
    if (error || !data || data.length === 0) break;
    casosRaw.push(...data);
    if (data.length < step) break;
    from += step;
  }

  // ── Procesamiento ─────────────────────────────────────────────
  const casos: CasoUI[] = casosRaw
    .filter((row) => row.numeracion_caso !== "0000")
    .map((row) => {
      const rtat = row.fecha_ingreso
        ? contarDiasHabiles(row.fecha_ingreso, row.fecha_salida ?? hoy)
        : null;
      const rtatFinal = rtat !== null && rtat >= 0 ? rtat : null;
      const fechaSalida = row.fecha_salida || null;
      const periodo = fechaSalida ? fechaSalida.slice(0, 7) : null;
      const sla = clasificarSLA(rtatFinal, row.tipo_trabajo || "");
      const sucursalNombre: string = row.sucursales?.nombre_ciudad ?? "Sin sucursal";

      return {
        id: row.id,
        numeracionCaso: row.numeracion_caso,
        estadoGeneral: row.estado_general || "ABIERTO",
        descripcion: row.descripcion || "",
        sucursal: sucursalNombre,
        sucursalId: row.sucursal_id ?? null,
        cliente: row.cliente || "",
        equipo: row.equipo || "",
        garantia: row.garantia || "",
        estadoCaso: row.estado_caso || "SIN ESTADO",
        tipoTrabajo: row.tipo_trabajo || "SIN TIPO",
        fechaIngreso: row.fecha_ingreso || null,
        fechaSalida,
        periodoMensual: periodo,
        rtat: rtatFinal,
        clasificacionSLA: sla,
      };
    });

  return (
    <div className="space-y-5">
      {/* Header de página */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-slate-800 pb-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            📋 Casos
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            {isAdmin
              ? `${casos.length} casos en total · Acceso completo a todas las sucursales.`
              : `${casos.length} casos de la sucursal ${user.ciudad}.`}
          </p>
        </div>
        {!isAdmin && (
          <div className="px-3 py-1.5 bg-slate-800/50 border border-slate-700/50 rounded-lg text-xs text-slate-400 font-medium">
            Sede:{" "}
            <span className="text-slate-200 font-semibold uppercase">
              {user.ciudad}
            </span>
          </div>
        )}
      </div>

      {/* Módulo principal */}
      <CasosClientWrapper
        casos={casos}
        sucursales={sucursales}
        isAdmin={isAdmin}
        userSucursal={user.ciudad}
        userSucursalId={user.id_db ?? null}
        userEmail={user.usuario}
      />
    </div>
  );
}
