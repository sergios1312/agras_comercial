# Especificación Dinámica de Filtros: Módulo de Dashboards

El panel de *Dashboards y Estadísticas* no aplica los filtros de la barra lateral (Sidebar) a un solo set de datos masivo. Para lograr que los gráficos funcionen lógicamente frente a diferentes ejes X/Y, el backend "pica" o intercepta los filtros de manera muy asimétrica. 

Aquí tienes el escáner del comportamiento técnico estricto de cada componente, tabla y gráfico frente a los filtros globales y los *widgets* (botones) internos:

---

## 1. Mapeo de Filtros Globales (La Sidebar)
Para entender qué ignoran los gráficos, partamos de la base de los 6 filtros globales disponibles en pantalla:
- `F1: Sucursal` (String único)
- `F2: Estado General` (ABIERTO, CERRADO, DEVUELTO)
    - *Nota técnica:* Si eligen "DEVUELTO", el sistema hace un override táctico y no busca en la columna `ESTADO GENERAL` sino en `ESTADO DE CASO == "DEVUELTO"`.
- `F3: Garantía` (CON GARANTIA, SIN GARANTIA)
- `F4: Periodo` (Multiselect de meses)
- `F5: Estado de Caso` (String de sub-estados)
- `F6: Tipo de Trabajo` (Electrónica, Mecánica, etc.)

---

## 2. Afectación Componente por Componente

### 📊 Tarjetas KPI's Superiores y "Tabla Principal"
- **Filtros Globales que aplican:** `F1`, `F3`, `F5`, `F6`.
- **Filtro `F2` (Estado):** Aplica normalmente.
- **Filtro `F4` (Periodo):** ⚠️ **Condición Especial:** Si `F2` está seteado en "ABIERTO", el filtro de Periodos se desactiva matemáticamente. (Porque los casos abiertos no tienen un mes de cierre/salida todavía).
- **Widgets internos:** Ninguno.

*(Nota: La "Tabla de Plazos" que se dibuja al lado de los KPIs no la afecta absolutamente NINGÚN filtro, es meramente un diccionario informativo).*

### 🍩 Distribución por Sucursal (Pie Chart)
- **Filtros Globales que aplican:** `F2`*, `F3`, `F4`*, `F5`, `F6`. (*Aplican condiciones del KPI).
- **Filtros intencionalmente IGNORADOS:** `F1` (Sucursal). *¿Por qué?* Porque el propósito de este gráfico es comparar las proporciones entre todas las sucursales, si se filtrara por sucursal, el Pie Chart sería un círculo 100% de un solo color e inútil.
- **Widgets internos:** Ninguno.

### 📋 Estadísticas por Sucursal (Tabla Resumen Agrupada)
- **Filtros Globales que aplican:** ÚNICA Y EXCLUSIVAMENTE el `F4` (Periodo).
- **Filtros intencionalmente IGNORADOS:** `F1`, `F2`, `F3`, `F5`, `F6`.
- *¿Por qué?* Esta tabla busca funcionar como una "Auditoría fotográfica del mes general" entre oficinas. Está programada para ignorar por defecto lo que elija el usuario en estado o tipos de trabajo y forzar el volcado completo de métricas bases.

### 🍩 Eficiencia por Sucursal (Pie Chart de Semáforo)
Mide el ratio de % A Tiempo, Aplazado, Atrasado.
- **Filtros Globales que aplican:** `F1` (Sucursal), `F4` (Periodo), `F6` (Tipo Trabajo).
- **Filtros intencionalmente IGNORADOS:** `F2` (Estado), `F3` (Garantía), `F5` (Estado de caso).
- **Filtro Interno/Forzado:** Solo lee casos CERRADOS mediante categorización de tiempos (los abiertos no tienen clasificación de demora).

### 📈 Comparativa de Eficiencias (Gráficos de Barras "Semáforo")
Tiene uso de Pestañas (Tabs) lo cual altera su lógica:

**Tab: "Evolución Temporal"** (Eje X = Periodos)
- **Filtros que aplican:** `F1` (Sucursal), `F3` (Garantía), `F6` (Tipo Trabajo). 
- **Filtros IGNORADOS:** `F4` (Periodo) (¡Porque el Eje X es el Periodo, quiere ver todos los meses sin restricción!). `F2` se ignora porque internamente fuerza a `CERRADOS`.

**Tab: "Comparativa por Sucursal"** (Eje X = Sucursales)
- **Filtros que aplican:** `F4` (Periodo), `F3` (Garantía), `F6` (Tipo Trabajo).
- **Filtros IGNORADOS:** `F1` (Sucursal) (¡Porque el Eje X es la Sucursal! Busca compararlas a todas). `F2` se ignora por forzar siempre CERRADOS.

### ⚖️ Demora Promedio (Gráfico de Barras Normal)
También está dividido por pestañas (Tabs):

**Tab: "Garantía"** (Garantía vs Sin Garantía cruzadas a nivel de Sucursales)
- **Filtros que aplican:** `F4` (Periodo), `F5` (Estado Caso), `F6` (Tipo Trabajo).
- **Filtro Forzado:** CERRADOS.
- **Filtros IGNORADOS:** `F1` (Sucursal) (Sale en el Eje X), `F3` (Garantía) (Sale en las paletas/columnas comparativas).

**Tab: "Tipo de trabajo"** (Compara Tiempo Real vs Tiempo Estándar Plazos dict)
- **Filtros que aplican:** `F4` (Periodo), `F5` (Estado Caso).
- **Filtro Forzado:** CERRADOS.
- **Filtros IGNORADOS:** `F1` (¡Evalúa a toda la empresa sin importar qué Sucursal elijas!), `F3` (Garantía), `F6` (Tipo Trabajo) (Usa todos porque ese es su Eje X).

### 🎯 Desviación del Plazo del tiempo de trabajo (Barras Horizontales con Positivo/Negativo)
- **Filtros Globales que aplican:** `F1` (Sucursal), `F3` (Garantía), `F4` (Periodo).
- **Filtro Forzado:** CERRADOS y un **Exclusión Hardcodeada:** Filtra y elimina a mano `ACTIVACION` para todos los cálculos.
- **Filtros IGNORADOS:** `F5` (Estado de Caso), `F6` (Tipo Trabajo - Porque es el Eje Y).
- **WIDGET INTERNO:** Tiene Radio Buttons:
  - Botón: "Tiempo ideal (ETD)". Dispara la fórmula matemática: `Duración - Plazo`
  - Botón: "Tiempo máximo (TAT)". Dispara la fórmula matemática: `Duración - (Plazo * 2)`.

### 📊 Histograma / Distribución de Tiempos (Escala Logarítmica X)
- **Filtros Globales que aplican:** Afectado agresivamente por **TODO** (`F1`, `F3`, `F4`, `F6`) exceptuando `F5`.
- **Filtro Forzado:** Estrictamente CERRADOS. Muestra una barra apilada cruzando Duración contra Sucursales.

### 🗺 Heatmap / Matriz de SLA (Nivel de Servicio)
Punto crítico en la UI. Depende de Tabs y Radio Buttons.

- **WIDGET INTERNO (Aplica a ambos Tabs):** Un Radio Button (`meta_sla_opcion`):
  - Botón "ETD (A tiempo)": Configura la regla de que el "100%" se alcanza obteniendo solo clasificaciones `A TIEMPO`.
  - Botón "TAT (Tiempo máximo)": Configura que el "100%" suma todos los `A TIEMPO` + `APLAZADOS`.
- **Filtro Forzado Común:** Casos CERRADOS y exclusión hardcodeada profunda de los trabajos que se llamen: `MANTENIMIENTO GENERADOR`.

**Tab: "Por Periodo"** (Mapa Cuadriculado Sucursal / Mes)
- **Filtros que aplican:** `F1`, `F3`, `F4`, `F6`. 
- *(Vulnerabilidad UX detectada en código viejo: Si el usuario usa el filtro lateral `F1` y elige "Lima", entonces toda la inmensa cuadrícula desaparece y solo muestra una sola fila inútil horizontal).*

**Tab: "Por Tipo de Trabajo"** (Mapa Cuadriculado Sucursal / Categoria de Trabajo)
- **Filtros que aplican:** `F1`, `F3`, `F4`.
- **Filtro IGNORADO:** `F6` (Tipo de Trabajo), porque todas las categorías cruzan toda la parte inferior del eje X obligatoriamente.
