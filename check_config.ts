import { createAdminClient } from "./src/utils/supabase/admin";

async function checkConfig() {
  const db = createAdminClient();
  const { data, error } = await (db as any)
    .from("configuracion_sistema")
    .select("*")
    .in("clave", ["ultima_actualizacion_maestro", "ultima_actualizacion_stock", "ultima_actualizacion_casos", "ultima_actualizacion_cases"]);

  if (error) {
    console.error("Error:", error);
    return;
  }

  console.log("Config entries:", JSON.stringify(data, null, 2));
}

checkConfig();
