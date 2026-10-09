// R8 — Extraído de server/auth.ts: ese módulo mezclaba política de
// autenticación (verificar contraseña, limitar intentos, emitir cookie)
// con acceso directo a `raw.prepare(...)` sobre members, credentials y
// login_attempts. MemberRepository aísla la segunda parte para que
// auth.ts dependa de un contrato con nombres de dominio
// (findByEmailWithCredential, recordLoginFailure...) en vez de SQL
// disperso entre su propia lógica de negocio.
import type { DatabaseSync } from "node:sqlite";

export interface MemberWithCredential {
  id: string;
  email: string;
  name: string;
  role: string;
  active: 0 | 1;
  password_hash: string | null;
}

export class MemberRepository {
  constructor(private raw: DatabaseSync) {}

  hasRealAdmin(): boolean {
    return !!this.raw.prepare("SELECT id FROM members WHERE demo=0").get();
  }

  findByEmailWithCredential(email: string): MemberWithCredential | undefined {
    return this.raw
      .prepare(
        "SELECT m.*,c.password_hash FROM members m JOIN credentials c ON c.member_id=m.id WHERE m.email=? AND m.demo=0 AND m.active=1",
      )
      .get(email) as MemberWithCredential | undefined;
  }

  findDemoProfile(role: string) {
    return this.raw
      .prepare("SELECT * FROM members WHERE id=? AND demo=1")
      .get("demo-" + role);
  }

  findCredentialHash(memberId: string): string | undefined {
    const row = this.raw
      .prepare("SELECT password_hash FROM credentials WHERE member_id=?")
      .get(memberId) as { password_hash: string } | undefined;
    return row?.password_hash;
  }

  findRealById(id: string) {
    return this.raw
      .prepare("SELECT * FROM members WHERE id=? AND demo=0")
      .get(id);
  }

  loginAttempts(key: string) {
    return this.raw.prepare("SELECT * FROM login_attempts WHERE key=?").get(
      key,
    ) as { failures: number; blocked_until: number; updated_at: number } | undefined;
  }

  recordLoginFailure(
    key: string,
    failures: number,
    blockedUntil: number,
    now: number,
  ) {
    this.raw
      .prepare(
        "INSERT INTO login_attempts VALUES(?,?,?,?) ON CONFLICT(key) DO UPDATE SET failures=excluded.failures,blocked_until=excluded.blocked_until,updated_at=excluded.updated_at",
      )
      .run(key, failures, blockedUntil, now);
  }

  clearLoginAttempts(key: string) {
    this.raw.prepare("DELETE FROM login_attempts WHERE key=?").run(key);
  }

  pruneLoginAttempts(olderThan: number) {
    this.raw
      .prepare("DELETE FROM login_attempts WHERE updated_at<?")
      .run(olderThan);
  }
}
// Nota: crear el primer administrador (bootstrap) y actualizar una
// credencial (passwordAction) ya escribían a través de `db: SqlDatabase`
// (lib/database-types) con db.batch([...]) para que ambas filas se
// inserten en una sola transacción — ese código ya cumplía DIP antes de
// R8 y se deja intacto en server/auth.ts; este repositorio solo asume
// las lecturas y escrituras sueltas que usaban `raw.prepare(...)`
// directamente, sin pasar por esa abstracción.
