"use client";

import { useState, useEffect, useRef } from "react";
import { User, CreditCard, Phone, Mail, Search, Save, AlertTriangle, CheckCircle2, X } from "lucide-react";
import { useClientesLocal, type ClienteLocal } from "@/hooks/useClientesLocal";

export interface ClienteSeleccionado {
  nombre: string;
  dni: string;
  telefono: string;
  email: string;
}

interface FormularioClienteProps {
  // Valores iniciales (útil para edición de casos existentes)
  initialValue?: Partial<ClienteSeleccionado>;
  // Callback invocado cada vez que se guardan o cambian los datos válidos
  onChange: (cliente: ClienteSeleccionado) => void;
  // Opcional: para desactivar el formulario (ej. permisos de solo lectura)
  disabled?: boolean;
}

function InputField({
  label,
  icon: Icon,
  type = "text",
  value,
  onChange,
  placeholder,
  required,
  disabled,
}: {
  label: string;
  icon: React.ElementType;
  type?: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
}) {
  return (
    <div className="space-y-1 relative">
      <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
        <Icon className="w-3.5 h-3.5" />
        {label}
        {required && <span className="text-red-400">*</span>}
      </label>
      <input
        type={type}
        value={value}
        onChange={onChange}
        disabled={disabled}
        placeholder={placeholder}
        className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-slate-100 focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-colors placeholder:text-slate-600 disabled:opacity-50"
      />
    </div>
  );
}

export function FormularioCliente({ initialValue, onChange, disabled }: FormularioClienteProps) {
  const { clientes, isHydrated, guardarCliente, buscarPorDni } = useClientesLocal();

  const [clienteEditandoId, setClienteEditandoId] = useState<string | null>(null);

  const [nombre, setNombre] = useState(initialValue?.nombre || "");
  const [dni, setDni] = useState(initialValue?.dni || "");
  const [telefono, setTelefono] = useState(initialValue?.telefono || "");
  const [email, setEmail] = useState(initialValue?.email || "");

  const [searchTerm, setSearchTerm] = useState("");
  const [showDropdown, setShowDropdown] = useState(false);
  
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  const dropdownRef = useRef<HTMLDivElement>(null);

  // Cerrar el dropdown al hacer click afuera
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Emitir al padre cuando haya cambios
  // Nota: Esto emite los datos actuales, pero no garantiza que estén guardados.
  // El guardado se hace con el botón "Guardar Cliente".
  useEffect(() => {
    onChange({ nombre, dni, telefono, email });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nombre, dni, telefono, email]);

  // Autocompletado por DNI exacto
  useEffect(() => {
    if (isHydrated && dni.length >= 8) {
      const match = buscarPorDni(dni);
      if (match && match.id !== clienteEditandoId) {
        setNombre(match.nombre);
        setTelefono(match.telefono);
        setEmail(match.correo);
        setClienteEditandoId(match.id);
        setErrorMsg("");
        setSuccessMsg(`Cliente "${match.nombre}" autocompletado.`);
        setTimeout(() => setSuccessMsg(""), 3000);
      }
    }
  }, [dni, isHydrated, buscarPorDni, clienteEditandoId]);

  const resultadosBusqueda = clientes.filter(
    (c) =>
      c.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.dni.includes(searchTerm)
  );

  const handleSeleccionarCliente = (c: ClienteLocal) => {
    setClienteEditandoId(c.id);
    setNombre(c.nombre);
    setDni(c.dni);
    setTelefono(c.telefono);
    setEmail(c.correo);
    setSearchTerm("");
    setShowDropdown(false);
    setErrorMsg("");
    setSuccessMsg("");
  };

  const handleLimpiar = () => {
    setClienteEditandoId(null);
    setNombre("");
    setDni("");
    setTelefono("");
    setEmail("");
    setErrorMsg("");
    setSuccessMsg("");
  };

  const handleGuardar = async () => {
    setErrorMsg("");
    setSuccessMsg("");

    if (!nombre.trim() || !dni.trim()) {
      setErrorMsg("El nombre y el DNI son campos obligatorios.");
      return;
    }

    const res = await guardarCliente(
      {
        nombre: nombre.trim(),
        dni: dni.trim(),
        telefono: telefono.trim(),
        correo: email.trim(),
      },
      clienteEditandoId || undefined
    );

    if (res.success && res.cliente) {
      setClienteEditandoId(res.cliente.id);
      setSuccessMsg("Datos del cliente guardados correctamente.");
      setTimeout(() => setSuccessMsg(""), 4000);
    } else if (res.error) {
      setErrorMsg(res.error);
    }
  };

  if (!isHydrated) {
    return <div className="animate-pulse h-40 bg-slate-800/50 rounded-xl" />;
  }

  return (
    <div className="bg-slate-900/50 border border-slate-700/60 rounded-xl p-5 space-y-4 relative">
      <div className="flex items-center justify-between mb-2 flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <User className="w-4 h-4 text-indigo-400" />
          <h3 className="text-sm font-bold text-slate-200 uppercase tracking-wider">
            Agregar / Editar Cliente
          </h3>
        </div>
        
        {/* Buscador de clientes */}
        <div className="relative" ref={dropdownRef}>
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
            <input
              type="text"
              placeholder="Buscar cliente guardado..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setShowDropdown(true);
              }}
              onFocus={() => setShowDropdown(true)}
              disabled={disabled}
              className="w-56 pl-8 pr-3 py-1.5 bg-slate-950 border border-slate-700 rounded-lg text-xs text-slate-200 focus:outline-none focus:border-indigo-500 disabled:opacity-50"
            />
          </div>

          {showDropdown && searchTerm && (
            <div className="absolute right-0 mt-1 w-64 bg-slate-800 border border-slate-700 rounded-lg shadow-xl overflow-hidden z-10 max-h-48 overflow-y-auto">
              {resultadosBusqueda.length > 0 ? (
                resultadosBusqueda.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => handleSeleccionarCliente(c)}
                    className="w-full text-left px-3 py-2 hover:bg-slate-700/50 transition-colors border-b border-slate-700/50 last:border-0"
                  >
                    <p className="text-sm text-slate-200 font-medium truncate">{c.nombre}</p>
                    <p className="text-[10px] text-slate-400">DNI: {c.dni}</p>
                  </button>
                ))
              ) : (
                <div className="px-3 py-3 text-center text-xs text-slate-500">
                  No se encontraron clientes.
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <InputField
          label="Nombre o Razón Social"
          icon={User}
          value={nombre}
          onChange={(e) => {
            setNombre(e.target.value);
            if (clienteEditandoId && errorMsg) setErrorMsg("");
          }}
          placeholder="Ej. Juan Pérez"
          required
          disabled={disabled}
        />
        <InputField
          label="DNI o RUC"
          icon={CreditCard}
          value={dni}
          onChange={(e) => {
            setDni(e.target.value);
            if (clienteEditandoId) {
              // Si se cambia el DNI, desvinculamos del ID de edición para forzar validación de unicidad
              setClienteEditandoId(null);
            }
          }}
          placeholder="Ej. 12345678"
          required
          disabled={disabled}
        />
        <InputField
          label="Teléfono"
          icon={Phone}
          type="tel"
          value={telefono}
          onChange={(e) => setTelefono(e.target.value)}
          placeholder="Ej. 987654321"
          disabled={disabled}
        />
        <InputField
          label="Correo Electrónico"
          icon={Mail}
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Ej. cliente@email.com"
          disabled={disabled}
        />
      </div>

      {/* Mensajes de feedback */}
      {errorMsg && (
        <div className="flex items-start gap-2 p-3 bg-red-950/40 border border-red-900/50 rounded-lg">
          <AlertTriangle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
          <p className="text-xs text-red-300">{errorMsg}</p>
        </div>
      )}
      {successMsg && (
        <div className="flex items-center gap-2 p-3 bg-emerald-950/40 border border-emerald-900/50 rounded-lg">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <p className="text-xs text-emerald-300 font-medium">{successMsg}</p>
        </div>
      )}

      {/* Botones de acción del formulario */}
      {!disabled && (
        <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
          {(nombre || dni || telefono || email) && (
            <button
              onClick={handleLimpiar}
              type="button"
              className="px-3 py-1.5 text-xs font-medium text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg transition-colors flex items-center gap-1.5"
            >
              <X className="w-3.5 h-3.5" />
              Limpiar
            </button>
          )}
          <button
            onClick={handleGuardar}
            type="button"
            className="flex items-center gap-1.5 px-4 py-1.5 bg-indigo-600/20 text-indigo-400 hover:bg-indigo-600 hover:text-white border border-indigo-500/30 text-xs font-semibold rounded-lg transition-all"
          >
            <Save className="w-3.5 h-3.5" />
            Guardar Cliente en Local
          </button>
        </div>
      )}
    </div>
  );
}
