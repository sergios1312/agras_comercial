# Especificación Técnica del Motor de Búsqueda (Buscador de Repuestos)

Este documento detalla el funcionamiento interno del motor de búsqueda de repuestos implementado actualmente en el archivo `app.py`. Está diseñado como una guía estructurada para que otro agente o desarrollador pueda replicar exactamente la misma lógica de negocio y ordenamiento de resultados en una arquitectura moderna (por ejemplo: con Next.js y TypeScript).

## 1. Entrada y Preprocesamiento de Datos (Normalización)

Antes de realizar cualquier búsqueda dentro de la data en memoria, el texto ingresado por el usuario pasa por una fase de normalización obligatoria para mejorar el ratio de coincidencias:

- **Conversión a minúsculas:** Todo el término de búsqueda se convierte a minúsculas (`toLowerCase()` / `.lower()`). Todo el catálogo comparado también se procesa temporalmente de la misma manera.
- **Limpieza de espacios en blanco:** Se limpian los márgenes iniciales y finales del texto introducido.
- **Expresión Regular de Versiones (Limpieza):** Se utiliza una regex para limpiar terminaciones de sub-versiones numéricas en los códigos.
  - **RegEx:** `r'\.\d{1,2}$'`
  - **Reemplazo:** `'.'`
  - **Propósito:** Si el usuario busca `ABC.01` o `ABC.12`, la búsqueda truncará esa fracción final dejándolo como `ABC.`. Esto ayuda a que el motor agrupe o encuentre repuestos base sin importar la edición o iteración exacta que el usuario haya tecleado.

## 2. Sistema de Calificación de Relevancia (Scoring System)

El motor aprueba o rechaza cada repuesto del catálogo comparando el término de búsqueda "limpio" secuencialmente contra diferentes campos de la base de datos. Si el término hace coincidencia (substring match / "contains"), se le asigna un número identificador (`_score`) al repuesto evaluado. 

> [!NOTE]
> La asignación de puntaje está configurada en **sobreescritura sobre la marcha**. La última validación cruzada que sea exitosa en el árbol `if` / máscara Booleana es la que prevalece y define la jerarquía del repuesto.

Las prioridades se definen en la siguiente jerarquía de valores (donde el número menor significa mayor prioridad de visualización final):

**Jerarquía de matches:**
4. **Puntaje 4 (Soporte Técnico Especializado):** 
   - Se asigna si el match está en `codigo_sap` o en el string de `modelos_compatibles`.
3. **Puntaje 3 (Nombres Alternativos / Extranjeros):** 
   - Se asigna automáticamente si la coincidencia tuvo lugar en el campo `nombre_traducido`.
2. **Puntaje 2 (Nombres Core):** 
   - Se asigna si hay un match directo en el nombre oficial del repuesto, campo: `nombre`.
1. **Puntaje 1 (Búsqueda Exacta / Identificador Único - Máxima Prioridad):** 
   - Se asigna en el paso final si la cadena de búsqueda se encuentra como coincidencia en el campo `codigo` (Código interno de SKU). Esto asegura que buscar un código devuelva esa fila por encima de repuestos que casualmente tengan ese código en su descripción o modelos compatibles.

## 3. Filtrado y Ordenamiento Algorítmico

Después de iterar o enmascarar los resultados que otorgan puntaje:
- **Filtro de Salida:** El motor desecha todas las filas que conservaron su valor inicial por defecto de `0`. (Se conservan solo filas con `_score > 0`).
- **Sort / Ordenamiento:** La lista devuelta se ordena en forma ascendente según el campo `_score` (`ascending=True`).
  - *Interpretación visual:* El usuario final verá estructuradamente en los top results de su pantalla los "1", luego los "2", luego los "3" seguido de todo lo clasificado con "4", brindando una UX donde el código exacto sobresale contra detalles secundarios y descripciones genéricas.

## 4. Optimizaciones de Rendimiento y UX

Para prevenir congestión de rendering en pantallas e incidentes de performance frente a catálogos extrensos, el motor contempla dos mecánicas reactivas:

- **Modo Standby o Paginación Estática:** Cuando la barra de búsqueda está enteramente vacía (o valor Nulo), no se renderiza la totalidad de elementos disponibles del DataFrame. El motor realiza un corte o `head(100)` enviando a la grilla inferior sólo los primeros 100 resultados estáticos.
- **Validación Anti-Spam de Caracteres (Aplicado fuertemente en carrito):** En vistas sensibles de envíos o reservas, se pide que la longitud mínima del string sea `>= 2`. Ingresar 1 solo texto provoca error o advertencia (`warning`) en la UI y retorna obligatoriamente 0 resultados.

## Especificación Lógica para un Nuevo Agente (TS/JS)

Si se necesita inyectar esta lógica en el backend o en un gestor de estado web en React, la translación pura del motor se vería de esta forma:

```typescript
// Estructura sugerida para el helper de búsqueda
export function searchEngine(catalogo: Repuesto[], searchTerm: string): Repuesto[] {
  // Manejo de optimizaciones UX 
  if (!searchTerm || searchTerm.trim() === '') {
    return catalogo.slice(0, 100);
  }

  const trimmedTerm = searchTerm.toLowerCase().trim();
  if (trimmedTerm.length < 2) return []; 

  // Expresión regular de limpieza
  const cleanTerm = trimmedTerm.replace(/\.\d{1,2}$/, '.');

  const parsedResults = catalogo.map((item) => {
    let currentScore = 0;
    
    // Nivel 4 - SAP & Compatibilidades
    const strSapMod = String(item.codigo_sap || '') + ' ' + String(item.modelos_compatibles || '');
    if (strSapMod.toLowerCase().includes(cleanTerm)) {
      currentScore = 4;
    }
    
    // Nivel 3 - Traducciones
    if (String(item.nombre_traducido || '').toLowerCase().includes(cleanTerm)) {
      currentScore = 3;
    }
    
    // Nivel 2 - Nombres
    if (String(item.nombre || '').toLowerCase().includes(cleanTerm)) {
      currentScore = 2;
    }
    
    // Nivel 1 - Código Matriz
    if (String(item.codigo || '').toLowerCase().includes(cleanTerm)) {
      currentScore = 1;
    }

    return { ...item, _score: currentScore };
  });

  // Filtramos repuestos sin match y mandamos al renderizado orden ascendente.
  return parsedResults
    .filter((res) => res._score > 0)
    .sort((a, b) => a._score - b._score);
}
```
