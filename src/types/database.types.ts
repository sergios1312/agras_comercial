// ============================================================
// src/types/database.types.ts
// Tipos TypeScript que reflejan el esquema de Supabase para Agras Comercial
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

export type EstadoEventoAcademy = 
  | "Tentativo"
  | "Confirmado"
  | "Agendado"
  | "Finalizado"
  | "Cancelado";


// ─── Tabla: clientes ─────────────────────────────────────────
export interface Cliente {
  id_cliente: string; // uuid
  nombre_razon_social: string;
  datos_contacto?: string | null;
  created_at?: string;
}

// ─── Tabla: documentos_reporte (Cotizaciones) ────────────────
export type TipoDocumentoReporte = "cotizacion_venta" | "orden_venta" | "reporte_ventas";

export interface DocumentoReporte {
  id: number;
  tipo_documento: TipoDocumentoReporte;
  codigo_generado: string;
  usuario_emisor: string;
  fecha_creacion: string;
  cliente_id?: string | null; // uuid
  descripcion_trabajo?: string | null;
  subtotal: number;
  igv: number;
  total: number;
}

// ─── Tabla: detalle_documento_reporte ────────────────────────
export interface DetalleDocumentoReporte {
  id: number;
  documento_id: number;
  repuesto_id: number; // Esto cambiará al ID del nuevo catálogo
  cantidad: number;
  precio_unitario: number;
  subtotal: number;
}

// ─── Tabla: configuracion_sistema ────────────────────────────
export interface ConfiguracionSistema {
  id: number;
  clave: string;
  valor: string;
  updated_at: string;
}

// ─── Módulo Academy ──────────────────────────────────────────

export interface AcademyInstructor {
  id: number;
  nombre: string;
  correo: string;
  score_promedio: number;
  activo: boolean;
}

export interface AcademyDronDemo {
  id: number;
  modelo: string;
  numero_serie: string;
  horas_vuelo: number;
  ciclos_bateria_estimado: number;
  estado: "Operativo" | "En Mantenimiento" | "Baja";
}

export interface AcademyEvento {
  id: number;
  cliente_id: string; // uuid FK a clientes
  modelo_dron: string; // El dron que le interesa al cliente
  fecha_estimada: string;
  estado: EstadoEventoAcademy;
  creado_por: string; // usuario comercial
  instructor_id?: number | null; // Asignado por coordinador
  dron_demo_id?: number | null; // Opcional
  notas_comerciales?: string | null;
  created_at?: string;
}

export interface AcademyEvaluacion {
  id: number;
  evento_id: number; // FK a academy_eventos
  calificacion_instructor: number; // 1 al 5
  calificacion_equipo: number;
  comentarios?: string | null;
  fecha_evaluacion: string;
}

export interface AcademySimulacionROI {
  id: number;
  cliente_id: string;
  modelo_dron: string;
  input_hectareas: number;
  input_costo_jornal: number;
  input_tiempo_actual: number;
  output_ahorro_dinero: number;
  output_ahorro_tiempo: number;
  output_meses_recuperacion: number;
  fecha_simulacion: string;
}

// ─── Database Schema (para tipado de Supabase Client) ────────
export interface Database {
  public: {
    Tables: {
      documentos_reporte: {
        Row: DocumentoReporte;
        Insert: Omit<DocumentoReporte, "id" | "fecha_creacion">;
        Update: Partial<Omit<DocumentoReporte, "id">>;
      };
      detalle_documento_reporte: {
        Row: DetalleDocumentoReporte;
        Insert: Omit<DetalleDocumentoReporte, "id">;
        Update: Partial<Omit<DetalleDocumentoReporte, "id">>;
      };
      clientes: {
        Row: Cliente;
        Insert: Omit<Cliente, "id_cliente" | "created_at">;
        Update: Partial<Omit<Cliente, "id_cliente">>;
      };
      configuracion_sistema: {
        Row: ConfiguracionSistema;
        Insert: Omit<ConfiguracionSistema, "id" | "updated_at">;
        Update: Partial<Omit<ConfiguracionSistema, "id" | "updated_at">>;
      },
      academy_eventos: {
        Row: AcademyEvento;
        Insert: Omit<AcademyEvento, "id" | "created_at">;
        Update: Partial<Omit<AcademyEvento, "id">>;
      },
      academy_instructores: {
        Row: AcademyInstructor;
        Insert: Omit<AcademyInstructor, "id">;
        Update: Partial<Omit<AcademyInstructor, "id">>;
      },
      academy_drones_demo: {
        Row: AcademyDronDemo;
        Insert: Omit<AcademyDronDemo, "id">;
        Update: Partial<Omit<AcademyDronDemo, "id">>;
      },
      academy_evaluaciones: {
        Row: AcademyEvaluacion;
        Insert: Omit<AcademyEvaluacion, "id" | "fecha_evaluacion">;
        Update: Partial<Omit<AcademyEvaluacion, "id">>;
      },
      academy_simulaciones_roi: {
        Row: AcademySimulacionROI;
        Insert: Omit<AcademySimulacionROI, "id" | "fecha_simulacion">;
        Update: Partial<Omit<AcademySimulacionROI, "id">>;
      }
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
  };
}
