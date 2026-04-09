# Especificación Técnica: Módulo de Dashboards y Estadísticas

Este documento detalla el funcionamiento, las reglas de negocio y los procesamientos en el backend gráfico que conforman el Módulo de Estadísticas Original implementado en Streamlit (abarcando `config.py`, `data_processing.py`, `filters.py`, `charts.py` y `dashboards_modulo.py`). Servirá como guía base para reconstruir las vistas y gráficos en Next.js.

---

## 1. Reglas de Negocio y Configuración Global

El módulo se rige por un diccionario central de "Plazos Ideales" (`plazos_dict`) medidos en **días hábiles**:

*   **REPARACION ELECTRONICA:** 5 días
*   **REPARACION DE GENERADOR:** 10 días
*   **REPARACION COMPLEJA GENERADOR:** 10 días
*   **REPARACION MECANICA:** 5 días
*   **SCRAP BATERIA:** 5 días
*   **REPARACION DE CONTROL REMOTO:** 5 días
*   **REPARACION COMPLEJA RC:** 10 días
*   **CASO CRASH:** 10 días
*   **REPARACION DE CARGADOR:** 5 días
*   **ACTIVACION:** 1 día

**Restricciones de Datos (Limpieza)**
Existen exclusiones absolutas antes de renderizar cualquier gráfico:
*   **Sucursales excluidas / Baneadas:** `Arequipa`, `Sullana`.
*   **Trabajos excluidos / Baneados:** `MANTENIMIENTO DE DRON`, `MANTENIMIENTO DE GENERADOR`.

---

## 2. Preprocesamiento de Datos (Data Pipeline)

Antes de cualquier gráfico, el archivo crudo (`casos.csv`) sufre la siguiente mutación obligatoria:

1.  **Limpieza de Nulos:** Los casos sin "ESTADO DE CASO" (sub-estados) pasan a `"SIN ESTADO"`.
2.  **Fechas Nulas:** Si un caso carece de `Fecha de ingreso`, su estado pasa automáticamente a `"NO INGRESADO"`.
3.  **Periodo Mensual:** Se extrae un string *YYYY-MM* a partir del campo `Fecha de salida` (ej. "2026-03").
4.  **Cálculo RTAT (Duración en Días):** 
    *   Mide días laborales considerando semana laboral de Lunes a Sábado (`weekmask='1111110'`). Los domingos no cuentan.
    *   Si el caso no ha salido (no tiene `Fecha de salida`), la fecha final para el cálculo asume **el día de hoy**.
5.  **Clasificación de Tiempos (SLA Tracker):** Aplica **SÓLO a casos CERRADOS** con fechas válidas. Se evalúa `RTAT` contra la tabla de plazos:
    *   **A TIEMPO (ETD):** `Tiempo invertido <= Plazo_Ideal`
    *   **APLAZADO (TAT máximo):** `Tiempo invertido <= (Plazo_Ideal * 2)`
    *   **ATRASADO:** `Tiempo invertido > (Plazo_Ideal * 2)`

---

## 3. Motor de Filtros

Los cruces de la SideBar no se aplican universalmente al dataset completo, sino que se preparan varios Dataframes independientes para asegurar que cada gráfico se vea afectado de manera inteligente. 

Parametrizaciones Clave:
*   **Excepción en Filtro de "Periodos":** Cuando se selecciona como estado global `"ABIERTO"`, el filtro de "Periodo Mensual" **se ignora/desactiva** internamente para los KPIs y Tabla Principal (los casos abiertos aún no tienen mes de salida, por lo que ocultarlos sería un error).
*   ***Slicing* por Visualización:**
    *   **Dashboard de Barras / Semáforos:** Exigen obligatoriamente que el estado sea solo `"CERRADO"`.
    *   **Pie de Sucursales:** Ignora el filtro individual de "Sucursal" (para comparar la sucursal contra las demás).

---

## 4. Arquitectura de Gráficos (Para Replicación Front-End)

Si vas a migrar estas piezas (por ejemplo, con *Recharts*, *Tremor* o *Chart.js*), asegúrate de reflejar la semántica de cada gráfico. En el sistema original, se definen en el archivo `charts.py` y se apilan con Plotly.

### 4.1 KPIs y Tabla Principal
*   **Métricas Header:** Total de Casos, Total Abiertos, Total Cerrados, % Abiertos (`Abiertos / Total * 100`).
*   **Tabla Principal:** Expone un resumen. Destaca visualmente el cambio del nombre de header *"Duracion (Dias)"* a *"RTAT (Duración)"* y el parseo a strings `DD/MM/YYYY`.

### 4.2 Tablas Dimensionales y Agrupaciones (Resumen de Sucursal)
Un DataFrame que agrupa por sucursal realizando el conteo respectivo de "A Tiempo" vs "Atrasados" basado en el cálculo de Clasificación generado en el Pipeline inicial.

### 4.3 Donas (Pie Charts - `crear_pie...`)
1.  **Distribución por Sucursal:** Un chart simple con agujero medio (Hole: 0.5) del total de casos.
2.  **Eficiencia de la Sucursal:** Dona mostrando la repartición entre ETD, TAT y Atrasados de manera porcentual. Coloreado vía diccionario de semáforo (Verde / Amarillo / Rojo).

### 4.4 Semáforos ("Evolución" y "Por Sucursal" - Barras 100% Apiladas)
A diferencia de gráficos convencionales, estos miden porcentajes sobre Casos Finalizados.
*   **Evolución:** Eje X son los periodos (mes-año). Eje Y la acumulación porcentual para la base total en ese mes que cerró "A Tiempo" y cerró "Aplazado".
*   **Comparativa por Sucursales (Ranking):** Barras apiladas horizontal o verticalmente ordenadas en orden descendente asegurando que la Sucursal más eficiente (`ETD%` más grande) salga primera.

### 4.5 Desviación Estadística vs Plazos (Barras Horizontales con eje 0)
*   **Gráfico de Resta Vectorial (`crear_barras_desviacion`)**
*   **No incluye:** El Trabajo "ACTIVACION" se omite permanentemente del gráfico por su plazo irreal de 1 día que ensucia el volumen de barras.
*   **Lógica:** Muestra mediante barras negativas o positivas la fórmula `Duración_Real - Plazo_Ideal (ó Plazo Máximo)`. 
*   Una barra orientada hacia lo "**negativo/izquierdo**" implica ahorro en días y eficiencia para esa categoría de reparación. Una a la derecha infiere pérdida de tiempo respecto al SLA.

### 4.6 Histograma Volumen/Frecuencia (Base Logarítmica)
*   **Excepción Matemática:** Analiza los Días de Reparación a Volumen de casos. Dado que "Un caso con X demora" tiene dispersiones grandes en el tiempo, usa una **Escala de Ejes Logarítmica** modificada (`y = log10(n+1)` internamente para solventar fallas con 0). Si usas librerías Frontend, verifica que tu Chart soporte _Logarithmic Axes_.
*   Los marcadores fijos (ticks) mostrados en la regla inferior son `[0, 1, 2, 5, 10, 20, 40, 80, 150]`.

### 4.7 Heatmap de Acuerdos de Nivel de Servicio (SLA Matriz)
*   Representa un Heatmap bidimensional (`Sucursal vs Periodo Mensual` o `Sucursal vs Tipo Trabajo`).
*   **No incluye:** Trabajo *"MANTENIMIENTO GENERADOR"* está silenciado en el Heatmap.
*   **Fórmula:** Porcentaje calculado internamente y forzado a mostrar un solo decimal (`.1f`).
*   **Paleta:** Va dictaminado en un espectro hardcoded `Rojo -> Amarillo -> Verde` con topes en Rango `0` y `100`.
