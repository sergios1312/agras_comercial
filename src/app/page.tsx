import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";

/**
 * Raíz del sitio: redirige automáticamente según la sesión activa.
 */
export default async function Home() {
  // const supabase = await createClient();
  // const { data: { user } } = await supabase.auth.getUser();
  
  // Forzamos redirección a /login para ver si carga
  redirect("/login");
}
