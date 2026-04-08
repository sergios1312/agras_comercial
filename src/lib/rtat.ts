// ============================================================
// src/lib/rtat.ts — Cálculo de RTAT en días hábiles (sin domingos)
// Equivalente a np.busday_count de Python excluyendo domingos.
// ============================================================

const DIAS_HABILES: number[] = [1, 2, 3, 4, 5, 6]; // Lun=1 … Sáb=6 (excluye Dom=0)

/**
 * Cuenta los días hábiles entre dos fechas (excluye domingos).
 * Incluye el día de inicio, excluye el día de fin (igual que numpy).
 * @param fechaInicio - Fecha de inicio (string ISO o Date)
 * @param fechaFin    - Fecha de fin (string ISO o Date)
 * @returns Número de días hábiles (sin domingos). -1 si las fechas son inválidas.
 */
export function contarDiasHabiles(
  fechaInicio: string | Date,
  fechaFin: string | Date
): number {
  const inicio = new Date(fechaInicio);
  const fin = new Date(fechaFin);

  if (isNaN(inicio.getTime()) || isNaN(fin.getTime())) return -1;
  if (inicio >= fin) return 0;

  let dias = 0;
  const actual = new Date(inicio);
  actual.setHours(0, 0, 0, 0);
  const limFin = new Date(fin);
  limFin.setHours(0, 0, 0, 0);

  while (actual < limFin) {
    const diaSemana = actual.getDay(); // 0=Dom, 1=Lun, ... 6=Sáb
    if (DIAS_HABILES.includes(diaSemana)) {
      dias++;
    }
    actual.setDate(actual.getDate() + 1);
  }

  return dias;
}

/**
 * Calcula el RTAT promedio de un array de objetos con fecha_apertura y fecha_cierre.
 * Devuelve null si el array está vacío o todos los valores son inválidos.
 */
export function calcularRtatPromedio(
  casos: Array<{ fecha_apertura: string; fecha_cierre: string | null }>
): number | null {
  const validos = casos
    .filter((c) => c.fecha_cierre !== null)
    .map((c) => contarDiasHabiles(c.fecha_apertura, c.fecha_cierre!))
    .filter((d) => d >= 0);

  if (validos.length === 0) return null;
  return validos.reduce((a, b) => a + b, 0) / validos.length;
}

/**
 * Agrupa casos por nombre de sucursal y calcula el RTAT promedio por grupo.
 */
export function rtatPorSucursal(
  casos: Array<{
    sucursal: string;
    fecha_apertura: string;
    fecha_cierre: string | null;
  }>
): Record<string, number | null> {
  const grupos: Record<
    string,
    Array<{ fecha_apertura: string; fecha_cierre: string | null }>
  > = {};

  for (const caso of casos) {
    if (!grupos[caso.sucursal]) grupos[caso.sucursal] = [];
    grupos[caso.sucursal].push({
      fecha_apertura: caso.fecha_apertura,
      fecha_cierre: caso.fecha_cierre,
    });
  }

  const resultado: Record<string, number | null> = {};
  for (const [sucursal, grupo] of Object.entries(grupos)) {
    resultado[sucursal] = calcularRtatPromedio(grupo);
  }
  return resultado;
}
