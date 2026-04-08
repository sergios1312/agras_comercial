import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

interface KpiCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon?: ReactNode;
  trend?: "up" | "down" | "neutral";
  className?: string;
}

export function KpiCard({ title, value, subtitle, icon, trend, className }: KpiCardProps) {
  const trendColor =
    trend === "up" ? "text-green-400" :
    trend === "down" ? "text-red-400" :
    "text-slate-400";

  return (
    <div
      className={cn(
        "bg-slate-900 border border-slate-800 rounded-2xl p-5 flex flex-col gap-3",
        className
      )}
    >
      <div className="flex items-start justify-between">
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest leading-tight">
          {title}
        </p>
        {icon && (
          <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-indigo-600/15 border border-indigo-500/20 text-indigo-400">
            {icon}
          </div>
        )}
      </div>
      <div>
        <p className={cn("text-3xl font-bold tracking-tight", trendColor === "text-slate-400" ? "text-white" : trendColor)}>
          {value}
        </p>
        {subtitle && (
          <p className="text-xs text-slate-500 mt-1">{subtitle}</p>
        )}
      </div>
    </div>
  );
}
