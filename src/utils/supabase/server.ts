import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { Database } from "@/types/database.types";

/**
 * createClient()
 * Cliente de Supabase para Server Components, Server Actions y Route Handlers.
 * Lee y escribe cookies a través de next/headers para mantener la sesión
 * sincronizada en el servidor sin exponer el Service Role Key.
 */
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options);
            });
          } catch {
            // setAll se llama desde un Server Component (read-only).
            // Si hay un middleware refrescando la sesión, esto es seguro de ignorar.
          }
        },
      },
    }
  );
}
