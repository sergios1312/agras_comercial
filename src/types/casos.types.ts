// ============================================================
// src/types/casos.types.ts — Tipos del módulo de casos/garantías
// Separados de casos.ts para evitar que el import de 'fs'
// contamine los Client Components.
// ============================================================

export type ClasificacionSLA = "A TIEMPO" | "APLAZADO" | "ATRASADO" | null;

export interface Caso {
  id: number;
  numeracionCaso: string;
  estadoGeneral: string;
  descripcion: string;
  sucursal: string;
  cliente: string;
  garantia: string;
  estadoCaso: string;
  tipoTrabajo: string;
  fechaIngreso: string | null;
  fechaSalida: string | null;
  periodoMensual: string | null;
  rtat: number | null;
  clasificacionSLA: ClasificacionSLA;
}

export interface CasoConEstado extends Caso {
  estadoCarga: "nuevo" | "modificado" | "sin_cambios";
}

export interface ResumenCarga {
  nuevos: number;
  modificados: number;
  sinCambios: number;
}

export const PLAZOS_IDEALES: Record<string, number> = {
  "REPARACION ELECTRONICA": 5,
  "REPARACION DE GENERADOR": 10,
  "REPARACION COMPLEJA GENERADOR": 10,
  "REPARACION MECANICA": 5,
  "SCRAP BATERIA": 5,
  "REPARACION DE CONTROL REMOTO": 5,
  "REPARACION COMPLEJA RC": 10,
  "CASO CRASH": 10,
  "REPARACION DE CARGADOR": 5,
  "ACTIVACION": 1,
};

export const SUCURSALES_BANEADAS = ["Arequipa", "Sullana"];

export const TRABAJOS_BANEADOS = [
  "MANTENIMIENTO DE DRON",
  "MANTENIMIENTO DE GENERADOR",
];
