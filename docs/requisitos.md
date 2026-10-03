# Requisitos y trazabilidad de Nexo

## Fuente principal y alcance

Documento: **EF_Daniel Alfredo Choquehuanca Tornero.docx**, titulado *Implementación de un sistema de tickets para mejorar la gestión operativa en una empresa de tecnología, Lima Metropolitana, 2026*. Autores consignados en la fuente: Daniel Alfredo Choquehuanca Tornero y Oliver Jhonatan Cueva Lopez.

La revisión abarca el cuerpo de 221 párrafos, tres tablas y cinco imágenes incorporadas: portada, informe de similitud, capítulos 1 y 2, referencias y tres anexos. Se utiliza la sección de origen como localizador. No se atribuyen números de página sin una paginación verificable del archivo. El documento no contiene resultados de la intervención, diseño técnico del sistema, diagrama de base de datos, UML, historias de usuario ni un manual de software. El esquema `G → O₁ → X → O₂` corresponde al diseño preexperimental de investigación.

El problema es la dispersión de registros de soporte, instalación y mantenimiento de módulos ATM. Se necesita relacionar el equipo, su estado, sus incidencias, las actividades de intervención y los responsables, y obtener indicadores sin reconstruir manualmente toda la operación. La solución materializa registro y seguimiento de tickets, planificación, ejecución y control operativo.

Los ATM de la investigación son módulos utilizados en el contexto de telecomunicaciones. No se implementan transacciones bancarias, gestión de efectivo ni conexión remota a equipos físicos. El inventario refleja información registrada por personas autorizadas.

## Convenciones y estado

- **D:** capacidad respaldada expresamente por la investigación. Los campos o reglas concretos pueden requerir una decisión de implementación.
- **I:** decisión propuesta para hacer operable una capacidad no especificada con detalle en la fuente.
- **U:** requisito del encargo de desarrollo.
- **Implementado:** hay código y recorrido para la capacidad; no equivale a afirmar que se ejecutaron todas sus pruebas posibles. Las comprobaciones efectivamente realizadas se consignan en el informe de verificación de la entrega.
- **Con límite:** existe la capacidad, con una restricción que debe considerarse al evaluar su aceptación.

## Matriz de trazabilidad

| ID | Clase | Requisito y origen | Módulo | Criterio de aceptación | Estado del alcance |
|---|---|---|---|---|---|
| R01 | D | Centralizar incidencias. Cap. 1, Realidad problemática; §2.3.2. | Tickets | Guardar genera código único; al reiniciar el servicio el caso continúa disponible. | Implementado con persistencia SQLite. |
| R02 | D | Registrar fecha, requerimiento, falla y categoría. §2.3.2; Anexo 2, Registro. | Tickets | El servidor rechaza título/descripcion incompletos y conserva fechas, activo, categoría y prioridad. | Implementado; catálogos propuestos. |
| R03 | D | Vincular incidencias e intervenciones con ATM. Cap. 1, Realidad problemática. | Activos, tickets y planificación | El historial de un activo filtra sus tickets; cada actividad vincula el mismo equipo que su ticket cuando existe relación. | Implementado. El historial respeta los permisos del usuario. |
| R04 | D | Conocer estado operativo de equipos. Cap. 1, Realidad problemática. | Activos y trazabilidad | Registrar un cambio de estado actualiza el inventario y genera un evento. | Implementado; actualización por registro humano, sin telemetría. |
| R05 | D | Asignar responsables y organizar carga. Cap. 1, Justificación práctica; §2.3.2. | Tickets y equipo | Asignar un miembro activo lo muestra en el caso y en su bandeja; guardar conserva autor y motivo. | Implementado. |
| R06 | D | Clasificar y direccionar solicitudes. Bases teóricas, Registro; Justificación; Anexo 2. | Tickets | Supervisión cambia categoría, prioridad y responsable con motivo obligatorio. | Implementado mediante clasificación y asignación explícitas. |
| R07 | D | Actualizar estados y supervisar avance. Bases teóricas, Seguimiento; §2.3.2. | Tickets | Solo se aceptan transiciones válidas y autorizadas; se conserva el estado anterior y el nuevo. | Implementado. |
| R08 | D | Registrar diagnóstico, trabajo y solución. Cap. 1, Realidad problemática. | Ticket y actividades | Las intervenciones registran tipo y detalle; resolver exige diagnóstico y solución. | Implementado con evidencia textual. |
| R09 | D | Registrar resolución y cierre. §2.3.2; Anexo 2, Resolución. | Tickets | Resolver exige primera respuesta y actividades finalizadas o canceladas; cerrar requiere solicitante del caso o supervisión. | Implementado; reapertura reservada a supervisión. |
| R10 | D | Medir tiempos de respuesta y resolución. §2.3.2; Anexo 2. | Indicadores | Promedios proceden de hitos persistidos y muestran tamaño de muestra y pendientes. | Implementado en horas continuas. |
| R11 | D | Conservar trazabilidad. Bases teóricas, Sistema de tickets; §2.3.2. | Historial y trazabilidad | Consultar creación, asignaciones, intervenciones y cambios con usuario y fecha. | Implementado; historial no editable desde la aplicación. |
| R12 | D | Planificar actividades y cronogramas. Bases teóricas, Planificación; §2.3.2; Anexo 2. | Planificación | Registrar demanda pendiente o programarla con responsable, inicio y fin; impedir fin anterior al inicio. | Implementado. |
| R13 | D | Asignar recursos oportunamente. Bases teóricas, Planificación; §2.3.2; Anexo 2. | Recursos de actividad | Registrar requisito, cantidad, unidad, plazo y entregas parciales; impedir sobreasignación e inicio sin cobertura. | Implementado; no es inventario de almacén ni compras. |
| R14 | D | Registrar ejecución de tareas. Bases teóricas, Ejecución; §2.3.2; Anexo 2. | Planificación | Iniciar y completar conserva fechas reales y evidencia; no permite completar una actividad aún pendiente. | Implementado. |
| R15 | D | Registrar metas operativas. Bases teóricas, Ejecución y Control; §2.3.2; Anexo 2. | Control operativo | Meta tiene período, unidad, umbral y dirección; su evaluación registra valor y evidencia. | Implementado; evaluación humana documentada. |
| R16 | D | Registrar desviaciones. Bases teóricas, Control; §2.3.2; Anexo 2. | Control operativo | Un hallazgo queda vinculado a una actividad y conserva descripción, responsable, plazo y estado. | Implementado. |
| R17 | D | Gestionar acciones correctivas. Bases teóricas, Control; §2.3.2; Anexo 2. | Control operativo | Responsable inicia una acción y supervisión verifica su cierre con evidencia. | Implementado; cerrar no demuestra por sí solo eficacia sostenida. |
| R18 | D | Obtener reportes e indicadores. Cap. 1, Realidad problemática y Justificación; Anexo 2. | Vista general e indicadores | Consultar intervalo obtiene agregados de registros; sin denominador se presenta «Sin datos». | Implementado, 14 indicadores con fórmulas propuestas. |
| R19 | D | Producir registros estructurados para investigación. §§2.3.1–2.3.3. | Investigación y exportación | CSV conserva fechas, identificador del indicador, procedencia, fórmula o evidencia según exportación. | Implementado; no incluye importación masiva de tickets históricos. |
| R20 | D | Permitir medición antes y después. §§2.1.3, 2.3.3 y 2.4. | Investigación | Definir períodos sin solapamiento; registrar mediciones semanales manuales o capturas del sistema. | Implementado. Duración definitiva requiere acuerdo metodológico. |
| R21 | D | Proteger confidencialidad y procedencia. §2.5. | Seguridad y datos | Sesión y rol limitan consultas y cambios; demo y operación real se distinguen. | Implementado; la autorización institucional para datos reales corresponde al estudio. |
| R22 | I/U | Definir cuentas y permisos de servidor. Necesario para R05/R21; encargo 2 y 9. | Autenticación y equipo | Sin sesión no hay acceso a datos; cambiar parámetros del navegador no otorga privilegios. | Implementación con correo, contraseña y sesiones propias; ver pruebas de entrega. |
| R23 | I | Definir prioridades, categorías y plazos. §2.3.2 menciona SLA sin valores. | Reglas de negocio | Categoría y prioridad se validan; una reasignación no reinicia el plazo desde la creación. | Implementado. Valores definidos en código y documentados; sin editor de SLA en la interfaz. |
| R24 | U | Persistencia, relaciones y migraciones. Encargo 5, 9 y 11. | Base de datos | Instalación limpia aplica SQL; FK, índices y restricciones rechazan relaciones inválidas. | Implementado; SQLite local de una instancia. |
| R25 | U | Interfaz española, adaptable y accesible. Encargo 6. | Interfaz | Operar formularios con etiquetas, foco visible, estados de carga/error/vacío y navegación móvil. | Implementado; no se afirma certificación integral WCAG. |
| R26 | U | Buscar, filtrar y paginar. Encargo 8 y 9. | Listados | La búsqueda modifica resultados reales; filtros de tickets y páginas respetan el acceso. | Implementado; 15 tickets o 30 registros generales por página. |
| R27 | U | Instalación, configuración y despliegue. Encargo 4 y 11. | Entrega | Instalar dependencias, compilar, iniciar demo y crear cuenta real siguiendo README. | Documentación y configuración de ejemplo incluidas; ver validación de arranque. |
| R28 | U | Verificar recorridos, permisos y errores. Encargo 10. | Calidad | Informe identifica escenarios ejecutados, resultado y limitaciones sin atribuir pruebas inexistentes. | Consultar informe de verificación de esta entrega. |
| R29 | I | Intercambio CSV para Excel/SPSS. §§2.3.3–2.4. | Exportaciones | Generar UTF-8 con BOM, comillas escapadas y protección contra fórmulas; documentar importación externa. | Exportador implementado. Ejecución dentro de SPSS pendiente de instalación licenciada. |
| R30 | I | Revisiones humanas de categoría y monitoreo. Anexo 2. | Supervisión de tickets | Resultado y evidencia se registran explícitamente; la mera creación no cuenta como revisión. | Implementado. |

## Roles propuestos

| Capacidad | Administrador | Supervisor | Técnico | Solicitante | Investigador / auditor |
|---|---|---|---|---|---|
| Consultar inventario | Sí | Sí | Sí | Sí | Sí |
| Crear/editar activos | Sí | Sí | No | No | No |
| Crear ticket | Sí | Sí | Sí | Sí | No |
| Consultar tickets | Todos del entorno | Todos del entorno | Propios o asignados | Propios | Todos del entorno |
| Asignar y clasificar | Sí | Sí | No | No | No |
| Atender y resolver | Sí | Sí | Solo asignados | No | No |
| Comentar un caso visible | Sí | Sí | Sí | Propios | No |
| Validar cierre | Sí | Sí | Solo si es solicitante del caso | Propios | No |
| Reabrir | Sí | Sí | No | No | No |
| Planificar y asignar recursos | Sí | Sí | No | No | No |
| Ejecutar actividades | Sí | Sí | Solo a cargo | No | No |
| Registrar revisiones, metas y desviaciones | Sí | Sí | No | No | No |
| Iniciar acción correctiva | Sí | Sí | Solo a cargo | No | No |
| Verificar cierre de correctiva | Sí | Sí | No | No | No |
| Indicadores, investigación y trazabilidad | Sí | Sí | No | No | Sí |
| Crear períodos y mediciones | Sí | Sí | No | No | Sí |
| Administrar usuarios reales | Sí | No | No | No | No |

El investigador tiene lectura de operación y escritura limitada a períodos/mediciones. El servidor controla estos permisos; ocultar botones no es el mecanismo de seguridad. No existe una categoría de comentario privado dentro de un ticket: sus participantes autorizados pueden ver las intervenciones. Por ello se debe evitar registrar información sensible ajena al caso.

## Decisiones de negocio propuestas

Las categorías son Hardware, Software, Conectividad, Mantenimiento e Instalación. Los plazos desde creación son: crítica 4 horas, alta 8 horas, media 24 horas y baja 72 horas. Son horas continuas; «En espera» no pausa el reloj. La tesis no proporciona horarios laborales, SLA institucionales ni reglas automáticas de enrutamiento.

Las actividades pueden registrarse pendientes para conservar demanda aún no planificada. Para quedar planificadas requieren responsable e intervalo previsto. Los recursos se definen y asignan antes del inicio. No es posible añadir trabajo a un ticket resuelto o cerrado ni resolver con trabajo pendiente.

Los reportes muestran hechos operativos. Los valores de demostración no son mediciones del estudio. Las capturas semanales conservan el resultado disponible al capturar junto con su fórmula y fecha; la captura no comprueba la autenticidad de evidencia externa.

## Vacíos y contradicciones académicas

1. La fuente menciona **cuatro y ocho semanas por fase**. El programa admite intervalos configurables; el protocolo debe fijar uno antes de recopilar y comparar observaciones.
2. §2.1 presenta investigación **aplicada**, mientras el Anexo 1 indica **básica**. El texto académico necesita coherencia; el programa no corrige esa clasificación.
3. El cronograma prevé pruebas y postest parcialmente superpuestos. Conviene iniciar postest sobre una versión estabilizada y registrar su fecha.
4. El Anexo 2 nombra indicadores sin fórmulas, cohortes, umbrales ni reglas sobre datos ausentes. Las fórmulas de esta entrega son una operacionalización propuesta, que debe contrastarse con los instrumentos validados.
5. No hay inventario institucional, línea base, volumen de usuarios, horarios ni credenciales externas entregadas. Los ejemplos son ficticios.
6. La fuente no exige Scrum ni un stack específico. El trabajo se organiza por capacidades verificables: datos y accesos; atención; planificación y control; medición; calidad y entrega. No se atribuyen reuniones, sprints académicos realizados ni actas que no existan.

## Alcance pendiente fuera del producto

La validación por expertos, Kappa de Cohen, piloto metodológico, permisos institucionales, recolección pre/post y contrastes estadísticos necesitan ejecución real. La aplicación aporta registros y exportaciones; no acredita automáticamente mejora, causalidad, significancia ni cumplimiento de hipótesis. Tampoco incluye notificaciones por correo/SMS, telemetría, adjuntos binarios, recuperación de contraseña por correo ni interfaces a sistemas empresariales no especificados en la fuente.
