/**
 * fetchAll()
 * Extrae todos los registros de una tabla de Supabase en paralelo.
 * En lugar de bucles secuenciales que añaden 1 segundo por cada 1000 filas,
 * calcula el count total en la primera llamada y dispara las demás en paralelo.
 */
export async function fetchAllParallel<T>(
  supabase: any,
  table: string,
  select: string = "*",
  orderBy: string = "id",
  ascending: boolean = true,
  batchSize: number = 1000
): Promise<T[]> {
  // 1. Primer request: traer de 0 a batchSize-1, Pidiendo a Supabase el EXACT COUNT
  const { data: firstBatch, error, count } = await supabase
    .from(table)
    .select(select, { count: "exact" })
    .order(orderBy, { ascending })
    .range(0, batchSize - 1);

  if (error) {
    console.error(`❌ Error en fetchAllParallel (${table}):`, error.message);
    throw error;
  }

  let allData: T[] = firstBatch || [];

  // Si no hay conteo o trajimos todo en el primer batch, salir rápido
  if (!count || count <= batchSize) {
    return allData;
  }

  // 2. Disparar el resto de bloques en paralelo
  const promises = [];
  const totalBatches = Math.ceil(count / batchSize);

  for (let i = 1; i < totalBatches; i++) {
    const from = i * batchSize;
    const to = from + batchSize - 1;
    promises.push(
      supabase
        .from(table)
        .select(select)
        .order(orderBy, { ascending })
        .range(from, to)
    );
  }

  const results = await Promise.all(promises);
  for (const res of results) {
    if (res.error) throw res.error;
    if (res.data) allData = allData.concat(res.data);
  }

  return allData;
}

// Mantengo el antiguo fetchAll por retrocompatibilidad con otros módulos
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
