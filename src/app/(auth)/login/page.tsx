import type { Metadata } from "next";
import { LoginForm } from "./LoginForm";
import { ShieldCheck } from "lucide-react";

export const metadata: Metadata = {
  title: "Iniciar Sesión",
  description: "Accede al Sistema de Gestión de Garantías y Repuestos.",
};

export default function LoginPage() {
  return (
    <main className="flex min-h-screen bg-slate-950">
      {/* Panel izquierdo — Branding */}
      <div className="hidden lg:flex lg:w-1/2 flex-col justify-center items-center p-12
                      bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 border-r border-slate-800">
        <div className="max-w-sm text-center space-y-6">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl
                          bg-indigo-600/20 border border-indigo-500/30 shadow-xl shadow-indigo-500/10">
            <ShieldCheck className="w-10 h-10 text-indigo-400" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-white tracking-tight">
              Sistema de Garantías
            </h1>
            <p className="mt-2 text-slate-400 text-sm">
              Versión 2.0 — Plataforma de gestión centralizada
            </p>
          </div>
          <div className="grid grid-cols-2 gap-4 pt-4">
            {[
              { label: "Módulo", value: "Inventario" },
              { label: "Módulo", value: "Estadísticas" },
              { label: "Módulo", value: "Solicitudes" },
              { label: "Módulo", value: "Procesos" },
            ].map((item, i) => (
              <div
                key={i}
                className="px-4 py-3 bg-slate-800/60 rounded-xl border border-slate-700/50 text-left"
              >
                <p className="text-xs text-slate-500 uppercase tracking-widest">{item.label}</p>
                <p className="text-sm font-semibold text-slate-200 mt-0.5">{item.value}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Panel derecho — Formulario */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-12">
        <div className="w-full max-w-sm space-y-8">
          {/* Cabecera mobile */}
          <div className="flex lg:hidden items-center justify-center gap-3 mb-2">
            <ShieldCheck className="w-7 h-7 text-indigo-400" />
            <span className="text-lg font-bold text-white">Sistema de Garantías</span>
          </div>

          <div>
            <h2 className="text-2xl font-bold text-white">Bienvenido de vuelta</h2>
            <p className="mt-1.5 text-sm text-slate-400">
              Ingresa tus credenciales para continuar.
            </p>
          </div>

          {/* Tarjeta del formulario */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-7 shadow-2xl">
            <LoginForm />
          </div>

          <p className="text-center text-xs text-slate-600">
            Sistema interno — acceso restringido a personal autorizado.
          </p>
        </div>
      </div>
    </main>
  );
}
