# Implementar Fecha de Última Actualización

Este plan detalla cómo almacenar y mostrar la fecha y hora de la última actualización para el Maestro de Inventario, el Stock SAP y los Casos de Garantía en sus respectivos módulos.

## User Review Required

> [!IMPORTANT]
> Se utilizará la tabla existente `configuracion_sistema` para almacenar estas fechas en formato ISO. Esto permite que no se pierdan al reiniciar el servidor y sean visibles para todos los usuarios.

## Cambios Propuestos

### Base de Datos y Acciones (Backend)

#### [MODIFY] [admin-inventario-actions.ts](file:///d:/OneDrive%20-%20Quetalcompra/Escritorio/Proyectos/sistema_garantias_2.0/src/app/(dashboard)/administrador/admin-inventario-actions.ts)
- Actualizar la clave `ultima_actualizacion_maestro` al completar exitosamente `confirmarSubidaMaestro`.
- Actualizar la clave `ultima_actualizacion_stock` al completar exitosamente `confirmarSubidaSap`.

#### [MODIFY] [admin-casos-actions.ts](file:///d:/OneDrive%20-%20Quetalcompra/Escritorio/Proyectos/sistema_garantias_2.0/src/app/(dashboard)/administrador/admin-casos-actions.ts)
- Actualizar la clave `ultima_actualizacion_casos` al completar exitosamente `confirmarSubidaCasos`.

#### [MODIFY] [config-actions.ts](file:///d:/OneDrive%20-%20Quetalcompra/Escritorio/Proyectos/sistema_garantias_2.0/src/app/(dashboard)/inventario/config-actions.ts)
- Añadir una nueva función `getUltimasActualizaciones()` que devuelva un objeto con las tres fechas de actualización.

---

### UI y Visualización (Frontend)

#### [MODIFY] [CatalogoTab.tsx](file:///d:/OneDrive%20-%20Quetalcompra/Escritorio/Proyectos/sistema_garantias_2.0/src/components/inventario/CatalogoTab.tsx)
- Reemplazar la fecha estática de `config.json` por una prop dinámica `fechaActualizacion`.

#### [MODIFY] [EstadisticasDashboard.tsx](file:///d:/OneDrive%20-%20Quetalcompra/Escritorio/Proyectos/sistema_garantias_2.0/src/components/estadisticas/EstadisticasDashboard.tsx)
- Añadir un indicador de "Datos actualizados el [fecha]" cerca del título o filtros.

#### [MODIFY] Paneles de Administrador
- **[CargaMaestroPanel.tsx](file:///d:/OneDrive%20-%20Quetalcompra/Escritorio/Proyectos/sistema_garantias_2.0/src/components/inventario/CargaMaestroPanel.tsx)**: Mostrar fecha de último maestro.
- **[CargaSapPanel.tsx](file:///d:/OneDrive%20-%20Quetalcompra/Escritorio/Proyectos/sistema_garantias_2.0/src/components/inventario/CargaSapPanel.tsx)**: Mostrar fecha de último stock.
- **[CargaCasosPanel.tsx](file:///d:/OneDrive%20-%20Quetalcompra/Escritorio/Proyectos/sistema_garantias_2.0/src/components/inventario/CargaCasosPanel.tsx)**: Mostrar fecha de últimos casos.

---

## Plan de Verificación

### Pruebas Manuales
1. Subir un archivo de Maestro de Inventario y verificar que la fecha se actualice en el panel de carga.
2. Subir un archivo de Stock SAP y verificar que la fecha cambie en el panel de administrador y en la pestaña del Catálogo.
3. Subir Casos de Garantía y verificar que la fecha se refleje en el Dashboard de Estadísticas.
4. Refrescar la página para asegurar que las fechas persisten (se leen de la DB).
