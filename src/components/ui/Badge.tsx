import { cn } from "@/lib/utils";

type BadgeVariant = "pendiente" | "aprobado" | "enviado" | "recibido" | "sin-stock" | "default";

interface BadgeProps {
  label: string;
  variant?: BadgeVariant;
  className?: string;
}

const VARIANT_STYLES: Record<BadgeVariant, string> = {
  pendiente: "bg-amber-500/15 text-amber-400 border-amber-500/30",
  aprobado: "bg-green-500/15 text-green-400 border-green-500/30",
  enviado: "bg-blue-500/15 text-blue-400 border-blue-500/30",
  recibido: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
  "sin-stock": "bg-orange-500/15 text-orange-400 border-orange-500/30",
  default: "bg-slate-700/50 text-slate-400 border-slate-600/50",
};

export function Badge({ label, variant = "default", className }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border",
        VARIANT_STYLES[variant],
        className
      )}
    >
      {label}
    </span>
  );
}

/** Convierte un EstadoPedido string a la variante correcta del Badge */
export function estadoToVariant(estado: string): BadgeVariant {
  const m: Record<string, BadgeVariant> = {
    Pendiente: "pendiente",
    Aprobado: "aprobado",
    Enviado: "enviado",
    Recibido: "recibido",
    "Pendiente de abastecimiento": "sin-stock",
  };
  return m[estado] ?? "default";
}
