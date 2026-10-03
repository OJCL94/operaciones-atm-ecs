// Extraído de lib/service.ts (R1): este manejador conserva exactamente el
// comportamiento original del caso "member.save" dentro de Service.execute.
// Ningún criterio de autorización, validación ni persistencia fue modificado.
import { z } from "zod";
import { now, uuid } from "../clock";
import { ensure, isManager } from "../domain";
import type { HandlerContext, Row } from "../types";
import { id, optId, short, memo, date, version } from "./shared-schemas";

export async function memberSave(
  svc: HandlerContext,
  input: unknown,
): Promise<Row> {
  const a = svc.actor,
    d = svc.demo,
    t = now();
  ensure(
    a.role === "admin" && a.actualAdmin !== false,
    "Solo el administrador real gestiona accesos.",
    403,
  );
  ensure(d === 0, "Los accesos se administran en el entorno real.");
  const p = z
    .object({
      id: optId,
      version: version.optional(),
      email: z
        .string()
        .trim()
        .email()
        .max(200)
        .transform((v) => v.toLowerCase()),
      name: short,
      role: z.enum([
        "admin",
        "supervisor",
        "tecnico",
        "solicitante",
        "auditor",
      ]),
      active: z.boolean(),
    })
    .parse(input);
  if (p.id) {
    const member = await svc.entity("members", p.id);
    ensure(
      p.id !== a.id || (p.role === "admin" && p.active),
      "No puedes retirar tu propio acceso administrativo.",
    );
    ensure(
      member.email === p.email,
      "El correo de un acceso existente es inmutable.",
    );
    ensure(p.version, "Falta versión");
    await svc.update(
      "members",
      member,
      p.version,
      { name: p.name, role: p.role, active: Number(p.active) },
      "acceso_actualizado",
      JSON.stringify(p),
    );
    return { id: p.id };
  }
  const mid = uuid();
  await svc.create(
    "members",
    {
      id: mid,
      email: p.email,
      name: p.name,
      role: p.role,
      active: Number(p.active),
      demo: 0,
    },
    "acceso_creado",
    p.email,
  );
  return { id: mid };
}
