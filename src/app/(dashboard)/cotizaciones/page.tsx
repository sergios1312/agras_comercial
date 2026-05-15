import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { CotizacionesTabs } from "@/components/cotizaciones/CotizacionesTabs";

export default async function CotizacionesPage() {
  const user = await getSession();
  if (!user) redirect("/login");

  return (
    <div className="h-[calc(100vh-3.5rem)] overflow-hidden bg-slate-950">
      <CotizacionesTabs />
    </div>
  );
}
