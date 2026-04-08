"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { SUCURSALES_DATA } from "@/lib/constants";

export interface AuthState {
  error: string | null;
}

/**
 * signIn()
 * Server Action para autenticar al usuario con Usuario/Sucursal y PIN.
 */
export async function signIn(prevState: any, formData: FormData): Promise<AuthState> {
  const usuario = formData.get("usuario") as string;
  const pin = formData.get("pin") as string;

  if (!usuario || !pin) {
    return { error: "Por favor selecciona un usuario e ingresa el PIN." };
  }

  // Mapear usuario -> correo
  const userData = SUCURSALES_DATA.find((u) => u.usuario === usuario);
  if (!userData) {
    return { error: "Usuario no reconocido." };
  }

  const supabase = await createClient();

  const { error } = await supabase.auth.signInWithPassword({
    email: userData.correo,
    password: pin,
  });

  if (error) {
    // Normalizamos el mensaje de error de Supabase a uno amigable en español
    if (
      error.message.includes("Invalid login credentials") ||
      error.message.includes("does not exist")
    ) {
      return { error: "PIN de acceso incorrecto para esta sucursal." };
    }
    return { error: `Error de acceso: ${error.message}` };
  }

  revalidatePath("/", "layout");
  redirect("/inventario");
}

/**
 * signOut()
 * Server Action para cerrar la sesión del usuario.
 */
export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  revalidatePath("/", "layout");
  redirect("/login");
}
