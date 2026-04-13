# Especificación Técnica: Motor de Sincronización de Stock y Datos Maestros

Este documento describe el flujo de datos y la lógica de procesamiento para actualizar el inventario y la información de repuestos en el sistema. El proceso se divide en una fase de transformación local (ETL) y una fase de carga transaccional hacia la base de datos Supabase.

---

## 1. Fuentes de Datos

El sistema utiliza dos archivos Excel principales como entrada:

1.  **`sap_crudo.xlsx`**: Contiene la data bruta exportada directamente de SAP. Es la fuente de verdad para las cantidades en stock por almacén.
2.  **`inventario_unificado.xlsx`**: Actúa como el "Maestro de Artículos". Contiene información enriquecida que SAP no maneja o que se gestiona manualmente, como:
    *   Precios de venta (`Precio_venta`).
    *   Modelos de drones compatibles.
    *   Links de imágenes.
    *   Nombres traducidos al español.

---

## 2. Lógica de Identificación (Mapeo de Sucursales)

Para identificar a qué ciudad pertenece cada stock en SAP, se utiliza un diccionario de mapeo que traduce los códigos de almacén de SAP a nombres legibles por el sistema:

| Código SAP | Sucursal / Ciudad |
| :--- | :--- |
| `APRI.016` | Lima |
| `DJCST.01` | Chiclayo |
| `DICST.01` | Ica |
| `DJABT.01` | Bellavista |
| `DJCM.001` | Nueva Cajamarca |
| `DJAPU.01` | Pucallpa |
| `DJJST.01` | Jaen |
| `DHUST.01` | Huanuco |
| `DYUST-01` | Yurimaguas |
| `DSTPI.01` | Piura |

---

## 3. Fase ETL Local (Procesamiento en `sync_stock.py`)

El script realiza los siguientes pasos lógicos sobre los archivos antes de subir datos:

### A. Limpieza de SAP
*   **Detección de Columnas**: El script busca dinámicamente las columnas de `Cod.SAP`, `Descripción`, `Stock` y `Almacén`.
*   **Suma de Duplicados**: Si un mismo código de repuesto aparece varias veces en el mismo almacén (error de reporte), el script suma las cantidades automáticamente.
*   **Filtrado**: Se descartan todos los almacenes de SAP que no estén en el diccionario de mapeo mencionado arriba.

### B. Pivoteo de Inventario
La data de SAP (que viene en filas verticales por almacén) se transforma en una **matriz horizontal**:
*   **Filas**: Código único del repuesto (`codigo`).
*   **Columnas**: Una columna por cada ciudad configurada (`Lima`, `Chiclayo`, etc.).
*   **Valores**: Cantidad total en stock.

### C. Mezcla con el Maestro (Combine First)
El inventario pivoteado se mezcla con `inventario_unificado.xlsx`.
*   **Regla de Oro**: Los datos de stock vienen de **SAP**. Los datos de precios y modelos vienen del **Unificado**.
*   Si un código existe en SAP pero no en el Maestro, se añade como registro nuevo.
*   Si un código existe en el Maestro pero no en el SAP actual, su stock se resetea a `0`.

---

## 4. Fase de Carga a Base de Datos (Supabase)

Una vez consolidado el Excel local, se ejecutan dos procesos de carga masiva (`upsert`):

### A. Actualización de Repuestos (`repuestos`)
Se envían en bloques de 500 registros.
*   **Campos**: `codigo`, `nombre`, `codigo_sap`, `precio_venta`, `modelos_compatibles`.
*   **Traducción Automática**: Si se detectan repuestos nuevos, el sistema intenta traducir el nombre del inglés al español automáticamente antes de subirlo.
*   **Clave de Conflicto**: Se usa el `codigo` como identificador único para decidir si sobrescribir o crear uno nuevo.

### B. Sincronización de Cantidades (`inventario`)
Este proceso cruza los IDs internos de la base de datos.
1.  Se descargan todos los IDs de repuestos y sucursales de Supabase.
2.  Se crea un registro por cada combinación `[Repuesto_ID + Sucursal_ID]`.
3.  Se suben las cantidades finales.
4.  **Clave de Conflicto**: `repuesto_id, sucursal_id`. Esto asegura que el stock se actualice sin duplicar registros.

---

## 5. Actualización de Precios y Modelos (`update_precios.py`)

Existe un script secundario/específico para actualizaciones rápidas de precios:
*   Lee `inventario_unificado.xlsx`.
*   Busca específicamente las columnas `Precio_venta` o `precio_venta`.
*   Descarga la fila actual de la base de datos para no "limpiar" otros campos (como imágenes o notas) y solo sobreescribe el campo de `precio_venta` mediante un `upsert`.

---

## 6. Automatización de UI y Versionamiento

Como paso final de la sincronización:
1.  **Actualización de `app.py`**: El script edita directamente el archivo `app.py` para cambiar la fecha visualmente en la web: `st.markdown(f"**Stock actualizado el DD/MM/YYYY**")`.
2.  **Commit de Git**: Se realiza un `git add`, `git commit` y `git push` automático para que los cambios en los archivos Excel queden registrados en el repositorio y la web se despliegue con la data nueva si está en CI/CD.
