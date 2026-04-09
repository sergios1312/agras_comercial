import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { Sidebar } from "@/components/layout/Sidebar";
import { Header } from "@/components/layout/Header";

/**
 * DashboardLayout — Server Component
 * Protege todas las rutas del dashboard verificando la sesión.
 * Pasa la info del usuario al Sidebar Client Component.
 */
export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getSession();

  if (!user) {
    redirect("/login");
  }

  // Determinar si el usuario es admin
  const isAdmin = user.role === "admin";

  return (
    <div className="flex h-screen bg-slate-950 text-slate-100 overflow-hidden">
      {/* Sidebar fijo */}
      <Sidebar userEmail={user.email} isAdmin={isAdmin} />

      {/* Contenido principal */}
      <div className="flex flex-col flex-1 overflow-hidden">
        <Header />
        <main className="flex-1 overflow-y-auto p-6 bg-slate-900">
          {children}
        </main>
      </div>
    </div>
  );
}
