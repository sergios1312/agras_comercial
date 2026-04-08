// ============================================================
// src/lib/supabase.ts — Clientes de Supabase
// ============================================================
import { createBrowserClient as _createBrowserClient } from "@supabase/ssr";
import type { Database } from "@/types/database.types";

/**
 * createBrowserClient()
 * Cliente de Supabase para Client Components ("use client").
 * Lee las variables de entorno públicas (NEXT_PUBLIC_*).
 */
export function createBrowserClient() {
  return _createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
