"use client";

import { useState, useTransition, useEffect } from "react";
import { X, Loader2, Save } from "lucide-react";
import { crearCaso, actualizarCaso } from "@/app/(dashboard)/casos/casos-actions";
import type { CasoUI } from "./CasosClientWrapper";

const TIPOS_TRABAJO = [
  "REPARACION ELECTRONICA",
  "REPARACION DE GENERADOR",
  "REPARACION COMPLEJA GENERADOR",
  "REPARACION MECANICA",
  "SCRAP BATERIA",
  "REPARACION DE CONTROL REMOTO",
  "REPARACION COMPLEJA RC",
  "CASO CRASH",
  "REPARACION DE CARGADOR",
  "ACTIVACION",
  "MANTENIMIENTO DE DRON",
  "MANTENIMIENTO DE GENERADOR",
];

interface Sucursal {
  id: number;
  nombre_ciudad: string;
}

interface Props {
  modo: "crear" | "editar";
  caso?: CasoUI | null;
  sucursales: Sucursal[];
  isAdmin: boolean;
  userSucursalId?: number | null;
  onClose: () => void;
  onSuccess: (caso: CasoUI) => void;
}

export function ModalCrearEditarCaso({
  modo,
  caso,
  sucursales,
  isAdmin,
  userSucursalId,
  onClose,
  onSuccess,
}: Props) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState("");

  const [form, setForm] = useState<{
    numeracion_caso: string;
    estado_general: string;
    cliente: string;
    equipo: string;
    garantia: string;
    estado_caso: string;
    tipo_trabajo: string;
    sucursal_id: number | null;
    descripcion: string;
    fecha_salida: string;
  }>({
    numeracion_caso: caso?.numeracionCaso ?? "",
    estado_general: caso?.estadoGeneral ?? "ABIERTO",
    cliente: caso?.cliente ?? "",
    equipo: caso?.equipo ?? "",
    garantia: caso?.garantia ?? "",
    estado_caso: caso?.estadoCaso === "SIN ESTADO" ? "" : (caso?.estadoCaso ?? ""),
    tipo_trabajo: caso?.tipoTrabajo === "SIN TIPO" ? "" : (caso?.tipoTrabajo ?? ""),
    sucursal_id: caso?.sucursalId ?? userSucursalId ?? sucursales[0]?.id ?? null,
    descripcion: caso?.descripcion ?? "",
    fecha_salida: caso?.fechaSalida ?? "",
  });

  useEffect(() => {
    if (caso) {
      setForm({
        numeracion_caso: caso.numeracionCaso,
        estado_general: caso.estadoGeneral,
        cliente: caso.cliente,
        equipo: caso.equipo,
        garantia: caso.garantia,
        estado_caso: caso.estadoCaso === "SIN ESTADO" ? "" : caso.estadoCaso,
        tipo_trabajo: caso.tipoTrabajo === "SIN TIPO" ? "" : caso.tipoTrabajo,
        sucursal_id: caso.sucursalId,
        descripcion: caso.descripcion,
        fecha_salida: caso.fechaSalida ?? "",
      });
    }
  }, [caso]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    startTransition(async () => {
      const payload = {
        numeracion_caso: form.numeracion_caso.trim(),
        estado_general: form.estado_general,
        cliente: form.cliente.trim() || undefined,
        equipo: form.equipo.trim() || undefined,
        garantia: form.garantia || undefined,
        estado_caso: form.estado_caso.trim() || undefined,
        tipo_trabajo: form.tipo_trabajo || undefined,
        sucursal_id: isAdmin ? Number(form.sucursal_id) : userSucursalId,
        descripcion: form.descripcion.trim() || undefined,
        fecha_salida: form.fecha_salida || null,
      };

      if (modo === "crear") {
        const res = await crearCaso(payload);
        if (res.error) {
          setError(res.error);
          return;
        }
        // Construir el objeto UI para actualizar el estado local
        const sucursalNombre =
          sucursales.find((s) => s.id === Number(form.sucursal_id))
            ?.nombre_ciudad ?? "Sin sucursal";
        onSuccess({
          id: res.id!,
          numeracionCaso: payload.numeracion_caso,
          estadoGeneral: payload.estado_general,
          descripcion: payload.descripcion ?? "",
          sucursal: sucursalNombre,
          sucursalId: Number(form.sucursal_id) || null,
          cliente: payload.cliente ?? "",
          equipo: payload.equipo ?? "",
          garantia: payload.garantia ?? "",
          estadoCaso: payload.estado_caso ?? "SIN ESTADO",
          tipoTrabajo: payload.tipo_trabajo ?? "SIN TIPO",
          fechaIngreso: null,
          fechaSalida: payload.fecha_salida ?? null,
          periodoMensual: payload.fecha_salida ? payload.fecha_salida.slice(0, 7) : null,
          rtat: null,
          clasificacionSLA: null,
        });
      } else if (caso) {
        const res = await actualizarCaso(caso.id, payload);
        if (res.error) {
          setError(res.error);
          return;
        }
        const sucursalNombre = isAdmin
          ? sucursales.find((s) => s.id === Number(form.sucursal_id))?.nombre_ciudad ?? caso.sucursal
          : caso.sucursal;
        onSuccess({
          ...caso,
          estadoGeneral: payload.estado_general,
          cliente: payload.cliente ?? "",
          equipo: payload.equipo ?? "",
          garantia: payload.garantia ?? "",
          estadoCaso: payload.estado_caso ?? "SIN ESTADO",
          tipoTrabajo: payload.tipo_trabajo ?? "SIN TIPO",
          sucursal: sucursalNombre,
          sucursalId: isAdmin ? Number(form.sucursal_id) : caso.sucursalId,
          descripcion: payload.descripcion ?? "",
          fechaSalida: payload.fecha_salida ?? null,
        });
      }
    });
  };

  const inputCls =
    "w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-sm text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500 placeholder:text-slate-600";
  const labelCls = "block text-xs font-medium text-slate-400 mb-1";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800">
          <div>
            <h2 className="text-lg font-bold text-white">
              {modo === "crear" ? "Nuevo Caso" : `Editar Caso — ${caso?.numeracionCaso}`}
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              {modo === "crear" ? "Registra un nuevo caso de garantía." : "Modifica los datos del caso."}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-100 transition-colors p-1.5 hover:bg-slate-800 rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          <div className="grid grid-cols-2 gap-4">
            {/* N° Caso */}
            <div>
              <label className={labelCls}>
                N° de Caso <span className="text-red-400">*</span>
              </label>
              <input
                name="numeracion_caso"
                required
                value={form.numeracion_caso}
                onChange={handleChange}
                readOnly={modo === "editar"}
                className={`${inputCls} ${modo === "editar" ? "opacity-50 cursor-not-allowed" : ""}`}
                placeholder="Ej. 001234"
              />
            </div>

            {/* Estado General */}
            <div>
              <label className={labelCls}>Estado General</label>
              <select
                name="estado_general"
                value={form.estado_general}
                onChange={handleChange}
                className={inputCls}
              >
                <option value="ABIERTO">ABIERTO</option>
                <option value="CERRADO">CERRADO</option>
              </select>
            </div>

            {/* Cliente */}
            <div>
              <label className={labelCls}>Cliente</label>
              <input
                name="cliente"
                value={form.cliente}
                onChange={handleChange}
                className={inputCls}
                placeholder="Nombre del cliente"
              />
            </div>

            {/* Equipo */}
            <div>
              <label className={labelCls}>Equipo / Modelo</label>
              <input
                name="equipo"
                value={form.equipo}
                onChange={handleChange}
                className={inputCls}
                placeholder="Ej. DJI T40"
              />
            </div>

            {/* Garantía */}
            <div>
              <label className={labelCls}>Garantía</label>
              <select name="garantia" value={form.garantia} onChange={handleChange} className={inputCls}>
                <option value="">Sin especificar</option>
                <option value="CON GARANTIA">CON GARANTIA</option>
                <option value="SIN GARANTIA">SIN GARANTIA</option>
              </select>
            </div>

            {/* Estado de Caso */}
            <div>
              <label className={labelCls}>Estado de Caso</label>
              <input
                name="estado_caso"
                value={form.estado_caso}
                onChange={handleChange}
                className={inputCls}
                placeholder="Ej. EN REVISION, DEVUELTO..."
              />
            </div>

            {/* Tipo de Trabajo */}
            <div>
              <label className={labelCls}>Tipo de Trabajo</label>
              <select
                name="tipo_trabajo"
                value={form.tipo_trabajo}
                onChange={handleChange}
                className={inputCls}
              >
                <option value="">Sin especificar</option>
                {TIPOS_TRABAJO.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>

            {/* Sucursal (solo admin) */}
            {isAdmin && (
              <div>
                <label className={labelCls}>Sucursal</label>
                <select
                  name="sucursal_id"
                  value={form.sucursal_id ?? ""}
                  onChange={handleChange}
                  className={inputCls}
                >
                  <option value="">Sin asignar</option>
                  {sucursales.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.nombre_ciudad}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Fecha Salida */}
            <div>
              <label className={labelCls}>Fecha de Salida</label>
              <input
                type="date"
                name="fecha_salida"
                value={form.fecha_salida ?? ""}
                onChange={handleChange}
                className={inputCls}
              />
            </div>

            {/* Fecha Ingreso (readonly en edición si ya existe) */}
            {modo === "editar" && caso?.fechaIngreso && (
              <div>
                <label className={labelCls}>
                  Fecha de Ingreso{" "}
                  <span className="text-amber-400 text-[10px] ml-1">🔒 BLOQUEADA</span>
                </label>
                <input
                  readOnly
                  value={caso.fechaIngreso}
                  className={`${inputCls} opacity-50 cursor-not-allowed`}
                />
              </div>
            )}
          </div>

          {/* Descripción */}
          <div>
            <label className={labelCls}>Descripción / Problema reportado</label>
            <textarea
              name="descripcion"
              value={form.descripcion}
              onChange={handleChange}
              rows={3}
              className={inputCls}
              placeholder="Descripción del problema o trabajo realizado..."
            />
          </div>

          {/* Error */}
          {error && (
            <p className="text-sm text-red-400 bg-red-950/40 border border-red-900/50 p-3 rounded-lg">
              {error}
            </p>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm text-slate-400 hover:text-slate-200 border border-slate-700 hover:border-slate-500 rounded-xl transition-all"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="flex items-center gap-2 px-6 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-indigo-600/20"
            >
              {isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              {isPending ? "Guardando..." : modo === "crear" ? "Crear Caso" : "Guardar Cambios"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
