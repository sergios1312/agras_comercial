import { cookies } from "next/headers";
import { SUCURSALES_DATA } from "@/lib/constants";
import type { UserRole } from "@/lib/permisos";

export interface SessionUser {
  usuario: string;
  ciudad: string;
  responsable: string;
  telefono: string;
  correo: string;
  pin: string;
  role: UserRole;
  maneja_stock: boolean;
  email: string;
  id_db?: number;
}

export async function getSession(): Promise<SessionUser | null> {
  const cookieStore = await cookies();
  const sede = cookieStore.get("sede_session")?.value;
  
  if (!sede) return null;
  
  const user = SUCURSALES_DATA.find((s) => s.usuario === sede);
  
  if (!user) return null;
  
  return {
    ...user,
    email: user.correo, // Map correo to email to avoid breaking some old components
  } as SessionUser;
}