// ============================================================
// src/components/cotizaciones/productos-data.ts
// Catálogo de productos extraído del Excel "Cotización Ecommerce"
// ============================================================

export interface Producto {
  tipo: string;
  codFabricante: string;
  codSAP: string;
  nombre: string;
  cantidad: number;
  pvp: number;         // Precio Venta Público (inc. IGV)
  pSubdealer: number;  // Precio subdealer
}

export interface KitConfig {
  nombre: string;
  productos: Producto[];
  // Accesorios requeridos que se agregan automáticamente
  accesoriosRequeridos: string[]; // COD SAP de accesorios obligatorios
}

// Todos los productos del catálogo
export const CATALOGO_PRODUCTOS: Producto[] = [
  // === KIT AGRAS T25P GENERADOR ===
  { tipo: "KIT AGRAS T25P GENERADOR", codFabricante: "", codSAP: "CN9405501NA8", nombre: "DJI AGRAS T25P (Oversea V2)", cantidad: 1, pvp: 60100, pSubdealer: 0 },
  { tipo: "KIT AGRAS T25P GENERADOR", codFabricante: "", codSAP: "CN13100009NA8", nombre: "DB800 Intelligent Flight Battery", cantidad: 3, pvp: 7800, pSubdealer: 0 },
  { tipo: "KIT AGRAS T25P GENERADOR", codFabricante: "", codSAP: "CN0909189NA2", nombre: "D6000i Multifunctional Inverter Generator (KR)", cantidad: 1, pvp: 9750, pSubdealer: 0 },

  // === KIT AGRAS T25P CARGADOR ===
  { tipo: "KIT AGRAS T25P CARGADOR", codFabricante: "", codSAP: "CN9405501NA8", nombre: "DJI AGRAS T25P (Oversea V2)", cantidad: 1, pvp: 54000, pSubdealer: 0 },
  { tipo: "KIT AGRAS T25P CARGADOR", codFabricante: "", codSAP: "CN13100321NA8", nombre: "DJI C8000 Intelligent Battery", cantidad: 1, pvp: 8158.4, pSubdealer: 0 },
  { tipo: "KIT AGRAS T25P CARGADOR", codFabricante: "", codSAP: "CN13100009NA8", nombre: "DB800 Intelligent Flight Battery", cantidad: 3, pvp: 7800, pSubdealer: 0 },
  { tipo: "KIT AGRAS T25P CARGADOR", codFabricante: "", codSAP: "CN0909189NA4", nombre: "2600W 4-Channel Intelligent Charger", cantidad: 1, pvp: 277.29, pSubdealer: 0 },

  // === KIT AGRAS T25 GENERADOR ===
  { tipo: "KIT AGRAS T25 GENERADOR", codFabricante: "", codSAP: "CN13100003NA8", nombre: "AGRAS T25 (Oversea V2)", cantidad: 1, pvp: 40950, pSubdealer: 0 },
  { tipo: "KIT AGRAS T25 GENERADOR", codFabricante: "", codSAP: "CN13100009NA8", nombre: "DB800 Intelligent Flight Battery", cantidad: 3, pvp: 7800, pSubdealer: 0 },
  { tipo: "KIT AGRAS T25 GENERADOR", codFabricante: "", codSAP: "CN0909189NA2", nombre: "D6000i Multifunctional Inverter Generator (KR)", cantidad: 1, pvp: 9750, pSubdealer: 0 },

  // === KIT AGRAS T25 CARGADOR ===
  { tipo: "KIT AGRAS T25 CARGADOR", codFabricante: "", codSAP: "CN13100003NA8", nombre: "AGRAS T25 (Oversea V2)", cantidad: 1, pvp: 40950, pSubdealer: 0 },
  { tipo: "KIT AGRAS T25 CARGADOR", codFabricante: "", codSAP: "CN13100009NA8", nombre: "DB800 Intelligent Flight Battery", cantidad: 3, pvp: 7800, pSubdealer: 0 },
  { tipo: "KIT AGRAS T25 CARGADOR", codFabricante: "", codSAP: "CN13100321NA8", nombre: "C8000 Intelligent Charger", cantidad: 1, pvp: 5572.71, pSubdealer: 0 },
  { tipo: "KIT AGRAS T25 CARGADOR", codFabricante: "", codSAP: "CN0909189NA4", nombre: "2600W 4-Channel Intelligent Charger", cantidad: 1, pvp: 277.29, pSubdealer: 0 },

  // === KIT AGRAS T50 GENERADOR ===
  { tipo: "KIT AGRAS T50 GENERADOR", codFabricante: "", codSAP: "CN13100012NA8", nombre: "AGRAS T50 (Oversea V2)", cantidad: 1, pvp: 58500, pSubdealer: 0 },
  { tipo: "KIT AGRAS T50 GENERADOR", codFabricante: "", codSAP: "CN13100212NA8", nombre: "DB1560 Intelligent Flight Battery (Oversea)", cantidad: 3, pvp: 8970, pSubdealer: 0 },
  { tipo: "KIT AGRAS T50 GENERADOR", codFabricante: "", codSAP: "CN13100007NA8", nombre: "D12000iEP Multifunctional Inverter Generator (EU)", cantidad: 1, pvp: 19113.9, pSubdealer: 0 },
  { tipo: "KIT AGRAS T50 GENERADOR", codFabricante: "", codSAP: "CN0909189NA6", nombre: "D12000i Charging Extension Cord", cantidad: 1, pvp: 386.1, pSubdealer: 0 },

  // === KIT AGRAS T50 CARGADOR ===
  { tipo: "KIT AGRAS T50 CARGADOR", codFabricante: "", codSAP: "CN13100012NA8", nombre: "AGRAS T50 (Oversea V2)", cantidad: 1, pvp: 58500, pSubdealer: 0 },
  { tipo: "KIT AGRAS T50 CARGADOR", codFabricante: "", codSAP: "CN13100212NA8", nombre: "DB1560 Intelligent Flight Battery (Oversea)", cantidad: 3, pvp: 8970, pSubdealer: 0 },
  { tipo: "KIT AGRAS T50 CARGADOR", codFabricante: "", codSAP: "CN13100011NA8", nombre: "C10000 Intelligent Charger", cantidad: 1, pvp: 7240, pSubdealer: 0 },
  { tipo: "KIT AGRAS T50 CARGADOR", codFabricante: "", codSAP: "CN0909189NA4", nombre: "2600W 4-Channel Intelligent Charger", cantidad: 2, pvp: 280, pSubdealer: 0 },

  // === KIT AGRAS T70P GENERADOR ===
  { tipo: "KIT AGRAS T70P GENERADOR", codFabricante: "", codSAP: "CN9405463NA8", nombre: "DJI AGRAS T70P (Oversea V2)", cantidad: 1, pvp: 106200, pSubdealer: 0 },
  { tipo: "KIT AGRAS T70P GENERADOR", codFabricante: "", codSAP: "CN9405119NA8", nombre: "DB2160 Intelligent Flight Battery", cantidad: 3, pvp: 14600, pSubdealer: 0 },
  { tipo: "KIT AGRAS T70P GENERADOR", codFabricante: "", codSAP: "CN9405498NA8", nombre: "D14000IE Multifunctional Inverter Generator", cantidad: 1, pvp: 15000, pSubdealer: 0 },

  // === KIT AGRAS T70P CARGADOR ===
  { tipo: "KIT AGRAS T70P CARGADOR", codFabricante: "", codSAP: "CN9405463NA8", nombre: "DJI AGRAS T70P (Oversea V2)", cantidad: 1, pvp: 97500, pSubdealer: 0 },
  { tipo: "KIT AGRAS T70P CARGADOR", codFabricante: "", codSAP: "CN9405119NA8", nombre: "DB2160 Intelligent Flight Battery (Global)", cantidad: 3, pvp: 14600, pSubdealer: 0 },
  { tipo: "KIT AGRAS T70P CARGADOR", codFabricante: "", codSAP: "CN9405466NA8", nombre: "DJI C12000 Intelligent Power Supply", cantidad: 1, pvp: 9820, pSubdealer: 0 },
  { tipo: "KIT AGRAS T70P CARGADOR", codFabricante: "", codSAP: "CN0909189NA4", nombre: "2600W 4-Channel Intelligent Charger", cantidad: 1, pvp: 280, pSubdealer: 0 },

  // === KIT AGRAS T100 GENERADOR ===
  { tipo: "KIT AGRAS T100 GENERADOR", codFabricante: "", codSAP: "CN9405465NA8", nombre: "DJI T100 Spraying System with Air-Cooled Heat Sink (Overseas)", cantidad: 1, pvp: 128500, pSubdealer: 0 },
  { tipo: "KIT AGRAS T100 GENERADOR", codFabricante: "", codSAP: "CN9405464NA8", nombre: "DJI T100 Intelligent Airframe (Overseas V1)", cantidad: 1, pvp: 0, pSubdealer: 0 },
  { tipo: "KIT AGRAS T100 GENERADOR", codFabricante: "", codSAP: "CN9405119NA8", nombre: "DB2160 Intelligent Flight Battery (Global)", cantidad: 3, pvp: 14600, pSubdealer: 0 },
  { tipo: "KIT AGRAS T100 GENERADOR", codFabricante: "", codSAP: "CN9405498NA8", nombre: "D14000IE Multifunctional Inverter Generator", cantidad: 1, pvp: 15000, pSubdealer: 0 },

  // === KIT AGRAS T100 CARGADOR ===
  { tipo: "KIT AGRAS T100 CARGADOR", codFabricante: "", codSAP: "CN9405465NA8", nombre: "DJI T100 Spraying System with Air-Cooled Heat Sink (Overseas)", cantidad: 1, pvp: 122000, pSubdealer: 0 },
  { tipo: "KIT AGRAS T100 CARGADOR", codFabricante: "", codSAP: "CN9405464NA8", nombre: "DJI T100 Intelligent Airframe (Overseas V1)", cantidad: 1, pvp: 0, pSubdealer: 0 },
  { tipo: "KIT AGRAS T100 CARGADOR", codFabricante: "", codSAP: "CN9405466NA8", nombre: "DJI C12000 Intelligent Power Supply", cantidad: 1, pvp: 9820, pSubdealer: 0 },
  { tipo: "KIT AGRAS T100 CARGADOR", codFabricante: "", codSAP: "CN9405119NA8", nombre: "DB2160 Intelligent Flight Battery (Global)", cantidad: 3, pvp: 14600, pSubdealer: 0 },
  { tipo: "KIT AGRAS T100 CARGADOR", codFabricante: "", codSAP: "CN0909189NA4", nombre: "2600W 4-Channel Intelligent Charger", cantidad: 1, pvp: 280, pSubdealer: 0 },

  // === KIT AGRAS T10 ===
  { tipo: "KIT AGRAS T10", codFabricante: "", codSAP: "CN13100422NA8", nombre: "AGRAS T10 (FCC)", cantidad: 1, pvp: 25346.53, pSubdealer: 0 },
  { tipo: "KIT AGRAS T10", codFabricante: "", codSAP: "CN13100423NA8", nombre: "T20 Intelligent Flight Battery", cantidad: 3, pvp: 11592.54, pSubdealer: 0 },
  { tipo: "KIT AGRAS T10", codFabricante: "", codSAP: "CN13100421NA8", nombre: "T10 Intelligent Battery Station (with ACDC) (HJ)", cantidad: 1, pvp: 3788.29, pSubdealer: 0 },

  // === MAVIC 3 MULTISPECTRAL ===
  { tipo: "MAVIC 3 MULTISPECTRAL", codFabricante: "", codSAP: "CN12800008NA8", nombre: "DJI Mavic 3 Multispectral (Universal Edition)", cantidad: 1, pvp: 23814.414, pSubdealer: 0 },
  { tipo: "MAVIC 3 MULTISPECTRAL", codFabricante: "", codSAP: "CN12800422NA8", nombre: "Mavic 3 Enterprise Series - Battery Kit", cantidad: 1, pvp: 3696.3, pSubdealer: 0 },

  // === ACCESORIOS (individuales) ===
  { tipo: "ACCESORIOS", codFabricante: "", codSAP: "CN13100006NA8", nombre: "T50 Atomized Sprinkler Package (Global)", cantidad: 1, pvp: 3120, pSubdealer: 0 },
  { tipo: "ACCESORIOS", codFabricante: "", codSAP: "CN0909185NA9", nombre: "T40 Spreading System", cantidad: 1, pvp: 5456.1, pSubdealer: 0 },
  { tipo: "ACCESORIOS", codFabricante: "", codSAP: "CN0909182NA5", nombre: "T40 Intelligent Flight Battery", cantidad: 1, pvp: 12714.59, pSubdealer: 0 },
  { tipo: "ACCESORIOS", codFabricante: "", codSAP: "CN0909180NA5", nombre: "T30 Intelligent Battery Station", cantidad: 1, pvp: 8158.84, pSubdealer: 0 },
  { tipo: "ACCESORIOS", codFabricante: "", codSAP: "CN13100002NA8", nombre: "T25 Atomized Sprinkler Package (Global)", cantidad: 1, pvp: 2730, pSubdealer: 0 },
  { tipo: "ACCESORIOS", codFabricante: "", codSAP: "CN13100010NA8", nombre: "Spreading System T50", cantidad: 1, pvp: 6630, pSubdealer: 0 },
  { tipo: "ACCESORIOS", codFabricante: "", codSAP: "CN13100004NA8", nombre: "Spreading System T25", cantidad: 1, pvp: 6240, pSubdealer: 0 },
  { tipo: "ACCESORIOS", codFabricante: "", codSAP: "CN0909189NA2", nombre: "D6000i Multifunctional Inverter Generator (KR)", cantidad: 1, pvp: 9750, pSubdealer: 0 },
  { tipo: "ACCESORIOS", codFabricante: "", codSAP: "CN9406003NA1", nombre: "D-RTK 2 High Precision GNSS Mobile Station", cantidad: 1, pvp: 13934.35, pSubdealer: 0 },
  { tipo: "ACCESORIOS", codFabricante: "", codSAP: "CN9406005NA3", nombre: "D-RTK 2 BASE STATION TRIPOD (RH)", cantidad: 1, pvp: 995.24, pSubdealer: 0 },
  { tipo: "ACCESORIOS", codFabricante: "", codSAP: "CN13100001NA8", nombre: "DJI 65W Portable Charger (NA)", cantidad: 1, pvp: 386.1, pSubdealer: 0 },
  { tipo: "ACCESORIOS", codFabricante: "", codSAP: "CN9406006NA2", nombre: "WB37 Intelligent Battery", cantidad: 1, pvp: 581.1, pSubdealer: 0 },
  { tipo: "ACCESORIOS", codFabricante: "", codSAP: "CN12800004NA8", nombre: "DJI WB37 Battery Charging Hub (USB-C)", cantidad: 1, pvp: 581.1, pSubdealer: 0 },
  { tipo: "ACCESORIOS", codFabricante: "", codSAP: "CN9405496NA8", nombre: "DJI T70 Spreading System", cantidad: 1, pvp: 7045, pSubdealer: 0 },
  { tipo: "ACCESORIOS", codFabricante: "", codSAP: "CN13100211NA8", nombre: "DJI Spotlight (AG T50/T25)", cantidad: 1, pvp: 700, pSubdealer: 0 },
  { tipo: "ACCESORIOS", codFabricante: "", codSAP: "CN12800001BK8", nombre: "DJI RC Pro Enterprise", cantidad: 1, pvp: 6240, pSubdealer: 0 },
  { tipo: "ACCESORIOS", codFabricante: "", codSAP: "CN9405263NA8", nombre: "DJI D-RTK 3 Survey Pole and Tripod Kit", cantidad: 1, pvp: 995.24, pSubdealer: 0 },
  { tipo: "ACCESORIOS", codFabricante: "", codSAP: "CN9405262NA8", nombre: "DJI D-RTK 3 Multifunctional Station", cantidad: 1, pvp: 13934.35, pSubdealer: 0 },
  { tipo: "ACCESORIOS", codFabricante: "", codSAP: "CN13100321NA8", nombre: "DJI C8000 Intelligent Battery", cantidad: 1, pvp: 8158.4, pSubdealer: 0 },
  { tipo: "ACCESORIOS", codFabricante: "", codSAP: "CN9405466NA8", nombre: "DJI C12000 Intelligent Power Supply", cantidad: 1, pvp: 9820, pSubdealer: 0 },
  { tipo: "ACCESORIOS", codFabricante: "", codSAP: "CN9405500NA8", nombre: "DJI 150L Spreading System (Global)", cantidad: 1, pvp: 10670, pSubdealer: 0 },
  { tipo: "ACCESORIOS", codFabricante: "", codSAP: "CN13100009NA8", nombre: "DB800 Intelligent Flight Battery", cantidad: 1, pvp: 7800, pSubdealer: 0 },
  { tipo: "ACCESORIOS", codFabricante: "", codSAP: "CN9405119NA8", nombre: "DB2160 Intelligent Flight Battery (Global)", cantidad: 1, pvp: 14600, pSubdealer: 0 },
  { tipo: "ACCESORIOS", codFabricante: "", codSAP: "CN13100212NA8", nombre: "DB1560 Intelligent Flight Battery (Oversea)", cantidad: 1, pvp: 13006.5, pSubdealer: 0 },
  { tipo: "ACCESORIOS", codFabricante: "", codSAP: "LIFT T70", nombre: "Lifting System T70", cantidad: 1, pvp: 7200, pSubdealer: 0 },
  { tipo: "ACCESORIOS", codFabricante: "", codSAP: "LIFT T100", nombre: "Lifting System T100", cantidad: 1, pvp: 8100, pSubdealer: 0 },
  { tipo: "ACCESORIOS", codFabricante: "", codSAP: "CN9405498NA8", nombre: "D14000IE Multifunctional Inverter Generator", cantidad: 1, pvp: 15000, pSubdealer: 0 },
];

// Tipos de kit disponibles para el dropdown
export const TIPOS_KIT = [
  "KIT AGRAS T25P GENERADOR",
  "KIT AGRAS T25P CARGADOR",
  "KIT AGRAS T25 GENERADOR",
  "KIT AGRAS T25 CARGADOR",
  "KIT AGRAS T50 GENERADOR",
  "KIT AGRAS T50 CARGADOR",
  "KIT AGRAS T70P GENERADOR",
  "KIT AGRAS T70P CARGADOR",
  "KIT AGRAS T100 GENERADOR",
  "KIT AGRAS T100 CARGADOR",
  "KIT AGRAS T10",
  "MAVIC 3 MULTISPECTRAL",
  "ACCESORIOS",
] as const;

export type TipoKit = typeof TIPOS_KIT[number];

// Accesorios obligatorios que se agregan a cada kit (del VBA: codExtra)
export const ACCESORIOS_REQUERIDOS_KIT = ["CN13100001NA8", "CN9406006NA2"];

/** Obtiene los productos de un kit específico */
export function obtenerProductosKit(tipoKit: string): Producto[] {
  return CATALOGO_PRODUCTOS.filter(p => p.tipo === tipoKit);
}

/** Obtiene los accesorios individuales disponibles */
export function obtenerAccesorios(): Producto[] {
  return CATALOGO_PRODUCTOS.filter(p => p.tipo === "ACCESORIOS");
}

/** Busca un producto por código SAP */
export function buscarProductoPorSAP(codSAP: string): Producto | undefined {
  return CATALOGO_PRODUCTOS.find(p => p.codSAP === codSAP);
}

// Datos de la empresa (del Excel)
export const DATOS_EMPRESA = {
  nombre: "GRUPO QTC S.A.C.",
  ruc: "20601844916",
  direccion: "Av. República de Panamá Nro. 3623 Int. 2901 Urb. El Palomar Lima - Lima - San Isidro",
  ciudad: "San Isidro - Lima",
  marca: "DJI PERÚ - QTC",
  titulo: "COTIZACIÓN ECOMMERCE",
  tipoVenta: "VENTA DIRECTA",
  garantia: "Brindamos 12 meses de garantía o 1,500 ciclos de uso de la batería (lo que ocurra primero).",
  nota1: "Esta cotización es válida para Que Tal Compra.",
  nota2: "Que Tal Compra del Perú S.A.C no cuenta con políticas de devolución.",
  nota3: "Vigencia según indica el documento.",
  notaDesistimiento: "En caso el cliente desista de su compra, luego de haber realizado el pago, se realizará una retención de S/1,500 por gastos operativos internos.",
  notaEnvio: "Los precios no incluyen gastos de envío.",
};

export const IGV_RATE = 0.18;
