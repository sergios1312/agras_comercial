/**
 * fetchAll()
 * Función genérica para extraer todos los registros de una tabla de Supabase
 * superando el límite predeterminado de 1000 filas mediante un bucle de paginación.
 * 
 * @param queryBuilder El constructor de consultas (ej: supabase.from('tabla').select('*'))
 * @param batchSize Tamaño de cada bloque (default 1000)
 * @returns Array con todos los registros extraídos
 */
export async function fetchAll<T>(
  queryBuilder: any,
  batchSize: number = 1000
): Promise<T[]> {
  let allData: T[] = [];
  let from = 0;
  let to = batchSize - 1;
  let finished = false;

  while (!finished) {
    const { data, error } = await queryBuilder
      .range(from, to)
      .order('id', { ascending: true }); // Orden consistente para evitar duplicados

    if (error) {
      console.error('❌ Error en fetchAll:', error.message);
      throw error;
    }

    if (data && data.length > 0) {
      allData = [...allData, ...data];
      
      // Si recibimos menos de lo solicitado, es el último bloque
      if (data.length < batchSize) {
        finished = true;
      } else {
        from += batchSize;
        to += batchSize;
      }
    } else {
      finished = true;
    }
  }

  return allData;
}
