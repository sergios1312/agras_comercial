import { cookies } from "next/headers";
import { SUCURSALES_DATA } from "@/lib/constants";

export async function getSession() {
  const cookieStore = await cookies();
  const sede = cookieStore.get("sede_session")?.value;
  
  if (!sede) return null;
  
  const user = SUCURSALES_DATA.find((s) => s.usuario === sede);
  
  if (!user) return null;
  
  return {
    ...user,
    email: user.correo, // Map correo to email to avoid breaking some old components
  };
}
