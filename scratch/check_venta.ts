
import { createAdminClient } from "../src/utils/supabase/admin";

async function checkVentaCase() {
  const supabase = createAdminClient();
  const { data, error } = await (supabase as any)
    .from("casos")
    .select("numeracion_caso")
    .eq("numeracion_caso", "VENTA")
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      console.log("CASE 'VENTA' NOT FOUND");
    } else {
      console.error("ERROR CHECKING CASE:", error);
    }
  } else {
    console.log("CASE 'VENTA' FOUND:", data);
  }
}

checkVentaCase();
