# Verificación técnica de la entrega

Fecha: **20 de septiembre de 2026**. Entorno: Windows, Node.js 24.19.0, npm 11.6.2, aplicación compilada en modo de demostración y servidores de prueba aislados. Todas las identidades y evidencias empleadas son ficticias.

## Resultados automatizados ejecutados

| Verificación | Resultado | Alcance |
|---|---|---|
| TypeScript y compilación Vite/servidor | Correctos | `npm run build` ejecuta la comprobación de tipos y prepara interfaz y servidor. |
| Reglas de negocio y SQL | **49/49** | `tests/service.cjs`; resultados individuales en `verificacion-dominio.json`. |
| Servidor HTTP y autenticación | **20/20 casos** | `tests/http.mjs`; el ejecutor también cuenta el grupo contenedor como una prueba adicional. |
| Persistencia, respaldo y recuperación | **3/3** | `tests/persistence.mjs`; migraciones, respaldo consistente y apertura de una copia restaurada. |

Son **72 casos específicos**, sin fallos en sus últimas ejecuciones. No se confunden con mediciones del estudio ni porcentajes de mejora del proceso investigado.

El dominio verifica el ciclo completo de ticket, reglas por rol, primera respuesta, diagnóstico, solución, cierre y reapertura; tareas y recursos que bloquean inicio/cierre; acciones correctivas, metas y revisiones; filtros/paginación; claves foráneas y unicidad; conflictos por versión; concurrencia de escrituras; inmutabilidad de auditoría y mediciones; aislamiento demo/real; carga ficticia idempotente; CSV; fechas y los 14 indicadores con valores calculables. Incluye reconstrucción histórica frente a reaperturas, cambios de plan, cancelaciones y reevaluaciones posteriores, y captura semanal atómica de 14 valores.

La suite HTTP verifica acceso sin sesión, credenciales incorrectas, atributos de cookie, caché y cabeceras de seguridad, origen de solicitudes, JSON inválido/cuerpo excesivo, rutas inválidas, simulación de roles, creación de cuentas y contraseñas, intentos de elevar permisos mediante cabeceras, inventario, alcance de tickets, exportaciones, recorrido completo hasta cierre, desactivación de cuentas, cambio de contraseña, revocación/expiración de sesiones, límite de cinco fallos y no exposición de fuentes/base/configuración como archivos estáticos. Se utilizan bases de datos en disco separadas de la instalación del usuario.

Los escenarios de concurrencia del dominio comprueban intercalados de operaciones y restricciones; no representan una prueba de estrés con muchos usuarios simultáneos.

## Instalación independiente del paquete

Se copió exclusivamente el contenido compartible a una carpeta nueva, sin `node_modules`, configuración privada ni bases de datos. Allí se ejecutó `npm ci` usando las versiones del archivo de bloqueo (133 paquetes; caché local disponible), seguido de `npm run build`, con resultado satisfactorio. No se afirma haber probado una descarga por Internet desde el equipo del destinatario.

Se inició la compilación obtenida en un puerto independiente y se verificaron: creación de la base, acceso de demostración, carga inicial y consulta de 16 tickets ficticios, disponibilidad de interfaz/recursos estáticos, manual de 17 secciones y respuesta CSV autenticada. El registro está en `verificacion-instalacion.json`. Esta comprobación de empaquetado complementa los 72 casos; no se suma como una nueva suite equivalente.

También se comprobó el asistente de creación del administrador mediante una terminal interactiva y una base aislada. La entrada de contraseña permaneció oculta. El paquete compartible no incluye esa cuenta, datos de pruebas ni la base de la vista previa.

## Comprobaciones en navegador

- Acceso con la cuenta de demostración y carga inicial de ejemplos.
- Creación de ticket, apertura automática de su ficha y persistencia tras recargar/reiniciar servidor.
- Asignación a técnico, primera respuesta, inicio de atención, actividad vinculada y planificación con fecha/hora de Lima.
- Definición de recurso; rechazo de inicio cuando falta asignarlo, conservando el formulario; asignación, inicio y finalización con evidencia.
- Resolución con diagnóstico/solución y cierre; el caso conserva primera respuesta, resolución, cierre e historial.
- Consulta de los 14 indicadores; creación de período de demostración y captura de una semana finalizada con 14 mediciones visibles.
- Búsqueda sin coincidencias y estado vacío, navegación por menú móvil y cierre de ficha mediante Escape.
- Formulario móvil de nuevo ticket y guardado correcto en base de datos.
- Revisión de disposición en **1440×1000**, **768×1024** y **390×844**. Tablas móviles desplazables y evidencias desplegables; se comprobó que el documento no se ensancha fuera del área disponible.

Durante la revisión se corrigieron una consulta de estado de sesión, reutilización transitoria de datos de otra vista, lectura de fecha/hora del formulario y desbordamientos de cabeceras/evidencias en móvil. La versión entregada contiene esas correcciones. Las pruebas se ejecutan sobre la implementación final, no sobre una maqueta sin persistencia.

## Trazabilidad de aceptación

| Requisitos | Evidencia |
|---|---|
| R01–R11: incidencias, activos, clasificación, seguimiento y resolución | Dominio 01–11, 20, 23, 25–26; recorrido HTTP y navegador. |
| R12–R17: planificación, recursos, ejecución y control | Dominio 04–05, 12–16, 27–30, 37, 44–48; recorrido de actividad en navegador. |
| R18–R20: medición y soporte al estudio | Dominio 16–18, 24–26, 38–46, 48–49; período/captura en navegador y exportación HTTP. Ver alcance exacto en la matriz. |
| R21–R24: acceso, reglas y persistencia | Dominio 06–11, 19–22, 27–35, 37, 47; HTTP y respaldo/recuperación. |
| R25–R28: interfaz, consulta, ejecución y calidad | Compilación; revisión de tres tamaños, formularios y navegación; pruebas HTTP/CLI y este informe. |
| R29–R30: CSV y revisiones | Dominio 26, 36, 48–49; exportaciones HTTP. |

## Límites de la comprobación

No se ejecutó el análisis/importación dentro de IBM SPSS ni se certificó la apertura en una instalación de Excel. Se comprobó el CSV producido, codificación, contenido, protección de fórmulas y permisos. No se hizo despliegue público HTTPS, prueba de carga, auditoría externa de seguridad, certificación WCAG ni matriz de navegadores/dispositivos físicos. Las dimensiones citadas son tamaños de navegador, no ensayos con equipos físicos distintos.

La inspección visual complementa las pruebas de reglas, pero no implica que cada combinación posible de formularios se haya ensayado manualmente. El navegador de revisión no confirmó el evento de descarga del archivo CSV; la respuesta HTTP, su contenido y los permisos sí se comprobaron. La guía recomienda usar un navegador convencional para las descargas. Las decisiones metodológicas del documento —duración pre/post, clasificación de la investigación y fórmulas finales— requieren acuerdo académico. No se fabricaron datos de campo, validación por expertos ni resultados de hipótesis.

## Repetir las comprobaciones

```powershell
npm.cmd ci
npm.cmd run build
npm.cmd test
```

Para revisar manualmente sigue el guion de la sección 16 del manual. Los archivos temporales de pruebas se guardan en `tests/output/`, excluidos del paquete compartible. Las pruebas no necesitan ni modifican datos institucionales.
