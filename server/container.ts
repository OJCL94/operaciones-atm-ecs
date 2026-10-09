// R8 — Raíz de composición. Único lugar del proyecto que decide con qué
// archivo SQLite real trabaja el servidor y arma, a partir de él, las
// piezas que el resto de server/ y lib/ solo conocen por su contrato
// (SqlDatabase, MemberRepository, SessionRepository). Antes de R8, cada
// módulo que necesitaba la base (index.ts, auth.ts, manage.ts,
// api-router.ts) importaba el singleton `raw`/`db` directamente de
// server/database.ts, que a su vez lo abría como efecto colateral de ser
// importado la primera vez — ambas cosas acoplaban todo el servidor a
// "la" base de datos del proceso y hacían imposible crear una segunda
// instancia (por ejemplo, para una prueba) sin trucos de aislamiento de
// módulos.
import { openDatabase } from "./database";
import { databasePath } from "./config";
import { MemberRepository } from "./member-repository";
import { SessionRepository } from "./session-repository";

const { raw, db } = openDatabase(databasePath);
const members = new MemberRepository(raw);
const sessions = new SessionRepository(raw);

export const container = { raw, db, members, sessions };
export { raw, db, members, sessions };
