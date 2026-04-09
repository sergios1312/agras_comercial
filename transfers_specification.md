# Especificación Técnica: Sistema de Transferencias e Historial de Pedidos

A continuación, se documenta la arquitectura técnica implementada en `app.py` que gestiona las solicitudes de repuestos (el "carrito" de compras), el enrutamiento de correos inteligente entre sedes y el seguimiento histórico.

---

## 1. Reglas Lógicas de Transferencia y Enrutamiento (Routing)

El sistema clasifica las transferencias en tres grandes grupos usando la función interna `_calcular_tipo_reporte` basándose en el "Destino" (o "Sede de Origen" donde se aloja el repuesto físicamente):

1. **Abastecimiento (`abastecimiento`):** Cuando el pedido va dirigido a "Lima" o "Lima-Almacen".
2. **Reposiciones (`reposiciones`):** Cuando se envía al limbo virtual o comodín: "Solicitar repuestos sin stock (Oficina Central)".
3. **Envíos Internos (`envios internos`):** Cuando se solicitan repuestos directamente a cualquier otra sucursal de provincias (por ejemplo, Chiclayo a Ica).

### Motor Inteligente de Correos (Destinatarios)
Cuando un técnico hace un pedido masivo en su carrito, la función `enviar_notificacion_pedido`:
- **Agrupa (Group By):** Separa todos los repuestos del carrito basados en a qué sucursal se los están pidiendo, y despacha **un correo distinto** a cada destinatario.
- **Reglas de Destinatarios (Vía `resolver_receptor_pedido`):**
  - **Excepción 1 (Sin Stock):** Dirigido a *Sergio* (TO) con copia a *Jesus* (CC).
  - **Excepción 2 (Dirigido a Lima):** Rebotado al jefe de almacén *Wilber* (TO) con copia a *Jesus* y *Sergio* (CC).
  - **Transferencia Normal (Inter-sede):** Dirigido directamente al correo técnico configurado de la sucursal a la que se le pide el repuesto (TO) y copia a *Jesus* y *Sergio* (CC).
- Existe un flag quemado en memoria (`MODO_PRUEBA_EMAIL = True`) que si está activo secuestra todos los correos entrantes y los dirige únicamente al administrador para evitar falsas transferencias en etapas de migración.

---

## 2. Transacciones DQL y DML en la Base de Datos

En la función crítica `registrar_pedido_y_descontar_stock`, ocurre el enlace de la UI con la base de datos (Supabase):

1. **Resolución de Master IDs:** Dado que la UI maneja "nombres de repuestos" y "nombres de ciudades" humanamente legibles, el sistema descarga de antemano el catálogo y cruza el `codigo` único para recuperar el `id` (guid de supabase) de `repuestos`, y cruza la `nombre_ciudad` para lograr el `id_sucursal`.
2. **Descuentos Concurrentes (Race Conditions):**
   - El descuento de stock físico sólo ocurre para sedes tangibles (se excluyen los pedidos "Sin stock").
   - **Sistema Protegido:** Hace una consulta `.select("id, cantidad").limit(1)` **justo un microsegundo antes** del update. Si verifica que el stock en ese exacto instante es menor a lo que pidió, descuenta forzadamente todo pero aplica una validación `max(0, stock_actual - cantidad)` para evitar dejar la base de datos en valores numéricos negativos. Lanza un warning interno de "Se descontó hasta 0".
3. **Persistencia Histórica:** Se forma un `payload` o array de objetos que se inyecta con `.insert()` directamente a la tabla `historial_pedidos`. El campo `estado` arranca quemado por defecto en `"Pendiente"` (o `"Pendiente de abastecimiento"` para los sin stock).

---

## 3. Arquitectura del Modulo "Visual de Aprobaciones" e Historial

El módulo alojado en el Tab "Historial y Auditoría" se alimenta de la carga de memoria por TTL de `cargar_historial()`, y utiliza una UI dinámica que difiere radicalmente dependiendo de los roles del usuario que inició la sesión:

### Vista Modo Administrador (Superuser)
- Se activa solo si el usuario logueado en la variable de sesión está dentro del Set constante `USUARIOS_ADMIN` ("admin", "admin_oficina", "admin_almacen").
- Provee control panóptico general partiendo el DataFrame por el campo `tipo_reporte` detallado en el Paso 1 en **3 tablas separadas**: "Abastecimiento", "Reposiciones", "Envíos Internos".
- Faculta exportar la totalidad relacional con `.to_excel()` devolviendo un documento multicapa en memoria (3 sheets distintos para contabilidad profunda).

### Vista Modo Técnico Promedio (Usuario Final)
Si es un usuario común (como "Gabriel" de la sucursal de Lima), las vistas de administración desaparecen en favor de una vista simplificada en dos cubetas direccionales usando máscaras booleanas condicionales en el DataFrame cargado de base:

1. **"Pedidos Realizados" (Tracking Egresos):** Filtra donde la constante `tecnico_destino` sea igual al usuario de la sesión. Es decir, sirve para que el técnico haga seguimiento a los ítems y estados de lo que ha solicitado semanas atrás a terceras sucursales o a oficina central.
2. **"Pedidos Recibidos — A Despachar" (Bandeja de Tareas):** Filtra inversamente donde el `sucursal_origen` contenga textualmente la sede de su usuario de sesión. Es decir, esto es lo que le cae a la sucursal como "responsabilidad de atender", ítems que otras sucursales se agarraron de su stock y él tiene que meterlos a la paquetería / courier.
- La descarga a Excel bajo su cuenta también está limitada solo para las bandejas que le competen a él a modo de "Mi Historial", creando 2 pestañas ("Mis pedidos" y "Recibidos").
