# Registro de cambios

Formato basado en [Keep a Changelog](https://keepachangelog.com/es-ES/1.1.0/).
Este proyecto documenta sus cambios como entregas del curso Evolución y
Configuración de Software (UPN); las versiones no siguen un calendario de
publicación, sino los hitos (`v0.0-antes`, etiquetas `refactor/*`) del plan
de recomendaciones RC-001 a RC-010.

## [1.1.0] — Refactorización SOLID completa (R1–R10)

Punto de llegada del plan de recomendaciones completo sobre el sistema
heredado etiquetado en `v0.0-antes`. Sin cambios de comportamiento
observable en ningún paso: cada refactorización se verificó con la
batería de pruebas automáticas (49 → 74 aserciones) y, para R1 y R4, con
comparación de salida exacta entre el código original y el refactorizado.

### Cambiado
- **R1 — `Service.execute`** dividido en manejadores por agregado
  (Command + Registry): complejidad ciclomática 77 → 2.
- **R2** — corrige la duplicación que R1 introdujo entre manejadores
  (`actorContext()`).
- **R3 — `Workspace`** dividido en 7 vistas por archivo: 1122 → 562 líneas.
- **R4 — `makeForm`** dividido en especificaciones por formulario:
  complejidad ciclomática 52 → 2.
- **R5** — corrige la duplicación que R4 introdujo entre especificaciones
  (`formContext()`/`formDefaults()`).
- **R5 — manejador HTTP** dividido en módulos con tabla de rutas:
  `server/index.ts` 207 → 85 líneas, complejidad 42 → 9.
- **R6** — `Row` (`Record<string, any>`) reemplazado por tipos de dominio
  concretos (`lib/entities.ts`) en `HandlerContext`/`lib/handlers/*`:
  56 → 24 referencias a `Row` en `lib/`. Efecto colateral detectado y
  corregido: `tsc --noEmit` fallaba en silencio por una opción de
  TypeScript 6 deprecada (`baseUrl`) y nunca llegaba a tipar el proyecto.
- **R7** — `now()`/`uuid()` pasan de funciones importadas directamente a
  los puertos inyectables `Clock`/`IdGenerator`, recibidos por el
  constructor de `Service` con los adaptadores del sistema real como
  valor por defecto.
- **R8** — `server/database.ts` deja de abrir la base como efecto
  colateral de ser importado; expone `openDatabase(path)`. Nuevo raíz de
  composición (`server/container.ts`) y dos repositorios
  (`MemberRepository`, `SessionRepository`) para que `server/auth.ts` deje
  de llamar a `raw.prepare(...)` directamente.
- **R9** — el cálculo de los 14 indicadores del panel de reportes pasa de
  un objeto literal único a un registro de estrategias por id
  (`lib/report-indicators.ts`), el mismo patrón Strategy + Registry de
  R1/R4. `lib/reports.ts`: 181 → 123 líneas.
- **R10** — `server/config.ts` valida las variables de entorno con Zod
  (antes, solo `PORT` y `APP_ORIGIN` se comprobaban, con dos `if` sueltos).

### Agregado
- `lib/entities.ts`: interfaces de dominio para las 13 tablas del esquema.
- `lib/clock.ts`: contratos `Clock`/`IdGenerator`.
- `server/container.ts`, `server/member-repository.ts`,
  `server/session-repository.ts`.
- `lib/report-indicators.ts`.
- Prueba 50 (`tests/service.cjs`): Clock/IdGenerator inyectados, sin
  recurrir al parcheo de `global.Date` que usan las pruebas 1-49.
- `DATA_DIR` y `BACKUP_DIR` documentadas en `.env.example`.
- Este archivo.

### Corregido
- `tsc --noEmit` ya no sale en silencio sin revisar ningún archivo
  (`ignoreDeprecations: "5.0"` + `vite/client` en `tsconfig.json`).
- `ignoreDeprecations: "6.0"` (el valor usado en el primer intento de este
  arreglo) no es un valor válido para TypeScript 5.9.3 y hace que
  `tsc --noEmit` — y por lo tanto `npm run build` — fallen con
  `TS5103: Invalid value for '--ignoreDeprecations'`. El valor correcto
  para esta versión de TypeScript es `"5.0"`.

## [1.0.0] — v0.0-antes (línea base)

Estado del sistema heredado tal como se recibió para el curso, antes de
cualquier refactorización: documentado en el informe técnico (sección de
arquitectura y diagnóstico) con sus métricas originales (`Service.execute`
CC 77, `makeForm` CC 52, `server/index.ts` CC 42, 1122 líneas en
`Workspace`, 0,26 % de duplicación según jscpd, 49 pruebas automáticas).
