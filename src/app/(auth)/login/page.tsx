import type { Metadata } from "next";
import Image from "next/image";
import { LoginForm } from "./LoginForm";
import { ShieldCheck, Package, BarChart3, ClipboardList, Settings } from "lucide-react";

export const metadata: Metadata = {
  title: "Iniciar Sesión",
  description: "Accede al Sistema de Gestión de Garantías y Repuestos.",
};

export default function LoginPage() {
  return (
    <main className="flex min-h-screen bg-slate-950">

      {/* Panel izquierdo — Branding con imagen de fondo (80%) */}
      <div className="hidden lg:flex lg:w-4/5 relative flex-col justify-center items-center overflow-hidden">

        {/* Imagen de fondo */}
        <Image
          src="/img_portada.jpg"
          alt="Sistema de Garantías portada"
          fill
          priority
          className="object-cover object-center"
          style={{ zIndex: 0 }}
        />

        {/* Overlay oscuro con efecto blur suave */}
        <div
          className="absolute inset-0"
          style={{
            zIndex: 1,
            background:
              "linear-gradient(135deg, rgba(2,6,23,0.82) 0%, rgba(15,23,42,0.75) 50%, rgba(30,27,75,0.80) 100%)",
            backdropFilter: "blur(2px)",
          }}
        />

        {/* Contenido sobre la imagen */}
        <div className="relative z-10 max-w-xl text-center space-y-8 px-12">
          {/* Ícono / logo */}
          <div className="inline-flex items-center justify-center w-24 h-24 rounded-3xl
                          bg-indigo-600/20 border border-indigo-400/40
                          shadow-2xl shadow-indigo-600/30 backdrop-blur-sm">
            <ShieldCheck className="w-12 h-12 text-indigo-300" />
          </div>

          {/* Título */}
          <div>
            <h1 className="text-5xl font-extrabold text-white tracking-tight drop-shadow-lg">
              Sistema de Garantías
            </h1>
            <p className="mt-3 text-indigo-200/80 text-base font-medium">
              Versión 2.0 — Plataforma de gestión centralizada
            </p>
          </div>

          {/* Módulos */}
          <div className="grid grid-cols-2 gap-4 pt-2">
            {[
              { label: "Inventario", icon: Package },
              { label: "Estadísticas", icon: BarChart3 },
              { label: "Solicitudes", icon: ClipboardList },
              { label: "Procesos", icon: Settings },
            ].map(({ label, icon: Icon }, i) => (
              <div
                key={i}
                className="flex items-center gap-3 px-5 py-4
                           bg-white/10 backdrop-blur-md
                           rounded-2xl border border-white/20
                           shadow-lg text-left"
              >
                <Icon className="w-5 h-5 text-indigo-300 shrink-0" />
                <div>
                  <p className="text-xs text-indigo-200/60 uppercase tracking-widest">Módulo</p>
                  <p className="text-sm font-semibold text-white mt-0.5">{label}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Badge version */}
          <p className="text-xs text-indigo-300/50 tracking-widest uppercase pt-2">
            © Quetalcompra — Acceso restringido
          </p>
        </div>
      </div>

      {/* Panel derecho — Formulario (20%) */}
      <div className="w-full lg:w-1/5 flex flex-col items-center justify-center
                      px-4 py-10 bg-slate-950 border-l border-slate-800">
        <div className="w-full max-w-xs space-y-7">

          {/* Cabecera mobile */}
          <div className="flex lg:hidden items-center justify-center gap-3 mb-2">
            <ShieldCheck className="w-7 h-7 text-indigo-400" />
            <span className="text-lg font-bold text-white">Sistema de Garantías</span>
          </div>

          {/* Logo desktop pequeño (visible en panel derecho) */}
          <div className="hidden lg:flex flex-col items-center gap-2 mb-1">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl
                            bg-indigo-600/20 border border-indigo-500/30 shadow-lg">
              <ShieldCheck className="w-6 h-6 text-indigo-400" />
            </div>
          </div>

          <div>
            <h2 className="text-xl font-bold text-white">Bienvenido</h2>
            <p className="mt-1.5 text-xs text-slate-400">
              Ingresa tus credenciales para continuar.
            </p>
          </div>

          {/* Tarjeta del formulario */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-2xl">
            <LoginForm />
          </div>

          <p className="text-center text-xs text-slate-600">
            Solo personal autorizado.
          </p>
        </div>
      </div>

    </main>
  );
}
