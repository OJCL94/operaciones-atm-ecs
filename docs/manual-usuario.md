# Manual de uso de Nexo · Operaciones ATM

Nexo reúne activos ATM, tickets, actividades, recursos, acciones correctivas e indicadores. Los datos guardados quedan en una base SQLite del equipo donde se ejecuta el servidor. Cerrar el navegador o cerrar sesión no elimina los registros.

## 1. Preparar y abrir el sistema

En Windows, instala una versión de Node.js compatible con el requisito del README. Abre la carpeta de la entrega, pulsa la barra de dirección del Explorador, escribe `powershell` y presiona Enter. La terminal debe quedar ubicada en la misma carpeta que `package.json`.

Ejecuta estos comandos, uno después de que termine el anterior:

```powershell
npm ci
npm run build
npm run demo
```

Con el servidor en ejecución, abre [http://127.0.0.1:3000](http://127.0.0.1:3000). Mantén abierta la terminal: es el proceso que atiende el navegador. Para detenerlo, vuelve a la terminal y pulsa `Ctrl+C`. Para volver a la demostración, ejecuta otra vez `npm run demo`; no es necesario reinstalar dependencias cada vez.

Acceso de demostración:

| Dato | Valor |
|---|---|
| Correo | `admin@demo.local` |
| Contraseña | `NexoDemo2026!` |
| Base utilizada | `data/demo.sqlite` |

Esta cuenta es pública y se usa únicamente con datos ficticios de demostración. El modo real utiliza otra base y requiere crear una cuenta administrativa propia. El servidor local solo está disponible mientras el equipo está encendido y el proceso sigue abierto. `127.0.0.1` significa «este equipo»: el asesor debe ejecutar su propia copia o acceder a un despliegue configurado para red.

Si PowerShell bloquea `npm.ps1`, utiliza `npm.cmd` en lugar de `npm` para los mismos comandos. Si el puerto está ocupado, revisa la configuración del README y abre la dirección que informe el servidor.

## 2. Pasar a operación real

1. Detén el servidor de demostración con `Ctrl+C`.
2. Revisa `.env.example` y crea tu archivo `.env` según el README. No compartas contraseñas ni archivos de datos reales en la carpeta pública de entrega.
3. Ejecuta `npm run admin` y proporciona los datos de la primera cuenta administrativa siguiendo las preguntas de la terminal.
4. Ejecuta `npm start`.
5. Abre la dirección del servidor e inicia sesión con tu cuenta real.
6. Registra los miembros, los ATM y los casos autorizados. La operación real comienza sin el inventario ficticio de la demostración.

La base real predeterminada es `data/nexo.sqlite`. El administrador crea los accesos del equipo en **Equipo y acceso**. El correo identifica la cuenta y, una vez registrado, no se modifica desde el formulario de edición. Si una persona deja de participar, deshabilita su acceso para conservar la referencia histórica de sus intervenciones.

### Crear los accesos de tu equipo

1. Entra en **Equipo y acceso** y pulsa **Registrar acceso**.
2. Introduce nombre y correo, elige el rol y deja **Acceso habilitado: Sí**. Guarda.
3. En la fila de esa persona pulsa **Establecer contraseña**. Introduce una contraseña inicial de 12 a 128 caracteres y guarda.
4. Entrega esa contraseña únicamente a la persona correspondiente por un canal privado.
5. La persona inicia sesión y pulsa **Cambiar mi contraseña** en la barra lateral. Debe introducir la actual y una nueva; al guardar vuelve a iniciar sesión.
6. Si olvida su contraseña, el administrador vuelve a usar **Establecer contraseña**. Las sesiones anteriores quedan revocadas. No existe recuperación automática por correo.

El modo de demostración conserva una contraseña pública fija y no permite modificarla ni crear usuarios reales. Las sesiones duran ocho horas. Cinco intentos fallidos consecutivos pueden bloquear el acceso durante quince minutos; espera antes de repetirlos. En un servidor detrás de un proxy, el límite por dirección puede afectar a varios usuarios que compartan esa dirección.

## 3. Entender la pantalla

La barra lateral contiene **Vista general**, **Tickets**, **Activos ATM**, **Planificación**, **Control operativo**, **Indicadores**, **Investigación**, **Trazabilidad** y **Equipo y acceso**. Solo aparecen los módulos autorizados para el rol. En una pantalla pequeña, abre y cierra el menú con su botón en la cabecera.

**Vista general** muestra el resumen operativo y accesos a casos que requieren atención. Los datos dependen del entorno y de los permisos del usuario. En demostración, el administrador puede explorar otros roles con el selector: el sistema cambia realmente el alcance permitido por el servidor. Esta simulación no crea una sesión de otro miembro ni habilita permisos en la operación real.

En las tablas, pulsa el título o el enlace de detalle para abrir la ficha. **Actualizar** vuelve a consultar los datos. La búsqueda responde al texto escrito; los filtros se combinan. Si una lista queda vacía, quita filtros o registra el primer elemento cuando tu rol lo permita. La paginación evita cargar toda la base en una sola pantalla.

Al guardar un formulario, espera el aviso de éxito. Si aparece un error, corrige el dato indicado. Si otro usuario modificó el mismo registro, actualiza la vista y revisa sus cambios antes de volver a guardar. Este control evita sobrescribir silenciosamente el trabajo de otra persona.

Las fechas se presentan para **America/Lima**. En la base se guardan instantes en UTC. Introduce la fecha y hora local en los formularios; no apliques manualmente una resta de cinco horas.

## 4. Roles y uso esperado

| Rol | Trabajo principal |
|---|---|
| Administrador | Gestiona accesos y toda la operación; configura el inicio real. |
| Supervisor | Registra activos, asigna y supervisa tickets, planifica recursos, revisa hallazgos y obtiene indicadores. |
| Técnico | Atiende los tickets asignados y ejecuta actividades o correctivas a su cargo. También puede registrar una incidencia propia. |
| Solicitante | Registra incidencias, consulta y comenta sus casos, y valida su cierre cuando están resueltos. |
| Investigador / auditor | Consulta operación e indicadores, crea períodos y registra mediciones; no modifica tickets ni actividades. |

Los técnicos y solicitantes no ven todos los tickets: ven los propios o aquellos que les correspondan. Los comentarios son parte del historial visible para los participantes autorizados del caso. No existe un campo de nota privada separado.

## 5. Registrar un ATM y consultar su historia

Con un rol administrador o supervisor:

1. Entra en **Activos ATM** y pulsa **Registrar activo**.
2. Completa código, nombre, número de serie, modelo y ubicación. Usa códigos inequívocos, por ejemplo `ATM-DEMO-101`, y una serie ficticia si estás ensayando.
3. Elige **Operativo**, **En mantenimiento**, **Fuera de servicio** o **Retirado**. Agrega observaciones si son necesarias.
4. Guarda. Código y serie no pueden duplicarse dentro del mismo entorno.
5. Utiliza **Editar** para mantener los datos. Un activo con trabajo abierto no puede retirarse hasta resolver ese trabajo conforme a las reglas del sistema.
6. Pulsa **Ver historial**. Se abre Tickets con el filtro de ese ATM. Abre los casos para revisar intervenciones, resolución y actividades vinculadas. **Quitar filtro de activo** regresa a la cola general.

El estado del ATM lo actualiza el personal autorizado. Registrar un ticket no mide físicamente el equipo ni activa una conexión remota. Un activo retirado no se utiliza para registrar nuevas incidencias o actividades.

## 6. Atender un ticket completo

### Registrar la incidencia

1. En **Tickets** o **Vista general**, pulsa **Nuevo ticket**.
2. Escribe un resumen concreto, por ejemplo «El módulo pierde conexión durante la atención».
3. Selecciona el ATM existente.
4. Describe qué sucede, desde cuándo y qué se observó. No incluyas contraseñas ni información ajena al soporte.
5. Selecciona Hardware, Software, Conectividad, Mantenimiento o Instalación.
6. Elige prioridad. Administrador/supervisor pueden asignar responsable al crear; otros roles solicitan atención y esperan asignación.
7. Guarda y conserva el código `TK-...` generado. La ficha muestra los hitos y el plazo objetivo.

Los plazos propuestos son crítica **4 horas**, alta **8 horas**, media **24 horas** y baja **72 horas**, contadas desde la creación. Son horas continuas, incluyendo noches y fines de semana. Cambiar responsable no reinicia el reloj y **En espera** no lo pausa. Estos umbrales deben acordarse con la empresa antes de considerarlos SLA institucionales.

### Asignar y comenzar atención

1. Supervisión abre el ticket y pulsa **Asignar / clasificar**.
2. Selecciona responsable activo, prioridad y categoría. Escribe el motivo del cambio y guarda.
3. El técnico asignado entra a **Tickets → Mis asignados** y abre el caso.
4. Pulsa **En atención**, registra una nota de inicio y guarda.
5. Pulsa **Registrar intervención**, selecciona **Respuesta al solicitante**, escribe la comunicación realizada y guarda.

La **primera respuesta** se registra en el paso 5. Asignar un técnico o abrir la ficha no equivale a responder. Las respuestas posteriores quedan como eventos, pero no sustituyen el primer hito.

### Registrar seguimiento y actividades

Usa **Registrar intervención → Seguimiento técnico** para dejar avances. **Comentario** se utiliza para mensajes del caso. Un solicitante puede comentar sus tickets, pero no registrar una respuesta técnica en nombre del personal asignado.

Si la intervención requiere tareas, supervisión pulsa **Añadir** en **Actividades vinculadas**. El formulario conserva el vínculo con el ticket y su ATM. Completa la actividad siguiendo la sección 7. No es necesario crear una actividad ficticia para una atención simple; sí deben completarse o cancelarse justificadamente todas las que se hayan registrado.

Cuando la atención deba esperar, el técnico o supervisión seleccionan **En espera** y explican el motivo. Para retomar, seleccionan **En atención**.

### Resolver, cerrar y reabrir

1. Comprueba que existe primera respuesta y que las actividades vinculadas están completadas o canceladas.
2. Desde **En atención**, pulsa **Resuelto**.
3. Registra nota de intervención, diagnóstico y solución aplicada. Guarda.
4. El solicitante del caso o supervisión verifica el resultado y pulsa **Cerrado**, dejando su nota de validación.
5. Si la falla reaparece, supervisión pulsa **Reabrir** y registra el motivo. El estado vuelve a **En atención** y se conserva el historial de la resolución anterior.

Resolver y cerrar son hitos distintos. El tiempo de resolución utiliza la resolución técnica; el cierre documenta su validación. Un técnico que no es solicitante del caso no valida por sí solo el cierre. En un ticket cerrado no se agregan intervenciones hasta reabrirlo.

### Revisar calidad

Supervisión pulsa **Registrar revisión** en la ficha. Selecciona **Categorización** o **Monitoreo**, registra si cumple y escribe el criterio y la evidencia. Esas revisiones alimentan los indicadores. Tener categoría seleccionada no significa automáticamente que la categorización sea correcta.

## 7. Planificar y ejecutar actividades con recursos

1. Abre **Planificación → Nueva actividad**, o **Añadir** desde un ticket para vincularla a esa incidencia.
2. Registra actividad, ATM y alcance. Si todavía no se acordó un plan, guarda sin fechas. Queda **Pendiente**, lo que conserva la demanda para medir planificación.
3. Para programarla, completa responsable, inicio y fin previstos. El fin debe ser posterior al inicio. La actividad queda **Planificada**.
4. Abre su detalle y pulsa **Definir recurso**. Indica nombre, cantidad, unidad —por ejemplo, `piezas`— y fecha en que debe estar disponible.
5. Pulsa **Asignar** en el recurso. Registra la cantidad efectivamente entregada y su referencia. Se admiten entregas parciales; el sistema impide superar la cantidad requerida.
6. Cuando todas las líneas de recursos estén cubiertas, el responsable o supervisión pulsa **Iniciar actividad**, escribe evidencia de inicio y guarda. El servidor registra la hora real.
7. Terminada la tarea, pulsa **Completar actividad**, describe el trabajo y guarda. Se registra la fecha real de finalización.

No se permite iniciar con cantidades pendientes. Si la actividad no requiere recursos materiales, puede iniciarse sin líneas de recursos; documenta de forma coherente esa decisión. Tras empezar, la aplicación impide cambiar la planificación o añadir asignaciones que falseen su oportunidad.

Solo supervisión cancela una actividad, con motivo. La cancelación conserva el registro y puede afectar los denominadores de los reportes, que excluyen actividades canceladas según su definición. No utilices cancelaciones para ocultar retrasos.

Los recursos registran necesidades y entregas de la intervención. No descuentan existencias de almacén ni generan órdenes de compra.

## 8. Revisiones, desviaciones y acciones correctivas

1. Supervisión abre una actividad y pulsa **Registrar revisión**.
2. Selecciona **Sin desviaciones** o **Con desviaciones** y registra el criterio observado.
3. Si existe un hallazgo, pulsa **Registrar desviación**. Completa resumen, hallazgo, acción correctiva, responsable y fecha límite.
4. En **Control operativo → Desviaciones y acciones**, el responsable abre el seguimiento y pulsa **Iniciar**. Registra evidencia de ejecución.
5. Supervisión revisa el resultado y pulsa **Verificar cierre**, con evidencia suficiente. El estado pasa a **Cerrada**.

Una revisión y una acción correctiva son registros diferentes: la revisión da contexto a los indicadores de control; la correctiva organiza la respuesta al hallazgo. Registrar solo una desviación no reemplaza la revisión operativa explícita. El cierre conserva quién verificó y cuándo. No representa una prueba automática de eficacia a largo plazo.

## 9. Metas operativas

1. En **Control operativo**, selecciona **Metas operativas** y pulsa **Nueva meta**.
2. Define un título, valor objetivo, unidad e intervalo. Ejemplo de ensayo: «Completar diez mantenimientos», objetivo `10`, unidad `actividades`.
3. Selecciona **Al menos el valor objetivo** para metas crecientes o **Como máximo el valor objetivo** para límites como duración o incidencias.
4. Guarda la meta antes de evaluar su resultado.
5. Cuando haya evidencia, pulsa **Registrar evaluación**, escribe el valor observado y la fuente que lo respalda.

La aplicación compara el valor con el umbral. No infiere automáticamente la evaluación a partir del texto de la meta. Las reevaluaciones quedan en trazabilidad. Una meta vencida sin evaluación se conserva en el denominador del indicador; no desaparece para mejorar el porcentaje.

## 10. Indicadores operativos

Entra con administrador, supervisor o investigador en **Indicadores**, selecciona **Desde** y **Hasta** y espera la consulta. El intervalo máximo es 366 días. Cada tarjeta muestra valor, unidad, muestra y, cuando corresponde, numerador, denominador o pendientes. Abre **Cómo se calcula** para leer su fórmula.

| Código | Indicador | Definición de esta entrega |
|---|---|---|
| registro | Tasa de tickets registrados | Tickets creados en el intervalo / duración del intervalo en semanas. No es porcentaje de solicitudes recibidas. |
| categoria | Categorización correcta | Últimas revisiones de categoría conformes / revisiones de categoría elegibles en el intervalo. |
| actualizacion | Tickets actualizados | Tickets creados en el intervalo con respuesta, seguimiento o cambio de estado hasta el corte / tickets creados en el intervalo. |
| monitoreo | Tickets monitoreados | Tickets creados en el intervalo con revisión explícita de monitoreo hasta el corte / tickets creados en el intervalo. |
| respuesta | Tiempo de primera respuesta | Media en horas entre creación y primera respuesta de la cohorte; muestra respondidos y pendientes. |
| resolucion | Tiempo de resolución | Media en horas entre creación y última resolución de casos resueltos/cerrados al corte; pendientes se informan aparte. |
| planificacion | Actividades planificadas | Actividades creadas en el intervalo con plan registrado al corte / actividades creadas, excluyendo canceladas. |
| recursos | Recursos asignados a tiempo | Líneas con cantidad cubierta antes o en su plazo / líneas cuyo plazo venció en el intervalo. |
| cronograma | Cumplimiento de cronograma | Actividades terminadas antes o en su fin previsto / actividades con plazo vencido en el intervalo, incluidas pendientes vencidas. |
| ejecucion | Tiempo de ejecución | Media en horas entre inicio real y fin de las actividades completadas en el intervalo. |
| tareas | Tareas ejecutadas | Actividades creadas en el intervalo y completadas al corte / actividades creadas en el intervalo, excluyendo canceladas. |
| metas | Metas operativas cumplidas | Metas vencidas evaluadas que alcanzan su umbral / metas vencidas del intervalo, incluidas las no evaluadas. |
| desviaciones | Actividades con desviaciones | Actividades revisadas con al menos un resultado «Con desviaciones» / actividades con revisión operativa en el intervalo. |
| correctivas | Acciones correctivas oportunas | Acciones cerradas con evidencia antes o en su plazo / acciones con plazo vencido en el intervalo. |

Estas fórmulas operacionalizan los nombres del Anexo 2. Deben aprobarse junto con el instrumento del estudio. El indicador de desviaciones mide incidencia en actividades revisadas; no estima cuántas desviaciones desconocidas quedaron sin detectar. Los indicadores de recursos y cronograma no cuentan plazos futuros como incumplidos.

**Sin datos** significa que no existe denominador o muestra suficiente; no es 0 %. Los promedios de tiempos que excluyen pendientes deben leerse junto con el número de pendientes para evitar conclusiones optimistas.

Los informes se recalculan sobre los registros disponibles y pueden variar tras registrar revisiones o cancelar actividades. Para conservar una medición del estudio, utiliza la captura semanal y su evidencia. Ni un dashboard ni los datos ficticios prueban la hipótesis de mejora.

## 11. Registrar pretest, postest y mediciones

### Definir períodos

1. En **Investigación**, pulsa **Nuevo período**.
2. Define nombre, fase **Pretest** o **Postest**, inicio y fin.
3. En justificación, registra la decisión metodológica acordada. El avance menciona cuatro y ocho semanas por fase; el programa no elige esa duración por el asesor.
4. Guarda. Los períodos del mismo entorno no pueden solaparse, incluidos sus extremos.

### Capturar una semana desde la operación

1. Pulsa **Capturar semana** y selecciona el período.
2. Introduce el inicio de la semana dentro de ese período.
3. Guarda cuando la semana haya finalizado. La captura comprende siete días o, si termina antes, el final del período.
4. Se guardan juntos los 14 indicadores con fórmulas, intervalo, fecha y procedencia. Las filas quedan visibles en **Mediciones registradas**.

No se permite repetir la combinación período, inicio de semana e indicador ni editar mediciones guardadas. Revisa cuidadosamente período y fecha antes de capturar. Una captura es una instantánea de los registros disponibles al realizarla; no reconstruye información externa que nunca fue ingresada.

### Incorporar una medición de registros externos

1. Pulsa **Medición manual**.
2. Selecciona período, indicador e inicio de semana.
3. Para porcentajes, introduce numerador y denominador; el programa calcula el valor. El numerador no puede superar al denominador. Si el denominador es cero, el resultado es «Sin datos».
4. Para horas o tickets/semana, introduce el valor observado y un tamaño de muestra positivo.
5. Registra una fuente concreta y una referencia verificable de evidencia. Ejemplo: código y ubicación del registro institucional autorizado, período revisado y procedimiento de cálculo.
6. Guarda y consulta la fila resultante.

Este formulario permite incorporar observaciones pretest resumidas cuando todavía no se usaba el sistema. No importa automáticamente archivos ni valida que la evidencia exista: esa comprobación es responsabilidad del proceso de investigación. No se deben rellenar semanas reales con valores de ejemplo.

## 12. Exportar y usar Excel o SPSS

Hay tres exportaciones:

| Pantalla | Botón | Contenido |
|---|---|---|
| Tickets | Exportar | Tickets que cumplen filtros y permisos, con datos operativos. Máximo 5.000; reduce filtros si superas ese volumen. |
| Indicadores | Exportar indicadores | Los 14 resultados del intervalo, con nombre, unidad, fórmula, muestra y fecha de extracción. |
| Investigación | CSV para Excel / SPSS | Mediciones guardadas, fase, período, fuente, evidencia y fecha. |

El navegador guarda un `.csv`, normalmente en Descargas. Los archivos identifican el entorno. Revisa su contenido antes de compartirlo: los textos libres de tickets y evidencias pueden contener información institucional. Un CSV es un extracto; no sustituye el respaldo íntegro de la base.

**En Excel:** abre Excel → **Datos → Desde texto/CSV** → elige el archivo → usa UTF-8 y delimitador coma → comprueba la vista previa → carga los datos. Importa códigos e identificadores como texto para conservarlos. Este procedimiento también evita depender del separador regional del equipo. El archivo incorpora BOM UTF-8 para ayudar a conservar tildes y eñes.

**En SPSS:** utiliza el asistente de datos de texto de tu instalación → elige el CSV → codificación UTF-8 → primera fila como nombres → delimitador coma → comillas dobles como calificador. Revisa tipos antes de importar: códigos, fase y evidencia como cadenas; valores, numerador, denominador y muestra como numéricos. Trata los vacíos de valor como datos ausentes, no como ceros. Las fechas ISO pueden importarse primero como texto y transformarse explícitamente según la sintaxis del análisis.

No se necesita iniciar sesión en Microsoft ni proporcionar una clave IBM para generar el CSV. Son intercambios por archivo, no conexiones en línea a sus servicios. La ejecución de la importación en SPSS y de los análisis requiere una instalación disponible/licenciada y queda fuera de una verificación realizada solo desde esta aplicación. No se generan resultados de Kappa, significancia o contrastes pre/post sin ejecutar ese análisis sobre observaciones reales.

## 13. Entender y consultar la base de datos

El servidor guarda datos en disco. La base contiene, entre otras, estas tablas:

| Tabla | Qué conserva |
|---|---|
| `members` | Nombre, correo, rol, acceso habilitado y referencia del usuario. |
| `assets` | Código, serie, modelo, ubicación, estado y observaciones de ATM. |
| `tickets` | Incidencia, equipo, solicitante, responsable, prioridad, estado, hitos, diagnóstico y solución. |
| `activities` | Demanda de trabajo, ticket opcional, equipo, responsable, planificación y ejecución real. |
| `resource_requirements` | Recurso necesario, cantidad, unidad y fecha requerida. |
| `resource_allocations` | Cantidad entregada, momento, usuario y referencia de entrega. |
| `reviews` | Revisiones de categoría, monitoreo y operación, con resultado y evidencia. |
| `controls` | Hallazgo, correctiva, responsable, plazo, evidencia y cierre. |
| `goals` | Objetivo, unidad, criterio, período, última evaluación y evidencia. |
| `study_periods` | Períodos pretest/postest y justificación. |
| `measurements` | Valores semanales, muestra, fuente, evidencia y autor. |
| `events` | Historial con entidad, acción, autor y fecha. |
| `settings` | Estado interno de configuración/inicialización. |

La versión con inicio de sesión propio añade almacenamiento de credenciales derivadas y sesiones. La contraseña no se conserva como texto legible. No compartas esas tablas ni una copia de la base real como si fuera solo código fuente.

Las tablas adicionales son `credentials` (hash de contraseña con sal), `sessions` (hash de token y vencimiento), `login_attempts` (contadores de acceso) y `schema_migrations` (migraciones aplicadas y su comprobación). Son información técnica de la instalación; no forman parte de los indicadores de investigación.

Para inspeccionar información sin cambiarla, abre **una copia de respaldo** en un visor SQLite. Usa consultas `SELECT`, por ejemplo:

```sql
SELECT code, title, status, created_at, resolved_at
FROM tickets
ORDER BY created_at DESC;

SELECT a.code AS activo, COUNT(t.id) AS tickets
FROM assets a
LEFT JOIN tickets t ON t.asset_id = a.id
GROUP BY a.id, a.code
ORDER BY a.code;

SELECT entity, action, created_at
FROM events
ORDER BY created_at DESC
LIMIT 50;
```

Las tablas se relacionan por identificadores. Editarlas directamente puede romper reglas de negocio o hacer que una medición pierda su procedencia. Para cambios operativos utiliza la interfaz. El historial y las mediciones guardadas no disponen de borrado/edición como operación normal.

## 14. Respaldo y continuidad

Sigue los comandos de respaldo del README de la entrega. Conserva copias en una ubicación distinta al disco del servidor y limita su acceso. Los respaldos incluyen registros, historiales y datos de cuentas; son información sensible del proyecto.

Abre una segunda terminal en la carpeta del proyecto y ejecuta `npm.cmd run db:backup` para operación real, o `npm.cmd run db:backup -- --demo` para demostración. El servidor puede permanecer activo. El comando muestra el archivo `.sqlite` creado dentro de `backups/`. Para comprobar integridad y relaciones utiliza `npm.cmd run db:check` o añade `-- --demo` según corresponda.

Para recuperar una base real, detén el servidor, conserva la base anterior, copia el respaldo a un archivo nuevo como `data/recuperada.sqlite` y cambia `DATABASE_PATH=./data/recuperada.sqlite` en `.env`. Ejecuta `npm.cmd run db:check` y después `npm.cmd start`. Revisa los registros antes de continuar. Así no sobrescribes la base anterior. Si necesitas regresar, detén el servidor y restablece la ruta anterior en `.env`.

Para una copia manual, detén el servidor limpiamente con `Ctrl+C` antes de copiar la base. SQLite puede utilizar archivos auxiliares de transacciones mientras está activo; copiar solo el archivo principal durante escritura puede producir una copia incompleta. Prefiere el respaldo consistente previsto por el proyecto. Comprueba periódicamente una restauración en otra carpeta antes de depender del respaldo.

Para compartir el sistema con el asesor, entrega el código y documentación de la carpeta preparada, sin `.env`, bases reales, sesiones ni contraseñas personales. La demostración recrea sus propios registros ficticios al ejecutarse. Los datos reales no viajan por estar el código en otra computadora.

## 15. Resolver errores frecuentes

| Situación | Qué revisar |
|---|---|
| La página no abre | Verifica que la terminal del servidor está activa y usa exactamente host y puerto informados. |
| Inicio de sesión incorrecto | Distingue modo demo de real; comprueba correo, contraseña y que el acceso esté habilitado. |
| No aparece un módulo | Es una restricción del rol. Solicita al administrador revisar el acceso cuando corresponda. |
| Activo no aparece al registrar | Comprueba que existe en el entorno actual y no está retirado. |
| No inicia una actividad | Completa responsable y fechas; asigna toda la cantidad de cada recurso requerido. |
| No se resuelve un ticket | Registra primera respuesta técnica y termina o cancela justificadamente todas sus actividades; añade diagnóstico y solución. |
| No permite cambiar el responsable | Un ticket resuelto/cerrado requiere reapertura por supervisión antes de reasignar. |
| «El registro cambió en otra sesión» | Actualiza, revisa el último estado y repite únicamente el cambio que siga siendo necesario. |
| Medición repetida | Ya existe período/semana/indicador; consulta la fila antes de crear otra. |
| Captura de semana rechazada | Revisa que el inicio pertenezca al período y que la ventana completa haya terminado. |
| «Sin datos» en indicadores | Revisa intervalo, entorno y muestra; no se ha encontrado una base suficiente para el cálculo. |
| CSV se abre en una sola columna | Importa desde Datos → Desde texto/CSV y selecciona coma explícitamente. |
| Error interno al guardar | Conserva el identificador de error mostrado y revisa el registro del servidor sin publicar datos sensibles. |

## 16. Guion de demostración ante el asesor

1. Inicia demostración y explica que inventario, personas y casos son ficticios.
2. Muestra Vista general y abre el historial de un ATM.
3. Registra un ticket, asígnalo y registra primera respuesta.
4. Añade una actividad, programa responsable y fechas, define y asigna un recurso.
5. Inicia y completa la actividad; muestra las fechas y su trazabilidad.
6. Resuelve el ticket con diagnóstico/solución y valida el cierre.
7. Registra una revisión operativa y una acción correctiva; muéstrala en Control operativo.
8. Consulta indicadores y explica fórmula, muestra y pendientes de dos o tres métricas.
9. Exporta CSV y enseña la separación entre datos operativos, medición de investigación y análisis estadístico externo.
10. Cierra y vuelve a abrir el navegador para mostrar que los registros siguen en la base.

Usa este recorrido para demostrar funcionalidad. La demostración no sustituye la evaluación de campo, la validación del instrumento ni los resultados de la tesis.

## 17. Compartir y evaluar en otra computadora

Envía el ZIP de entrega completo y pide al destinatario extraerlo a una carpeta local. Debe instalar Node.js 24 LTS con npm, abrir una terminal en esa carpeta y ejecutar, en orden, `npm.cmd ci`, `npm.cmd run build` y `npm.cmd run demo`. Después entra en http://127.0.0.1:3000 con la cuenta de demostración indicada en la sección 1. La terminal debe permanecer abierta.

El archivo **COMPARTIR_Y_PROBAR.md**, incluido en la raíz del proyecto, explica cada paso, cómo revisar todos los módulos, cómo iniciar desarrollo y cómo devolver mejoras. El destinatario recibe el código completo y genera sus propios datos ficticios. No recibe tu base de trabajo ni comparte tus registros automáticamente.

Para descargar CSV utiliza Chrome, Edge o Firefox. En la revisión se verificó el contenido y los permisos del CSV desde el servidor; el navegador integrado no confirmó el evento de descarga. La comprobación de importación dentro de Excel/SPSS corresponde al equipo que disponga de esas aplicaciones.
