# Blueprint Técnico v2.0 - Sistema de Gestión de Garantías y Repuestos

Este documento detalla la especificación técnica profunda del MVP actual (Python/Streamlit) para servir como base en la migración a la nueva arquitectura web v2.0.

## 1. Arquitectura y Navegación (UI/UX)

### Estructura Visual Principal
- **Layout General:** Configuración de página 'wide'. Todo el flujo está protegido por un **Control de Acceso Global (Login)**. 
- **Pantalla de Login:** Se muestra una vista limpia con un selectbox de `Usuario / Sucursal` y un input de contraseña para el `PIN de 4 dígitos`. Emplea un `CookieManager` para mantener la sesión abierta (`auth_token` válido por 1 año).
- **Sidebar (Flujo autenticado):** Contiene la información del usuario logueado ("👤 Iniciado como: [Sucursal]"), un botón de "Cerrar Sesión", y un menú de navegación `radio` que sirve como enrutador principal del sistema.

### Vistas Principales y Elementos de Interfaz

1. **📦 Solicitudes de Repuestos:**
   - **Elementos superiores:** Barra de progreso lateral indicando el estado de traducción del catálogo.
   - **Tabs internos:**
     - **Tab 1: 🔍 Buscador Principal:** Input de texto para búsqueda (Código, Nombre, SAP). Tabla de solo lectura que carga todo el `df_catalogo` usando `st.dataframe`.
     - **Tab 2: 📦 Envío de Repuestos (Funcionalidad Central):**
       - Buscador de repuestos y un `st.data_editor` que incluye un checkbox (`_seleccionar`) para agregar repuestos masivamente al carrito.
       - Botón "➕ Agregar X repuesto(s) al carrito".
       - Modalidad encapsulada en un contenedor `st.form`.
       - Selector tipo radio (Consumo normal / Solicitud/Reserva sin stock).
       - Tabla interactiva final (`st.data_editor` del carrito) con columnas para Borrar, Venta, Código, Nombre, N° Caso, Cantidad (modificable) y Sede.
       - Botón de submit "🚀 Solicitar pedido".
     - **Tab 3: 📊 Historial y Auditoría:** Tablas separadas mostradas con `st.dataframe`. La vista varía según el rol (Admin ve Abastecimiento, Reposiciones y Envíos Internos; las sucursales ven "Pedidos Realizados" y "Pedidos Recibidos"). Botón para recargar el historial.

2. **📊 Dashboards y Estadísticas:**
   - Acceso restringido solo al usuario "admin".
   - Integrado de forma modular (`dashboards_modulo.py`).
   - Contiene un sistema de filtros laterales (Sucursales, Tiempos, Estados), KPIs superiores creados con `st.columns().metric()`.
   - Incluye gráficos interactivos (Plotly) integrados mediante radio buttons para alternar entre "Evolución Temporal" y "Comparativas", mostrando pie charts, bar charts e histogramas del RTAT.

3. **📋 Notificaciones a Técnicos ("Procesos de Colab"):**
   - Acceso restringido solo al usuario "admin".
   - Interfaz con un banner de alerta ("Modo prueba").
   - Contiene KPIs del estado general de todo el dataset de casos.
   - **Botón Principal:** "📤 Enviar Todos por Correo" con una barra de progreso (`st.progress`).
   - Muestra **Expanders** colapsados por cada sucursal con vistas previas del texto que se enviará en el correo y los datos de la tabla, con un botón para descargar el Excel o enviar correo individualmente de forma manual.

## 2. Mapa de Base de Datos (Interacciones con Supabase)

El sistema se conecta a Supabase con credenciales en un archivo `.env` o a través de los secretos del servidor. Hace operaciones sobre 4 tablas principales:

1. **`repuestos`**
   - **Leer (R):** Se leen campos base como `id, codigo, nombre, nombre_traducido, codigo_sap, precio_venta, modelos_compatibles`. Sirve como el maestro de artículos, uniéndose al stock en código.
2. **`sucursales`**
   - **Leer (R):** Se leen `id, nombre_ciudad` para unirlos por ID.
3. **`inventario`**
   - **Leer (R):** Se hace un Left Join (via Supabase foreign key `sucursales(nombre_ciudad)`) sobre `repuesto_id`, obteniendo las existencias dinámicas y pivoteándolas en la visualización. Se consulta unitariamente para validar que el inventario `>= cantidad_pedida`.
   - **Actualizar (U):** Descuenta la cantidad pedida usando `update({"cantidad": stock_nuevo}).eq("id", inv_id).execute()`. Solo opera si la solicitud es de "Consumo normal".
4. **`historial_pedidos`**
   - **Crear (C):** Se realiza una inserción masiva (`insert`) de diccionarios que incluyen detalles del pedio (tecnico_destino, sucursal_origen, codigo, etc) generados a partir de los datos en sesión del usuario.
   - **Leer (R):** El Tab de "Historial y Auditoría" trae íntegramente esta tabla usando select y range (paginación hasta traer todo al frontend).

## 3. Reglas de Negocio y Flujos Lógicos

### Lógica de Autenticación
- Un diccionario estático `USUARIOS_PERMITIDOS` en el código (ej. "lima": "1001", "admin": "7232") valida las credenciales. Tras un ingreso exitoso, se guarda en `st.session_state["usuario_actual"]` y genera una cookie persistente de 1 año.

### Motor de Búsqueda de Artículos (Puntuación Analítica)
- Cuando el usuario busca un texto, la aplicación evalúa y rankea los registros usando sistema de "Score": Asigna un **4** si aparece en código SAP o modelos, un **3** para nombre traducido, **2** en el nombre en español, y un **1** para el código de repuesto puro. Se ignora case sensitivity y valida combinaciones de punto decimal para coincidencia exacta.

### Sistema de Carrito de Pedidos
- Usa el `st.session_state['carrito']` para prevenir re-cargas o perder las filas elegidas.
- **Flujo de Envío (st.form):** Recolecta un dataframe combinado y modificado dentro de un `data_editor`.
- **Validaciones antes del insert a Supabase:**
  1. Si NO es "Solicitud/Reserva sin stock": se exige una sede válida. El `stock_disponible` de esa sede debe ser **>=** `cantidad_pedida`.
  2. Si es una **"Venta"** (`es_venta = True`): Queda prohibido generarlo desde una sucursal distinta a "Lima". Almacena el número de caso genéricamente como "VENTA".
  3. Si NO es una Venta: Se exige rígidamente introducir **un número de caso de exactamente 4 dígitos**. Todo lo que no sea venta necesita número de caso.
  4. Modo **"Solicitud/Reserva sin stock"**: Saltea por completo la validación de inventario. No intenta descontar inventario en Supabase y graba el estado como `Pendiente de abastecimiento` predeterminadamente. Solo requiere validación de 4 dígitos para N° Caso.

## 4. Integraciones y Módulos Externos

### Módulo "Procesos de Colab" (Procesamiento y Documentos)
- Ubicación: `modulos/procesos_colab.py`.
- **Qué hace:** Se encarga de procesar un archivo `casos.csv`. Separa todo por técnicos (sucursales). Cruza datos, omite casos en mal estado ('Nan' o incompletos) y calcula el RTAT contabilizando exclusivamente **días hábiles (excluyendo domingos)** usando `np.busday_count`.
- **Generación Externa (Excel):** Crea on-the-fly hojas de cálculo nativas estilizadas mediante la librería `openpyxl` en memoria. Les asigna bordes, colores Hex a las celdas, filas alternadas, anchos de columna dinámicos y fusiona celdas para el título, retornando el buffer como bytes.

### Infraestructura de Correo / Notificaciones (SMTP)
Está implementado en dos lugares, con dos propósitos diferentes pero bajo el mismo servidor:
- **Tecnología:** Librería nativa `smtplib`, `email.mime`, utilizando el servidor y credenciales en `.env` (EMAIL_USER, SMTP_HOST = smtp.gmail.com puerto 587).
1. **Pedidos de Repuestos (`app.py`):** Cuando se confirma un pedido de repuesto exitosamente en BD, se compila inmediatamente un template HTML tabular con el resumen del pedido, avisando a los administradores lógicos (ruteo "correo_lima@..." frente al default de supervisión).
2. **Notificaciones a Técnicos (`procesos_colab.py`):** Permite generar y despachar reportes completos. Construye un multipart (Texto + HTML + Adjunto en Base64 de Excel). Actualmante tiene desactivado el modo simulado y realiza el envío **REAL**, enviando los correos a las direcciones de los técnicos respectivos e incluyendo como Copia (CC) a los encargados de revisión.

---
*Este análisis es exhaustivo y lista las funciones y comportamientos actuales del MVP. Este documento constituye el diseño base comprobado necesario para desarrollar y adaptar la versión web 2.0.*
