"use server";

import { createAdminClient } from "@/utils/supabase/admin";
import { getSession } from "@/lib/auth";
import { revalidatePath } from "next/cache";

export interface CasoPayload {
  numeracion_caso: string;
  estado_general: string;
  cliente?: string;
  equipo?: string;
  garantia?: string;
  estado_caso?: string;
  tipo_trabajo?: string;
  sucursal_id?: number | null;
  descripcion?: string;
  fecha_salida?: string | null;
}

// ─── Crear Caso ────────────────────────────────────────────────
export async function crearCaso(payload: CasoPayload) {
  const user = await getSession();
  if (!user) return { error: "No autorizado." };

  const db = createAdminClient() as any;

  // Usuarios de sucursal solo pueden crear en su sucursal
  const sucursalId =
    user.role === "admin" ? payload.sucursal_id : (user.id_db ?? null);

  const { data, error } = await db
    .from("casos")
    .insert({
      numeracion_caso: payload.numeracion_caso,
      estado_general: payload.estado_general || "ABIERTO",
      cliente: payload.cliente || null,
      equipo: payload.equipo || null,
      garantia: payload.garantia || null,
      estado_caso: payload.estado_caso || null,
      tipo_trabajo: payload.tipo_trabajo || null,
      sucursal_id: sucursalId,
      descripcion: payload.descripcion || null,
      fecha_salida: payload.fecha_salida || null,
      estado_sistema: "activo",
    })
    .select("id")
    .single();

  if (error) {
    console.error("Error crearCaso:", error);
    return { error: "No se pudo crear el caso: " + error.message };
  }

  revalidatePath("/casos");
  return { success: true, id: data.id };
}

// ─── Actualizar Caso ───────────────────────────────────────────
export async function actualizarCaso(
  id: number,
  payload: Partial<CasoPayload>
) {
  const user = await getSession();
  if (!user) return { error: "No autorizado." };

  const db = createAdminClient() as any;

  // Verificar que el caso existe y no ha sido purgado
  const { data: casoActual, error: errBuscar } = await db
    .from("casos")
    .select("id, fecha_ingreso, sucursal_id")
    .eq("id", id)
    .single();

  if (errBuscar || !casoActual) return { error: "Caso no encontrado." };

  // Usuarios de sucursal solo pueden editar sus propios casos
  if (user.role !== "admin" && casoActual.sucursal_id !== user.id_db) {
    return { error: "No tienes permiso para editar este caso." };
  }

  // Nunca permitir modificar fecha_ingreso si ya está establecida
  const updates: Record<string, unknown> = { ...payload };
  delete updates.numeracion_caso; // Nunca cambiar el N° de caso
  if (casoActual.fecha_ingreso) {
    delete updates.fecha_ingreso; // Proteger fecha de ingreso ya registrada
  }
  // Si el payload tiene sucursal_id y el usuario no es admin, ignorarlo
  if (user.role !== "admin") {
    delete updates.sucursal_id;
  }

  const { error } = await db.from("casos").update(updates).eq("id", id);

  if (error) {
    console.error("Error actualizarCaso:", error);
    return { error: "No se pudo actualizar el caso: " + error.message };
  }

  revalidatePath("/casos");
  return { success: true };
}

// ─── Eliminar Caso (soft delete) ───────────────────────────────
export async function eliminarCaso(id: number) {
  const user = await getSession();
  if (!user || user.role !== "admin") {
    return { error: "Solo los administradores pueden eliminar casos." };
  }

  const db = createAdminClient() as any;

  const { error } = await db
    .from("casos")
    .update({ estado_sistema: "inactivo" })
    .eq("id", id);

  if (error) {
    console.error("Error eliminarCaso:", error);
    return { error: "No se pudo eliminar el caso: " + error.message };
  }

  revalidatePath("/casos");
  return { success: true };
}

// ─── Registrar Ingreso ─────────────────────────────────────────
// Acción irreversible: establece fecha_ingreso = ahora.
// Solo disponible si fecha_ingreso es null.
export async function registrarIngreso(id: number) {
  const user = await getSession();
  if (!user) return { error: "No autorizado." };

  const db = createAdminClient() as any;

  // Verificar que el caso no tiene fecha_ingreso
  const { data: casoActual, error: errBuscar } = await db
    .from("casos")
    .select("id, fecha_ingreso, sucursal_id")
    .eq("id", id)
    .single();

  if (errBuscar || !casoActual) return { error: "Caso no encontrado." };

  if (casoActual.fecha_ingreso) {
    return { error: "Este caso ya tiene una fecha de ingreso registrada." };
  }

  // Verificar permiso de sucursal
  if (user.role !== "admin" && casoActual.sucursal_id !== user.id_db) {
    return { error: "No tienes permiso para registrar el ingreso de este caso." };
  }

  // Usar fecha actual (solo la parte de fecha para consistencia con el resto de la BD)
  const fechaIngreso = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
  const horaIngreso = new Date().toLocaleTimeString("es-PE", {
    hour: "2-digit",
    minute: "2-digit",
  });

  const { error } = await db
    .from("casos")
    .update({ fecha_ingreso: fechaIngreso })
    .eq("id", id);

  if (error) {
    console.error("Error registrarIngreso:", error);
    return { error: "No se pudo registrar el ingreso: " + error.message };
  }

  revalidatePath("/casos");
  return { success: true, fechaIngreso, horaIngreso };
}
