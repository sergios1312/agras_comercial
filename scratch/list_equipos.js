
const { createAdminClient } = require("./src/utils/supabase/admin");

async function listEquipos() {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('casos')
    .select('equipo');

  if (error) {
    console.error("Error fetching equipos:", error);
    return;
  }

  const equipos = [...new Set(data.map(d => d.equipo).filter(Boolean))].sort();
  console.log("EQUIPOS_LIST:" + equipos.join(", "));
}

listEquipos();
