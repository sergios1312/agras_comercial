import ExcelJS from 'exceljs';
import * as path from 'path';

async function analyzePrices() {
  const filePath = path.join(process.cwd(), 'inventario_unificado.xlsx');
  
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(filePath);
  const worksheet = workbook.worksheets[0];

  const headers = worksheet.getRow(1).values as string[];
  const idxCod = headers.findIndex(h => String(h).trim() === 'codigo');
  const idxPrecio = headers.findIndex(h => String(h).trim() === 'Precio_venta');

  if (idxCod === -1 || idxPrecio === -1) {
    console.error('❌ No se encontraron las columnas "codigo" o "Precio_venta".');
    process.exit(1);
  }

  // Map to store prices by base code
  const baseGroups: Record<string, { codes: string[], maxPrice: number, items: {code: string, price: number}[] }> = {};

  worksheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return;
    const codigo = String(row.getCell(idxCod).value || '').trim();
    let priceVal = row.getCell(idxPrecio).value;
    
    let price = 0;
    if (typeof priceVal === 'number') {
      price = priceVal;
    } else if (typeof priceVal === 'string') {
      price = parseFloat(priceVal) || 0;
    }
    
    if (codigo) {
      const parts = codigo.split('.');
      if (parts.length > 1 && !isNaN(Number(parts[parts.length - 1]))) {
        const base = parts.slice(0, -1).join('.');
        
        if (!baseGroups[base]) {
          baseGroups[base] = { codes: [], maxPrice: price, items: [] };
        }
        
        baseGroups[base].codes.push(codigo);
        baseGroups[base].items.push({ code: codigo, price });
        if (price > baseGroups[base].maxPrice) {
          baseGroups[base].maxPrice = price;
        }
      }
    }
  });

  let itemsToUpdateCount = 0;
  let groupsWithMultipleItems = 0;
  let sampleUpdates = [];

  for (const [base, group] of Object.entries(baseGroups)) {
    if (group.codes.length > 1) {
      groupsWithMultipleItems++;
      const itemsToUpdate = group.items.filter(i => i.price < group.maxPrice);
      if (itemsToUpdate.length > 0) {
        itemsToUpdateCount += itemsToUpdate.length;
        if (sampleUpdates.length < 5) {
          sampleUpdates.push({
            base,
            maxPrice: group.maxPrice,
            items: group.items
          });
        }
      }
    }
  }

  console.log(`Análisis completado.`);
  console.log(`- Grupos con múltiples códigos (ej. .01, .02): ${groupsWithMultipleItems}`);
  console.log(`- Códigos individuales que necesitan ser actualizados: ${itemsToUpdateCount}`);
  console.log(`\nEjemplos de actualizaciones:`);
  console.log(JSON.stringify(sampleUpdates, null, 2));
}

analyzePrices().catch(console.error);
