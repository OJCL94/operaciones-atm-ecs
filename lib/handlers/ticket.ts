// Extraído de lib/service.ts (R1): este manejador conserva exactamente el
// comportamiento original del caso "ticket.create" dentro de Service.execute.
// Ningún criterio de autorización, validación ni persistencia fue modificado.
import { z } from "zod";
import { uuid } from "../clock";
import { actorContext } from "./context";
import {
  ensure,
  isManager,
  categories,
  deadlines,
  transitionMap,
} from "../domain";
import type { HandlerContext, ActionResult } from "../types";
import type { Ticket } from "../entities";
import { id, optId, short, memo, date, version } from "./shared-schemas";

export async function ticketCreate(
  svc: HandlerContext,
  input: unknown,
): Promise<ActionResult> {
  const { a, d, t } = actorContext(svc);
  svc.write();
  const p = z
    .object({
      asset_id: id,
      title: short,
      description: memo,
      category: z.enum(categories as [string, ...string[]]),
      priority: z.enum(["critica", "alta", "media", "baja"]),
      assignee_id: optId,
    })
    .parse(input);
  const asset = await svc.entity("assets", p.asset_id);
  ensure(asset.status !== "retirado", "El activo está retirado.");
  if (p.assignee_id) {
    svc.manage();
    await svc.validAssignee(p.assignee_id);
  }
  const tid = uuid();
  const code =
    "TK-" +
    new Date().getFullYear().toString().slice(-2) +
    "-" +
    tid.slice(0, 6).toUpperCase();
  await svc.create(
    "tickets",
    {
      id: tid,
      demo: d,
      code,
      ...p,
      assignee_id: p.assignee_id ?? null,
      requester_id: a.id,
      status: p.assignee_id ? "asignado" : "abierto",
      created_at: t,
      updated_at: t,
      due_at: new Date(
        Date.now() + deadlines[p.priority] * 3600000,
      ).toISOString(),
    },
    "ticket_creado",
    p.description,
  );
  return { id: tid };
}
export async function ticketAssign(
  svc: HandlerContext,
  input: unknown,
): Promise<ActionResult> {
  const { a, d, t } = actorContext(svc);
  svc.manage();
  const p = z
    .object({
      id,
      version,
      assignee_id: id,
      priority: z.enum(["critica", "alta", "media", "baja"]),
      category: z.enum(categories as [string, ...string[]]),
      reason: memo,
    })
    .parse(input);
  const ticket = await svc.entity("tickets", p.id);
  ensure(
    !["resuelto", "cerrado"].includes(ticket.status),
    "Reabre el ticket antes de reasignarlo.",
  );
  await svc.validAssignee(p.assignee_id);
  await svc.update(
    "tickets",
    ticket,
    p.version,
    {
      assignee_id: p.assignee_id,
      priority: p.priority,
      category: p.category,
      status: ticket.status === "abierto" ? "asignado" : ticket.status,
      updated_at: t,
      due_at: new Date(
        new Date(ticket.created_at).getTime() + deadlines[p.priority] * 3600000,
      ).toISOString(),
    },
    "asignacion",
    JSON.stringify({
      motivo: p.reason,
      responsable: p.assignee_id,
      prioridad: p.priority,
      categoria: p.category,
    }),
  );
  return { id: p.id };
}

export async function ticketTransition(
  svc: HandlerContext,
  input: unknown,
): Promise<ActionResult> {
  const { a, d, t } = actorContext(svc);
  const p = z
    .object({
      id,
      version,
      status: z.enum([
        "asignado",
        "en_atencion",
        "en_espera",
        "resuelto",
        "cerrado",
      ]),
      note: memo,
      diagnosis: z.string().trim().max(5000).default(""),
      solution: z.string().trim().max(5000).default(""),
    })
    .parse(input);
  const ticket = await svc.entity("tickets", p.id);
  svc.ticketAccess(ticket, true);
  ensure(
    transitionMap[ticket.status]?.includes(p.status),
    "Transición de estado no permitida.",
    409,
  );
  if (p.status === "cerrado")
    ensure(
      isManager(a) || ticket.requester_id === a.id,
      "Solo supervisión o el solicitante pueden validar el cierre.",
      403,
    );
  else
    ensure(
      isManager(a) || (a.role === "tecnico" && ticket.assignee_id === a.id),
      "Solo el técnico asignado o supervisión pueden cambiar este estado.",
      403,
    );
  ensure(ticket.assignee_id, "Asigna un técnico antes de atender el ticket.");
  if (p.status === "resuelto") {
    ensure(
      p.diagnosis.length >= 5 && p.solution.length >= 5,
      "Registra un diagnóstico y una solución de al menos 5 caracteres.",
    );
    const open = await svc.one(
      "SELECT COUNT(*) n FROM activities WHERE ticket_id=? AND status NOT IN ('completada','cancelada')",
      [p.id],
    );
    ensure(
      !open?.n,
      "Completa o cancela las actividades vinculadas antes de resolver.",
    );
    ensure(
      ticket.first_response_at,
      "Registra una primera respuesta técnica antes de resolver.",
    );
  }
  const values: Partial<Ticket> = { status: p.status, updated_at: t };
  if (p.status === "resuelto") {
    values.diagnosis = p.diagnosis;
    values.solution = p.solution;
    values.resolved_at = t;
  }
  if (p.status === "cerrado") values.closed_at = t;
  if (
    p.status === "en_atencion" &&
    ["cerrado", "resuelto"].includes(ticket.status)
  ) {
    ensure(isManager(a), "La reapertura requiere supervisión.", 403);
    values.resolved_at = null;
    values.closed_at = null;
  }
  await svc.update(
    "tickets",
    ticket,
    p.version,
    values,
    "estado",
    JSON.stringify({
      de: ticket.status,
      a: p.status,
      nota: p.note,
      diagnostico: p.diagnosis,
      solucion: p.solution,
    }),
  );
  return { id: p.id };
}

export async function ticketNote(
  svc: HandlerContext,
  input: unknown,
): Promise<ActionResult> {
  const { a, d, t } = actorContext(svc);
  const p = z
    .object({
      id,
      version,
      type: z.enum(["comentario", "respuesta", "seguimiento"]),
      note: memo,
    })
    .parse(input);
  const ticket = await svc.entity("tickets", p.id);
  svc.ticketAccess(ticket, true);
  ensure(
    ticket.status !== "cerrado",
    "Reabre el ticket para registrar una intervención.",
  );
  if (p.type !== "comentario")
    ensure(
      isManager(a) || (a.role === "tecnico" && ticket.assignee_id === a.id),
      "Solo el personal asignado registra respuestas y seguimiento.",
      403,
    );
  const values: Partial<Ticket> = { updated_at: t };
  if (p.type === "respuesta" && !ticket.first_response_at)
    values.first_response_at = t;
  await svc.update("tickets", ticket, p.version, values, p.type, p.note);
  return { id: p.id };
}

export async function reviewCreate(
  svc: HandlerContext,
  input: unknown,
): Promise<ActionResult> {
  const { a, d, t } = actorContext(svc);
  svc.manage();
  const p = z
    .object({
      entity_id: id,
      kind: z.enum(["categoria", "monitoreo", "operativa"]),
      passed: z.boolean(),
      evidence: memo,
    })
    .parse(input);
  const row = await svc.entity(
    p.kind === "operativa" ? "activities" : "tickets",
    p.entity_id,
  );
  await svc.create(
    "reviews",
    {
      id: uuid(),
      demo: d,
      ticket_id: p.kind === "operativa" ? null : row.id,
      activity_id: p.kind === "operativa" ? row.id : null,
      kind: p.kind,
      passed: Number(p.passed) as 0 | 1,
      evidence: p.evidence,
      actor_id: a.id,
      created_at: t,
    },
    "revision_" + p.kind,
    p.evidence,
  );
  return { ok: true };
}
