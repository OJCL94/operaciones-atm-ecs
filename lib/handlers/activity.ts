// Extraído de lib/service.ts (R1): este manejador conserva exactamente el
// comportamiento original del caso "activity.save" dentro de Service.execute.
// Ningún criterio de autorización, validación ni persistencia fue modificado.
import { z } from "zod";
import { actorContext } from "./context";
import { ensure, isManager } from "../domain";
import type { HandlerContext, ActionResult } from "../types";
import type { Activity } from "../entities";
import { id, optId, short, memo, date, version } from "./shared-schemas";

export async function activitySave(
  svc: HandlerContext,
  input: unknown,
): Promise<ActionResult> {
  const { a, d, t } = actorContext(svc);
  svc.manage();
  const p = z
    .object({
      id: optId,
      version: version.optional(),
      asset_id: id,
      ticket_id: optId,
      title: short,
      description: z.string().trim().max(5000).default(""),
      owner_id: optId,
      planned_start: z.union([date, z.literal("")]).optional(),
      planned_end: z.union([date, z.literal("")]).optional(),
    })
    .parse(input);
  const asset = await svc.entity("assets", p.asset_id);
  ensure(asset.status !== "retirado", "El activo está retirado.");
  if (p.ticket_id) {
    const tk = await svc.entity("tickets", p.ticket_id);
    ensure(tk.asset_id === p.asset_id, "El ticket pertenece a otro activo.");
    ensure(
      !["resuelto", "cerrado"].includes(tk.status),
      "No se pueden añadir tareas a un ticket resuelto.",
    );
  }
  await svc.validAssignee(p.owner_id ?? null);
  const planned = !!p.planned_start || !!p.planned_end;
  ensure(
    !planned || (p.planned_start && p.planned_end && p.owner_id),
    "La planificación requiere inicio, fin y responsable.",
  );
  ensure(
    !planned || p.planned_end! > p.planned_start!,
    "El fin previsto debe ser posterior al inicio.",
  );
  const values: Partial<Activity> = {
    asset_id: p.asset_id,
    ticket_id: p.ticket_id ?? null,
    title: p.title,
    description: p.description,
    owner_id: p.owner_id ?? null,
    planned_start: p.planned_start || null,
    planned_end: p.planned_end || null,
    planned_at: planned ? t : null,
    status: planned ? "planificada" : "pendiente",
  };
  if (p.id) {
    const old = await svc.entity("activities", p.id);
    ensure(
      ["pendiente", "planificada"].includes(old.status),
      "Solo se pueden editar actividades pendientes o planificadas.",
    );
    ensure(p.version, "Falta versión");
    values.planned_at = planned ? (old.planned_at ?? t) : null;
    await svc.update(
      "activities",
      old,
      p.version,
      values,
      "actividad_planificada",
      JSON.stringify({ ...values, before: old }),
    );
    return { id: p.id };
  }
  const actid = svc.ids.uuid();
  await svc.create(
    "activities",
    { id: actid, demo: d, ...values, created_at: t },
    "actividad_creada",
    JSON.stringify(values),
  );
  return { id: actid };
}
export async function activityTransition(
  svc: HandlerContext,
  input: unknown,
): Promise<ActionResult> {
  const { a, d, t } = actorContext(svc);
  const p = z
    .object({
      id,
      version,
      status: z.enum(["en_curso", "completada", "cancelada"]),
      evidence: memo,
    })
    .parse(input);
  const act = await svc.entity("activities", p.id);
  svc.activityAccess(act, true);
  const map: Record<string, string[]> = {
    pendiente: ["cancelada"],
    planificada: ["en_curso", "cancelada"],
    en_curso: ["completada", "cancelada"],
  };
  ensure(
    map[act.status]?.includes(p.status),
    "Transición de actividad no permitida.",
    409,
  );
  if (p.status === "cancelada") svc.manage();
  if (p.status === "en_curso") {
    const lacking = await svc.one(
      "SELECT COUNT(*) n FROM resource_requirements r WHERE r.activity_id=? AND COALESCE((SELECT SUM(quantity) FROM resource_allocations WHERE requirement_id=r.id),0)<r.quantity",
      [p.id],
    );
    ensure(!lacking?.n, "Faltan recursos por asignar para iniciar.");
  }
  await svc.update(
    "activities",
    act,
    p.version,
    {
      status: p.status,
      evidence: p.evidence,
      ...(p.status === "en_curso"
        ? { started_at: t }
        : p.status === "completada"
          ? { completed_at: t }
          : {}),
    },
    "actividad_" + p.status,
    p.evidence,
  );
  return { id: p.id };
}
