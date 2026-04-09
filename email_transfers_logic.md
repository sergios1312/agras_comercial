# Especificación Técnica: Motor de Envío de Correos (Transferencias)

Este documento describe la lógica de enrutamiento y notificación por correo electrónico utilizada en el sistema para gestionar las solicitudes y transferencias de repuestos entre sedes.

## ⚙️ 1. Lógica de Enrutamiento (Destinatarios)

El sistema determina automáticamente quién debe recibir la notificación (TO) y quién debe supervisar (CC) mediante la función `resolver_receptor_pedido`. La decisión se basa primordialmente en la **Sede de Origen** del repuesto solicitado.

| Escenario | Origen del Repuesto | Destinatario Principal (TO) | Copia (CC) |
| :--- | :--- | :--- | :--- |
| **Reposiciones** | Oficina Central (Sin Stock) | **Sergio** (Admin Técnico) | Jesus |
| **Abastecimiento** | Lima / Lima-Almacen | **Wilber** (Jefe Almacén) | Jesus, Sergio |
| **Transferencia Interna** | Cualquier Sede de Provincia | **Técnico de la Sede Origen** | Jesus, Sergio |

> [!NOTE]
> En **modo de prueba** (`MODO_PRUEBA_EMAIL=True`), todas las notificaciones se redirigen exclusivamente a Sergio Araujo para evitar saturar o confundir a los técnicos durante el desarrollo.

## 📦 2. Mecanismo de Agrupación (Batching)

Para optimizar la comunicación, el motor no envía un correo por cada pieza. Si un técnico solicita múltiples repuestos en un solo carrito, el sistema realiza lo siguiente:

1.  **Agrupa** los ítems por la sucursal que posee el stock (`sede_asignada`).
2.  Dispara **un correo único por sucursal**, conteniendo la lista completa de repuestos requeridos a esa sede específica.
3.  Esto asegura que cada responsable reciba solo la información que le compete gestionar.

## 💡 3. Ejemplos de Funcionamiento

### A. Solicitud de Importación (Sin Stock)
*   **Solicitante:** Técnico de Ica.
*   **Pedido:** Sensor de proximidad (marcado como "Sin Stock").
*   **Enrutamiento:** El sistema detecta que el origen es la Oficina Central virtual. Envía el correo a **Sergio** para que gestione la compra o importación.

### B. Pedido de Abastecimiento Estándar
*   **Solicitante:** Técnico de Chiclayo.
*   **Pedido:** 10 Hélices T40 (desde Lima-Almacen).
*   **Enrutamiento:** Se detecta origen Lima. El correo llega a **Wilber** en el almacén central para que prepare el despacho por courier.

### C. Transferencia Mixta (Multi-Sede)
*   **Solicitante:** Técnico de Piura.
*   **Pedido:**
    1.  1 Batería desde **Ica**.
    2.  1 Motor desde **Chiclayo**.
*   **Enrutamiento:** El motor dispara **dos correos independientes**:
    *   **Correo 1:** A Victor (Ica) con la solicitud de la batería.
    *   **Correo 2:** A Cesar (Chiclayo) con la solicitud del motor.
    *   Ambos incluyen a la administración central en **CC** para trazabilidad.

---

## 🛠️ Detalles del Mensaje (Cuerpo HTML)
El correo generado automáticamente incluye:
*   **Encabezado:** Nombre del solicitante y fecha/hora.
*   **Tabla de Repuestos:** Código, Nombre, Cantidad, Venta (Sí/No) y Número de Caso.
*   **Badge de Alerta:** Si es un pedido "Sin Stock", se resalta en amarillo para indicar que requiere gestión administrativa.
