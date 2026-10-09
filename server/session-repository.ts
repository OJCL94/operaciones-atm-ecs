// R8 — Extraído de server/auth.ts (ver member-repository.ts para el
// contexto completo del refactor). Aísla el acceso a la tabla sessions.
import type { DatabaseSync } from "node:sqlite";

export class SessionRepository {
  constructor(private raw: DatabaseSync) {}

  findActiveMemberByTokenHash(tokenHash: string, now: number) {
    return this.raw
      .prepare(
        "SELECT m.* FROM sessions s JOIN members m ON m.id=s.member_id WHERE s.token_hash=? AND s.expires_at>? AND m.active=1 AND m.demo=0",
      )
      .get(tokenHash, now);
  }

  create(
    tokenHash: string,
    memberId: string,
    createdAt: number,
    expiresAt: number,
  ) {
    this.raw
      .prepare("INSERT INTO sessions VALUES(?,?,?,?)")
      .run(tokenHash, memberId, createdAt, expiresAt);
  }

  deleteByTokenHash(tokenHash: string) {
    this.raw.prepare("DELETE FROM sessions WHERE token_hash=?").run(tokenHash);
  }

  deleteExpired(now: number) {
    this.raw.prepare("DELETE FROM sessions WHERE expires_at<=?").run(now);
  }
}
