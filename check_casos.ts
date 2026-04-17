import { createAdminClient } from "./src/utils/supabase/admin";

async function countCasos() {
  const db = createAdminClient();
  const { count, error } = await (db as any)
    .from("casos")
    .select("*", { count: "exact", head: true });

  if (error) {
    console.error("Error:", error);
    return;
  }

  console.log("Total casos in DB:", count);
  
  const { data: lastCasos, error: err2 } = await (db as any)
    .from("casos")
    .select("numeracion_caso, created_at")
    .order("created_at", { ascending: false })
    .limit(5);
    
  if (err2) {
    console.error("Error fetching last cases:", err2);
  } else {
    console.log("Last 5 cases:", JSON.stringify(lastCasos, null, 2));
  }
}

countCasos();
