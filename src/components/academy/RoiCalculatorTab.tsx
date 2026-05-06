"use client";

import { useState, useMemo } from "react";
import { 
  Calculator, 
  TrendingUp, 
  Coins, 
  Clock, 
  Plane, 
  Fuel,
  ChevronRight,
  Info
} from "lucide-react";
import { cn } from "@/lib/utils";

// Parámetros base de los drones (Extraídos del Excel)
const DRONES_BASE = {
  "T25P": {
    precio: 60100,
    tanque: 20,
    tasa: 45,
    velocidad: 5,
    interlineado: 3.2,
    abastecimiento: 6,
    combustibleCarga: 0.3
  },
  "T50": {
    precio: 104910,
    tanque: 45,
    tasa: 25,
    velocidad: 8,
    interlineado: 9,
    abastecimiento: 6,
    combustibleCarga: 0.3
  },
  "T100": {
    precio: 128500,
    tanque: 85,
    tasa: 50,
    velocidad: 8,
    interlineado: 8,
    abastecimiento: 7,
    combustibleCarga: 0.8
  }
};

export function RoiCalculatorTab() {
  // Inputs del usuario
  const [modelo, setModelo] = useState<keyof typeof DRONES_BASE>("T50");
  const [hectareasDia, setHectareasDia] = useState(20);
  const [costoTradicionalHa, setCostoTradicionalHa] = useState(150);
  const [precioGasolina, setPrecioGasolina] = useState(5.0);
  const [precioDiesel, setPrecioDiesel] = useState(15.0);
  const [costoPersonalDia, setCostoPersonalDia] = useState(150);

  // Cálculos ROI (Lógica del Excel)
  const results = useMemo(() => {
    const d = DRONES_BASE[modelo];
    
    // 1. Ratios Operativos
    const caudal = (d.tasa * d.velocidad * 3600 / 1000 * d.interlineado) / 600;
    const haBateria = d.tanque / d.tasa;
    const tiempoVueloEfectivo = d.tanque / caudal;
    const tiempoRealVuelo = tiempoVueloEfectivo + d.abastecimiento;
    const haPorHora = (haBateria / tiempoRealVuelo) * 60;
    const horasTrabajoDia = hectareasDia / haPorHora;

    // 2. Costos Operativos
    const numCargas = hectareasDia / haBateria;
    const combustibleDia = d.combustibleCarga * numCargas;
    const costoGasolinaDia = combustibleDia * precioGasolina;
    const costoDieselDia = 6 * precioDiesel; // Camioneta (estimado Excel)
    const costoTotalOperativoDia = costoGasolinaDia + costoDieselDia + costoPersonalDia;
    
    const costoPorHa = costoTotalOperativoDia / hectareasDia;

    // 3. Resultados ROI
    const ahorroPorHa = costoTradicionalHa - costoPorHa;
    const ahorroPorDia = ahorroPorHa * hectareasDia;
    const diasRecuperacion = d.precio / ahorroPorDia;
    const haRecuperacion = diasRecuperacion * hectareasDia;

    return {
      ahorroPorHa,
      ahorroPorDia,
      diasRecuperacion: Math.ceil(diasRecuperacion),
      haRecuperacion: Math.ceil(haRecuperacion),
      costoPorHa,
      horasTrabajoDia: horasTrabajoDia.toFixed(1)
    };
  }, [modelo, hectareasDia, costoTradicionalHa, precioGasolina, precioDiesel, costoPersonalDia]);

  return (
    <div className="flex flex-col lg:flex-row h-full overflow-hidden">
      {/* Panel de Inputs */}
      <div className="lg:w-1/3 border-r border-slate-800 bg-slate-900/40 p-6 overflow-y-auto custom-scrollbar">
        <div className="flex items-center gap-2 mb-6">
          <Calculator className="w-5 h-5 text-indigo-400" />
          <h3 className="font-bold text-white uppercase tracking-wider text-sm">Configuración de Simulación</h3>
        </div>

        <div className="space-y-6">
          {/* Selector de Dron */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-500 uppercase">Modelo DJI Agras</label>
            <div className="grid grid-cols-3 gap-2">
              {Object.keys(DRONES_BASE).map((m) => (
                <button
                  key={m}
                  onClick={() => setModelo(m as keyof typeof DRONES_BASE)}
                  className={cn(
                    "py-2 px-1 rounded-xl text-xs font-bold border transition-all",
                    modelo === m 
                      ? "bg-indigo-600 border-indigo-500 text-white shadow-lg shadow-indigo-600/20"
                      : "bg-slate-950 border-slate-800 text-slate-500 hover:border-slate-700"
                  )}
                >
                  {m}
                </button>
              ))}
            </div>
          </div>

          {/* Hectáreas */}
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-tighter">Hectáreas por día (Meta)</label>
              <span className="text-sm font-bold text-indigo-400">{hectareasDia} Ha</span>
            </div>
            <input 
              type="range" 
              min="1" 
              max="100" 
              value={hectareasDia}
              onChange={(e) => setHectareasDia(parseInt(e.target.value))}
              className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-500"
            />
          </div>

          <div className="h-px bg-slate-800" />

          {/* Otros Costos */}
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-500 uppercase">Costo Tradicional por Ha (Soles)</label>
              <div className="relative">
                <Coins className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <input 
                  type="number"
                  value={costoTradicionalHa}
                  onChange={(e) => setCostoTradicionalHa(parseFloat(e.target.value))}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-500 uppercase">Gasolina (L)</label>
                <input 
                  type="number"
                  value={precioGasolina}
                  onChange={(e) => setPrecioGasolina(parseFloat(e.target.value))}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-500 uppercase">Personal (Día)</label>
                <input 
                  type="number"
                  value={costoPersonalDia}
                  onChange={(e) => setCostoPersonalDia(parseFloat(e.target.value))}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                />
              </div>
            </div>
          </div>
        </div>

        <div className="mt-8 p-4 rounded-2xl bg-indigo-500/5 border border-indigo-500/10 flex items-start gap-3">
          <Info className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
          <p className="text-[10px] text-indigo-300/70 leading-relaxed italic">
            * Los cálculos consideran consumos de combustible y tiempos de abastecimiento estándar para cada modelo de dron DJI.
          </p>
        </div>
      </div>

      {/* Panel de Resultados */}
      <div className="flex-1 p-8 overflow-y-auto custom-scrollbar">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {/* Card: Días ROI */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/5 rounded-full -mr-16 -mt-16 transition-transform group-hover:scale-110" />
            <Clock className="w-8 h-8 text-indigo-400 mb-4" />
            <div className="text-3xl font-black text-white">{results.diasRecuperacion} <span className="text-sm font-normal text-slate-500">Días</span></div>
            <div className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">Recuperación de Inversión</div>
          </div>

          {/* Card: Ahorro Ha */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 rounded-full -mr-16 -mt-16 transition-transform group-hover:scale-110" />
            <TrendingUp className="w-8 h-8 text-emerald-400 mb-4" />
            <div className="text-3xl font-black text-white">S/ {results.ahorroPorHa.toFixed(0)}</div>
            <div className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">Ahorro Neto por Hectárea</div>
          </div>

          {/* Card: Ganancia Día */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/5 rounded-full -mr-16 -mt-16 transition-transform group-hover:scale-110" />
            <Coins className="w-8 h-8 text-amber-400 mb-4" />
            <div className="text-3xl font-black text-white">S/ {results.ahorroPorDia.toLocaleString(undefined, { maximumFractionDigits: 0 })}</div>
            <div className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">Ahorro Diario Proyectado</div>
          </div>
        </div>

        {/* Gráfico Comparativo / Visualización de Eficiencia */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mt-12">
          {/* Comparativa de Costos */}
          <div className="space-y-6">
            <h4 className="text-sm font-bold text-white uppercase tracking-widest flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-indigo-400" />
              Eficiencia de Costos
            </h4>
            
            <div className="space-y-6">
              <div className="space-y-2">
                <div className="flex justify-between text-xs font-bold text-slate-500 uppercase tracking-widest">
                  <span>Método Tradicional</span>
                  <span className="text-slate-300">S/ {costoTradicionalHa} / Ha</span>
                </div>
                <div className="h-4 bg-slate-800 rounded-full overflow-hidden">
                  <div className="h-full bg-slate-600 w-full" />
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between text-xs font-bold text-indigo-400 uppercase tracking-widest">
                  <span>Con {modelo}</span>
                  <span>S/ {results.costoPorHa.toFixed(2)} / Ha</span>
                </div>
                <div className="h-4 bg-slate-800 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-indigo-500 transition-all duration-1000 ease-out" 
                    style={{ width: `${(results.costoPorHa / costoTradicionalHa) * 100}%` }}
                  />
                </div>
              </div>
            </div>
            
            <div className="p-5 rounded-2xl bg-emerald-500/10 border border-emerald-500/20">
              <p className="text-sm font-medium text-emerald-400">
                ¡Reducción de costos del <span className="text-xl font-black">{(100 - (results.costoPorHa / costoTradicionalHa) * 100).toFixed(0)}%</span>!
              </p>
            </div>
          </div>

          {/* Otros Ratios */}
          <div className="bg-slate-900/50 border border-slate-800 rounded-3xl p-8 space-y-6">
            <h4 className="text-sm font-bold text-white uppercase tracking-widest mb-4">Métricas de la Operación</h4>
            
            <div className="space-y-6">
              <div className="flex items-center justify-between group">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-slate-800 rounded-lg group-hover:bg-indigo-500/20 transition-colors">
                    <Clock className="w-4 h-4 text-slate-400 group-hover:text-indigo-400" />
                  </div>
                  <span className="text-sm font-medium text-slate-400">Tiempo de trabajo diario</span>
                </div>
                <span className="text-lg font-bold text-white">{results.horasTrabajoDia} <span className="text-xs font-normal text-slate-500">Hrs</span></span>
              </div>

              <div className="flex items-center justify-between group">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-slate-800 rounded-lg group-hover:bg-amber-500/20 transition-colors">
                    <Plane className="w-4 h-4 text-slate-400 group-hover:text-amber-400" />
                  </div>
                  <span className="text-sm font-medium text-slate-400">Ha necesarias para el ROI</span>
                </div>
                <span className="text-lg font-bold text-white">{results.haRecuperacion.toLocaleString()} <span className="text-xs font-normal text-slate-500">Ha</span></span>
              </div>

              <div className="flex items-center justify-between group">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-slate-800 rounded-lg group-hover:bg-emerald-500/20 transition-colors">
                    <Fuel className="w-4 h-4 text-slate-400 group-hover:text-emerald-400" />
                  </div>
                  <span className="text-sm font-medium text-slate-400">Combustible diario dron</span>
                </div>
                <span className="text-lg font-bold text-white">{(hectareasDia / (DRONES_BASE[modelo].tanque / DRONES_BASE[modelo].tasa) * DRONES_BASE[modelo].combustibleCarga).toFixed(1)} <span className="text-xs font-normal text-slate-500">L</span></span>
              </div>
            </div>

            <button className="w-full mt-4 flex items-center justify-center gap-2 py-3 px-4 bg-white text-slate-950 rounded-2xl font-bold text-sm hover:bg-slate-200 transition-all shadow-xl shadow-white/5">
              Generar Propuesta PDF
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
