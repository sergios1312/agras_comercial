import { Loader2 } from "lucide-react";

export default function DashboardLoading() {
  return (
    <div className="flex flex-col items-center justify-center h-full w-full bg-slate-900 border border-slate-800 rounded-xl">
      <Loader2 className="w-10 h-10 text-indigo-500 animate-spin mb-4" />
      <h3 className="text-lg font-medium text-slate-200">Cargando módulo...</h3>
      <p className="text-sm text-slate-500">Sincronizando datos con el servidor central</p>
    </div>
  );
}
