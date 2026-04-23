// ============================================================
// src/types/database.types.ts
// Tipos TypeScript que reflejan el esquema de Supabase v2.0
// Tablas: repuestos, sucursales, inventario, historial_pedidos
// ============================================================

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

// ─── Enums de Negocio ────────────────────────────────────────
export type EstadoPedido =
  | "Pendiente"
  | "Aprobado"
  | "Enviado"
  | "Recibido"
  | "Rechazado"
  | "Finalizado";


export type TipoSolicitud = "Consumo normal" | "Solicitud/Reserva sin stock";

export type TipoReporte = "Abastecimiento" | "Reposición" | "Envío Interno";

// ─── Tabla: repuestos ────────────────────────────────────────
export interface Repuesto {
  id: number;
  codigo: string;
  nombre: string;
  nombre_traducido: string | null;
  codigo_sap: string | null;
  precio_venta: number | null;
  modelos_compatibles: string | null;
  created_at?: string;
}

// ─── Tabla: sucursales ───────────────────────────────────────
export interface Sucursal {
  id: number;
  nombre_ciudad: string;
  nombre_tecnico?: string;
  numero_telefono?: string;
  correo?: string;
}

// ─── Tabla: inventario ───────────────────────────────────────
export interface InventarioRow {
  id: number;
  repuesto_id: number;
  sucursal_id: number;
  cantidad: number;
  // Join fields (cuando se usa foreign key expand)
  sucursales?: { nombre_ciudad: string };
  repuestos?: Repuesto;
}

// Vista pivotada del inventario por sucursal (para la UI)
export interface InventarioPivot extends Repuesto {
  stock_por_sucursal: Record<string, number>;
  stock_total: number;
}

// ─── Tabla: transferencias ───────────────────────────────────
export interface Transferencia {
  id: number;
  estado: "Pendiente" | "Enviado";
  sucursal_destino: string | null;
  codigo_transferencia: string | null;
  orden_venta: string | null;
  factura: string | null;
  fecha_hora: string;
}

// ─── Tabla: historial_pedidos ────────────────────────────────
export interface HistorialPedido {
  id: number;
  tecnico_destino: string;
  sucursal_origen: string;
  repuesto_id: number | null;         // FK → repuestos(id)
  numero_caso: string;
  caso_reposicion?: string | null;
  cantidad: number;
  tipo_reporte: string;
  estado: EstadoPedido;
  fecha_pedido: string;
  // Fechas de trazabilidad (se rellenan automáticamente al cambiar estado)
  fecha_aprobacion?: string | null;
  fecha_envio?: string | null;
  fecha_recepcion?: string | null;
  transferencia_id?: number | null; // FK -> transferencias
  is_test?: boolean; // Bandera virtual para UI
  // Join expandido desde Supabase (disponible cuando se hace select con FK join)
  transferencias?: Transferencia | null;
  repuestos?: {
    id: number;
    codigo: string;
    nombre: string;
    nombre_traducido: string | null;
    codigo_sap: string | null;
    precio_venta: number | null;
  } | null;
}


// ─── Tabla: casos_reposicion ─────────────────────────────────
export interface CasoReposicion {
  id: number;
  fecha: string;
  codigo_caso: string;
  serie_equipo: string;
  ubicacion: string;
}

// ─── Tabla: configuracion_sistema ────────────────────────────
export interface ConfiguracionSistema {
  id: number;
  clave: string;
  valor: string;
  updated_at: string;
}

/** Estado de habilitación de cada tipo de pedido */
export interface ConfigPedidos {
  abastecimiento: boolean; // pedidos_abastecimiento → destino Lima
  internos: boolean;       // pedidos_internos → Envío Interno
  reposicion: boolean;     // pedidos_reposicion → Sin Stock
  modo_prueba: boolean;    // modo_prueba → Guardo en tabla prueba
}

// ─── Tipos UI ─────────────────────────────────────────────────

/** Ítem dentro del carrito de pedidos (estado en memoria) */
export interface ItemCarrito {
  id: string; // UUID temporal para key de React
  repuesto_id: number;
  codigo: string;
  nombre: string;
  nombre_traducido: string;
  cantidad: number;
  numero_caso: string;
  sucursal_destino: string;
  es_venta: boolean;
  stock_disponible: number; // stock de la sede seleccionada
  inv_ids: Record<string, number>;
}

/** Resultado del motor de búsqueda por score (_score: menor = mayor prioridad) */
export interface RepuestoConScore extends RepuestoConStock {
  _score: number;
}

/** Repuesto con stock de todas las sucursales */
export interface RepuestoConStock extends Repuesto {
  stock_por_sucursal: Record<string, number>;
  inv_ids: Record<string, number>; // map sucursal → inventario.id
}

// ─── Database Schema (para tipado de Supabase Client) ────────
export interface Database {
  public: {
    Tables: {
      repuestos: {
        Row: Repuesto;
        Insert: Omit<Repuesto, "id" | "created_at">;
        Update: Partial<Omit<Repuesto, "id">>;
      };
      sucursales: {
        Row: Sucursal;
        Insert: Omit<Sucursal, "id">;
        Update: Partial<Omit<Sucursal, "id">>;
      };
      inventario: {
        Row: InventarioRow;
        Insert: Omit<InventarioRow, "id">;
        Update: Partial<Omit<InventarioRow, "id">>;
      };
      historial_pedidos: {
        Row: HistorialPedido;
        Insert: Omit<HistorialPedido, "id" | "fecha_pedido" | "repuestos">;
        Update: Partial<Omit<HistorialPedido, "id" | "repuestos">>;
      };
      historial_pedidos_prueba: {
        Row: HistorialPedido;
        Insert: Omit<HistorialPedido, "id" | "fecha_pedido" | "repuestos">;
        Update: Partial<Omit<HistorialPedido, "id" | "repuestos">>;
      };
      casos_reposicion: {
        Row: CasoReposicion;
        Insert: Omit<CasoReposicion, "id" | "fecha">;
        Update: Partial<Omit<CasoReposicion, "id">>;
      };
      transferencias: {
        Row: Transferencia;
        Insert: Omit<Transferencia, "id" | "fecha_hora">;
        Update: Partial<Omit<Transferencia, "id" | "fecha_hora">>;
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
  };
}
