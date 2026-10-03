export interface SqlResult {
  meta: { changes: number; lastInsertRowid?: number | bigint };
  results?: Record<string, any>[];
}
export interface SqlStatement {
  sql: string;
  args: unknown[];
  bind(...args: unknown[]): SqlStatement;
  first<T = Record<string, any>>(): Promise<T | null>;
  all(): Promise<{ results: Record<string, any>[] }>;
  run(): Promise<SqlResult>;
}
export interface SqlDatabase {
  prepare(sql: string): SqlStatement;
  batch(statements: SqlStatement[]): Promise<SqlResult[]>;
}
