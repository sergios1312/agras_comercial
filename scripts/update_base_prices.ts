import ExcelJS from 'exceljs';
import * as path from 'path';
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function main() {
  const filePath = path.join(process.cwd(), 'inventario_unificado.xlsx');
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(filePath);
  const worksheet = workbook.worksheets[0];

  const headers = worksheet.getRow(1).values as string[];
  const idxCod = headers.findIndex(h => String(h).trim() === 'codigo');
  const idxPrecio = headers.findIndex(h => String(h).trim() === 'Precio_venta');

  const baseGroups: Record<string, { maxPrice: number }> = {};

  worksheet.eachRow((row, rowNum) => {
    if (rowNum === 1) return;
    const codigo = String(row.getCell(idxCod).value || '').trim();
    let price = parseFloat(String(row.getCell(idxPrecio).value)) || 0;

    if (codigo) {
      const parts = codigo.split('.');
      if (parts.length > 1 && !isNaN(Number(parts[parts.length - 1]))) {
        const base = parts.slice(0, -1).join('.');
        if (!baseGroups[base]) baseGroups[base] = { maxPrice: price };
        if (price > baseGroups[base].maxPrice) baseGroups[base].maxPrice = price;
      }
    }
  });

  const pricesToUpdate: Record<string, number> = {};
  
  worksheet.eachRow((row, rowNum) => {
    if (rowNum === 1) return;
    const codigo = String(row.getCell(idxCod).value || '').trim();
    let price = parseFloat(String(row.getCell(idxPrecio).value)) || 0;

    if (codigo) {
      const parts = codigo.split('.');
      if (parts.length > 1 && !isNaN(Number(parts[parts.length - 1]))) {
        const base = parts.slice(0, -1).join('.');
        const maxPrice = baseGroups[base].maxPrice;
        
        if (price < maxPrice) {
          pricesToUpdate[codigo] = maxPrice;
          row.getCell(idxPrecio).value = maxPrice;
        }
      }
    }
  });

  const updateCount = Object.keys(pricesToUpdate).length;
  if (updateCount > 0) {
    console.log(`Detectados ${updateCount} registros para actualizar.`);
    await workbook.xlsx.writeFile(filePath);
    console.log('Excel actualizado.');

    let count = 0;
    for (const [codigo, newPrice] of Object.entries(pricesToUpdate)) {
      await supabase.from('repuestos').update({ precio_venta: newPrice }).eq('codigo', codigo);
      count++;
      if (count % 50 === 0) console.log(`Progreso: ${count}/${updateCount}`);
    }
    console.log('Proceso completado.');
  } else {
    console.log('No hay códigos para actualizar.');
  }
}

main().catch(console.error);
