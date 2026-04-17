import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function GET(request: Request) {
  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code") || "0718";
  
  // Also get the columns for 'casos' table
  
  const { data: stringSearch } = await supabase.from("casos").select("numeracion_caso, sucursales(nombre_ciudad)").eq("numeracion_caso", code);
  
  const { data: numSearch } = await supabase.from("casos").select("numeracion_caso, sucursales(nombre_ciudad)").eq("numeracion_caso", Number(code));
  
  return NextResponse.json({
    stringSearch,
    numSearch,
  });
}
