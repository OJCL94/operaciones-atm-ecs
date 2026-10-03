# Nexo · Operaciones ATM

Sistema web de tickets y gestión operativa para módulos ATM. Integra inventario, incidencias, actividades, recursos, control, indicadores y mediciones de investigación. La aplicación funciona con un servidor propio y base SQLite; no necesita suscripciones ni credenciales de servicios externos.

## Probar la demostración

Requisitos: **Node.js 24 LTS con npm**. Se verificó con Node **24.19.0**, npm **11.6.2** y Windows. El mínimo declarado es Node 22.16; otras versiones/plataformas no se comprobaron. Instala Node desde [su página oficial](https://nodejs.org/). La primera instalación necesita Internet para descargar dependencias; la aplicación compilada funciona localmente.

1. Extrae toda la carpeta a una ubicación local, por ejemplo `C:\Proyectos\Nexo_ATM`. Evita una carpeta sincronizada para la base activa.
2. Abre PowerShell en la carpeta que contiene `package.json`.
3. Ejecuta, uno por uno:

```powershell
npm.cmd ci
npm.cmd run build
npm.cmd run demo
```

4. Abre **http://127.0.0.1:3000**. Mantén la terminal abierta.
5. Ingresa con **admin@demo.local** y **NexoDemo2026!**.

Son credenciales públicas exclusivamente para demostración. La primera entrada carga ejemplos ficticios; las entradas siguientes conservan tus cambios. El selector de roles permite comprobar los distintos permisos sin modificar cuentas reales. Para detener el servidor pulsa `Ctrl+C`; para volver a abrirlo basta `npm.cmd run demo`.

También puedes usar **INICIAR_DEMO.cmd**, que comprueba las dependencias, prepara la compilación cuando falta e inicia la demostración. En macOS/Linux utiliza `npm` en lugar de `npm.cmd`.

## Manual y documentación

- [Manual completo e imprimible](docs/manual-usuario.html): abrir con doble clic; no requiere servidor. Con el servidor activo también está en **http://127.0.0.1:3000/manual.html** y en **Guía de uso**.
- [Manual editable](docs/manual-usuario.md): instalación, cuentas, cada proceso, indicadores, exportaciones, base de datos y respaldo.
- [Requisitos y trazabilidad](docs/requisitos.md): origen en la investigación, decisiones propuestas y criterios de aceptación.
- [Arquitectura](docs/arquitectura.md): componentes, relaciones, autenticación, seguridad y límites.
- [Referencias revisadas](docs/referencias.md): patrones de interfaz y documentación oficial consultada.
- [Verificación](docs/verificacion.md): resultados ejecutados y aspectos no comprobados.
- [Licencias de terceros](THIRD_PARTY_NOTICES.md).

## Usar datos reales

Detén la demostración antes de arrancar el modo real en el mismo puerto.

```powershell
Copy-Item .env.example .env
npm.cmd run admin
npm.cmd start
```

`admin` pregunta correo, nombre y contraseña del primer administrador. La contraseña debe tener 12–128 caracteres y no se muestra al escribir. No existe una contraseña real predeterminada. El comando se niega a crear otro administrador cuando ya hay cuentas reales.

Entra con esa cuenta y abre **Equipo y acceso**. Registra cada persona, guarda y pulsa **Establecer contraseña**. Comunica la contraseña inicial individualmente; cada persona puede usar **Cambiar mi contraseña**. Deshabilitar una cuenta impide su acceso y conserva el historial. Actualizar una contraseña revoca sus sesiones anteriores.

Antes de usar información institucional, acuerda permisos, fórmulas, período del estudio y plazos con el responsable/asesor. Las decisiones propuestas están identificadas en la matriz. No uses registros ficticios como pretest/postest.

## Base de datos y archivos

| Archivo/carpeta | Función |
|---|---|
| `data/demo.sqlite` | Ejemplos y pruebas manuales del modo demo. |
| `data/nexo.sqlite` | Cuentas y registros del modo real; se crea automáticamente. |
| `drizzle/*.sql` | Cinco migraciones del esquema, restricciones y autenticación. |
| `backups/` | Copias consistentes generadas por el comando de respaldo. |
| `.env` | Configuración privada de la instalación, excluida de la entrega. |
| `dist/` | Interfaz compilada; única carpeta servida como archivos públicos. |
| `build/` | Servidor y herramienta administrativa compilados. |

La base permanece cuando cierras sesión, navegador o servidor. No requiere instalar MySQL ni ejecutar un servicio de base de datos adicional. Las migraciones se aplican automáticamente en orden y se comprueba que no hayan sido modificadas después de aplicarse. No edites SQL ya aplicado: agrega una nueva migración.

Para consultar tablas utiliza **una copia de respaldo** con un visor SQLite; el manual incluye consultas `SELECT`. No edites directamente el historial, las credenciales o los indicadores capturados.

### Verificar y respaldar

```powershell
# Operación real
npm.cmd run db:check
npm.cmd run db:backup

# Demostración
npm.cmd run db:check -- --demo
npm.cmd run db:backup -- --demo
```

`db:check` verifica integridad, relaciones y migraciones. `db:backup` genera una copia consistente incluso si el servidor está activo y muestra su ruta. Guarda copias fuera del equipo de trabajo. El respaldo contiene información de usuarios y debe tratarse como privado. Puedes configurar `BACKUP_DIR` para cambiar su destino.

### Restaurar sin sobrescribir el original

1. Detén el servidor con `Ctrl+C`.
2. Conserva la base actual y sus archivos auxiliares como respaldo del estado anterior.
3. Copia el respaldo que quieras recuperar a **un archivo nuevo**, por ejemplo `data/recuperada.sqlite`.
4. En `.env` establece `DATABASE_PATH=./data/recuperada.sqlite`.
5. Ejecuta `npm.cmd run db:check` y, si no informa errores, `npm.cmd start`.
6. Comprueba que los registros esperados están presentes. Volver al archivo anterior solo requiere detener el servidor y cambiar `DATABASE_PATH`.

Para restaurar una demostración en una carpeta separada, copia el respaldo a `demo.sqlite` dentro de esa carpeta y configura `DATA_DIR` con su ruta antes de usar `--demo`. No copies únicamente el archivo principal mientras SQLite está escribiendo: utiliza el respaldo consistente.

## Configuración y desarrollo

| Variable | Predeterminado | Descripción |
|---|---|---|
| `HOST` | `127.0.0.1` | Interfaz donde escucha el servidor. |
| `PORT` | `3000` | Puerto HTTP local. |
| `APP_ORIGIN` | `http://127.0.0.1:3000` | Dirección exacta usada en el navegador; no lleva `/` final. |
| `COOKIE_SECURE` | `false` | Cambiar a `true` al servir mediante HTTPS. |
| `DATABASE_PATH` | `./data/nexo.sqlite` | Archivo de operación real. |
| `DATA_DIR` | `data` | Carpeta de datos; demo siempre usa `demo.sqlite` dentro de ella. |
| `BACKUP_DIR` | `backups` | Destino de respaldos. |

Si cambias el puerto cambia también `APP_ORIGIN`. No intercambies `localhost` y `127.0.0.1`: las escrituras comprueban el origen exacto.

```powershell
npm.cmd run dev -- --demo
npm.cmd run typecheck
npm.cmd run build
npm.cmd test
```

El modo desarrollo recompila la interfaz automáticamente. Tras modificar el servidor, reinicia `dev`. Las pruebas usan cuentas sintéticas y archivos independientes dentro de `tests/output/`; no operan sobre tus bases reales. La compilación detiene el proceso si encuentra errores TypeScript.

La implementación se organiza en `app/` (pantallas), `components/` (controles), `lib/` (reglas y métricas), `server/` (HTTP, sesión y SQLite), `drizzle/` (migraciones), `tests/` y `docs/`.

## Integraciones, despliegue y alcance

El intercambio con **Excel y SPSS es por CSV**, generado desde tickets, indicadores o mediciones. No hay sincronización con cuentas Microsoft/IBM. La exportación se probó; la importación dentro de SPSS y el análisis estadístico requieren ejecutarse en una instalación del investigador. No se conectan equipos ATM físicos ni servicios bancarios, correo o SMS.

Para un servidor compartido: instala y compila, configura almacenamiento local persistente fuera de carpetas sincronizadas, crea el administrador, configura un proxy HTTPS hacia el puerto local y establece `APP_ORIGIN=https://tu-dominio` y `COOKIE_SECURE=true`. Ejecuta Node como servicio con usuario limitado, respaldos y reinicio supervisado. Mantén una única instancia que acceda al archivo SQLite. La clave de sesión nunca se entrega a servicios externos.

La entrega fue comprobada **localmente**; no se afirma un despliegue público, auditoría de penetración, carga de gran escala ni certificación WCAG. El estado de cada requisito y las restricciones de consulta/exportación figuran en `docs/requisitos.md`. No contiene resultados académicos reales: la recolección, validación del instrumento y contraste de hipótesis siguen siendo actividades del estudio.

## Compartir con el asesor

Comparte la carpeta de entrega o su ZIP, con código, migraciones, configuración de ejemplo y documentación. No incluyas `.env`, `data/`, `backups/`, `tests/output/` ni `node_modules/`. El asesor ejecuta `npm ci`, `npm run build` y `npm run demo` en su equipo. Conserva los avisos de terceros incluidos.

Consulta [Compartir y probar en otra computadora](COMPARTIR_Y_PROBAR.md) para las instrucciones paso a paso destinadas a tu asesor o a un colaborador que quiera revisar y mejorar el código.
