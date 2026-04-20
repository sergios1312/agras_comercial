"use client";

type Fmt = (v: any, name: any, info: any) => [string, string];
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  Legend, ResponsiveContainer, LabelList
} from "recharts";

interface DataRow {
  sucursal: string;
  "A TIEMPO": number;
  "APLAZADO": number;
  "ATRASADO": number;
  cantATiempo: number;
  cantAplazado: number;
  cantAtrasado: number;
  pctEtd: number; // para ordenar
}

interface Props {
  data: DataRow[];
}

export function SemaforoSucursal({ data }: Props) {
  // Ordenar desc por ETD% (mayor eficiencia primero)
  const sorted = [...data].sort((a, b) => b.pctEtd - a.pctEtd);

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
      <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-widest mb-1">
        Eficiencia por Sucursal (Ranking)
      </h3>
      <p className="text-xs text-slate-600 mb-4">Solo casos con SLA · ordenado por % A tiempo desc</p>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart
          data={sorted}
          margin={{ top: 20, right: 8, left: -20, bottom: 4 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
          <XAxis
            type="category"
            dataKey="sucursal"
            tick={{ fill: "#94a3b8", fontSize: 11 }}
            axisLine={false}
            tickLine={false}
            interval={0}
            angle={-35}
            textAnchor="end"
            height={60}
          />
          <YAxis
            type="number"
            tickFormatter={(v) => `${v}%`}
            domain={[0, 100]}
            tick={{ fill: "#64748b", fontSize: 11 }}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip
            contentStyle={{ background: "#1e293b", border: "1px solid #334155", borderRadius: 8 }}
            labelStyle={{ color: "#94a3b8" }}
            itemStyle={{ color: "#e2e8f0" }}
            formatter={((v: number, name: string, props: any) => {
              const row = props.payload as DataRow;
              let count = 0;
              if (name === "A TIEMPO") count = row.cantATiempo;
              else if (name === "APLAZADO") count = row.cantAplazado;
              else if (name === "ATRASADO") count = row.cantAtrasado;
              return [`${Number(v).toFixed(1)}% (${count} casos)`, name];
            }) as Fmt}
          />
          <Legend wrapperStyle={{ fontSize: 12, color: "#94a3b8" }} verticalAlign="top" height={36} />
          
          <Bar dataKey="A TIEMPO" stackId="a" fill="#22c55e">
            <LabelList 
              dataKey={(d: DataRow) => d["A TIEMPO"] >= 5 ? `${d["A TIEMPO"].toFixed(0)}%\n(${d.cantATiempo})` : ""}
              position="center" 
              fill="#fff" 
              fontSize={10} 
              style={{ whiteSpace: "pre" }}
            />
          </Bar>
          <Bar dataKey="APLAZADO" stackId="a" fill="#f59e0b">
            <LabelList 
              dataKey={(d: DataRow) => d["APLAZADO"] >= 5 ? `${d["APLAZADO"].toFixed(0)}%\n(${d.cantAplazado})` : ""}
              position="center" 
              fill="#fff" 
              fontSize={10} 
              style={{ whiteSpace: "pre" }}
            />
          </Bar>
          <Bar dataKey="ATRASADO" stackId="a" fill="#ef4444" radius={[4, 4, 0, 0]}>
            <LabelList 
              dataKey={(d: DataRow) => d["ATRASADO"] >= 5 ? `${d["ATRASADO"].toFixed(0)}%\n(${d.cantAtrasado})` : ""}
              position="center" 
              fill="#fff" 
              fontSize={10} 
              style={{ whiteSpace: "pre" }}
            />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
