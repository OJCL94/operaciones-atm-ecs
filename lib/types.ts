// Tipos compartidos entre Service y los manejadores (lib/handlers/).
// Viven en un archivo propio, sin depender de service.ts, para que los
// manejadores no tengan que importar la clase concreta: solo el contrato
// que necesitan (HandlerContext). Esto evita un ciclo de dependencia
// (service.ts -> handlers/* -> service.ts) y es, a la vez, un primer paso
// hacia la inversión de dependencias planificada para R7/R8.
import type { SqlDatabase, SqlStatement } from "./database-types";
import type { Actor } from "./domain";
import type { EntityByTable, Ticket, Activity } from "./entities";

// Fila genérica: sigue existiendo para el resultado de consultas SQL
// agregadas o ad-hoc (COUNT, SUM, JOIN entre varias tablas) que no
// corresponden a una sola entidad del dominio. R6 (ver lib/entities.ts)
// reemplaza su uso en entity()/create()/update() por los tipos concretos
// de cada tabla; Row deja de ser el tipo por defecto de una entidad.
export type Row = Record<string, any>;

// Nombre de tabla conocido en EntityByTable, o uno arbitrario (consultas
// contra una vista o tabla fuera del mapa siguen devolviendo Row).
type KnownTable = keyof EntityByTable;
export type EntityOf<T extends string> = T extends KnownTable ? EntityByTable[T] : Row;

// Subconjunto público de Service que los manejadores necesitan: acceso a
// datos, autorización y auditoría. Deliberadamente NO incluye execute(),
// tickets(), ticketDetail() ni los demás métodos de solo lectura del panel,
// que no son responsabilidad de un manejador de escritura.
export interface HandlerContext {
  readonly db: SqlDatabase;
  readonly actor: Actor;
  readonly demo: number;
  stmt(sql: string, args?: unknown[]): SqlStatement;
  all<T extends Row = Row>(sql: string, args?: unknown[]): Promise<T[]>;
  one<T extends Row = Row>(sql: string, args?: unknown[]): Promise<T | null>;
  entity<T extends string>(table: T, idValue: string): Promise<EntityOf<T>>;
  manage(): void;
  research(): void;
  write(): void;
  ticketAccess(t: Ticket, edit?: boolean): void;
  activityAccess(a: Activity, edit?: boolean): void;
  event(
    entity: string,
    entityId: string,
    action: string,
    detail: string,
    ticketId?: string | null,
    conditional?: boolean,
  ): SqlStatement;
  create<T extends string>(
    table: T,
    data: Partial<EntityOf<T>>,
    action: string,
    detail: string,
  ): Promise<string>;
  update<T extends string>(
    table: T,
    row: EntityOf<T>,
    v: number,
    values: Partial<EntityOf<T>>,
    action: string,
    detail: string,
  ): Promise<string>;
  validAssignee(memberId: string | null): Promise<void>;
}

// Forma de respuesta de un manejador de escritura (lib/handlers/*): el id
// del registro creado o afectado, o una confirmación simple. Antes de R6
// cada manejador declaraba `Promise<Row>` para esto, que describía
// erróneamente la respuesta como "una fila de alguna tabla" cuando en
// realidad nunca devuelven una entidad completa.
export type ActionResult = { id: string } | { ok: true };
