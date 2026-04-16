# Análisis de Recursos Técnicos y Requerimientos

Este documento detalla el consumo de recursos detectado en el proyecto **Sistema de Garantías 2.0** y las razones por las cuales es probable que notes lentitud o cierres inesperados en tu equipo actual.

## 1. Perfil del Proyecto (Next.js 15 + TypeScript)

Este es un proyecto de vanguardia técnica, pero es muy exigente en memoria RAM y CPU por las siguientes razones:

*   **Next.js 15 (App Router):** Esta versión de Next maneja una arquitectura de componentes de servidor extremadamente eficiente para el usuario final, pero muy costosa para el desarrollador. El servidor de desarrollo (`next dev`) debe mantener un mapa en memoria de toda la estructura de rutas y componentes.
*   **TypeScript 5:** Al ser un lenguaje tipado, el editor (VS Code/Cursor) ejecuta un proceso de fondo ("TSServer") que analiza constantemente cada archivo para detectar errores. En proyectos modernos, este proceso puede consumir fácilmente entre **1 GB y 2 GB de RAM**.
*   **Generación de Estáticos (Build):** El comando `npm run build` es el punto crítico. Durante este proceso, Node.js intenta optimizar todo el código, lo que genera picos de consumo de hasta **4 GB de RAM** adicionales.
*   **Antigravity / IA:** El agente utiliza procesos de indexación de archivos para poder "leer" y entender tu código. Esto añade una carga extra de procesamiento y memoria en segundo plano.

## 2. Estimación de Consumo de RAM (Escenario Real)

| Proceso | Consumo Estimado |
| :--- | :--- |
| **Sistema Operativo (Windows)** | 2.5 GB - 3.5 GB |
| **Navegador (Chrome/Edge con DevTools)** | 1.0 GB - 2.0 GB |
| **Editor (Cursor/VS Code)** | 1.0 GB - 1.5 GB |
| **TypeScript (Análisis en vivo)** | 0.8 GB - 1.5 GB |
| **Next.js Dev Server** | 0.8 GB - 1.5 GB |
| **Antigravity (Procesamiento de IA)** | 1.0 GB - 1.5 GB |
| **TOTAL ESTIMADO** | **7.1 GB - 11.5 GB** |

> [!WARNING]
> Si tu laptop tiene **8 GB de RAM**, el sistema se queda sin memoria física y empieza a usar el disco duro como "memoria virtual" (Swap/Paginación). Esto es **100 veces más lento** y es lo que causa que los programas se cierren o la terminal deje de responder.

## 3. Requisitos Recomendados para la Laptop

Para trabajar con fluidez en este proyecto, estas son las especificaciones ideales:

### Requisito Mínimo (Trabajo aceptable)
*   **RAM:** 16 GB DDR4/DDR5.
*   **Procesador:** Intel Core i5 o AMD Ryzen 5 (Generación 11 o superior).
*   **Disco:** SSD (Indispensable para que la memoria virtual no congele el sistema).

### Requisito Recomendado (Productividad Total)
*   **RAM:** **32 GB**. Con este nivel de memoria, puedes tener el servidor de desarrollo, múltiples pestañas del navegador, el editor con IA y herramientas de diseño abiertas simultáneamente sin ninguna demora.
*   **Procesador:** Intel Core i7 / i9 o AMD Ryzen 7 / 9 (Serie H preferiblemente).
*   **Gráfica:** No es crítica para este proyecto, pero una GPU dedicada ayuda a descargar al procesador de las tareas visuales del navegador y el editor.

## 4. Recomendaciones Inmediatas (Software)

Si no puedes cambiar la laptop de inmediato, prueba esto:
1.  **Cerrar el navegador:** Usa solo 1 pestaña de navegación y ciérrala cuando estés compilando el proyecto.
2.  **Reiniciar el editor:** Si notar que se pone lento, presiona `Ctrl+Shift+P` y ejecuta `TypeScript: Restart TS Server`.
3.  **Aumentar Archivo de Paginación:** En Windows, aumenta manualmente el tamaño de la memoria virtual en un SSD para evitar que los programas se cierren por falta de RAM física.
