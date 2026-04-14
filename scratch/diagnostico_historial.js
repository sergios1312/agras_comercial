/**
 * Script de diagnóstico: muestra los valores reales de tecnico_destino
 * en historial_pedidos para validar el filtro de VistaTecnico.
 * Ejecutar: node scratch/diagnostico_historial.js
 */

const SUPABASE_URL = "https://ffaqsyprvehybfprfmyf.supabase.co";
const SERVICE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZmYXFzeXBydmVoeWJmcHJmbXlmIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MjQ3MDAxNiwiZXhwIjoyMDg4MDQ2MDE2fQ.q1380oHyqgmwii59DcGUgSMM0PrP1hbpD1TWAYQSHj4";

async function diagnostico() {
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/historial_pedidos?select=id,tecnico_destino,sucursal_origen,estado,fecha_pedido&order=fecha_pedido.desc&limit=50`,
    {
      headers: {
        apikey: SERVICE_KEY,
        Authorization: `Bearer ${SERVICE_KEY}`,
      },
    }
  );

  const data = await res.json();

  if (!Array.isArray(data)) {
    console.error("Error:", data);
    return;
  }

  console.log(`\n=== ÚLTIMOS ${data.length} PEDIDOS EN BD ===\n`);

  // Agrupar por tecnico_destino
  const byDestino = {};
  for (const row of data) {
    const key = `"${row.tecnico_destino}"`;
    if (!byDestino[key]) byDestino[key] = [];
    byDestino[key].push({ id: row.id, origen: row.sucursal_origen, estado: row.estado, fecha: row.fecha_pedido?.slice(0,10) });
  }

  for (const [destino, pedidos] of Object.entries(byDestino)) {
    console.log(`tecnico_destino = ${destino} → ${pedidos.length} pedido(s)`);
    for (const p of pedidos.slice(0, 5)) {
      console.log(`   #${p.id} | origen: "${p.origen}" | estado: ${p.estado} | fecha: ${p.fecha}`);
    }
  }

  console.log("\n=== VALORES ÚNICOS DE tecnico_destino ===");
  const unicos = [...new Set(data.map(r => r.tecnico_destino))];
  for (const v of unicos) {
    console.log(`  "${v}"  (length: ${v?.length})`);
  }

  console.log("\n=== LO QUE ESPERA EL FILTRO ===");
  console.log('  ciudadUsuario de Chiclayo: "Chiclayo" → ciudadNorm: "chiclayo"');
  console.log('  ciudadUsuario de Lima: "Lima" → ciudadNorm: "lima"');
}

diagnostico().catch(console.error);
