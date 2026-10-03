# Referencias de diseño, funcionalidad e intercambio

Fecha de consulta: **18 de septiembre de 2026**. Se revisó documentación pública de productos, componentes y formatos. Estas fuentes orientan decisiones del proyecto; no son resultados del estudio ni implican acceso a instancias privadas de esas aplicaciones.

## Comparación aplicada

| Referencia revisada | Solución observada | Aporte a Nexo |
|---|---|---|
| [Jira Service Management: colas](https://support.atlassian.com/jira-service-management-cloud/docs/check-out-your-queues/) | Agrupación de solicitudes con información de estado, responsable y servicio. | Cola filtrable, prioridad, responsable y vencimiento visibles; acceso directo al detalle. |
| [Jira Assets: primeros pasos](https://support.atlassian.com/assets/docs/getting-started-with-assets-in-jira/) | Atributos y relaciones entre activos y trabajo de soporte. | Inventario de ATM con código, ubicación y relación con tickets. Se evita la complejidad de una CMDB general sin necesidad documental. |
| [Zendesk: vistas de tickets](https://support.zendesk.com/hc/en-us/articles/4408888828570-Creating-views-to-build-customized-lists-of-tickets) | Listas construidas con condiciones para distintos escenarios de atención. | Vistas Todos, Mis asignados y Fuera de plazo; filtros de estado/prioridad sujetos a permisos. |
| [Zendesk: formularios](https://support.zendesk.com/hc/en-us/articles/4408846520858-Creating-multiple-ticket-forms) | Campos organizados según solicitud y tipo de participante. | Registro breve de incidencia; asignación, diagnóstico y solución se completan en su etapa del recorrido. |
| [GLPI: dashboards](https://help.glpi-project.org/tutorials/readme-1/dashboard) | Separación entre indicadores generales, activos y asistencia. | Resumen operativo y módulo específico de indicadores con datos persistidos, muestra e intervalo. |
| [GLPI: activos y relaciones](https://help.glpi-project.org/documentation/modules/assets/monitors) | Una ficha reúne datos del activo y relaciones con tickets. | Enlace desde ATM hacia su historial; códigos que evitan depender de nombres ambiguos. |
| [Tabler: tablas](https://docs.tabler.io/ui/components/table) | Jerarquía visual, separadores discretos y variantes de presentación. | Tablas legibles, paginación real y control de desbordamiento. No se ofrecen ordenamientos meramente visuales. |
| [Tabler: validación](https://docs.tabler.io/ui/forms/validation) | Retroalimentación visual de campos y errores. | Formularios con etiquetas y errores del servidor, conservando datos para corrección. |
| [Tabler: cronología](https://docs.tabler.io/ui/components/timeline) | Secuencia de acontecimientos fechados. | Historial con acción, detalle, usuario y fecha. |

También se consultaron la [documentación general de Tabler](https://docs.tabler.io/) y la [presentación del template](https://tabler.io/admin-template). La [ruta de vista previa](https://tabler.io/admin-template/preview) no proporcionó contenido legible en la consulta, por lo que no se atribuye una inspección interactiva de su demo.

Nexo utiliza una identidad propia: fondo claro, acentos azules, navegación persistente, jerarquía de tipografía, badges con texto y color, formularios por etapa y fichas laterales de detalle. Se toman patrones funcionales, no marcas, imágenes ni la interfaz completa de los productos referenciados.

## Accesibilidad

La referencia de criterios es [WCAG 2.2, W3C](https://www.w3.org/TR/WCAG22/). Se aplican etiquetas de controles, foco visible, navegación por teclado, encabezados de tabla y estados expresados mediante texto además de color. Los objetivos de contraste son 4,5:1 para texto normal y 3:1 para texto grande. La adopción de buenas prácticas no equivale a una certificación de conformidad; el informe de verificación limita sus afirmaciones a revisiones realmente ejecutadas.

## Formatos de intercambio

Microsoft documenta la [apertura de CSV UTF-8 en Excel](https://support.microsoft.com/en-us/excel/opening-csv-utf-8-files-correctly-in-excel) y el uso de BOM o importación desde texto/CSV. Esto sustenta la exportación UTF-8 con encabezados estables y delimitador coma. No se utiliza Microsoft Graph ni una sesión Microsoft para descargar los datos de Nexo.

Se consultó [OWASP, CSV Injection](https://wstg.owasp.org/latest/4-Web_Application_Security_Testing/07-Injection/21-CSV_Injection/) para el tratamiento de texto que una hoja de cálculo podría interpretar como fórmula. Las comillas CSV se escapan y los valores de texto potencialmente ejecutables se neutralizan; los controles de la hoja de cálculo siguen siendo relevantes al editar/reexportar los archivos.

Para IBM SPSS se obtuvo contenido oficial indexado de estas fuentes:

- [Lectura de archivos de texto, SPSS Statistics 30](https://www.ibm.com/docs/en/spss-statistics/30.0.0?topic=wizard-read-text-data-files).
- [GET DATA, SPSS Statistics 31](https://www.ibm.com/docs/en/spss-statistics/31.0.0?topic=reference-get-data).
- [Subcomandos TYPE=TXT](https://www.ibm.com/docs/en/spss-statistics/31.0.0?topic=data-subcommands-typetxt-get-command).
- [Guía oficial de gestión de datos, SPSS 30](https://www.ibm.com/docs/SSLVMB_30.0.0/pdf/IBM_SPSS_Statistics_Data_Management_SAS.pdf).

La apertura directa de esas páginas IBM devolvió bloqueo 403 o no permitió extraer el contenido. Los resultados de búsqueda aportaron texto oficial sobre importación, codificación, delimitadores y tipos de variables. Se conserva esta limitación: no se declara una ejecución de SPSS ni una importación validada en el motor solo por generar un CSV. La guía de uso explica la configuración del asistente y la necesidad de verificar tipos y valores ausentes.

## Plataforma y sesiones

La documentación oficial de [SQLite en Node.js](https://nodejs.org/api/sqlite.html) describe conexiones locales, consultas preparadas y respaldo. La de [crypto.scrypt](https://nodejs.org/api/crypto.html#cryptoscryptpassword-salt-keylen-options-callback) sustenta la derivación de contraseñas con sal. La [guía de gestión de sesiones de OWASP](https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html) orienta cookies, expiración y manejo de tokens. La arquitectura registra las decisiones de esta entrega y el README fija el runtime probado; no se presupone que todas las versiones de Node ofrezcan idéntico estado de estabilidad de cada API.

## Licencias y atribuciones

Se verificó también la [guía de almacenamiento de contraseñas de OWASP](https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html), que incluye la combinación scrypt N=2^16, r=8, p=2 aplicada en esta entrega. El código reutilizado de componentes conserva la [licencia MIT de shadcn/ui](https://github.com/shadcn-ui/ui/blob/main/LICENSE.md) en `vendor/LICENSE-shadcn.txt` y los avisos consolidados de dependencias en `THIRD_PARTY_NOTICES.md`.

Jira y Zendesk se usan como referencias funcionales de documentación pública. No se incorpora código de sus productos. GLPI publica su licencia [GPL-3.0-or-later](https://www.glpi-project.org/en/glpi-gpl-3-0/); en Nexo se observa el patrón de relación entre activo e incidencia, sin incorporar código GLPI.

El núcleo de [Tabler](https://github.com/tabler/tabler) se publica bajo [MIT](https://github.com/tabler/tabler/blob/dev/LICENSE). La consulta no supone que todos sus plugins compartan esa licencia: por ejemplo, el repositorio distingue las condiciones de ApexCharts posteriores a su cambio de licencia. Nexo no necesita ese plugin para sus gráficos simples.

Las dependencias efectivamente incluidas mantienen sus licencias y avisos aplicables. Las referencias visuales no autorizan atribuirse código ajeno ni retirar avisos de terceros. El proyecto debe conservar el archivo de avisos de la entrega y las licencias distribuidas con las dependencias.
