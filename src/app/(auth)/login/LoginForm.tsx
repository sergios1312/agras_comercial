"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { signIn, type AuthState } from "./actions";
import { Loader2, ShieldCheck } from "lucide-react";

const initialState: AuthState = { error: null };

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="w-full flex items-center justify-center gap-2 py-3 px-4
                 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold
                 rounded-xl transition-all duration-200 shadow-lg shadow-indigo-500/30
                 disabled:opacity-60 disabled:cursor-not-allowed focus:outline-none
                 focus:ring-2 focus:ring-indigo-400 focus:ring-offset-2 focus:ring-offset-slate-900"
    >
      {pending ? (
        <>
          <Loader2 className="w-4 h-4 animate-spin" />
          Verificando...
        </>
      ) : (
        "Ingresar al sistema"
      )}
    </button>
  );
}

import { SUCURSALES_DATA } from "@/lib/constants";

export function LoginForm() {
  const [state, action] = useActionState(signIn, null);

  return (
    <form action={action} className="space-y-5">
      <div className="space-y-2">
        <label htmlFor="usuario" className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
          Seleccionar Usuario / Sucursal
        </label>
        <select
          id="usuario"
          name="usuario"
          required
          defaultValue=""
          className="w-full bg-slate-900/50 border border-slate-800 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all appearance-none cursor-pointer"
        >
          <option value="" disabled>— Selecciona una sede —</option>
          {SUCURSALES_DATA.map((u) => (
            <option key={u.usuario} value={u.usuario}>
              {u.ciudad} ({u.responsable})
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-2">
        <label htmlFor="pin" className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
          PIN de Acceso
        </label>
        <input
          id="pin"
          name="pin"
          type="password"
          placeholder="••••"
          required
          autoComplete="current-password"
          className="w-full bg-slate-900/50 border border-slate-800 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all placeholder:text-slate-600"
        />
      </div>

      {/* Error del Server Action */}
      {state?.error && (
        <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs text-center animate-in fade-in slide-in-from-top-1 duration-300">
          {state.error}
        </div>
      )}

      <SubmitButton />
    </form>
  );
}
