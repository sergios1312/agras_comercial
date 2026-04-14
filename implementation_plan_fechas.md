# Plan: Sistema de Fechas por Estado en Historial de Pedidos

## Descripción

Añadir trazabilidad temporal completa a cada pedido: fecha de pedido (ya existe), fecha de aprobación, fecha de envío y fecha de recepción. Solo la columna `fecha_pedido` será visible directamente en la tabla; las demás se consultarán desde un popover de historial. Solo administradores podrán editar cualquiera de las fechas.

---

## Fase 1 — Base de datos (Supabase) ← **REQUIERE APROBACIÓN PRIMERO**

### SQL a ejecutar en Supabase SQL Editor

```sql
-- 1. Agregar las 3 nuevas columnas NULLABLE (sin valor default, se rellenan en la app)
ALTER TABLE historial_pedidos
  ADD COLUMN IF NOT EXISTS fecha_aprobacion  TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS fecha_envio       TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS fecha_recepcion   TIMESTAMPTZ;
```

> [!IMPORTANT]
> El SQL es conservador: columnas NULLABLE, sin triggers automáticos.
> Las fechas las pondrá la aplicación cuando ocurra el cambio de estado.
> Así hay control total desde el código sin depender de lógica de BD.

---

## Fase 2 — Tipos TypeScript

#### [MODIFY] database.types.ts
Añadir las 3 fechas opcionales a `HistorialPedido`:
```ts
fecha_aprobacion?: string | null;
fecha_envio?:      string | null;
fecha_recepcion?:  string | null;
```

---

## Fase 3 — Server Actions

#### [MODIFY] historial-actions.ts
- `actualizarEstadoPedido` (admin): Al cambiar el estado, también guarda la fecha correspondiente automáticamente:
  - `"Aprobado"` → graba `fecha_aprobacion = NOW()`
  - `"Enviado"` → graba `fecha_envio = NOW()`
  - `"Recibido"` / `"Finalizado"` → graba `fecha_recepcion = NOW()`
- `actualizarEstadoPedidoTecnico` (técnico): Igual, graba `fecha_envio` o `fecha_recepcion`.
- Nueva action `editarFechasPedido(id, fechas)`: Solo admin puede editar manualmente las 4 fechas.

---

## Fase 4 — Componente UI: Popover de Historial de Fechas

### Nuevo componente `FechasPopover`

- Aparece en TODAS las tablas (admin y técnico) como un pequeño ícono `📅` al lado de `fecha_pedido`.
- Al hacer click muestra un tooltip/popover con:

| Campo | Valor |
|---|---|
| 📅 Pedido | 14/04/2026 09:30 |
| ✅ Aprobación | 14/04/2026 10:15 |
| 📤 Envío | 15/04/2026 08:00 |
| 📥 Recepción | 16/04/2026 11:30 |

- Si una fecha aún no existe, muestra `—`.
- **Solo admin** ve un botón "Editar fechas" dentro del popover.

### Modal de edición de fechas (solo admin)
- Formulario con 4 inputs `datetime-local` (uno por fecha).
- Bouton "Guardar" llama a `editarFechasPedido`.

---

## Fase 5 — Integración en tablas existentes

Afecta las siguientes tablas/componentes:
- `TablaPedidos` (vista admin — Aprobaciones, Abastecimiento, Reposición, Envío Interno)
- `TablaMisPedidos` (vista técnico — Pedidos en curso)
- `TablaMisPedidosHistorial` (vista técnico — Historial)
- `TablaADespachar` (vista técnico)
- `TablaDespachadosHistorial` (vista técnico)

En todas: reemplazar la celda de `fecha_pedido` por `<FechaConHistorial>` que incluye el ícono.

---

## Verificación

- `npx tsc --noEmit` sin errores
- Dev server compila limpio
- Admin puede abrir popover y editar fechas
- Técnico ve el popover (read-only) sin botón de edición
- Al aprobar/enviar/recibir un pedido, la fecha correspondiente se guarda automáticamente en BD
