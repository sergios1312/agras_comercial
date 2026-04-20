"use client";

import {
  ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  Legend, ResponsiveContainer, LabelList, Cell
} from "recharts";

type Fmt = (v: any, name: any, info: any) => [string, string];

export interface EvolucionEquipoRow {
  periodo: string;
  Dron: number;
  Generador: number;
  Bateria: number;
  Otros: number;
  eficienciaSLA: number; // Porcentaje de "A Tiempo"
  totalCasos: number;
}

interface Props {
  data: EvolucionEquipoRow[];
}

export function EvolucionEquipos({ data }: Props) {

  const formatterTooltip: Fmt = (v: number, name: string, props: any) => {
    if (name === "Eficiencia SLA") {
      return [`${Number(v).toFixed(1)}%`, name];
    }
    const n = Number(v);
    return [`${n} casos`, name];
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 mb-6">
      {/* Header */}
      <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-widest mb-1">
        Evolución de Eficiencia y Volumen por Equipo
      </h3>
      <p className="text-xs text-slate-600 mb-4">
        Solo casos cerrados (con SLA) · Comparativa histórica de volumen vs eficiencia (A Tiempo)
      </p>

      <ResponsiveContainer width="100%" height={400}>
        <ComposedChart data={data} barCategoryGap="25%" margin={{ top: 20, right: 16, left: 0, bottom: 4 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
          <XAxis dataKey="periodo" tick={{ fill: "#64748b", fontSize: 11 }} />
          
          {/* Eje Y Izquierdo para Volumen (Barras Apiladas) */}
          <YAxis
            yAxisId="left"
            tickFormatter={(v) => `${v}`}
            tick={{ fill: "#64748b", fontSize: 11 }}
            axisLine={false}
            tickLine={false}
          />
          
          {/* Eje Y Derecho para Eficiencia (Línea, 0% a 100%) */}
          <YAxis
            yAxisId="right"
            orientation="right"
            domain={[0, 100]}
            tickFormatter={(v) => `${v}%`}
            tick={{ fill: "#64748b", fontSize: 11 }}
            axisLine={false}
            tickLine={false}
          />

          <Tooltip
            contentStyle={{ background: "#1e293b", border: "1px solid #334155", borderRadius: 8 }}
            labelStyle={{ color: "#94a3b8" }}
            itemStyle={{ color: "#e2e8f0" }}
            formatter={formatterTooltip}
          />
          <Legend wrapperStyle={{ fontSize: 12, color: "#94a3b8" }} verticalAlign="top" height={36} />
          
          <Bar yAxisId="left" dataKey="Dron" stackId="a" fill="#3b82f6">
             <LabelList dataKey={(d: EvolucionEquipoRow) => d.Dron >= 3 ? d.Dron : ""} position="center" fill="#fff" fontSize={10} />
          </Bar>
          <Bar yAxisId="left" dataKey="Generador" stackId="a" fill="#10b981">
             <LabelList dataKey={(d: EvolucionEquipoRow) => d.Generador >= 3 ? d.Generador : ""} position="center" fill="#fff" fontSize={10} />
          </Bar>
          <Bar yAxisId="left" dataKey="Bateria" stackId="a" fill="#f59e0b">
             <LabelList dataKey={(d: EvolucionEquipoRow) => d.Bateria >= 3 ? d.Bateria : ""} position="center" fill="#fff" fontSize={10} />
          </Bar>
          <Bar yAxisId="left" dataKey="Otros" stackId="a" fill="#8b5cf6" radius={[4, 4, 0, 0]}>
             <LabelList dataKey={(d: EvolucionEquipoRow) => d.Otros >= 3 ? d.Otros : ""} position="center" fill="#fff" fontSize={10} />
          </Bar>

          <Line 
            yAxisId="right"
            type="monotone" 
            dataKey="eficienciaSLA" 
            name="Eficiencia SLA" 
            stroke="#ef4444" 
            strokeWidth={3} 
            dot={{ r: 4, fill: "#ef4444", strokeWidth: 2, stroke: "#1e293b" }} 
            activeDot={{ r: 6 }} 
          >
            <LabelList 
              dataKey="eficienciaSLA" 
              position="left" 
              offset={10} 
              fill="#fca5a5" 
              fontSize={11} 
              fontWeight={600}
              formatter={(v: any) => `${v}%`}
            />
          </Line>
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
