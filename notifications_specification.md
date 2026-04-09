# Especificación Técnica: Módulo de Notificaciones (Procesos Colab)

A continuación, se detalla una disección meticulosa y estructurada del funcionamiento del módulo de notificaciones y generación de reportes (implementado originalmente en `app.py` y `procesos_colab.py`). 

A diferencia de los gráficos, este módulo no perdona fallos lógicos, ya que interactúa directamente con el cliente/técnico generando Excel y correos electrónicos masivos.

## 1. Maestro de Sucursales (Master Data)
El sistema depende de una fuente de verdad dura (`DATOS_SUCURSALES_DEFAULT`). Cualquier caso que provenga del CSV y **NO** coincida en nombre con alguna de las 10 sucursales maestras ("Lima", "Chiclayo", "Ica", "Bellavista", "Nueva Cajamarca", "Pucallpa", "Jaen", "Huanuco", "Yurimaguas", "Piura") **es silenciosamente ignorado/descartado** de la bandeja de correos.

## 2. Trampas y Correcciones de Origen (Parseo Crítico)
La clase `CasoGarantia` posee un código crítico de pre-procesamiento enfocado en solventar exportaciones erróneas del gestor "Lark". 
- **CSV Malformados:** Si el CSV exportado condensa todas las columnas en una sola celda separada por punto y coma (`;`), el sistema lo detecta evaluando `if "Numeración" not in fila and len(fila) == 1`. Inmediatamente splitea las llaves y valores por `;` para reconstruir la fila matricial. **Esto es obligatorio de replicar** o el procesador de Next.js fallará con los CSV del cliente.
- **Limpieza de N° Caso Gestioo:** Extrae el ID base eliminando decimales (ej: `12.0` -> `12`) y le agrega ceros a la izquierda hasta llegar a 4 dígitos haciendo un `zfill(4)` (ej: `0012`).
- **Lógica Inversa de Garantías:** La propiedad booleana `garantia` es declarada indirectamente como verdadera si el texto `"SIN GARANTIA"` **NO** está en la celda.

## 3. La Paradoja de los Días (Discrepancia de Cálculos)
Aquí recae un detalle sumamente importante en la lógica de negocio actual que se bifurca en dos. El sistema utiliza **dos métricas distintas** (Días Calendario vs Días Hábiles) dependiendo de la salida:

1. **Para el Mensaje de Texto en el Correo (El resumen listado):** 
   Utiliza el método de clase `dias_en_proceso()`. Esto realiza una simple resta `(Fecha_Actual - Fecha_Ingreso).days` que cuenta absolutamente **todos los Días Calendario** (lunes a domingo). Además, si este valor es **> 30**, inyecta la bandera estricta `" ⚠ URGENTE"`.
2. **Para el Excel Adjunto (`RTAT Duración`):**
   Utiliza una función matemática anidada basada en `np.busday_count` con máscara `weekmask='1111110'`. Esto cuenta exclusivamente **Días Hábiles (Lunes a Sábado)** y salta los domingos.
> [!WARNING]
> Resultará normal que un técnico vea en su correo "El caso tiene 32 días (⚠ URGENTE)", pero al abrir el Excel, la columna de RTAT muestre "28 días" ya que omitió los 4 domingos.

## 4. Clasificación y Generación de Mensajes (Clasificación Multi-Bucket)
Si un técnico tiene casos `ABIERTOS`, el generador de reportes separa sus casos en tres "Buckets" o cubetas para generar el texto en un orden y alerta específicos:
1. `sin_fecha`: Casos que tienen `fecha_ingreso` vacía. (Se exige actualización prioritaria al inicio del correo).
2. `sin_tipo`: Casos donde el "TIPO DE TRABAJO" está vacío o en su defecto, en `"nan"`. (Común en Pandas cuando es string `null`).
3. `completos`: Casos normales que se ordenan mostrando los **Más antiguos primero** (ordenados por mayor cantidad de días descendente).

El administrador principal (Admin / "Jesus") recibe un Mega-Reporte general condensado: *"Sucursal {Nombre}: X abiertos, Y sin fecha"*.

## 5. Arquitectura del Archivo Excel (Maquetado Hardcoded)
La función `generar_excel_sucursal` construye un `.xlsx` en memoria listo para enviarse. Sus columnas no van en el mismo orden del CSV original. Las extrae en este estricto orden final:
1. `Numeración`, 2. `Cliente`, 3. `Fecha de ingreso`, 4. `RTAT (Duración)`, 5. `Estado`, 6. `Tipo de Trabajo`, 7. `Motivo`, 8. `Observaciones`.
- **Interacción Exigida:** Las columnas `Motivo` y `Observaciones` se inyectan intencionalmente **100% vacías** para que el técnico las responda a mano de forma obligatoria al recibir el correo.
- **Styling:**
  - Fila 1: Título unificado (`#1a4fa0`).
  - Fila 3: Encabezados azules (`#2E75B6`) con letra blanca Bold.
  - Alternancia Zebra (Striped Columns): Las celdas de valores varían usando un fill color de `#F2F7FB` estrictamente en **las Filas Pares** del Excel procesado.

## 6. Motor SMTP y Anti-Spamming Rate Limits
A la hora de accionar el botón de **"Enviar Todos"**:
- **Simulación (Modo Prueba):** Por default está ligado a enviar absolutamente todo al "CORREO_PRUEBA" (`sergio.araujo@quetalcompra.com`) para evitar incidentes en desarrollo.
- **Listas CC Bloqueadas:** Por defecto toda notificación arrastra en CC a dos directivos fijos: `sergio.araujo@...` y `jesus.tapia@...`.
- **Evasión de Rate Limits (Anti-Spam):** Dado que se enviarán masivamente (~10 correos con adjuntos en loop generados por Gmail SMTP API), existe un código intencional de prevención antes de cada iteración:
  `pausa = random.uniform(2.0, 5.0)` -> Obliga al sistema a dormir **aleatoriamente entre 2 a 5 segundos** previo a enviar el correo de la siguiente sucursal. Esto es para no ser detectados y bloqueados como Spammers y tiene que incorporarse si migras el backend a Vercel Functions o NodeMailer.
