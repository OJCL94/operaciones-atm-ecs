import type { SqlDatabase } from "./database-types";
import { z } from "zod";
import {
  Actor,
  isManager,
  ensure,
  DomainError,
  categories,
  deadlines,
  transitionMap,
  indicatorDefinitions,
} from "./domain";
import type { Row, HandlerContext } from "./types";
export type { Row } from "./types";
const id = z.string().min(1).max(100),
  short = z.string().trim().min(3).max(160),
  memo = z.string().trim().min(5).max(5000),
  date = z
    .string()
    .datetime({ offset: true })
    .transform((v) => new Date(v).toISOString()),
  version = z.number().int().positive();
const optId = z
  .union([id, z.literal("")])
  .optional()
  .transform((v) => v || null);
import { now } from "./clock";
const uuid = () => crypto.randomUUID();
export class Service implements HandlerContext {
  constructor(
    public db: SqlDatabase,
    public actor: Actor,
    public demo: number,
  ) {}
  stmt(sql: string, args: unknown[] = []) {
    return this.db.prepare(sql).bind(...args);
  }
  async all(sql: string, args: unknown[] = []): Promise<Row[]> {
    return (await this.stmt(sql, args).all()).results as Row[];
  }
  async one(sql: string, args: unknown[] = []): Promise<Row | null> {
    return this.stmt(sql, args).first<Row>();
  }
  async entity(table: string, idValue: string) {
    ensure(
      [
        "assets",
        "tickets",
        "activities",
        "controls",
        "goals",
        "study_periods",
        "resource_requirements",
        "members",
      ].includes(table),
      "Entidad desconocida",
    );
    const row = await this.one(`SELECT * FROM ${table} WHERE id=? AND demo=?`, [
      idValue,
      this.demo,
    ]);
    ensure(row, "Registro no encontrado", 404);
    return row;
  }
  manage() {
    ensure(
      isManager(this.actor),
      "Esta operación requiere un supervisor o administrador.",
      403,
    );
  }
  research() {
    ensure(
      isManager(this.actor) || this.actor.role === "auditor",
      "Acceso reservado a supervisión e investigación.",
      403,
    );
  }
  write() {
    ensure(
      this.actor.role !== "auditor",
      "El investigador tiene acceso de lectura a la operación.",
      403,
    );
  }
  ticketAccess(t: Row, edit = false) {
    ensure(
      isManager(this.actor) ||
        (!edit && this.actor.role === "auditor") ||
        t.requester_id === this.actor.id ||
        t.assignee_id === this.actor.id,
      "No tienes acceso a este ticket.",
      403,
    );
    if (edit) this.write();
  }
  activityAccess(a: Row, edit = false) {
    ensure(
      isManager(this.actor) ||
        (!edit && this.actor.role === "auditor") ||
        a.owner_id === this.actor.id,
      "No tienes acceso a esta actividad.",
      403,
    );
    if (edit) this.write();
  }
  event(
    entity: string,
    entityId: string,
    action: string,
    detail: string,
    ticketId: string | null = null,
    conditional = false,
  ) {
    return this.stmt(
      `INSERT INTO events (demo,entity,entity_id,ticket_id,actor_id,action,detail,created_at) SELECT ?,?,?,?,?,?,?,? ${conditional ? "WHERE changes()=1" : ""}`,
      [
        this.demo,
        entity,
        entityId,
        ticketId,
        this.actor.id,
        action,
        detail,
        now(),
      ],
    );
  }
  async create(table: string, data: Row, action: string, detail: string) {
    const fields = Object.keys(data);
    await this.db.batch([
      this.stmt(
        `INSERT INTO ${table} (${fields.join(",")}) VALUES (${fields.map(() => "?").join(",")})`,
        Object.values(data),
      ),
      this.event(
        table,
        data.id,
        action,
        detail,
        table === "tickets" ? data.id : (data.ticket_id ?? null),
      ),
    ]);
    return data.id;
  }
  async update(
    table: string,
    row: Row,
    v: number,
    values: Row,
    action: string,
    detail: string,
  ) {
    const keys = Object.keys(values);
    const result = await this.db.batch([
      this.stmt(
        `UPDATE ${table} SET ${keys.map((k) => k + "=?").join(",")}, version=version+1 WHERE id=? AND demo=? AND version=?`,
        [...Object.values(values), row.id, this.demo, v],
      ),
      this.event(
        table,
        row.id,
        action,
        detail,
        table === "tickets" ? row.id : (row.ticket_id ?? null),
        true,
      ),
    ]);
    ensure(
      result[0].meta.changes === 1,
      "El registro cambió en otra sesión. Actualiza la vista antes de guardar.",
      409,
    );
    return row.id;
  }
  async validAssignee(memberId: string | null) {
    if (!memberId) return;
    const m = await this.one(
      "SELECT * FROM members WHERE id=? AND active=1 AND (demo=? OR (demo=0 AND role IN ('admin','supervisor')))",
      [memberId, this.demo],
    );
    ensure(
      m && ["admin", "supervisor", "tecnico"].includes(m.role),
      "Selecciona un responsable activo de operaciones.",
    );
  }
  async execute(kind: string, input: unknown): Promise<Row> {
    const a = this.actor,
      d = this.demo,
      t = now();
    switch (kind) {
      case "asset.save": {
        this.manage();
        const p = z
          .object({
            id: optId,
            version: version.optional(),
            code: short,
            serial: short,
            name: short,
            model: short,
            location: short,
            status: z.enum([
              "operativo",
              "mantenimiento",
              "fuera_servicio",
              "retirado",
            ]),
            notes: z.string().trim().max(3000).default(""),
          })
          .parse(input);
        const { id: aid, version: v, ...data } = p;
        if (aid) {
          const old = await this.entity("assets", aid);
          ensure(v, "Falta versión del activo");
          await this.update(
            "assets",
            old,
            v,
            data,
            "activo_actualizado",
            JSON.stringify({ antes: old, despues: data }),
          );
          return { id: aid };
        }
        const aid2 = uuid();
        await this.create(
          "assets",
          { id: aid2, demo: d, ...data, created_at: t },
          "activo_creado",
          p.code,
        );
        return { id: aid2 };
      }
      case "ticket.create": {
        this.write();
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
        const asset = await this.entity("assets", p.asset_id);
        ensure(asset.status !== "retirado", "El activo está retirado.");
        if (p.assignee_id) {
          this.manage();
          await this.validAssignee(p.assignee_id);
        }
        const tid = uuid();
        const code =
          "TK-" +
          new Date().getFullYear().toString().slice(-2) +
          "-" +
          tid.slice(0, 6).toUpperCase();
        await this.create(
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
      case "ticket.assign": {
        this.manage();
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
        const ticket = await this.entity("tickets", p.id);
        ensure(
          !["resuelto", "cerrado"].includes(ticket.status),
          "Reabre el ticket antes de reasignarlo.",
        );
        await this.validAssignee(p.assignee_id);
        await this.update(
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
              new Date(ticket.created_at).getTime() +
                deadlines[p.priority] * 3600000,
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
      case "ticket.transition": {
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
        const ticket = await this.entity("tickets", p.id);
        this.ticketAccess(ticket, true);
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
            isManager(a) ||
              (a.role === "tecnico" && ticket.assignee_id === a.id),
            "Solo el técnico asignado o supervisión pueden cambiar este estado.",
            403,
          );
        ensure(
          ticket.assignee_id,
          "Asigna un técnico antes de atender el ticket.",
        );
        if (p.status === "resuelto") {
          ensure(
            p.diagnosis.length >= 5 && p.solution.length >= 5,
            "Registra un diagnóstico y una solución de al menos 5 caracteres.",
          );
          const open = await this.one(
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
        const values: Row = { status: p.status, updated_at: t };
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
        await this.update(
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
      case "ticket.note": {
        const p = z
          .object({
            id,
            version,
            type: z.enum(["comentario", "respuesta", "seguimiento"]),
            note: memo,
          })
          .parse(input);
        const ticket = await this.entity("tickets", p.id);
        this.ticketAccess(ticket, true);
        ensure(
          ticket.status !== "cerrado",
          "Reabre el ticket para registrar una intervención.",
        );
        if (p.type !== "comentario")
          ensure(
            isManager(a) ||
              (a.role === "tecnico" && ticket.assignee_id === a.id),
            "Solo el personal asignado registra respuestas y seguimiento.",
            403,
          );
        const values: Row = { updated_at: t };
        if (p.type === "respuesta" && !ticket.first_response_at)
          values.first_response_at = t;
        await this.update("tickets", ticket, p.version, values, p.type, p.note);
        return { id: p.id };
      }
      case "review.create": {
        this.manage();
        const p = z
          .object({
            entity_id: id,
            kind: z.enum(["categoria", "monitoreo", "operativa"]),
            passed: z.boolean(),
            evidence: memo,
          })
          .parse(input);
        const row = await this.entity(
          p.kind === "operativa" ? "activities" : "tickets",
          p.entity_id,
        );
        await this.create(
          "reviews",
          {
            id: uuid(),
            demo: d,
            ticket_id: p.kind === "operativa" ? null : row.id,
            activity_id: p.kind === "operativa" ? row.id : null,
            kind: p.kind,
            passed: Number(p.passed),
            evidence: p.evidence,
            actor_id: a.id,
            created_at: t,
          },
          "revision_" + p.kind,
          p.evidence,
        );
        return { ok: true };
      }
      case "activity.save": {
        this.manage();
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
        const asset = await this.entity("assets", p.asset_id);
        ensure(asset.status !== "retirado", "El activo está retirado.");
        if (p.ticket_id) {
          const tk = await this.entity("tickets", p.ticket_id);
          ensure(
            tk.asset_id === p.asset_id,
            "El ticket pertenece a otro activo.",
          );
          ensure(
            !["resuelto", "cerrado"].includes(tk.status),
            "No se pueden añadir tareas a un ticket resuelto.",
          );
        }
        await this.validAssignee(p.owner_id ?? null);
        const planned = !!p.planned_start || !!p.planned_end;
        ensure(
          !planned || (p.planned_start && p.planned_end && p.owner_id),
          "La planificación requiere inicio, fin y responsable.",
        );
        ensure(
          !planned || p.planned_end! > p.planned_start!,
          "El fin previsto debe ser posterior al inicio.",
        );
        const values = {
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
          const old = await this.entity("activities", p.id);
          ensure(
            ["pendiente", "planificada"].includes(old.status),
            "Solo se pueden editar actividades pendientes o planificadas.",
          );
          ensure(p.version, "Falta versión");
          values.planned_at = planned ? (old.planned_at ?? t) : null;
          await this.update(
            "activities",
            old,
            p.version,
            values,
            "actividad_planificada",
            JSON.stringify({ ...values, before: old }),
          );
          return { id: p.id };
        }
        const actid = uuid();
        await this.create(
          "activities",
          { id: actid, demo: d, ...values, created_at: t },
          "actividad_creada",
          JSON.stringify(values),
        );
        return { id: actid };
      }
      case "activity.transition": {
        const p = z
          .object({
            id,
            version,
            status: z.enum(["en_curso", "completada", "cancelada"]),
            evidence: memo,
          })
          .parse(input);
        const act = await this.entity("activities", p.id);
        this.activityAccess(act, true);
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
        if (p.status === "cancelada") this.manage();
        if (p.status === "en_curso") {
          const lacking = await this.one(
            "SELECT COUNT(*) n FROM resource_requirements r WHERE r.activity_id=? AND COALESCE((SELECT SUM(quantity) FROM resource_allocations WHERE requirement_id=r.id),0)<r.quantity",
            [p.id],
          );
          ensure(!lacking?.n, "Faltan recursos por asignar para iniciar.");
        }
        await this.update(
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
      case "resource.require": {
        this.manage();
        const p = z
          .object({
            activity_id: id,
            name: short,
            quantity: z.number().positive().max(100000),
            unit: short,
            required_by: date,
          })
          .parse(input);
        const act = await this.entity("activities", p.activity_id);
        ensure(
          ["pendiente", "planificada"].includes(act.status),
          "Define recursos antes de iniciar la actividad.",
        );
        const rid = uuid();
        await this.create(
          "resource_requirements",
          { id: rid, demo: d, ...p },
          "recurso_requerido",
          p.name,
        );
        return { id: rid };
      }
      case "resource.allocate": {
        this.manage();
        const p = z
          .object({
            requirement_id: id,
            quantity: z.number().positive().max(100000),
            note: memo,
          })
          .parse(input);
        const r = await this.entity("resource_requirements", p.requirement_id);
        const act = await this.entity("activities", r.activity_id);
        ensure(
          ["pendiente", "planificada"].includes(act.status),
          "La actividad ya comenzó o finalizó.",
        );
        const allocation = uuid();
        const out = await this.db.batch([
          this.stmt(
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
          this.event(
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
      case "control.create": {
        this.manage();
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
        await this.entity("activities", p.activity_id);
        await this.validAssignee(p.owner_id);
        const cid = uuid();
        await this.create(
          "controls",
          { id: cid, demo: d, ...p, created_at: t },
          "desviacion_registrada",
          p.finding,
        );
        return { id: cid };
      }
      case "control.transition": {
        const p = z
          .object({
            id,
            version,
            status: z.enum(["en_curso", "cerrada"]),
            evidence: memo,
          })
          .parse(input);
        const c = await this.entity("controls", p.id);
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
        if (p.status === "cerrada") this.manage();
        await this.update(
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
      case "goal.create": {
        this.manage();
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
        const gid = uuid();
        await this.create(
          "goals",
          { id: gid, demo: d, ...p, created_at: t },
          "meta_creada",
          p.title,
        );
        return { id: gid };
      }
      case "goal.evaluate": {
        this.manage();
        const p = z
          .object({
            id,
            version,
            actual: z.number().finite().nonnegative(),
            evidence: memo,
          })
          .parse(input);
        const g = await this.entity("goals", p.id);
        await this.update(
          "goals",
          g,
          p.version,
          { actual: p.actual, evidence: p.evidence, evaluated_at: t },
          "meta_evaluada",
          JSON.stringify(p),
        );
        return { id: p.id };
      }
      case "period.create": {
        this.research();
        const p = z
          .object({
            label: short,
            phase: z.enum(["pretest", "postest"]),
            start_at: date,
            end_at: date,
            notes: memo,
          })
          .parse(input);
        ensure(p.end_at >= p.start_at, "El período no es válido.");
        const clash = await this.one(
          "SELECT id FROM study_periods WHERE demo=? AND start_at<=? AND end_at>=?",
          [d, p.end_at, p.start_at],
        );
        ensure(!clash, "Los períodos de estudio no pueden solaparse.", 409);
        const pid = uuid();
        await this.create(
          "study_periods",
          { id: pid, demo: d, ...p, created_at: t },
          "periodo_creado",
          p.label,
        );
        return { id: pid };
      }
      case "measurement.create": {
        this.research();
        const p = z
          .object({
            period_id: id,
            indicator: z.enum(
              indicatorDefinitions.map((i) => i[0]) as [string, ...string[]],
            ),
            week_start: date,
            numerator: z.number().finite().nonnegative().nullable(),
            denominator: z.number().finite().nonnegative().nullable(),
            value: z.number().finite().nonnegative().nullable(),
            sample_size: z.number().int().min(0).max(10000000),
            source: short,
            evidence: memo,
          })
          .parse(input);
        const period = await this.entity("study_periods", p.period_id);
        ensure(
          p.week_start >= period.start_at && p.week_start <= period.end_at,
          "La semana debe pertenecer al período.",
        );
        const def = indicatorDefinitions.find((i) => i[0] === p.indicator)!;
        let value = p.value;
        if (def[2] === "%") {
          ensure(
            p.numerator !== null && p.denominator !== null,
            "Registra numerador y denominador.",
          );
          ensure(
            p.numerator <= p.denominator,
            "El numerador no puede superar al denominador.",
          );
          value = p.denominator ? (100 * p.numerator) / p.denominator : null;
        } else {
          ensure(
            p.value !== null && p.sample_size > 0,
            "Registra valor y tamaño de muestra positivo.",
          );
        }
        const mid = uuid();
        await this.create(
          "measurements",
          { id: mid, ...p, value, actor_id: a.id, created_at: t },
          "medicion_registrada",
          JSON.stringify({ ...p, demo: d }),
        );
        return { id: mid };
      }
      case "member.save": {
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
          const member = await this.entity("members", p.id);
          ensure(
            p.id !== a.id || (p.role === "admin" && p.active),
            "No puedes retirar tu propio acceso administrativo.",
          );
          ensure(
            member.email === p.email,
            "El correo de un acceso existente es inmutable.",
          );
          ensure(p.version, "Falta versión");
          await this.update(
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
        await this.create(
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
      default:
        throw new DomainError("Operación desconocida", 404);
    }
  }
  ticketFilter() {
    return isManager(this.actor) || this.actor.role === "auditor"
      ? { sql: "t.demo=?", args: [this.demo] as unknown[] }
      : {
          sql: "t.demo=? AND (t.requester_id=? OR t.assignee_id=?)",
          args: [this.demo, this.actor.id, this.actor.id] as unknown[],
        };
  }
  async tickets(params: URLSearchParams) {
    const f = this.ticketFilter();
    let sql = f.sql,
      args = f.args;
    const q = (params.get("q") ?? "").trim().slice(0, 120),
      status = params.get("status"),
      priority = params.get("priority"),
      asset = params.get("asset");
    if (q) {
      sql +=
        " AND (t.title LIKE ? ESCAPE '!' OR t.code LIKE ? ESCAPE '!' OR x.code LIKE ? ESCAPE '!')";
      const escaped = "%" + q.replace(/[!%_]/g, (v) => "!" + v) + "%";
      args.push(escaped, escaped, escaped);
    }
    if (status) {
      sql += " AND t.status=?";
      args.push(status);
    }
    if (priority) {
      sql += " AND t.priority=?";
      args.push(priority);
    }
    if (asset) {
      sql += " AND t.asset_id=?";
      args.push(asset);
    }
    if (params.get("mine") === "1") {
      sql += " AND t.assignee_id=?";
      args.push(this.actor.id);
    }
    if (params.get("overdue") === "1") {
      sql += " AND t.due_at<? AND t.status NOT IN ('resuelto','cerrado')";
      args.push(now());
    }
    const page = Math.max(
      1,
      Math.min(100000, Math.trunc(Number(params.get("page"))) || 1),
    );
    const count = await this.one(
      `SELECT COUNT(*) n FROM tickets t JOIN assets x ON x.id=t.asset_id WHERE ${sql}`,
      args,
    );
    const rows = await this.all(
      `SELECT t.*,x.code asset_code,x.location, m.name assignee_name FROM tickets t JOIN assets x ON x.id=t.asset_id LEFT JOIN members m ON m.id=t.assignee_id WHERE ${sql} ORDER BY t.created_at DESC,t.id DESC LIMIT 15 OFFSET ?`,
      [...args, (page - 1) * 15],
    );
    return { rows, total: count?.n ?? 0, page, pageSize: 15 };
  }
  async ticketDetail(ticketId: string) {
    const t = await this.entity("tickets", ticketId);
    this.ticketAccess(t);
    const [asset, events, reviews, activities] = await Promise.all([
      this.entity("assets", t.asset_id),
      this.all(
        "SELECT e.*,m.name actor_name FROM events e JOIN members m ON m.id=e.actor_id WHERE e.ticket_id=? AND e.demo=? ORDER BY e.id DESC LIMIT 150",
        [t.id, this.demo],
      ),
      this.all(
        "SELECT r.*,m.name actor_name FROM reviews r JOIN members m ON m.id=r.actor_id WHERE ticket_id=? ORDER BY created_at DESC",
        [t.id],
      ),
      this.all(
        "SELECT * FROM activities WHERE ticket_id=? ORDER BY created_at DESC",
        [t.id],
      ),
    ]);
    return { ticket: t, asset, events, reviews, activities };
  }
  async activityDetail(activityId: string) {
    const act = await this.entity("activities", activityId);
    this.activityAccess(act);
    const [resources, events, reviews] = await Promise.all([
      this.all(
        "SELECT r.*,COALESCE((SELECT SUM(quantity) FROM resource_allocations WHERE requirement_id=r.id),0) allocated FROM resource_requirements r WHERE r.activity_id=?",
        [act.id],
      ),
      this.all(
        "SELECT e.*,m.name actor_name FROM events e JOIN members m ON m.id=e.actor_id WHERE e.entity='activities' AND e.entity_id=? ORDER BY e.id DESC LIMIT 100",
        [act.id],
      ),
      this.all(
        "SELECT * FROM reviews WHERE activity_id=? ORDER BY created_at DESC",
        [act.id],
      ),
    ]);
    return { activity: act, resources, events, reviews };
  }
  async list(module: string, params: URLSearchParams) {
    if (module === "tickets") return this.tickets(params);
    if (module === "ticket")
      return this.ticketDetail(id.parse(params.get("id")));
    if (module === "activity")
      return this.activityDetail(id.parse(params.get("id")));
    const page = Math.max(
      1,
      Math.min(100000, Math.trunc(Number(params.get("page"))) || 1),
    );
    const limit = " LIMIT 30 OFFSET ?";
    let query = "",
      count = "",
      args: unknown[] = [this.demo];
    if (module === "assets") {
      query = "SELECT * FROM assets WHERE demo=?";
      const q = (params.get("q") ?? "").slice(0, 120);
      if (q) {
        query += " AND (code LIKE ? OR serial LIKE ? OR location LIKE ?)";
        args.push("%" + q + "%", "%" + q + "%", "%" + q + "%");
      }
      count = query.replace("SELECT *", "SELECT COUNT(*) n");
      query += " ORDER BY code";
    } else if (module === "activities") {
      ensure(this.actor.role !== "solicitante", "Acceso no autorizado", 403);
      query =
        "SELECT a.*,m.name owner_name,x.code asset_code FROM activities a LEFT JOIN members m ON m.id=a.owner_id JOIN assets x ON x.id=a.asset_id WHERE a.demo=?";
      if (!isManager(this.actor) && this.actor.role !== "auditor") {
        query += " AND a.owner_id=?";
        args.push(this.actor.id);
      }
      count = query.replace(
        "SELECT a.*,m.name owner_name,x.code asset_code",
        "SELECT COUNT(*) n",
      );
      query += " ORDER BY COALESCE(a.planned_end,a.created_at) DESC";
    } else if (module === "controls") {
      ensure(this.actor.role !== "solicitante", "Acceso no autorizado", 403);
      query =
        "SELECT c.*,m.name owner_name,a.title activity_title FROM controls c JOIN members m ON m.id=c.owner_id JOIN activities a ON a.id=c.activity_id WHERE c.demo=?";
      if (!isManager(this.actor) && this.actor.role !== "auditor") {
        query += " AND c.owner_id=?";
        args.push(this.actor.id);
      }
      count = query.replace(
        "SELECT c.*,m.name owner_name,a.title activity_title",
        "SELECT COUNT(*) n",
      );
      query += " ORDER BY c.created_at DESC";
    } else if (module === "goals") {
      this.research();
      query = "SELECT * FROM goals WHERE demo=?";
      count = query.replace("SELECT *", "SELECT COUNT(*) n");
      query += " ORDER BY end_at DESC";
    } else if (module === "members") {
      ensure(
        this.actor.role === "admin",
        "Solo el administrador puede ver los accesos.",
        403,
      );
      query =
        "SELECT id,name,email,role,active,demo,version FROM members WHERE demo=?";
      count = "SELECT COUNT(*) n FROM members WHERE demo=?";
      query += " ORDER BY name";
    } else if (module === "periods") {
      this.research();
      const periods = await this.all(
        "SELECT * FROM study_periods WHERE demo=? ORDER BY start_at",
        [this.demo],
      );
      const measurements = await this.all(
        "SELECT m.*,p.phase,p.label,p.demo FROM measurements m JOIN study_periods p ON p.id=m.period_id WHERE p.demo=? ORDER BY m.week_start DESC LIMIT 500",
        [this.demo],
      );
      return {
        rows: periods,
        measurements,
        total: periods.length,
        page: 1,
        pageSize: 500,
      };
    } else if (module === "audit") {
      this.research();
      query =
        "SELECT e.*,m.name actor_name FROM events e JOIN members m ON m.id=e.actor_id WHERE e.demo=?";
      count = "SELECT COUNT(*) n FROM events e WHERE e.demo=?";
      query += " ORDER BY e.id DESC";
    } else throw new DomainError("Módulo desconocido", 404);
    const [rows, total] = await Promise.all([
      this.all(query + limit, [...args, (page - 1) * 30]),
      this.one(count, args),
    ]);
    return { rows, total: total?.n ?? 0, page, pageSize: 30 };
  }
  async overview() {
    const f = this.ticketFilter();
    const summary = await this.one(
      `SELECT COUNT(*) total,SUM(CASE WHEN t.status NOT IN ('resuelto','cerrado') THEN 1 ELSE 0 END) open,SUM(CASE WHEN t.status='en_atencion' THEN 1 ELSE 0 END) working,SUM(CASE WHEN t.status IN ('resuelto','cerrado') THEN 1 ELSE 0 END) resolved,SUM(CASE WHEN t.status NOT IN ('resuelto','cerrado') AND t.due_at<? THEN 1 ELSE 0 END) overdue FROM tickets t WHERE ${f.sql}`,
      [now(), ...f.args],
    );
    const assets = await this.one(
      "SELECT COUNT(*) total,SUM(CASE WHEN status='operativo' THEN 1 ELSE 0 END) operational FROM assets WHERE demo=?",
      [this.demo],
    );
    const recent = await this.tickets(new URLSearchParams());
    const attention = await this.all(
      `SELECT t.*,x.code asset_code,x.location FROM tickets t JOIN assets x ON x.id=t.asset_id WHERE ${f.sql} AND t.status NOT IN ('resuelto','cerrado') ORDER BY CASE t.priority WHEN 'critica' THEN 0 WHEN 'alta' THEN 1 WHEN 'media' THEN 2 ELSE 3 END,t.due_at LIMIT 3`,
      f.args,
    );
    const days = [];
    for (let i = 6; i >= 0; i--) {
      const dt = new Date(Date.now() - i * 86400000 - 5 * 3600000)
        .toISOString()
        .slice(0, 10);
      const day = await this.one(
        `SELECT SUM(CASE WHEN date(t.created_at,'-5 hours')=? THEN 1 ELSE 0 END) created,SUM(CASE WHEN date(t.resolved_at,'-5 hours')=? THEN 1 ELSE 0 END) resolved FROM tickets t WHERE ${f.sql}`,
        [dt, dt, ...f.args],
      );
      days.push({ day: dt, ...day });
    }
    return {
      summary,
      assets,
      recent: recent.rows.slice(0, 5),
      attention,
      days,
    };
  }
}
