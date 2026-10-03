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
import { assetSave } from "./handlers/asset";
import {
  ticketCreate,
  ticketAssign,
  ticketTransition,
  ticketNote,
  reviewCreate,
} from "./handlers/ticket";
import { activitySave, activityTransition } from "./handlers/activity";
import { resourceRequire, resourceAllocate } from "./handlers/resource";
import {
  controlCreate,
  controlTransition,
  goalCreate,
  goalEvaluate,
} from "./handlers/control";
import { periodCreate, measurementCreate } from "./handlers/investigation";
import { memberSave } from "./handlers/member";
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
      case "asset.save":
        return assetSave(this, input);
      case "ticket.create":
        return ticketCreate(this, input);
      case "ticket.assign":
        return ticketAssign(this, input);
      case "ticket.transition":
        return ticketTransition(this, input);
      case "ticket.note":
        return ticketNote(this, input);
      case "review.create":
        return reviewCreate(this, input);
      case "activity.save":
        return activitySave(this, input);
      case "activity.transition":
        return activityTransition(this, input);
      case "resource.require":
        return resourceRequire(this, input);
      case "resource.allocate":
        return resourceAllocate(this, input);
      case "control.create":
        return controlCreate(this, input);
      case "control.transition":
        return controlTransition(this, input);
      case "goal.create":
        return goalCreate(this, input);
      case "goal.evaluate":
        return goalEvaluate(this, input);
      case "period.create":
        return periodCreate(this, input);
      case "measurement.create":
        return measurementCreate(this, input);
      case "member.save":
        return memberSave(this, input);
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
