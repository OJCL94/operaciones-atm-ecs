import { scrypt, randomBytes, timingSafeEqual, createHash } from "node:crypto";
import { promisify } from "node:util";
import { z } from "zod";
import { raw, db } from "./database";
import { config } from "./config";
import { Service } from "../lib/service";
import { Actor, ensure } from "../lib/domain";
const derive = promisify(scrypt),
  cookieName = "nexo_session";
const options = { N: 65536, r: 8, p: 2, maxmem: 128 * 1024 * 1024 };
const hash = (s: string) => createHash("sha256").update(s).digest("hex");
export const passwordSchema = z
  .string()
  .min(12, "Usa al menos 12 caracteres.")
  .max(128, "Usa hasta 128 caracteres.");
export async function encodePassword(password: string) {
  passwordSchema.parse(password);
  const salt = randomBytes(16);
  const key = await (derive as any)(password, salt, 64, options);
  return `scrypt$65536$8$2$${salt.toString("hex")}$${key.toString("hex")}`;
}
async function verify(password: string, encoded: string) {
  const parts = encoded.split("$");
  if (parts.length !== 6) return false;
  const key = await (derive as any)(
    password,
    Buffer.from(parts[4], "hex"),
    64,
    options,
  );
  const expected = Buffer.from(parts[5], "hex");
  return expected.length === key.length && timingSafeEqual(expected, key);
}
function token(request: Request) {
  return (
    request.headers
      .get("cookie")
      ?.split(";")
      .map((s) => s.trim())
      .find((s) => s.startsWith(cookieName + "="))
      ?.slice(cookieName.length + 1) ?? ""
  );
}
export function sessionMember(request: Request) {
  const t = token(request);
  ensure(/^[a-f0-9]{64}$/.test(t), "Inicia sesión para acceder.", 401);
  const m = raw
    .prepare(
      "SELECT m.* FROM sessions s JOIN members m ON m.id=s.member_id WHERE s.token_hash=? AND s.expires_at>? AND m.active=1 AND m.demo=0",
    )
    .get(hash(t), Date.now());
  ensure(m, "La sesión venció. Vuelve a iniciar sesión.", 401);
  return m as unknown as Actor;
}
export async function context(request: Request) {
  const member = sessionMember(request);
  const demo = new URL(request.url).searchParams.get("demo") === "0" ? 0 : 1;
  ensure(
    !config.demo || demo === 1,
    "El servidor de demostración no admite registros reales.",
    403,
  );
  const realAdmin = member.role === "admin";
  let actor: Actor = { ...member, actualAdmin: realAdmin };
  const role = request.headers.get("x-demo-role");
  if (role && role !== "admin") {
    ensure(
      demo === 1 && realAdmin,
      "La simulación de roles requiere administrador y entorno de demostración.",
      403,
    );
    const sim = raw
      .prepare("SELECT * FROM members WHERE id=? AND demo=1")
      .get("demo-" + role);
    ensure(sim, "Perfil no disponible.");
    actor = { ...sim, actualAdmin: false } as Actor;
  }
  return {
    service: new Service(db, actor, demo),
    member,
    actor,
    realAdmin,
    demoOnly: config.demo,
  };
}
export function cookie(value: string, maxAge = 8 * 3600) {
  return `${cookieName}=${value}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${maxAge}${config.secure ? "; Secure" : ""}`;
}
let activeLogins = 0;
export async function login(body: any, ip: string) {
  const input = z
    .object({
      email: z
        .string()
        .trim()
        .email()
        .max(254)
        .transform((x) => x.toLowerCase()),
      password: z.string().min(1).max(128),
    })
    .parse(body);
  const keys = [hash("ip:" + ip), hash("account:" + input.email)];
  const now = Date.now();
  for (const k of keys) {
    const a = raw.prepare("SELECT * FROM login_attempts WHERE key=?").get(k);
    ensure(
      !a || Number(a.blocked_until) <= now,
      "Demasiados intentos. Espera 15 minutos.",
      429,
    );
  }
  ensure(
    activeLogins < 2,
    "Servicio ocupado. Intenta nuevamente en unos segundos.",
    429,
  );
  activeLogins++;
  try {
    const member = raw
      .prepare(
        "SELECT m.*,c.password_hash FROM members m JOIN credentials c ON c.member_id=m.id WHERE m.email=? AND m.demo=0 AND m.active=1",
      )
      .get(input.email);
    const fallback =
      "scrypt$65536$8$2$00000000000000000000000000000000$" + "00".repeat(64);
    const valid = await verify(
      input.password,
      String(member?.password_hash ?? fallback),
    );
    if (!member || !valid) {
      for (const k of keys) {
        const prev = raw
          .prepare("SELECT * FROM login_attempts WHERE key=?")
          .get(k);
        const n =
          prev && now - Number(prev.updated_at) < 900000
            ? Number(prev.failures) + 1
            : 1;
        raw
          .prepare(
            "INSERT INTO login_attempts VALUES(?,?,?,?) ON CONFLICT(key) DO UPDATE SET failures=excluded.failures,blocked_until=excluded.blocked_until,updated_at=excluded.updated_at",
          )
          .run(k, n, n >= 5 ? now + 900000 : 0, now);
      }
      ensure(false, "Correo o contraseña incorrectos.", 401);
    }
    for (const k of keys)
      raw.prepare("DELETE FROM login_attempts WHERE key=?").run(k);
    raw.prepare("DELETE FROM sessions WHERE expires_at<=?").run(now);
    raw
      .prepare("DELETE FROM login_attempts WHERE updated_at<?")
      .run(now - 86400000);
    const value = randomBytes(32).toString("hex");
    raw
      .prepare("INSERT INTO sessions VALUES(?,?,?,?)")
      .run(hash(value), String(member.id), now, now + 8 * 3600000);
    await new Service(db, member as unknown as Actor, config.demo ? 1 : 0)
      .event(
        "members",
        String(member.id),
        "sesion_iniciada",
        "Acceso con credenciales locales.",
      )
      .run();
    return cookie(value);
  } finally {
    activeLogins--;
  }
}
export function logout(request: Request) {
  raw
    .prepare("DELETE FROM sessions WHERE token_hash=?")
    .run(hash(token(request)));
  return cookie("", 0);
}
export async function passwordAction(
  request: Request,
  data: any,
  self = false,
) {
  ensure(
    data && typeof data === "object" && !Array.isArray(data),
    "Datos de credenciales inválidos.",
    422,
  );
  const { service: s, member } = await context(request);
  const id = self ? member.id : z.string().min(1).max(100).parse(data.id);
  if (!self) {
    ensure(
      member.role === "admin" && s.demo === 0,
      "Solo el administrador en el entorno real puede establecer contraseñas.",
      403,
    );
  }
  ensure(
    !config.demo,
    "La contraseña de demostración es pública y no se modifica.",
    403,
  );
  const target = raw
    .prepare("SELECT * FROM members WHERE id=? AND demo=0")
    .get(id);
  ensure(target, "Cuenta no encontrada.", 404);
  if (self) {
    const stored = raw
      .prepare("SELECT password_hash FROM credentials WHERE member_id=?")
      .get(id);
    ensure(
      stored &&
        (await verify(
          z.string().max(128).parse(data.current_password),
          String(stored.password_hash),
        )),
      "La contraseña actual no coincide.",
      401,
    );
  }
  const encoded = await encodePassword(data.password);
  await db.batch([
    db
      .prepare(
        "INSERT INTO credentials VALUES(?,?,?) ON CONFLICT(member_id) DO UPDATE SET password_hash=excluded.password_hash,updated_at=excluded.updated_at",
      )
      .bind(id, encoded, new Date().toISOString()),
    db.prepare("DELETE FROM sessions WHERE member_id=?").bind(id),
    s.event(
      "members",
      id,
      "credencial_actualizada",
      "Contraseña actualizada; sesiones anteriores revocadas.",
    ),
  ]);
  return { ok: true, signout: id === member.id };
}
export async function bootstrap(email: string, name: string, password: string) {
  ensure(
    !raw.prepare("SELECT id FROM members WHERE demo=0").get(),
    "Ya existe un administrador. Gestiona las cuentas desde el sistema.",
    409,
  );
  const mail = z.string().trim().email().max(254).parse(email).toLowerCase();
  const fullName = z.string().trim().min(3).max(160).parse(name);
  const encoded = await encodePassword(password);
  await db.batch([
    db
      .prepare(
        "INSERT INTO members(id,demo,email,name,role,active) VALUES('owner',0,?,?,'admin',1)",
      )
      .bind(mail, fullName),
    db
      .prepare("INSERT INTO credentials VALUES('owner',?,?)")
      .bind(encoded, new Date().toISOString()),
  ]);
}
