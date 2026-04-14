import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database.types";

/**
 * createAdminClient()
 * Cliente de Supabase con Service Role Key.
 * Bypassa completamente las políticas RLS — usar SOLO en Server Components
 * y Server Actions donde ya se haya verificado la sesión manualmente.
 * NUNCA exponer al cliente (browser).
 */
export function createAdminClient() {
  return createSupabaseClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}
