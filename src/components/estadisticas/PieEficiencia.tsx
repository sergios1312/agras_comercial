"use client";

import {
  PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer,
} from "recharts";
type Fmt = (v: any, name: any) => [string, string];

interface Props {
  data: { name: string; value: number }[];
  titulo?: string;
}

// Semáforo: Verde=A TIEMPO, Amarillo=APLAZADO, Rojo=ATRASADO
const SLA_COLORS: Record<string, string> = {
  "A TIEMPO": "#22c55e",
  "APLAZADO": "#f59e0b",
  "ATRASADO": "#ef4444",
};

const DEFAULT_COLOR = "#6366f1";

const renderCustomLabel = (props: any) => {
  const { cx, cy, midAngle, outerRadius, percent, value } = props;
  const RADIAN = Math.PI / 180;
  const radius = outerRadius + 15;
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);
  if (value === 0) return null;

  return (
    <text 
      x={x} 
      y={y} 
      fill="#94a3b8" 
      fontSize={11} 
      textAnchor={x > cx ? 'start' : 'end'} 
      dominantBaseline="central"
    >
      {`${value} (${(percent * 100).toFixed(0)}%)`}
    </text>
  );
};

export function PieEficiencia({ data, titulo = "Eficiencia SLA" }: Props) {
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
      <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-widest mb-4">
        {titulo}
      </h3>
      <ResponsiveContainer width="100%" height={280}>
        <PieChart>
          <Pie
            data={data}
            dataKey="value"
            nameKey="name"
            cx="50%"
            cy="50%"
            innerRadius={60}
            outerRadius={95}
            paddingAngle={3}
            labelLine={{ stroke: '#475569', strokeWidth: 1 }}
            label={renderCustomLabel}
          >
            {data.map((entry, i) => (
              <Cell
                key={i}
                fill={SLA_COLORS[entry.name] ?? DEFAULT_COLOR}
              />
            ))}
          </Pie>
          <Tooltip
            contentStyle={{ background: "#1e293b", border: "1px solid #334155", borderRadius: 8 }}
            labelStyle={{ color: "#94a3b8" }}
            itemStyle={{ color: "#e2e8f0" }}
            formatter={((v: number, name: string) => {
              return [`${v} casos`, name];
            }) as Fmt}
          />
          <Legend
            wrapperStyle={{ fontSize: 12, color: "#94a3b8" }}
            iconType="circle"
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
