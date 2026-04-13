const ExcelJS = require('exceljs');
const path = require('path');

async function peek(filename, numRows = 2) {
  console.log(`\n--- Peeking into ${filename} ---`);
  const workbook = new ExcelJS.Workbook();
  const filePath = path.join(process.cwd(), filename);
  await workbook.xlsx.readFile(filePath);
  
  const sheet = workbook.worksheets[0];
  console.log(`Sheet name: ${sheet.name}, Total rows: ${sheet.rowCount}`);
  
  for (let i = 1; i <= numRows; i++) {
    const row = sheet.getRow(i);
    console.log(`Row ${i}:`, row.values);
  }
}

async function main() {
  try {
    await peek('sap_crudo.xlsx');
    await peek('inventario_unificado.xlsx');
  } catch (err) {
    console.error(err);
  }
}

main();
