import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database.types";

/**
 * createBrowserClient()
 * Cliente de Supabase para Client Components.
 * Usa la ANON_KEY + URL públicas expuestas al browser.
 * Solo acceso de lectura sujeto a las políticas RLS de la tabla.
 */
export function createBrowserClient() {
  return createSupabaseClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
