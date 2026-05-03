// src/lib/permisos.ts
// Sistema de permisos basado en roles
 
export type UserRole = "admin" | "sucursal" | "subdealer";
 
export interface PermisosUsuario {
  puedeVerSolicitudes: boolean;
  puedeVerReportes: boolean;
  puedeVerEstadisticas: boolean;
  puedeVerProcesos: boolean;
  puedeVerAdministrador: boolean;
}
 
export const PERMISOS_POR_ROLE: Record<UserRole, PermisosUsuario> = {
  admin: {
    puedeVerSolicitudes: true,
    puedeVerReportes: true,
    puedeVerEstadisticas: true,
    puedeVerProcesos: true,
    puedeVerAdministrador: true,
  },
  sucursal: {
    puedeVerSolicitudes: true,
    puedeVerReportes: true,
    puedeVerEstadisticas: true,
    puedeVerProcesos: false,
    puedeVerAdministrador: false,
  },
  subdealer: {
    puedeVerSolicitudes: false,
    puedeVerReportes: true,
    puedeVerEstadisticas: false,
    puedeVerProcesos: false,
    puedeVerAdministrador: false,
  },
};
 
export function obtenerPermisos(role: UserRole): PermisosUsuario {
  return PERMISOS_POR_ROLE[role];
}