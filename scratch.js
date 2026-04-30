const testPedidos = [
  { id: 1, repuesto_id: "REP1", numero_caso: "100", tecnico_destino: "Sede A", repuestos: { codigo: "C1" } },
  { id: 2, repuesto_id: "REP1", numero_caso: "100", tecnico_destino: "Sede A", repuestos: { codigo: "C1" } }, // Duplicate of 1
  { id: 3, repuesto_id: "REP2", numero_caso: "100", tecnico_destino: "Sede A", repuestos: { codigo: "C2" } },
  { id: 4, repuesto_id: "REP1", numero_caso: "200", tecnico_destino: "Sede A", repuestos: { codigo: "C1" } },
  { id: 5, repuesto_id: "REP1", numero_caso: "100", tecnico_destino: "Sede B", repuestos: { codigo: "C1" } },
  { id: 6, repuesto_id: "REP2", numero_caso: "100", tecnico_destino: "Sede A", repuestos: { codigo: "C2" } }, // Duplicate of 3
];

function simulateMapaDuplicados(pedidos) {
  const mapa = new Map();
  pedidos.forEach(p => {
    const rep_id = p.repuestos?.codigo || p.repuesto_id || "null";
    const key = `${rep_id}-${p.numero_caso}-${p.tecnico_destino}`;
    if (!mapa.has(key)) mapa.set(key, []);
    mapa.get(key).push(p);
  });
  
  const res = new Map(); // pedido_id -> duplicate_key
  for (const [key, grupo] of mapa.entries()) {
    if (grupo.length > 1) {
      grupo.forEach(p => res.set(p.id, key));
    }
  }
  return { duplicadosById: res, grupos: mapa };
}

const result = simulateMapaDuplicados(testPedidos);

console.log("Duplicados encontrados (ID -> Key):");
for (const [id, key] of result.duplicadosById.entries()) {
  console.log(`ID: ${id}, Key: ${key}`);
}

console.log("\nGrupos de duplicados:");
for (const [key, grupo] of result.grupos.entries()) {
  if (grupo.length > 1) {
    console.log(`Key: ${key}, IDs: ${grupo.map(p => p.id).join(", ")}`);
  }
}

// Expected duplicates:
// 1 and 2 (Key: C1-100-Sede A)
// 3 and 6 (Key: C2-100-Sede A)
