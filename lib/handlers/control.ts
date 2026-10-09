// Extraído de lib/service.ts (R1): este manejador conserva exactamente el
// comportamiento original del caso "control.create" dentro de Service.execute.
// Ningún criterio de autorización, validación ni persistencia fue modificado.
import { z } from "zod";
import { actorContext } from "./context";
import { ensure, isManager } from "../domain";
import type { HandlerContext, ActionResult } from "../types";
import { id, optId, short, memo, date, version } from "./shared-schemas";

export async function controlCreate(
  svc: HandlerContext,
  input: unknown,
): Promise<ActionResult> {
  const { a, d, t } = actorContext(svc);
  svc.manage();
  const p = z
    .object({
      activity_id: id,
      title: short,
      finding: memo,
      action: memo,
      owner_id: id,
      due_at: date,
    })
    .parse(input);
  await svc.entity("activities", p.activity_id);
  await svc.validAssignee(p.owner_id);
  const cid = svc.ids.uuid();
  await svc.create(
    "controls",
    { id: cid, demo: d, ...p, created_at: t },
    "desviacion_registrada",
    p.finding,
  );
  return { id: cid };
}
export async function controlTransition(
  svc: HandlerContext,
  input: unknown,
): Promise<ActionResult> {
  const { a, d, t } = actorContext(svc);
  const p = z
    .object({
      id,
      version,
      status: z.enum(["en_curso", "cerrada"]),
      evidence: memo,
    })
    .parse(input);
  const c = await svc.entity("controls", p.id);
  ensure(
    isManager(a) || (a.role === "tecnico" && c.owner_id === a.id),
    "No puedes gestionar esta acción correctiva.",
    403,
  );
  ensure(
    (c.status === "abierta" && p.status === "en_curso") ||
      (c.status === "en_curso" && p.status === "cerrada"),
    "Transición de acción no permitida.",
    409,
  );
  if (p.status === "cerrada") svc.manage();
  await svc.update(
    "controls",
    c,
    p.version,
    {
      status: p.status,
      evidence: p.evidence,
      completed_at: p.status === "cerrada" ? t : null,
    },
    "accion_" + p.status,
    p.evidence,
  );
  return { id: p.id };
}

export async function goalCreate(
  svc: HandlerContext,
  input: unknown,
): Promise<ActionResult> {
  const { a, d, t } = actorContext(svc);
  svc.manage();
  const p = z
    .object({
      title: short,
      unit: short,
      target: z.number().finite().nonnegative(),
      direction: z.enum(["mayor", "menor"]),
      start_at: date,
      end_at: date,
    })
    .parse(input);
  ensure(p.end_at >= p.start_at, "Revisa el período de la meta.");
  const gid = svc.ids.uuid();
  await svc.create(
    "goals",
    { id: gid, demo: d, ...p, created_at: t },
    "meta_creada",
    p.title,
  );
  return { id: gid };
}

export async function goalEvaluate(
  svc: HandlerContext,
  input: unknown,
): Promise<ActionResult> {
  const { a, d, t } = actorContext(svc);
  svc.manage();
  const p = z
    .object({
      id,
      version,
      actual: z.number().finite().nonnegative(),
      evidence: memo,
    })
    .parse(input);
  const g = await svc.entity("goals", p.id);
  await svc.update(
    "goals",
    g,
    p.version,
    { actual: p.actual, evidence: p.evidence, evaluated_at: t },
    "meta_evaluada",
    JSON.stringify(p),
  );
  return { id: p.id };
}
