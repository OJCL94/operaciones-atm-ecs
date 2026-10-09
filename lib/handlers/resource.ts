// Extraído de lib/service.ts (R1): este manejador conserva exactamente el
// comportamiento original del caso "resource.require" dentro de Service.execute.
// Ningún criterio de autorización, validación ni persistencia fue modificado.
import { z } from "zod";
import { uuid } from "../clock";
import { actorContext } from "./context";
import { ensure, isManager } from "../domain";
import type { HandlerContext, ActionResult } from "../types";
import { id, optId, short, memo, date, version } from "./shared-schemas";

export async function resourceRequire(
  svc: HandlerContext,
  input: unknown,
): Promise<ActionResult> {
  const { a, d, t } = actorContext(svc);
  svc.manage();
  const p = z
    .object({
      activity_id: id,
      name: short,
      quantity: z.number().positive().max(100000),
      unit: short,
      required_by: date,
    })
    .parse(input);
  const act = await svc.entity("activities", p.activity_id);
  ensure(
    ["pendiente", "planificada"].includes(act.status),
    "Define recursos antes de iniciar la actividad.",
  );
  const rid = uuid();
  await svc.create(
    "resource_requirements",
    { id: rid, demo: d, ...p },
    "recurso_requerido",
    p.name,
  );
  return { id: rid };
}
export async function resourceAllocate(
  svc: HandlerContext,
  input: unknown,
): Promise<ActionResult> {
  const { a, d, t } = actorContext(svc);
  svc.manage();
  const p = z
    .object({
      requirement_id: id,
      quantity: z.number().positive().max(100000),
      note: memo,
    })
    .parse(input);
  const r = await svc.entity("resource_requirements", p.requirement_id);
  const act = await svc.entity("activities", r.activity_id);
  ensure(
    ["pendiente", "planificada"].includes(act.status),
    "La actividad ya comenzó o finalizó.",
  );
  const allocation = uuid();
  const out = await svc.db.batch([
    svc.stmt(
      "INSERT INTO resource_allocations(id,requirement_id,quantity,allocated_at,actor_id,note) SELECT ?,?,?,?,?,? WHERE COALESCE((SELECT SUM(quantity) FROM resource_allocations WHERE requirement_id=?),0)+? <= (SELECT quantity FROM resource_requirements WHERE id=?)",
      [
        allocation,
        p.requirement_id,
        p.quantity,
        t,
        a.id,
        p.note,
        p.requirement_id,
        p.quantity,
        p.requirement_id,
      ],
    ),
    svc.event(
      "activities",
      act.id,
      "recurso_asignado",
      p.note,
      act.ticket_id,
      true,
    ),
  ]);
  ensure(
    out[0].meta.changes === 1,
    "La cantidad supera el recurso pendiente de asignar.",
    409,
  );
  return { id: allocation };
}
