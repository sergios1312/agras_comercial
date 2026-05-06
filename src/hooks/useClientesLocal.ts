"use client";

import { useState, useEffect, useCallback } from "react";

export interface ClienteLocal {
  id: string; // Generado con UUID o Date.now()
  nombre: string;
  dni: string;
  telefono: string;
  correo: string;
  fechaCreacion: string;
}

const STORAGE_KEY = "sg_clientes_local";

export function useClientesLocal() {
  const [clientes, setClientes] = useState<ClienteLocal[]>([]);
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        setClientes(JSON.parse(stored));
      }
    } catch (e) {
      console.error("Error al leer clientes de localStorage", e);
    } finally {
      setIsHydrated(true);
    }
  }, []);

  const buscarPorDni = useCallback(
    (dni: string) => {
      return clientes.find((c) => c.dni === dni) || null;
    },
    [clientes]
  );

  const buscarPorNombre = useCallback(
    (nombre: string) => {
      const lower = nombre.toLowerCase();
      return clientes.filter((c) => c.nombre.toLowerCase().includes(lower));
    },
    [clientes]
  );

  const guardarCliente = useCallback(
    (
      payload: Omit<ClienteLocal, "id" | "fechaCreacion">,
      clienteEditandoId?: string
    ) => {
      return new Promise<{ success: boolean; error?: string; cliente?: ClienteLocal }>(
        (resolve) => {
          if (!payload.dni.trim() || !payload.nombre.trim()) {
            return resolve({
              success: false,
              error: "El nombre y el DNI son obligatorios.",
            });
          }

          // Validación de unicidad de DNI
          const clienteExistentePorDni = clientes.find(
            (c) => c.dni === payload.dni
          );

          if (clienteEditandoId) {
            // Modo edición
            if (clienteExistentePorDni && clienteExistentePorDni.id !== clienteEditandoId) {
              return resolve({
                success: false,
                error: `El DNI ${payload.dni} ya está registrado bajo el nombre de "${clienteExistentePorDni.nombre}".`,
              });
            }

            const actualizados = clientes.map((c) =>
              c.id === clienteEditandoId ? { ...c, ...payload } : c
            );
            setClientes(actualizados);
            try {
              localStorage.setItem(STORAGE_KEY, JSON.stringify(actualizados));
            } catch (e) {
              console.error(e);
            }
            return resolve({
              success: true,
              cliente: { ...clientes.find((c) => c.id === clienteEditandoId)!, ...payload },
            });
          } else {
            // Modo creación
            if (clienteExistentePorDni) {
              // Si el usuario intentó crear uno nuevo pero el DNI existe, podemos:
              // 1. Mostrar error.
              // 2. O, si los datos son idénticos, no hacer nada.
              // Vamos a requerir que explicitly se edite si ya existe.
              return resolve({
                success: false,
                error: `El DNI ${payload.dni} ya está registrado a nombre de "${clienteExistentePorDni.nombre}". Seleccionelo de la lista para editarlo.`,
              });
            }

            const nuevoCliente: ClienteLocal = {
              id: `cli_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
              ...payload,
              fechaCreacion: new Date().toISOString(),
            };

            const actualizados = [...clientes, nuevoCliente];
            setClientes(actualizados);
            try {
              localStorage.setItem(STORAGE_KEY, JSON.stringify(actualizados));
            } catch (e) {
              console.error(e);
            }
            return resolve({ success: true, cliente: nuevoCliente });
          }
        }
      );
    },
    [clientes]
  );

  return {
    clientes,
    isHydrated,
    buscarPorDni,
    buscarPorNombre,
    guardarCliente,
  };
}
