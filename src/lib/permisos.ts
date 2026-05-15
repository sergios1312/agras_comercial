// src/lib/permisos.ts
// Sistema de permisos basado en roles
export type UserRole = "admin" | "sucursal" | "subdealer";
export interface PermisosUsuario {
  puedeVerAcademy: boolean;
  puedeVerReportes: boolean;
  puedeVerEstadisticas: boolean;
  puedeVerAdministrador: boolean;
  puedeVerCotizaciones: boolean;
}

export const PERMISOS_POR_ROLE: Record<UserRole, PermisosUsuario> = {
  admin: {
    puedeVerAcademy: true,
    puedeVerReportes: true,
    puedeVerEstadisticas: true,
    puedeVerAdministrador: true,
    puedeVerCotizaciones: true,
  },
  sucursal: {
    puedeVerAcademy: true,
    puedeVerReportes: true,
    puedeVerEstadisticas: true,
    puedeVerAdministrador: false,
    puedeVerCotizaciones: true,
  },
  subdealer: {
    puedeVerAcademy: false,
    puedeVerReportes: true,
    puedeVerEstadisticas: false,
    puedeVerAdministrador: false,
    puedeVerCotizaciones: true,
  },
};

export function obtenerPermisos(role: UserRole): PermisosUsuario {
  return PERMISOS_POR_ROLE[role];
}