
import ExcelJS from 'exceljs';
import * as path from 'path';

const PRICES_TO_UPDATE: Record<string, number> = {
  'YC.DZ.GR000012.01': 2970,
  'YC.DZ.GR000022.01': 2175,
  'YC.DZ.GR000433.01': 3985,
  'YC.DZ.GR000011.02': 4250,
  'YC.DZ.GR000020.01': 5275,
  'YC.DZ.GR000030.01': 3045,
  'YC.DZ.GR000014.01': 2370,
  'YC.DZ.GR000024.01': 1305,
  'CP.AG.00000580.02': 3945,
  'YC.DZ.BC000062.01': 2650,
  'YC.DZ.GR000432.01': 2160,
};

async function updatePrices() {
  const filePath = path.join(process.cwd(), 'inventario_unificado.xlsx');
  console.log(`📖 Leyendo ${filePath}...`);
  
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(filePath);
  const worksheet = workbook.worksheets[0];

  // Identificar las columnas
  const headers = worksheet.getRow(1).values as string[];
  const idxCod = headers.findIndex(h => String(h).trim() === 'codigo');
  const idxPrecio = headers.findIndex(h => String(h).trim() === 'Precio_venta');

  if (idxCod === -1 || idxPrecio === -1) {
    console.error('❌ No se encontraron las columnas "codigo" o "Precio_venta".');
    console.log('Headers encontrados:', headers);
    process.exit(1);
  }

  console.log(`Indices encontrados: codigo(${idxCod}), Precio_venta(${idxPrecio})`);

  let updatedCount = 0;
  worksheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return;
    const codigo = String(row.getCell(idxCod).value || '').trim();
    
    if (PRICES_TO_UPDATE[codigo] !== undefined) {
      const oldPrice = row.getCell(idxPrecio).value;
      const newPrice = PRICES_TO_UPDATE[codigo];
      row.getCell(idxPrecio).value = newPrice;
      console.log(`✅ Actualizado ${codigo}: ${oldPrice} -> ${newPrice}`);
      updatedCount++;
    }
  });

  if (updatedCount > 0) {
    console.log(`💾 Guardando cambios en el archivo...`);
    await workbook.xlsx.writeFile(filePath);
    console.log(`🎉 Se actualizaron ${updatedCount} registros.`);
  } else {
    console.warn('⚠️ No se encontró ningún código para actualizar.');
  }
}

updatePrices().catch(console.error);
