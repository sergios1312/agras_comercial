"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { SUCURSALES_DATA } from "@/lib/constants";

export interface AuthState {
  error: string | null;
}

export async function signIn(
  prevState: any,
  formData: FormData
): Promise<AuthState> {
  const usuario = formData.get("usuario") as string;
  const pin = formData.get("pin") as string;

  if (!usuario || !pin) {
    return { error: "Por favor selecciona un usuario e ingresa el PIN." };
  }

  // Buscar el usuario en la base local (fija y segura para uso interno)
  const userData = SUCURSALES_DATA.find((u) => u.usuario === usuario);

  if (!userData) {
    return { error: "Usuario no reconocido." };
  }

  if (userData.pin !== pin) {
    return { error: "PIN incorrecto." };
  }

  // Desactivamos Supabase y colocamos una Cookie Permanente de 10 años.
  // Es "permanente" hasta que le de clic a cerrar sesión.
  const cookieStore = await cookies();
  cookieStore.set("sede_session", userData.usuario, {
    maxAge: 60 * 60 * 24 * 365 * 10, // 10 years
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    sameSite: "lax",
  });

  revalidatePath("/", "layout");
  redirect("/inventario");
}

export async function signOut() {
  const cookieStore = await cookies();
  cookieStore.delete("sede_session");
  revalidatePath("/", "layout");
  redirect("/login");
}
