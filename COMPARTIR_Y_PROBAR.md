# Compartir Nexo y probarlo en otra computadora

## Qué enviar

Envía **Nexo_ATM_Entrega_Final.zip** por el medio que prefieras, o comparte únicamente la carpeta **Entrega_Final_Nexo_ATM**. Incluye el código completo, compilación, migraciones, ejemplos recreables, pruebas y manual. No es necesario enviar el documento de investigación para ejecutar la aplicación.

El paquete no contiene tu base de trabajo, sesiones, contraseñas personales, dependencias descargadas ni configuración privada. Quien lo recibe tendrá su propia base local. Los cambios que haga en su computadora no modificarán tu instalación.

## Primera ejecución en Windows

1. Instala **Node.js 24 LTS con npm** desde https://nodejs.org/ si aún no lo tienes. Cierra y vuelve a abrir la terminal después de instalarlo.
2. Extrae **todo** el ZIP a una carpeta local, por ejemplo `C:\Proyectos\Nexo_ATM`. No ejecutes los archivos dentro del ZIP.
3. Abre esa carpeta, donde se encuentran `package.json`, `README.md` e `INICIAR_DEMO.cmd`.
4. En la barra de dirección del Explorador escribe `powershell` y pulsa Enter. Se abrirá una terminal en esa carpeta.
5. Ejecuta estas órdenes por separado; espera a que termine cada una antes de continuar:

```powershell
node --version
npm.cmd ci
npm.cmd run build
npm.cmd run demo
```

6. Deja abierta la terminal. Abre Chrome, Edge o Firefox y entra exactamente en **http://127.0.0.1:3000**.
7. Ingresa con **admin@demo.local** y contraseña **NexoDemo2026!**.

La primera instalación necesita Internet para descargar las dependencias. Después de instalar y compilar, la demostración puede funcionar sin Internet. También puedes iniciar con doble clic en **INICIAR_DEMO.cmd**, una vez instalado Node.js.

La dirección `127.0.0.1` representa la computadora de quien la abre. Enviar solamente ese enlace a otra persona no comparte tu sistema: esa persona debe instalar y ejecutar el paquete en su propio equipo.

Para cerrar el servidor, vuelve a su terminal y pulsa **Ctrl+C**. Para usarlo otro día, abre la terminal en la carpeta del proyecto y ejecuta solamente `npm.cmd run demo`. Tus registros de demostración seguirán allí.

## Recorrido para revisar la funcionalidad completa

La cuenta de demostración permite cambiar de rol desde el selector de la aplicación. Es una simulación de permisos claramente identificada; en operación real cada persona tiene su propia cuenta.

| Área | Qué probar |
|---|---|
| Vista general | Abrir indicadores y acceder a casos pendientes. |
| Inventario ATM | Crear un equipo, editarlo, buscarlo y consultar sus incidencias. |
| Tickets | Crear, filtrar, asignar, registrar primera respuesta, comentar y consultar historial. |
| Actividades y recursos | Vincular actividad al ticket, programar responsable/fechas, definir y asignar recursos; iniciar y finalizar con evidencia. |
| Resolución y cierre | Resolver con diagnóstico y solución después de terminar las actividades; cerrar y comprobar el historial. Probar reapertura como supervisor/administrador. |
| Control operativo | Registrar revisión, desviación y acción correctiva; asignar, ejecutar y verificar cierre. |
| Metas | Definir objetivo, período y criterio; evaluar con evidencia. |
| Indicadores | Cambiar fechas, consultar fórmulas, muestras y los 14 indicadores; exportar. |
| Investigación | Crear períodos sin solapamientos, registrar mediciones o capturar una semana ya finalizada y exportar CSV. |
| Permisos | Cambiar entre administrador, supervisor, técnico, solicitante y auditor; comprobar el alcance de cada rol. |
| Persistencia | Crear un ticket, cerrar el servidor, iniciarlo de nuevo y comprobar que el ticket sigue guardado. |

El **manual completo** está en `docs/manual-usuario.html`: ábrelo con doble clic o visita http://127.0.0.1:3000/manual.html con el servidor activo. Incluye explicación de cada flujo, roles, fórmulas, base de datos, respaldo y solución de errores. La sección 16 contiene un guion de demostración.

Para probar cuentas individuales, detén la demo y sigue «Usar datos reales» en el README: `npm.cmd run admin` crea la primera cuenta y `npm.cmd start` abre una base independiente inicialmente vacía. Se pueden usar personas y casos ficticios también en ese entorno de evaluación.

## Base de datos y respaldo

No se instala MySQL. SQLite crea automáticamente **data/demo.sqlite** para la demo y **data/nexo.sqlite** para la operación real. Allí quedan registros, relaciones, historial y cuentas de cada entorno. No borres esos archivos si quieres conservar los datos.

Desde otra terminal, con la demostración en ejecución, puedes comprobar y respaldar:

```powershell
npm.cmd run db:check -- --demo
npm.cmd run db:backup -- --demo
```

El respaldo queda en `backups/`. La recuperación se explica en el README y en la sección 14 del manual. Exportar CSV sirve para revisar datos en Excel/SPSS; no reemplaza el respaldo de la base completa.

## Revisar código y hacer mejoras

La interfaz está en `app/` y `components/`, las reglas de negocio en `lib/`, el servidor en `server/` y las migraciones en `drizzle/`. La arquitectura y la matriz de requisitos están en `docs/`.

Trabaja en una copia de la carpeta o en una rama de Git para conservar una versión funcional. Detén primero el servidor de demostración y ejecuta:

```powershell
npm.cmd run dev -- --demo
```

Los cambios de interfaz se actualizan automáticamente. Tras modificar el servidor, detén y vuelve a ejecutar ese comando. Cuando termines una mejora:

```powershell
npm.cmd run build
npm.cmd test
```

La compilación comprueba TypeScript y las pruebas usan archivos aislados, sin modificar bases de trabajo. Documenta qué cambiaste, por qué y cómo lo probaste. Para devolver el proyecto, excluye `node_modules/`, `data/`, `backups/`, `.env` y `tests/output/`; conserva las licencias. No cambies migraciones ya aplicadas: agrega una nueva.

## Si algo impide iniciar

- **No reconoce node o npm:** instala Node.js con npm y abre una terminal nueva.
- **PowerShell bloquea npm.ps1:** usa `npm.cmd`, como en esta guía.
- **Falla la descarga de dependencias:** verifica conexión/proxy y repite `npm.cmd ci`.
- **El puerto 3000 está ocupado:** detén la otra instancia o cambia el puerto antes de iniciar, en la misma terminal:

```powershell
$env:PORT = '3001'
$env:APP_ORIGIN = 'http://127.0.0.1:3001'
npm.cmd run demo
```

Abre entonces http://127.0.0.1:3001. Si utilizas `.env`, mantén coherentes esos valores allí también.

- **No aparece el CSV descargado:** utiliza un navegador convencional y revisa sus descargas/permisos. La respuesta CSV del servidor fue verificada; el navegador integrado usado en la revisión no confirmó su evento de descarga.
- **El sistema rechaza una operación:** revisa el mensaje, el rol y los pasos previos exigidos; por ejemplo, una actividad no inicia si le faltan recursos.

La entrega está verificada localmente en Windows. Excel/SPSS reciben archivos CSV; no requieren una cuenta conectada al sistema. La importación y análisis dentro de esas aplicaciones, el despliegue público y la evaluación académica de campo son comprobaciones posteriores distintas de ejecutar esta demostración.
