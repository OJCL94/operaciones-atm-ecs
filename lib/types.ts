// Tipos compartidos entre Service y los manejadores (lib/handlers/).
// Viven en un archivo propio, sin depender de service.ts, para que los
// manejadores no tengan que importar la clase concreta: solo el contrato
// que necesitan (HandlerContext). Esto evita un ciclo de dependencia
// (service.ts -> handlers/* -> service.ts) y es, a la vez, un primer paso
// hacia la inversión de dependencias planificada para R7/R8.
import type { SqlDatabase, SqlStatement } from "./database-types";
import type { Actor } from "./domain";

export type Row = Record<string, any>;

// Subconjunto público de Service que los manejadores necesitan: acceso a
// datos, autorización y auditoría. Deliberadamente NO incluye execute(),
// tickets(), ticketDetail() ni los demás métodos de solo lectura del panel,
// que no son responsabilidad de un manejador de escritura.
export interface HandlerContext {
  readonly db: SqlDatabase;
  readonly actor: Actor;
  readonly demo: number;
  stmt(sql: string, args?: unknown[]): SqlStatement;
  all(sql: string, args?: unknown[]): Promise<Row[]>;
  one(sql: string, args?: unknown[]): Promise<Row | null>;
  entity(table: string, idValue: string): Promise<Row>;
  manage(): void;
  research(): void;
  write(): void;
  ticketAccess(t: Row, edit?: boolean): void;
  activityAccess(a: Row, edit?: boolean): void;
  event(
    entity: string,
    entityId: string,
    action: string,
    detail: string,
    ticketId?: string | null,
    conditional?: boolean,
  ): SqlStatement;
  create(table: string, data: Row, action: string, detail: string): Promise<string>;
  update(
    table: string,
    row: Row,
    v: number,
    values: Row,
    action: string,
    detail: string,
  ): Promise<string>;
  validAssignee(memberId: string | null): Promise<void>;
}
