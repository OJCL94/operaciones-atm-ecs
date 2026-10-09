const { DatabaseSync } = require("node:sqlite");
const fs = require("node:fs");
const path = require("node:path");
const Module = require("node:module");
const assert = require("node:assert/strict");
const root = path.resolve(__dirname, "..");
const ts = require("typescript");
Module._extensions[".ts"] = (mod, file) =>
  mod._compile(
    ts.transpileModule(fs.readFileSync(file, "utf8"), {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2022,
      },
    }).outputText,
    file,
  );
const { Service } = require(path.join(root, "lib/service.ts"));
const { report } = require(path.join(root, "lib/reports.ts"));
const { seed } = require(path.join(root, "lib/seed.ts"));
const { captureWeek } = require(path.join(root, "lib/snapshot.ts"));
const { csv, DomainError } = require(path.join(root, "lib/domain.ts"));

const RealDate = Date;
let fakeNow = null;
class ClockDate extends RealDate {
  constructor(...args) {
    super(...(args.length ? args : [fakeNow ?? RealDate.now()]));
  }
  static now() {
    return fakeNow ?? RealDate.now();
  }
}
global.Date = ClockDate;
async function at(iso, fn) {
  const old = fakeNow;
  fakeNow = RealDate.parse(iso);
  try {
    return await fn();
  } finally {
    fakeNow = old;
  }
}
const results = [];
const liveDatabases = [];
async function test(name, fn, { pending = false } = {}) {
  try {
    await fn();
    results.push({ name, status: "PASS" });
  } catch (e) {
    results.push({
      name,
      status: pending ? "PENDING" : "FAIL",
      error: e.message,
    });
  } finally {
    while (liveDatabases.length) liveDatabases.pop().close();
    fakeNow = null;
  }
}
function context() {
  const db = new DatabaseSync(":memory:");
  liveDatabases.push(db);
  db.exec("PRAGMA foreign_keys=ON");
  const migrations = fs
    .readdirSync(path.join(root, "drizzle"))
    .filter((x) => /^\d+.*\.sql$/.test(x))
    .sort();
  for (const filename of migrations)
    db.exec(fs.readFileSync(path.join(root, "drizzle", filename), "utf8"));
  const members = [
    ["admin", "admin"],
    ["supervisor", "supervisor"],
    ["tech", "tecnico"],
    ["othertech", "tecnico"],
    ["requester", "solicitante"],
    ["otherrequester", "solicitante"],
    ["auditor", "auditor"],
  ];
  for (const [id, role] of members)
    db.prepare(
      "INSERT INTO members(id,email,name,role,demo,active) VALUES(?,?,?,?,0,1)",
    ).run(id, id + "@pruebas.invalid", "Persona " + id, role);
  const adapter = {
    prepare(sql) {
      return {
        sql,
        args: [],
        bind(...args) {
          this.args = args;
          return this;
        },
        async first() {
          return db.prepare(sql).get(...this.args) ?? null;
        },
        async all() {
          return { results: db.prepare(sql).all(...this.args) };
        },
        async run() {
          return { meta: db.prepare(sql).run(...this.args) };
        },
      };
    },
    async batch(statements) {
      db.exec("BEGIN");
      try {
        const out = statements.map((s) => ({
          meta: db.prepare(s.sql).run(...s.args),
        }));
        db.exec("COMMIT");
        return out;
      } catch (e) {
        db.exec("ROLLBACK");
        throw e;
      }
    },
  };
  const svc = (id = "admin", demo = 0, overrides = {}, clock, ids) =>
    new Service(
      adapter,
      {
        ...db.prepare("SELECT * FROM members WHERE id=?").get(id),
        actualAdmin: id === "admin",
        ...overrides,
      },
      demo,
      clock,
      ids,
    );
  const row = (table, id) =>
    db.prepare(`SELECT * FROM ${table} WHERE id=?`).get(id);
  const count = (table) =>
    db.prepare(`SELECT COUNT(*) n FROM ${table}`).get().n;
  return { db, adapter, svc, row, count, migrations };
}
const assetData = {
  code: "ATM-900",
  serial: "SER-900",
  name: "Cajero de prueba",
  model: "ATM Modelo X",
  location: "Sede Lima",
  status: "operativo",
};
async function asset(c, overrides = {}, demo = 0) {
  return (
    await c
      .svc("admin", demo)
      .execute("asset.save", { ...assetData, ...overrides })
  ).id;
}
async function ticket(
  c,
  assetId,
  overrides = {},
  actor = "requester",
  demo = 0,
) {
  return (
    await c
      .svc(actor, demo)
      .execute("ticket.create", {
        asset_id: assetId,
        title: "Falla de impresión",
        description: "La impresora no emite el comprobante.",
        category: "Hardware",
        priority: "media",
        ...overrides,
      })
  ).id;
}
async function mutate(c, actor, table, id, kind, data = {}) {
  const r = c.row(table, id);
  return c
    .svc(actor, r.demo ?? 0)
    .execute(kind, { id, version: r.version, ...data });
}
async function assigned(c) {
  const aid = await asset(c);
  const tid = await ticket(c, aid);
  await mutate(c, "supervisor", "tickets", tid, "ticket.assign", {
    assignee_id: "tech",
    priority: "media",
    category: "Hardware",
    reason: "Asignación para revisión técnica",
  });
  return { aid, tid };
}
async function inProgress(c) {
  const data = await assigned(c);
  await mutate(c, "tech", "tickets", data.tid, "ticket.note", {
    type: "respuesta",
    note: "Se coordinó la inspección con la sede.",
  });
  await mutate(c, "tech", "tickets", data.tid, "ticket.transition", {
    status: "en_atencion",
    note: "Comienza la revisión técnica.",
  });
  return data;
}
async function activity(c, aid, overrides = {}) {
  return (
    await c
      .svc("supervisor")
      .execute("activity.save", {
        asset_id: aid,
        title: "Inspección técnica",
        description: "Revisión del módulo de impresión",
        owner_id: "tech",
        planned_start: "2026-09-18T10:00:00Z",
        planned_end: "2026-09-18T18:00:00Z",
        ...overrides,
      })
  ).id;
}
const statusError = (status) => (e) =>
  e instanceof DomainError && e.status === status;
const metric = (r, id) => r.metrics.find((x) => x.id === id);
const historicalRange = [
  "2026-01-01T00:00:00.000Z",
  "2026-01-31T23:59:59.999Z",
];

(async () => {
  await test("01 Flujo ticket: crear, asignar, responder, atender, resolver, cerrar y reabrir", async () => {
    const c = context();
    let aid, tid;
    await at("2026-01-01T10:00:00Z", async () => {
      aid = await asset(c);
      tid = await ticket(c, aid);
    });
    assert.equal(c.row("tickets", tid).status, "abierto");
    assert.equal(c.row("tickets", tid).due_at, "2026-01-02T10:00:00.000Z");
    await at("2026-01-01T10:10:00Z", () =>
      mutate(c, "supervisor", "tickets", tid, "ticket.assign", {
        assignee_id: "tech",
        priority: "alta",
        category: "Hardware",
        reason: "Derivado al técnico responsable.",
      }),
    );
    assert.equal(c.row("tickets", tid).due_at, "2026-01-01T18:00:00.000Z");
    await at("2026-01-01T10:30:00Z", () =>
      mutate(c, "tech", "tickets", tid, "ticket.note", {
        type: "respuesta",
        note: "Se confirmó recepción y visita técnica.",
      }),
    );
    await at("2026-01-01T11:00:00Z", () =>
      mutate(c, "tech", "tickets", tid, "ticket.transition", {
        status: "en_atencion",
        note: "Inspección iniciada.",
      }),
    );
    await at("2026-01-01T12:00:00Z", () =>
      mutate(c, "tech", "tickets", tid, "ticket.transition", {
        status: "resuelto",
        note: "Trabajo completado.",
        diagnosis: "Rodillo de arrastre desajustado.",
        solution: "Se ajustó y verificó con impresión.",
      }),
    );
    assert.equal(
      c.row("tickets", tid).first_response_at,
      "2026-01-01T10:30:00.000Z",
    );
    assert.equal(c.row("tickets", tid).resolved_at, "2026-01-01T12:00:00.000Z");
    await at("2026-01-01T13:00:00Z", () =>
      mutate(c, "requester", "tickets", tid, "ticket.transition", {
        status: "cerrado",
        note: "La sede confirma funcionamiento.",
      }),
    );
    assert.equal(c.row("tickets", tid).resolved_at, "2026-01-01T12:00:00.000Z");
    assert.equal(c.row("tickets", tid).closed_at, "2026-01-01T13:00:00.000Z");
    await assert.rejects(
      mutate(c, "tech", "tickets", tid, "ticket.note", {
        type: "respuesta",
        note: "Intervención después del cierre.",
      }),
      /Reabre/,
    );
    await at("2026-01-02T10:00:00Z", () =>
      mutate(c, "supervisor", "tickets", tid, "ticket.transition", {
        status: "en_atencion",
        note: "Se requiere inspección adicional.",
      }),
    );
    assert.equal(c.row("tickets", tid).resolved_at, null);
    assert.equal(c.row("tickets", tid).closed_at, null);
    assert.equal(
      c.row("tickets", tid).first_response_at,
      "2026-01-01T10:30:00.000Z",
    );
    assert.equal((await c.svc("requester").ticketDetail(tid)).events.length, 7);
  });
  await test("02 La primera respuesta no se sobreescribe con respuestas posteriores", async () => {
    const c = context();
    const { tid } = await assigned(c);
    await at("2026-09-18T10:00:00Z", () =>
      mutate(c, "tech", "tickets", tid, "ticket.note", {
        type: "respuesta",
        note: "Primera respuesta técnica.",
      }),
    );
    await at("2026-09-18T11:00:00Z", () =>
      mutate(c, "tech", "tickets", tid, "ticket.note", {
        type: "respuesta",
        note: "Segunda respuesta técnica.",
      }),
    );
    assert.equal(
      c.row("tickets", tid).first_response_at,
      "2026-09-18T10:00:00.000Z",
    );
  });
  await test("03 Resolver exige atención, primera respuesta, diagnóstico y solución", async () => {
    const c = context();
    const { tid } = await assigned(c);
    await assert.rejects(
      mutate(c, "tech", "tickets", tid, "ticket.transition", {
        status: "resuelto",
        note: "Intento inválido.",
        diagnosis: "Diagnóstico extenso",
        solution: "Solución extensa",
      }),
      statusError(409),
    );
    await mutate(c, "tech", "tickets", tid, "ticket.transition", {
      status: "en_atencion",
      note: "Inspección iniciada.",
    });
    await assert.rejects(
      mutate(c, "tech", "tickets", tid, "ticket.transition", {
        status: "resuelto",
        note: "Cierre prematuro.",
        diagnosis: "Diagnóstico extenso",
        solution: "Solución extensa",
      }),
      /primera respuesta/,
    );
    await mutate(c, "tech", "tickets", tid, "ticket.note", {
      type: "respuesta",
      note: "Respuesta documentada.",
    });
    await assert.rejects(
      mutate(c, "tech", "tickets", tid, "ticket.transition", {
        status: "resuelto",
        note: "Resultado registrado.",
        diagnosis: "x",
        solution: "y",
      }),
      /diagnóstico/,
    );
    assert.equal(c.row("tickets", tid).status, "en_atencion");
  });
  await test("04 Tareas abiertas bloquean resolver; completar permite resolver", async () => {
    const c = context();
    const { aid, tid } = await inProgress(c);
    const act = await activity(c, aid, { ticket_id: tid });
    const data = {
      status: "resuelto",
      note: "Trabajo completado.",
      diagnosis: "Se detectó atasco.",
      solution: "Se retiró material atascado.",
    };
    await assert.rejects(
      mutate(c, "tech", "tickets", tid, "ticket.transition", data),
      /actividades vinculadas/,
    );
    await mutate(c, "tech", "activities", act, "activity.transition", {
      status: "en_curso",
      evidence: "Inicio documentado.",
    });
    await mutate(c, "tech", "activities", act, "activity.transition", {
      status: "completada",
      evidence: "Verificación correcta.",
    });
    await mutate(c, "tech", "tickets", tid, "ticket.transition", data);
    assert.equal(c.row("tickets", tid).status, "resuelto");
  });
  await test("05 No se agregan tareas a tickets resueltos ni tickets a activos retirados", async () => {
    const c = context();
    const { aid, tid } = await inProgress(c);
    await mutate(c, "tech", "tickets", tid, "ticket.transition", {
      status: "resuelto",
      note: "Trabajo completado.",
      diagnosis: "Se detectó atasco.",
      solution: "Se retiró material atascado.",
    });
    await assert.rejects(activity(c, aid, { ticket_id: tid }), /resuelto/);
    await c
      .svc()
      .execute("asset.save", {
        ...assetData,
        id: aid,
        version: 1,
        status: "retirado",
      });
    await assert.rejects(ticket(c, aid), /retirado/);
  });
  await test("06 Roles: solicitante ve sólo sus tickets y técnico sólo propios/asignados", async () => {
    const c = context();
    const { aid, tid } = await assigned(c);
    await ticket(c, aid, {}, "otherrequester");
    assert.equal(
      (await c.svc("requester").tickets(new URLSearchParams())).total,
      1,
    );
    assert.equal((await c.svc("tech").tickets(new URLSearchParams())).total, 1);
    assert.equal(
      (await c.svc("othertech").tickets(new URLSearchParams())).total,
      0,
    );
    await assert.rejects(
      c.svc("otherrequester").ticketDetail(tid),
      statusError(403),
    );
    await assert.rejects(
      c.svc("othertech").ticketDetail(tid),
      statusError(403),
    );
    assert.equal(
      (await c.svc("auditor").tickets(new URLSearchParams())).total,
      2,
    );
  });
  await test("07 Roles: solicitante y técnico no administran asignaciones, activos ni recursos", async () => {
    const c = context();
    const { aid, tid } = await assigned(c);
    for (const id of ["requester", "tech"]) {
      await assert.rejects(
        c.svc(id).execute("asset.save", assetData),
        statusError(403),
      );
      await assert.rejects(
        c
          .svc(id)
          .execute("ticket.assign", {
            id: tid,
            version: 2,
            assignee_id: "othertech",
            priority: "media",
            category: "Hardware",
            reason: "Cambio no autorizado.",
          }),
        statusError(403),
      );
      await assert.rejects(
        c.svc(id).execute("resource.require", {}),
        statusError(403),
      );
    }
    await assert.rejects(
      ticket(c, aid, { assignee_id: "tech" }),
      statusError(403),
    );
  });
  await test("08 Roles: auditor consulta, pero no modifica operación", async () => {
    const c = context();
    const { aid, tid } = await inProgress(c);
    const act = await activity(c, aid);
    assert.ok(await c.svc("auditor").ticketDetail(tid));
    assert.ok(await c.svc("auditor").activityDetail(act));
    await assert.rejects(ticket(c, aid, {}, "auditor"), statusError(403));
    await assert.rejects(
      mutate(c, "auditor", "tickets", tid, "ticket.note", {
        type: "comentario",
        note: "Intento de edición.",
      }),
      statusError(403),
    );
    await assert.rejects(
      mutate(c, "auditor", "activities", act, "activity.transition", {
        status: "en_curso",
        evidence: "Intento de inicio.",
      }),
      statusError(403),
    );
    await assert.rejects(
      c.svc("auditor").execute("review.create", {}),
      statusError(403),
    );
  });
  await test("09 Roles: sólo asignado/supervisión responde y sólo solicitante/supervisión cierra", async () => {
    const c = context();
    const { tid } = await inProgress(c);
    await assert.rejects(
      mutate(c, "requester", "tickets", tid, "ticket.note", {
        type: "respuesta",
        note: "Respuesta no permitida.",
      }),
      statusError(403),
    );
    await assert.rejects(
      mutate(c, "othertech", "tickets", tid, "ticket.note", {
        type: "seguimiento",
        note: "Seguimiento ajeno.",
      }),
      statusError(403),
    );
    await mutate(c, "tech", "tickets", tid, "ticket.transition", {
      status: "resuelto",
      note: "Trabajo completado.",
      diagnosis: "Se detectó atasco.",
      solution: "Se retiró material atascado.",
    });
    await assert.rejects(
      mutate(c, "tech", "tickets", tid, "ticket.transition", {
        status: "cerrado",
        note: "Cierre no autorizado.",
      }),
      statusError(403),
    );
    await assert.rejects(
      mutate(c, "requester", "tickets", tid, "ticket.transition", {
        status: "en_atencion",
        note: "Reapertura no autorizada.",
      }),
      statusError(403),
    );
  });
  await test("10 Accesos: sólo admin real, correo inmutable y no autoexclusión", async () => {
    const c = context();
    await assert.rejects(
      c.svc("supervisor").execute("member.save", {}),
      statusError(403),
    );
    await assert.rejects(
      c.svc("admin", 0, { actualAdmin: false }).execute("member.save", {}),
      statusError(403),
    );
    await assert.rejects(
      c.svc("admin", 1).execute("member.save", {}),
      /entorno real/,
    );
    const made = await c
      .svc()
      .execute("member.save", {
        email: "NUEVO@PRUEBAS.INVALID",
        name: "Nuevo Técnico",
        role: "tecnico",
        active: true,
      });
    assert.equal(c.row("members", made.id).email, "nuevo@pruebas.invalid");
    await assert.rejects(
      c
        .svc()
        .execute("member.save", {
          id: made.id,
          version: 1,
          email: "otro@pruebas.invalid",
          name: "Nuevo Técnico",
          role: "tecnico",
          active: true,
        }),
      /inmutable/,
    );
    await assert.rejects(
      c
        .svc()
        .execute("member.save", {
          id: "admin",
          version: 1,
          email: "admin@pruebas.invalid",
          name: "Administrador",
          role: "tecnico",
          active: true,
        }),
      /propio acceso/,
    );
  });
  await test("11 Asignación rechaza inactivos y roles sin función técnica", async () => {
    const c = context();
    const aid = await asset(c);
    c.db.prepare("UPDATE members SET active=0 WHERE id=?").run("tech");
    await assert.rejects(
      ticket(c, aid, { assignee_id: "tech" }, "supervisor"),
      /responsable activo/,
    );
    await assert.rejects(
      ticket(c, aid, { assignee_id: "requester" }, "supervisor"),
      /responsable activo/,
    );
  });
  await test("12 Recurso parcial bloquea inicio; cobertura total habilita; exceso se rechaza", async () => {
    const c = context();
    const aid = await asset(c),
      act = await activity(c, aid);
    const req = (
      await c
        .svc("supervisor")
        .execute("resource.require", {
          activity_id: act,
          name: "Rodillo de repuesto",
          quantity: 2,
          unit: "unidad",
          required_by: "2026-09-18T10:00:00Z",
        })
    ).id;
    await c
      .svc("supervisor")
      .execute("resource.allocate", {
        requirement_id: req,
        quantity: 1,
        note: "Primera unidad entregada.",
      });
    await assert.rejects(
      mutate(c, "tech", "activities", act, "activity.transition", {
        status: "en_curso",
        evidence: "Inicio de trabajo.",
      }),
      /Faltan recursos/,
    );
    await assert.rejects(
      c
        .svc("supervisor")
        .execute("resource.allocate", {
          requirement_id: req,
          quantity: 2,
          note: "Entrega por encima del pendiente.",
        }),
      statusError(409),
    );
    await c
      .svc("supervisor")
      .execute("resource.allocate", {
        requirement_id: req,
        quantity: 1,
        note: "Segunda unidad entregada.",
      });
    await mutate(c, "tech", "activities", act, "activity.transition", {
      status: "en_curso",
      evidence: "Todos los recursos disponibles.",
    });
    await assert.rejects(
      c
        .svc("supervisor")
        .execute("resource.require", {
          activity_id: act,
          name: "Nuevo repuesto",
          quantity: 1,
          unit: "unidad",
          required_by: "2026-09-18T10:00:00Z",
        }),
      /antes de iniciar/,
    );
    await assert.rejects(
      c
        .svc("supervisor")
        .execute("resource.allocate", {
          requirement_id: req,
          quantity: 1,
          note: "Asignación tardía.",
        }),
      /comenzó/,
    );
    await mutate(c, "tech", "activities", act, "activity.transition", {
      status: "completada",
      evidence: "Actividad terminada.",
    });
    assert.ok(c.row("activities", act).started_at);
    assert.ok(c.row("activities", act).completed_at);
  });
  await test("13 Actividad pendiente requiere plan y sólo supervisión puede cancelar", async () => {
    const c = context();
    const aid = await asset(c),
      act = await activity(c, aid, { planned_start: "", planned_end: "" });
    assert.equal(c.row("activities", act).status, "pendiente");
    await assert.rejects(
      mutate(c, "tech", "activities", act, "activity.transition", {
        status: "en_curso",
        evidence: "Inicio sin plan.",
      }),
      statusError(409),
    );
    await assert.rejects(
      mutate(c, "tech", "activities", act, "activity.transition", {
        status: "cancelada",
        evidence: "Cancelación no autorizada.",
      }),
      statusError(403),
    );
    await mutate(c, "supervisor", "activities", act, "activity.transition", {
      status: "cancelada",
      evidence: "Cancelación justificada.",
    });
    assert.equal(c.row("activities", act).status, "cancelada");
  });
  await test("14 Planificación valida fechas, responsable y activo del ticket", async () => {
    const c = context();
    const { aid, tid } = await assigned(c);
    const other = await asset(c, { code: "ATM-901", serial: "SER-901" });
    await assert.rejects(activity(c, other, { ticket_id: tid }), /otro activo/);
    await assert.rejects(activity(c, aid, { owner_id: "" }), /requiere/);
    await assert.rejects(
      activity(c, aid, {
        planned_start: "2026-09-18T10:00:00-05:00",
        planned_end: "2026-09-18T11:00:00Z",
      }),
      /posterior/,
    );
  });
  await test("15 Control: responsable inicia, supervisor verifica cierre con evidencia", async () => {
    const c = context();
    const aid = await asset(c),
      act = await activity(c, aid);
    const id = (
      await c
        .svc("supervisor")
        .execute("control.create", {
          activity_id: act,
          title: "Entrega tardía",
          finding: "El repuesto se entregó fuera de plazo.",
          action: "Preparar el kit el día anterior.",
          owner_id: "tech",
          due_at: "2026-09-19T00:00:00Z",
        })
    ).id;
    await assert.rejects(
      mutate(c, "othertech", "controls", id, "control.transition", {
        status: "en_curso",
        evidence: "Inicio no autorizado.",
      }),
      statusError(403),
    );
    await mutate(c, "tech", "controls", id, "control.transition", {
      status: "en_curso",
      evidence: "Se coordinó el nuevo procedimiento.",
    });
    await assert.rejects(
      mutate(c, "tech", "controls", id, "control.transition", {
        status: "cerrada",
        evidence: "Cierre no autorizado.",
      }),
      statusError(403),
    );
    await mutate(c, "supervisor", "controls", id, "control.transition", {
      status: "cerrada",
      evidence: "Se verificó implementación.",
    });
    assert.ok(c.row("controls", id).completed_at);
    await assert.rejects(
      mutate(c, "supervisor", "controls", id, "control.transition", {
        status: "en_curso",
        evidence: "Transición no prevista.",
      }),
      statusError(409),
    );
  });
  await test("16 Metas: comparar mayor/menor e incluir no evaluadas en denominador", async () => {
    const c = context();
    let ids = [];
    await at("2026-01-01T00:00:00Z", async () => {
      for (const [direction, target] of [
        ["mayor", 5],
        ["menor", 5],
        ["mayor", 1],
      ])
        ids.push(
          (
            await c
              .svc("supervisor")
              .execute("goal.create", {
                title: "Meta de prueba",
                unit: "unidad",
                target,
                direction,
                start_at: "2026-01-01T00:00:00Z",
                end_at: "2026-01-15T00:00:00Z",
              })
          ).id,
        );
    });
    await at("2026-01-16T00:00:00Z", async () => {
      await mutate(c, "supervisor", "goals", ids[0], "goal.evaluate", {
        actual: 6,
        evidence: "Se verificaron seis unidades.",
      });
      await mutate(c, "supervisor", "goals", ids[1], "goal.evaluate", {
        actual: 4,
        evidence: "Se verificaron cuatro unidades.",
      });
    });
    const r = await report(c.svc("auditor"), ...historicalRange);
    assert.equal(metric(r, "metas").numerator, 2);
    assert.equal(metric(r, "metas").denominator, 3);
    assert.equal(metric(r, "metas").value, 66.67);
  });
  await test("17 Mediciones: porcentaje calculado, denominador cero nulo y unicidad", async () => {
    const c = context();
    const period = (
      await c
        .svc("auditor")
        .execute("period.create", {
          label: "Pretest enero",
          phase: "pretest",
          start_at: historicalRange[0],
          end_at: historicalRange[1],
          notes: "Datos sintéticos para la prueba.",
        })
    ).id;
    const base = {
      period_id: period,
      indicator: "categoria",
      week_start: "2026-01-05T00:00:00Z",
      numerator: 3,
      denominator: 4,
      value: 999,
      sample_size: 4,
      source: "Ficha de observación",
      evidence: "Tres de cuatro casos revisados.",
    };
    const id = (await c.svc("auditor").execute("measurement.create", base)).id;
    assert.equal(c.row("measurements", id).value, 75);
    await assert.rejects(
      c.svc("auditor").execute("measurement.create", base),
      /UNIQUE/,
    );
    await assert.rejects(
      c
        .svc("auditor")
        .execute("measurement.create", {
          ...base,
          week_start: "2026-01-12T00:00:00Z",
          numerator: 5,
        }),
      /numerador/,
    );
    const empty = (
      await c
        .svc("auditor")
        .execute("measurement.create", {
          ...base,
          week_start: "2026-01-12T00:00:00Z",
          numerator: 0,
          denominator: 0,
          sample_size: 0,
        })
    ).id;
    assert.equal(c.row("measurements", empty).value, null);
  });
  await test("18 Mediciones: tiempo requiere muestra; semana fuera del período se rechaza", async () => {
    const c = context();
    const p = (
      await c
        .svc("auditor")
        .execute("period.create", {
          label: "Pretest enero",
          phase: "pretest",
          start_at: historicalRange[0],
          end_at: historicalRange[1],
          notes: "Prueba de restricciones temporales.",
        })
    ).id;
    const x = {
      period_id: p,
      indicator: "respuesta",
      week_start: "2026-01-05T00:00:00Z",
      numerator: null,
      denominator: null,
      value: 2,
      sample_size: 0,
      source: "Registro de tiempos",
      evidence: "Tiempo observado en muestra.",
    };
    await assert.rejects(
      c.svc("auditor").execute("measurement.create", x),
      /muestra positivo/,
    );
    await assert.rejects(
      c
        .svc("auditor")
        .execute("measurement.create", {
          ...x,
          sample_size: 2,
          week_start: "2026-02-01T00:00:00Z",
        }),
      /pertenecer/,
    );
    await assert.rejects(
      c.svc("tech").execute("period.create", {}),
      statusError(403),
    );
    await assert.rejects(
      c.svc("requester").list("periods", new URLSearchParams()),
      statusError(403),
    );
  });
  await test("19 Restricciones FK, unicidad y rollback de creación con auditoría", async () => {
    const c = context();
    const { aid, tid } = await assigned(c);
    assert.throws(
      () => c.db.prepare("DELETE FROM assets WHERE id=?").run(aid),
      /FOREIGN KEY/,
    );
    assert.throws(
      () =>
        c.db
          .prepare("UPDATE tickets SET assignee_id=? WHERE id=?")
          .run("no-existe", tid),
      /FOREIGN KEY/,
    );
    const before = c.count("events");
    await assert.rejects(asset(c), /UNIQUE/);
    assert.equal(c.count("events"), before);
    assert.equal(c.count("assets"), 1);
  });
  await test("20 Versiones obsoletas se rechazan sin evento ni modificación extra", async () => {
    const c = context();
    const { tid } = await assigned(c);
    const v = c.row("tickets", tid).version;
    await mutate(c, "requester", "tickets", tid, "ticket.note", {
      type: "comentario",
      note: "Información adicional de sede.",
    });
    const n = c.count("events");
    await assert.rejects(
      c
        .svc("requester")
        .execute("ticket.note", {
          id: tid,
          version: v,
          type: "comentario",
          note: "Edición de una vista obsoleta.",
        }),
      statusError(409),
    );
    assert.equal(c.count("events"), n);
    assert.equal(c.row("tickets", tid).version, v + 1);
  });
  await test("21 Entornos: demo/real no se cruzan en lecturas, enlaces ni mediciones", async () => {
    const c = context();
    await seed(c.svc("admin", 1));
    const realAsset = await asset(c);
    const realTicket = await ticket(c, realAsset);
    assert.equal((await c.svc().tickets(new URLSearchParams())).total, 1);
    assert.equal(
      (await c.svc("admin", 1).tickets(new URLSearchParams())).total,
      16,
    );
    await assert.rejects(
      c.svc("admin", 1).ticketDetail(realTicket),
      statusError(404),
    );
    await assert.rejects(ticket(c, "demo-atm-1"), statusError(404));
    await assert.rejects(
      ticket(c, realAsset, {}, "admin", 1),
      statusError(404),
    );
    const p = (
      await c
        .svc("auditor")
        .execute("period.create", {
          label: "Estudio real",
          phase: "pretest",
          start_at: historicalRange[0],
          end_at: historicalRange[1],
          notes: "Período de prueba en entorno real.",
        })
    ).id;
    await assert.rejects(
      c
        .svc("demo-auditor", 1)
        .execute("measurement.create", {
          period_id: p,
          indicator: "respuesta",
          week_start: "2026-01-05T00:00:00Z",
          numerator: null,
          denominator: null,
          value: 1,
          sample_size: 1,
          source: "Fuente de prueba",
          evidence: "Evidencia de prueba.",
        }),
      statusError(404),
    );
  });
  await test("22 SQL parametrizado y búsqueda literal de comodines", async () => {
    const c = context();
    const a = await asset(c);
    await ticket(c, a, { title: "Lectura 100%_! correcta" });
    await ticket(c, a, { title: "Otro incidente registrado" });
    assert.equal(
      (await c.svc().tickets(new URLSearchParams({ q: "%_!" }))).total,
      1,
    );
    assert.equal(
      (await c.svc().tickets(new URLSearchParams({ q: "' OR 1=1 --" }))).total,
      0,
    );
    assert.equal(c.count("tickets"), 2);
  });
  await test("23 Paginación estable, filtros y páginas decimales", async () => {
    const c = context();
    const a = await asset(c);
    for (let i = 0; i < 17; i++)
      await ticket(c, a, {
        title: "Incidencia número " + i,
        priority: i < 4 ? "alta" : "media",
      });
    const p1 = await c.svc().tickets(new URLSearchParams("page=1.5"));
    const p2 = await c.svc().tickets(new URLSearchParams("page=2"));
    assert.equal(p1.page, 1);
    assert.equal(p1.rows.length, 15);
    assert.equal(p2.rows.length, 2);
    assert.equal(new Set([...p1.rows, ...p2.rows].map((x) => x.id)).size, 17);
    assert.equal(
      (await c.svc().tickets(new URLSearchParams("priority=alta"))).total,
      4,
    );
    assert.equal(
      (await c.svc().list("assets", new URLSearchParams("page=1.2"))).page,
      1,
    );
  });
  await test("24 Reportes vacíos: porcentajes y promedios nulos, sin evidencia inventada", async () => {
    const c = context();
    const r = await report(c.svc("auditor"), ...historicalRange);
    assert.equal(r.metrics.length, 14);
    for (const m of r.metrics)
      if (m.id !== "registro") {
        assert.equal(m.value, null, m.id);
        assert.equal(m.sample_size, 0, m.id);
      }
    assert.equal(metric(r, "registro").value, 0);
    await assert.rejects(
      report(c.svc("tech"), ...historicalRange),
      statusError(403),
    );
    await assert.rejects(
      report(c.svc("requester"), ...historicalRange),
      statusError(403),
    );
  });
  await test("25 Reportes: primera respuesta y resolución excluyen hitos posteriores al corte", async () => {
    const c = context();
    let tid;
    await at("2026-01-30T00:00:00Z", async () => {
      const d = await assigned(c);
      tid = d.tid;
    });
    await at("2026-02-01T00:00:00Z", async () => {
      await mutate(c, "tech", "tickets", tid, "ticket.note", {
        type: "respuesta",
        note: "Respuesta posterior al corte.",
      });
      await mutate(c, "tech", "tickets", tid, "ticket.transition", {
        status: "en_atencion",
        note: "Atención posterior al corte.",
      });
    });
    await at("2026-02-02T00:00:00Z", () =>
      mutate(c, "tech", "tickets", tid, "ticket.transition", {
        status: "resuelto",
        note: "Finalizado en febrero.",
        diagnosis: "Falla de rodillo.",
        solution: "Rodillo reemplazado.",
      }),
    );
    const r = await report(c.svc("auditor"), ...historicalRange);
    assert.equal(metric(r, "respuesta").value, null);
    assert.equal(metric(r, "respuesta").pending, 1);
    assert.equal(metric(r, "resolucion").value, null);
    assert.equal(metric(r, "resolucion").pending, 1);
  });
  await test("26 Reportes: última revisión cuenta una vez, monitoreo exige revisión explícita", async () => {
    const c = context();
    let tid;
    await at("2026-01-01T00:00:00Z", async () => {
      ({ tid } = await assigned(c));
    });
    await at("2026-01-02T00:00:00Z", () =>
      c
        .svc("supervisor")
        .execute("review.create", {
          entity_id: tid,
          kind: "categoria",
          passed: false,
          evidence: "Categoría incorrecta en revisión.",
        }),
    );
    await at("2026-01-03T00:00:00Z", () =>
      c
        .svc("supervisor")
        .execute("review.create", {
          entity_id: tid,
          kind: "categoria",
          passed: true,
          evidence: "Clasificación corregida y revisada.",
        }),
    );
    let r = await report(c.svc("auditor"), ...historicalRange);
    assert.equal(metric(r, "categoria").denominator, 1);
    assert.equal(metric(r, "categoria").value, 100);
    assert.equal(metric(r, "monitoreo").value, 0);
    await at("2026-01-04T00:00:00Z", () =>
      c
        .svc("supervisor")
        .execute("review.create", {
          entity_id: tid,
          kind: "monitoreo",
          passed: false,
          evidence: "Monitoreo explícito con observación.",
        }),
    );
    r = await report(c.svc("auditor"), ...historicalRange);
    assert.equal(metric(r, "monitoreo").value, 100);
  });
  await test("27 Concurrencia: ticket no queda resuelto con nueva actividad pendiente", async () => {
    const c = context();
    const { aid, tid } = await inProgress(c),
      v = c.row("tickets", tid).version;
    const out = await Promise.allSettled([
      c
        .svc("tech")
        .execute("ticket.transition", {
          id: tid,
          version: v,
          status: "resuelto",
          note: "Resolución concurrente.",
          diagnosis: "Diagnóstico registrado.",
          solution: "Solución registrada.",
        }),
      activity(c, aid, { ticket_id: tid }),
    ]);
    assert.equal(out.filter((x) => x.status === "rejected").length, 1);
    assert.equal(
      c.db
        .prepare(
          "SELECT COUNT(*) n FROM tickets t JOIN activities a ON a.ticket_id=t.id WHERE t.status='resuelto' AND a.status NOT IN ('completada','cancelada')",
        )
        .get().n,
      0,
    );
  });
  await test("28 Concurrencia: inicio y recurso nuevo preservan cobertura", async () => {
    const c = context();
    const aid = await asset(c),
      act = await activity(c, aid);
    const out = await Promise.allSettled([
      mutate(c, "tech", "activities", act, "activity.transition", {
        status: "en_curso",
        evidence: "Inicio concurrente.",
      }),
      c
        .svc("supervisor")
        .execute("resource.require", {
          activity_id: act,
          name: "Repuesto adicional",
          quantity: 1,
          unit: "unidad",
          required_by: "2026-09-18T10:00:00Z",
        }),
    ]);
    assert.equal(out.filter((x) => x.status === "rejected").length, 1);
    assert.equal(
      c.db
        .prepare(
          "SELECT COUNT(*) n FROM activities a JOIN resource_requirements r ON r.activity_id=a.id WHERE a.status='en_curso' AND COALESCE((SELECT SUM(quantity) FROM resource_allocations WHERE requirement_id=r.id),0)<r.quantity",
        )
        .get().n,
      0,
    );
  });
  await test("29 Concurrencia: asignaciones parciales no sobrepasan el requisito", async () => {
    const c = context();
    const aid = await asset(c),
      act = await activity(c, aid);
    const req = (
      await c
        .svc("supervisor")
        .execute("resource.require", {
          activity_id: act,
          name: "Repuesto necesario",
          quantity: 2,
          unit: "unidad",
          required_by: "2026-09-18T10:00:00Z",
        })
    ).id;
    const out = await Promise.allSettled([
      c
        .svc("supervisor")
        .execute("resource.allocate", {
          requirement_id: req,
          quantity: 1.5,
          note: "Asignación de almacén A.",
        }),
      c
        .svc("supervisor")
        .execute("resource.allocate", {
          requirement_id: req,
          quantity: 1.5,
          note: "Asignación de almacén B.",
        }),
    ]);
    assert.equal(out.filter((x) => x.status === "rejected").length, 1);
    assert.equal(
      c.db
        .prepare(
          "SELECT SUM(quantity) n FROM resource_allocations WHERE requirement_id=?",
        )
        .get(req).n,
      1.5,
    );
  });
  await test("30 Concurrencia: una de dos modificaciones con misma versión gana", async () => {
    const c = context();
    const { tid } = await assigned(c),
      v = c.row("tickets", tid).version;
    const data = {
      id: tid,
      version: v,
      type: "comentario",
      note: "Información adicional de sede.",
    };
    const n = c.count("events");
    const out = await Promise.allSettled([
      c.svc("requester").execute("ticket.note", data),
      c.svc("requester").execute("ticket.note", data),
    ]);
    assert.equal(out.filter((x) => x.status === "rejected").length, 1);
    assert.equal(c.count("events"), n + 1);
  });
  await test("31 Concurrencia: período solapado sólo se inserta una vez", async () => {
    const c = context();
    const p = {
      label: "Enero pretest",
      phase: "pretest",
      start_at: historicalRange[0],
      end_at: historicalRange[1],
      notes: "Datos sintéticos de prueba.",
    };
    const out = await Promise.allSettled([
      c.svc("auditor").execute("period.create", p),
      c.svc("auditor").execute("period.create", p),
    ]);
    assert.equal(out.filter((x) => x.status === "rejected").length, 1);
    assert.equal(c.count("study_periods"), 1);
  });
  await test("32 Seed concurrente es idempotente, respeta SLA y conserva cambios posteriores", async () => {
    const c = context();
    await Promise.all([seed(c.svc("admin", 1)), seed(c.svc("admin", 1))]);
    assert.equal(c.count("tickets"), 16);
    assert.equal(
      c.db
        .prepare("SELECT COUNT(*) n FROM events WHERE action='ticket_creado'")
        .get().n,
      16,
    );
    assert.equal(
      c.db
        .prepare("SELECT COUNT(*) n FROM activities WHERE status='completada'")
        .get().n,
      3,
    );
    const t = c.row("tickets", "demo-ticket-4");
    assert.equal(
      (RealDate.parse(t.due_at) - RealDate.parse(t.created_at)) / 3600000,
      24,
    );
    await c
      .svc("admin", 1)
      .execute("activity.transition", {
        id: "demo-activity-1",
        version: 1,
        status: "cancelada",
        evidence: "Cancelación posterior al seed.",
      });
    await seed(c.svc("admin", 1));
    assert.equal(c.row("activities", "demo-activity-1").status, "cancelada");
    assert.equal(c.db.prepare("PRAGMA foreign_key_check").all().length, 0);
  });
  await test("33 Seed restringido a administrador real en demostración", async () => {
    const c = context();
    await assert.rejects(seed(c.svc("supervisor", 1)), statusError(403));
    await assert.rejects(seed(c.svc("admin", 0)), /demostración/);
    await assert.rejects(
      seed(c.svc("admin", 1, { actualAdmin: false })),
      statusError(403),
    );
  });
  await test("34 Auditoría inmutable y fallo de batch revierte toda la operación", async () => {
    const c = context();
    const aid = await asset(c);
    assert.throws(() => c.db.prepare("DELETE FROM events").run(), /inmutable/);
    assert.throws(
      () => c.db.prepare("UPDATE events SET detail='modificado'").run(),
      /inmutable/,
    );
    const version = c.row("assets", aid).version;
    await assert.rejects(
      c.adapter.batch([
        c
          .svc()
          .stmt("UPDATE assets SET name=? WHERE id=?", [
            "Cambio transitorio",
            aid,
          ]),
        c.svc().stmt("UPDATE events SET detail='modificado'"),
      ]),
      /inmutable/,
    );
    assert.equal(c.row("assets", aid).name, assetData.name);
    assert.equal(c.row("assets", aid).version, version);
  });
  await test("35 Fechas UTC canónicas y rechazo de rangos inversos", async () => {
    const c = context();
    const id = (
      await c
        .svc("supervisor")
        .execute("goal.create", {
          title: "Meta UTC",
          unit: "unidad",
          target: 1,
          direction: "mayor",
          start_at: "2026-01-01T00:00:00-05:00",
          end_at: "2026-01-02T00:00:00-05:00",
        })
    ).id;
    assert.equal(c.row("goals", id).start_at, "2026-01-01T05:00:00.000Z");
    await assert.rejects(
      c
        .svc("supervisor")
        .execute("goal.create", {
          title: "Meta inversa",
          unit: "unidad",
          target: 1,
          direction: "mayor",
          start_at: "2026-09-18T10:00:00-05:00",
          end_at: "2026-09-18T11:00:00Z",
        }),
      /período/,
    );
    await assert.rejects(
      report(c.svc(), historicalRange[1], historicalRange[0]),
      /período/,
    );
    await assert.rejects(report(c.svc(), "2024-01-01", "2026-01-01"), /366/);
  });
  await test("36 CSV: UTF8 BOM, comillas, salto de línea y neutralización de fórmulas", async () => {
    const out = csv([
      { texto: "=1+1", nombre: 'Árbol, "Lima"\nsegunda línea', n: 2 },
      { texto: " \t+SUM(A1)", nombre: "Seguro", n: 0 },
      { texto: "-2+3", nombre: "@cmd", n: null },
    ]);
    assert.ok(out.startsWith("\uFEFF"));
    assert.ok(out.includes('"\'=1+1"'));
    assert.ok(out.includes('"\' \t+SUM(A1)"'));
    assert.ok(out.includes('"\'-2+3"'));
    assert.ok(out.includes('"\'@cmd"'));
    assert.ok(out.includes('"Árbol, ""Lima""\nsegunda línea"'));
    assert.ok(out.includes("\r\n"));
    assert.ok(out.endsWith('""'));
  });

  // Regresiones de concurrencia e historial.
  await test(
    "37 Concurrencia: alta ticket comprueba retiro del activo dentro de escritura",
    async () => {
      const c = context();
      const aid = await asset(c);
      const out = await Promise.allSettled([
        ticket(c, aid, { assignee_id: "tech" }, "supervisor"),
        c
          .svc()
          .execute("asset.save", {
            ...assetData,
            id: aid,
            version: 1,
            status: "retirado",
          }),
      ]);
      const ev = c.db.prepare("SELECT id,action FROM events ORDER BY id").all(),
        retired = ev.find((x) => x.action === "activo_actualizado"),
        created = ev.find((x) => x.action === "ticket_creado");
      assert.ok(
        out.some((x) => x.status === "rejected") || created.id < retired.id,
        "Se confirmó ticket_creado después de activo_actualizado a retirado.",
      );
    },
    {},
  );
  await test(
    "38 Reportes: reapertura posterior conserva resolución histórica",
    async () => {
      const c = context();
      let tid;
      await at("2026-01-01T00:00:00Z", async () => {
        ({ tid } = await inProgress(c));
      });
      await at("2026-01-02T00:00:00Z", () =>
        mutate(c, "tech", "tickets", tid, "ticket.transition", {
          status: "resuelto",
          note: "Resolución en enero.",
          diagnosis: "Falla identificada.",
          solution: "Componente ajustado.",
        }),
      );
      const before = await report(c.svc("auditor"), ...historicalRange);
      await at("2026-09-01T00:00:00Z", () =>
        mutate(c, "supervisor", "tickets", tid, "ticket.transition", {
          status: "en_atencion",
          note: "Reapertura en septiembre.",
        }),
      );
      const after = await report(c.svc("auditor"), ...historicalRange);
      assert.equal(metric(before, "resolucion").sample_size, 1);
      assert.equal(metric(after, "resolucion").sample_size, 1);
      assert.equal(metric(after, "resolucion").value, 24);
    },
    {},
  );
  await test(
    "39 Reportes: reevaluación posterior conserva logro histórico de meta",
    async () => {
      const c = context();
      let id;
      await at("2026-01-01T00:00:00Z", async () => {
        id = (
          await c
            .svc("supervisor")
            .execute("goal.create", {
              title: "Meta histórica",
              unit: "unidad",
              target: 1,
              direction: "mayor",
              start_at: "2026-01-01T00:00:00Z",
              end_at: "2026-01-15T00:00:00Z",
            })
        ).id;
      });
      await at("2026-01-16T00:00:00Z", () =>
        mutate(c, "supervisor", "goals", id, "goal.evaluate", {
          actual: 1,
          evidence: "Meta cumplida en enero.",
        }),
      );
      const before = await report(c.svc("auditor"), ...historicalRange);
      await at("2026-09-01T00:00:00Z", () =>
        mutate(c, "supervisor", "goals", id, "goal.evaluate", {
          actual: 1,
          evidence: "Mismo resultado en reevaluación.",
        }),
      );
      const after = await report(c.svc("auditor"), ...historicalRange);
      assert.equal(metric(before, "metas").value, 100);
      assert.equal(metric(after, "metas").value, 100);
    },
    {},
  );
  await test("40 Captura semanal guarda 14 métricas, fecha UTC y origen verificable", async () => {
    const c = context();
    let pid;
    await at("2026-01-01T00:00:00Z", async () => {
      const aid = await asset(c);
      await ticket(c, aid);
      pid = (
        await c
          .svc("auditor")
          .execute("period.create", {
            label: "Pretest captura",
            phase: "pretest",
            start_at: historicalRange[0],
            end_at: historicalRange[1],
            notes: "Datos sintéticos exclusivamente para pruebas.",
          })
      ).id;
    });
    const result = await at("2026-02-01T00:00:00Z", () =>
      captureWeek(c.svc("auditor"), {
        period_id: pid,
        week_start: "2025-12-31T19:00:00-05:00",
      }),
    );
    assert.equal(result.count, 14);
    assert.equal(c.count("measurements"), 14);
    const rows = c.db
      .prepare("SELECT * FROM measurements WHERE period_id=?")
      .all(pid);
    assert.equal(new Set(rows.map((r) => r.indicator)).size, 14);
    const registration = rows.find((r) => r.indicator === "registro");
    assert.equal(registration.value, 1);
    assert.equal(registration.week_start, historicalRange[0]);
    assert.equal(registration.source, "Sistema Nexo");
    const evidence = JSON.parse(registration.evidence);
    assert.equal(evidence.origin, "REAL");
    assert.equal(evidence.to, "2026-01-07T23:59:59.999Z");
    assert.equal(evidence.generated_at, "2026-02-01T00:00:00.000Z");
    assert.equal(rows.find((r) => r.indicator === "respuesta").value, null);
    assert.throws(
      () => c.db.prepare("UPDATE measurements SET value=100").run(),
      /inmutables/,
    );
    assert.throws(
      () => c.db.prepare("DELETE FROM measurements").run(),
      /inmutables/,
    );
  });
  await test("41 Captura duplicada o conflicto manual revierte el lote completo", async () => {
    const c = context();
    const pid = (
      await c
        .svc("auditor")
        .execute("period.create", {
          label: "Pretest captura",
          phase: "pretest",
          start_at: historicalRange[0],
          end_at: historicalRange[1],
          notes: "Datos sintéticos exclusivamente para pruebas.",
        })
    ).id;
    await captureWeek(c.svc("auditor"), {
      period_id: pid,
      week_start: historicalRange[0],
    });
    let events = c.count("events");
    await assert.rejects(
      captureWeek(c.svc("auditor"), {
        period_id: pid,
        week_start: historicalRange[0],
      }),
      /UNIQUE/,
    );
    assert.equal(c.count("measurements"), 14);
    assert.equal(c.count("events"), events);
    const week = "2026-01-08T00:00:00Z";
    await c
      .svc("auditor")
      .execute("measurement.create", {
        period_id: pid,
        indicator: "metas",
        week_start: week,
        numerator: 1,
        denominator: 2,
        value: null,
        sample_size: 2,
        source: "Ficha de observación",
        evidence: "Dos metas sintéticas, una alcanzada.",
      });
    events = c.count("events");
    await assert.rejects(
      captureWeek(c.svc("auditor"), { period_id: pid, week_start: week }),
      /UNIQUE/,
    );
    assert.equal(c.count("measurements"), 15);
    assert.equal(c.count("events"), events);
  });
  await test("42 Captura rechaza permisos, período ajeno y semanas incompletas", async () => {
    const c = context();
    const pid = (
      await c
        .svc("auditor")
        .execute("period.create", {
          label: "Pretest captura",
          phase: "pretest",
          start_at: historicalRange[0],
          end_at: historicalRange[1],
          notes: "Datos sintéticos exclusivamente para pruebas.",
        })
    ).id;
    const input = { period_id: pid, week_start: historicalRange[0] };
    await assert.rejects(captureWeek(c.svc("tech"), input), statusError(403));
    await assert.rejects(
      captureWeek(c.svc("requester"), input),
      statusError(403),
    );
    await assert.rejects(
      captureWeek(c.svc("auditor", 1), input),
      statusError(404),
    );
    await assert.rejects(
      at("2026-01-05T00:00:00Z", () => captureWeek(c.svc("auditor"), input)),
      /finalizadas/,
    );
    await assert.rejects(
      captureWeek(c.svc("auditor"), {
        ...input,
        week_start: "2025-12-31T00:00:00Z",
      }),
      /pertenecer/,
    );
    assert.equal(c.count("measurements"), 0);
  });
  await test("43 Última semana parcial termina exactamente al final del período", async () => {
    const c = context();
    const pid = (
      await c
        .svc("auditor")
        .execute("period.create", {
          label: "Pretest parcial",
          phase: "pretest",
          start_at: historicalRange[0],
          end_at: historicalRange[1],
          notes: "Datos sintéticos exclusivamente para pruebas.",
        })
    ).id;
    await captureWeek(c.svc("auditor"), {
      period_id: pid,
      week_start: "2026-01-29T00:00:00Z",
    });
    const row = c.db.prepare("SELECT evidence FROM measurements LIMIT 1").get();
    assert.equal(JSON.parse(row.evidence).to, historicalRange[1]);
  });
  await test("44 Replanificación y cancelación posterior conservan cronograma histórico", async () => {
    const c = context();
    let aid, act;
    await at("2026-01-01T00:00:00Z", async () => {
      aid = await asset(c);
      act = await activity(c, aid, {
        planned_start: "2026-01-02T00:00:00Z",
        planned_end: "2026-01-03T00:00:00Z",
      });
    });
    const before = await report(c.svc("auditor"), ...historicalRange);
    assert.equal(metric(before, "planificacion").value, 100);
    assert.equal(metric(before, "cronograma").denominator, 1);
    await at("2026-02-01T00:00:00Z", () =>
      mutate(c, "supervisor", "activities", act, "activity.save", {
        asset_id: aid,
        title: "Inspección reprogramada",
        owner_id: "tech",
        planned_start: "2026-02-05T00:00:00Z",
        planned_end: "2026-02-06T00:00:00Z",
      }),
    );
    await at("2026-02-02T00:00:00Z", () =>
      mutate(c, "supervisor", "activities", act, "activity.transition", {
        status: "cancelada",
        evidence: "Cancelación posterior al período.",
      }),
    );
    const after = await report(c.svc("auditor"), ...historicalRange);
    for (const id of ["planificacion", "cronograma", "tareas"])
      assert.deepEqual(metric(after, id), metric(before, id), id);
    const february = await report(
      c.svc("auditor"),
      "2026-01-01T00:00:00Z",
      "2026-02-28T23:59:59Z",
    );
    assert.equal(metric(february, "planificacion").denominator, 0);
  });
  await test("45 Quitar planificación después del corte conserva su existencia histórica", async () => {
    const c = context();
    let aid, act;
    await at("2026-01-01T00:00:00Z", async () => {
      aid = await asset(c);
      act = await activity(c, aid, {
        planned_start: "2026-01-02T00:00:00Z",
        planned_end: "2026-01-03T00:00:00Z",
      });
    });
    await at("2026-02-01T00:00:00Z", () =>
      mutate(c, "supervisor", "activities", act, "activity.save", {
        asset_id: aid,
        title: "Actividad sin nuevo plan",
        owner_id: "",
        planned_start: "",
        planned_end: "",
      }),
    );
    const r = await report(c.svc("auditor"), ...historicalRange);
    assert.equal(metric(r, "planificacion").value, 100);
    assert.equal(metric(r, "cronograma").denominator, 1);
  });
  await test("46 Altas posteriores con vencimiento pasado no entran al corte histórico", async () => {
    const c = context();
    let aid, act;
    await at("2026-01-01T00:00:00Z", async () => {
      aid = await asset(c);
      act = await activity(c, aid, {
        planned_start: "2026-01-02T00:00:00Z",
        planned_end: "2026-01-03T00:00:00Z",
      });
    });
    await at("2026-02-01T00:00:00Z", async () => {
      await activity(c, aid, {
        planned_start: "2026-01-02T00:00:00Z",
        planned_end: "2026-01-03T00:00:00Z",
      });
      await c
        .svc("supervisor")
        .execute("resource.require", {
          activity_id: act,
          name: "Repuesto posterior",
          quantity: 1,
          unit: "unidad",
          required_by: "2026-01-02T00:00:00Z",
        });
      await c
        .svc("supervisor")
        .execute("goal.create", {
          title: "Meta registrada después",
          unit: "unidad",
          target: 1,
          direction: "mayor",
          start_at: historicalRange[0],
          end_at: "2026-01-20T00:00:00Z",
        });
      await c
        .svc("supervisor")
        .execute("control.create", {
          activity_id: act,
          title: "Control posterior",
          finding: "Hallazgo posterior al corte.",
          action: "Revisar procedimiento de registro.",
          owner_id: "tech",
          due_at: "2026-01-20T00:00:00Z",
        });
    });
    const r = await report(c.svc("auditor"), ...historicalRange);
    assert.equal(metric(r, "cronograma").denominator, 1);
    for (const id of ["recursos", "metas", "correctivas"])
      assert.equal(metric(r, id).denominator, 0, id);
  });
  await test("47 Activo retirado bloquea editar la actividad, incluso en la restricción SQL", async () => {
    const c = context();
    const aid = await asset(c),
      act = await activity(c, aid),
      retired = await asset(c, {
        code: "ATM-RET",
        serial: "SER-RET",
        status: "retirado",
      });
    await assert.rejects(
      mutate(c, "supervisor", "activities", act, "activity.save", {
        asset_id: retired,
        title: "Actividad en equipo retirado",
        owner_id: "tech",
        planned_start: "2026-09-18T10:00:00Z",
        planned_end: "2026-09-18T18:00:00Z",
      }),
      /retirado/,
    );
    assert.throws(
      () =>
        c.db
          .prepare("UPDATE activities SET asset_id=? WHERE id=?")
          .run(retired, act),
      /retirado/,
    );
    assert.equal(c.row("activities", act).asset_id, aid);
  });
  await test("48 Los 14 indicadores coinciden con un flujo controlado y calculable", async () => {
    const c = context();
    let aid, tid, act, req, goal, control;
    await at("2026-01-01T10:00:00Z", async () => {
      ({ aid, tid } = await assigned(c));
      act = await activity(c, aid, {
        ticket_id: tid,
        planned_start: "2026-01-01T12:00:00Z",
        planned_end: "2026-01-02T12:00:00Z",
      });
      req = (
        await c
          .svc("supervisor")
          .execute("resource.require", {
            activity_id: act,
            name: "Dos repuestos",
            quantity: 2,
            unit: "unidad",
            required_by: "2026-01-01T12:00:00Z",
          })
      ).id;
    });
    await at("2026-01-01T11:00:00Z", async () => {
      await mutate(c, "tech", "tickets", tid, "ticket.note", {
        type: "respuesta",
        note: "Respuesta inicial verificada.",
      });
      await c
        .svc("supervisor")
        .execute("resource.allocate", {
          requirement_id: req,
          quantity: 2,
          note: "Entrega completa antes del inicio.",
        });
      for (const kind of ["categoria", "monitoreo"])
        await c
          .svc("supervisor")
          .execute("review.create", {
            entity_id: tid,
            kind,
            passed: true,
            evidence: "Revisión positiva documentada.",
          });
    });
    await at("2026-01-01T12:00:00Z", async () => {
      await mutate(c, "tech", "tickets", tid, "ticket.transition", {
        status: "en_atencion",
        note: "Atención técnica iniciada.",
      });
      await mutate(c, "tech", "activities", act, "activity.transition", {
        status: "en_curso",
        evidence: "Trabajo técnico iniciado.",
      });
    });
    await at("2026-01-01T14:00:00Z", async () => {
      await mutate(c, "tech", "activities", act, "activity.transition", {
        status: "completada",
        evidence: "Trabajo terminado dentro del plazo.",
      });
      await mutate(c, "tech", "tickets", tid, "ticket.transition", {
        status: "resuelto",
        note: "Falla corregida y probada.",
        diagnosis: "Falla de mecanismo identificada.",
        solution: "Mecanismo reparado y verificado.",
      });
      await c
        .svc("supervisor")
        .execute("review.create", {
          entity_id: act,
          kind: "operativa",
          passed: false,
          evidence: "Se detectó un desvío de procedimiento.",
        });
      goal = (
        await c
          .svc("supervisor")
          .execute("goal.create", {
            title: "Una reparación verificada",
            unit: "unidad",
            target: 1,
            direction: "mayor",
            start_at: "2026-01-01T00:00:00Z",
            end_at: "2026-01-02T00:00:00Z",
          })
      ).id;
      control = (
        await c
          .svc("supervisor")
          .execute("control.create", {
            activity_id: act,
            title: "Actualizar procedimiento",
            finding: "Se detectó un paso omitido.",
            action: "Corregir la lista de verificación.",
            owner_id: "tech",
            due_at: "2026-01-02T00:00:00Z",
          })
      ).id;
    });
    await at("2026-01-01T15:00:00Z", async () => {
      await mutate(c, "tech", "controls", control, "control.transition", {
        status: "en_curso",
        evidence: "Corrección del procedimiento en curso.",
      });
      await mutate(c, "supervisor", "controls", control, "control.transition", {
        status: "cerrada",
        evidence: "Procedimiento corregido y verificado.",
      });
      await mutate(c, "supervisor", "goals", goal, "goal.evaluate", {
        actual: 1,
        evidence: "Una reparación cumplida.",
      });
    });
    const r = await report(
      c.svc("auditor"),
      "2026-01-01T00:00:00Z",
      "2026-01-07T23:59:59.999Z",
    );
    const expected = {
      registro: 1,
      categoria: 100,
      actualizacion: 100,
      monitoreo: 100,
      respuesta: 1,
      resolucion: 4,
      planificacion: 100,
      recursos: 100,
      cronograma: 100,
      ejecucion: 2,
      tareas: 100,
      metas: 100,
      desviaciones: 100,
      correctivas: 100,
    };
    for (const [id, value] of Object.entries(expected))
      assert.equal(metric(r, id).value, value, id);
    assert.equal(r.metrics.length, 14);
  });
  await test("49 Revisiones simultáneas usan orden de inserción y no el texto de su identificador", async () => {
    const c = context();
    let tid;
    await at("2026-01-01T00:00:00Z", async () => {
      const aid = await asset(c);
      tid = await ticket(c, aid);
    });
    const insert = c.db.prepare(
      "INSERT INTO reviews(id,demo,ticket_id,kind,passed,evidence,actor_id,created_at) VALUES(?,0,?,'categoria',?,'Revisión sintética simultánea.','supervisor','2026-01-02T00:00:00.000Z')",
    );
    insert.run("z-primera", tid, 0);
    insert.run("a-segunda", tid, 1);
    const r = await report(c.svc("auditor"), ...historicalRange);
    assert.equal(metric(r, "categoria").denominator, 1);
    assert.equal(metric(r, "categoria").value, 100);
  });
  await test(
    "50 Clock/IdGenerator inyectados fijan hora e id sin tocar el reloj global (R7)",
    async () => {
      // Las pruebas 1-49 fingen el tiempo parcheando `global.Date` (ver
      // ClockDate más arriba): una necesidad real porque, antes de R7,
      // lib/service.ts y lib/handlers/* llamaban a `now()`/`uuid()`
      // importadas directamente, sin forma de sustituirlas salvo
      // interceptando el reloj del sistema entero. Esta prueba usa el
      // puerto Clock/IdGenerator inyectado por el propio constructor de
      // Service (lib/clock.ts) y no toca `global.Date` en ningún momento:
      // demuestra que la capa de dominio ya no tiene esa dependencia
      // oculta.
      const c = context();
      const fixedClock = { now: () => "2030-05-01T12:00:00.000Z" };
      let n = 0;
      const sequentialIds = { uuid: () => "fixture-id-" + ++n };
      const aid = await asset(c, {}, 0);
      const { id: tid } = await c
        .svc("requester", 0, {}, fixedClock, sequentialIds)
        .execute("ticket.create", {
          asset_id: aid,
          title: "Pantalla sin respuesta",
          description: "El cajero no responde al tacto.",
          category: "Hardware",
          priority: "media",
        });
      assert.equal(tid, "fixture-id-1");
      const ticketRow = c.row("tickets", tid);
      assert.equal(ticketRow.created_at, "2030-05-01T12:00:00.000Z");
      assert.equal(ticketRow.updated_at, "2030-05-01T12:00:00.000Z");
      const ev = c.db
        .prepare(
          "SELECT created_at FROM events WHERE entity_id=? ORDER BY id DESC LIMIT 1",
        )
        .get(tid);
      assert.equal(ev.created_at, "2030-05-01T12:00:00.000Z");
      // Sin inyección, la fábrica svc() de este archivo usa los
      // adaptadores por defecto del sistema (systemClock/systemIds):
      // sigue funcionando igual que antes de R7.
      const { id: tid2 } = await c
        .svc("requester")
        .execute("ticket.create", {
          asset_id: aid,
          title: "Segundo ticket, reloj real",
          description: "Confirma que el valor por defecto sigue activo.",
          category: "Hardware",
          priority: "media",
        });
      assert.notEqual(tid2, "fixture-id-1");
      assert.notEqual(c.row("tickets", tid2).created_at, undefined);
    },
  );
  global.Date = RealDate;
  const summary = {
    executed_at: new RealDate().toISOString(),
    scope:
      "Reglas de negocio y migraciones SQL; SQLite en memoria; no incluye HTTP, interfaz ni autenticación",
    total: results.length,
    passed: results.filter((x) => x.status === "PASS").length,
    failed: results.filter((x) => x.status === "FAIL").length,
    pending: results.filter((x) => x.status === "PENDING").length,
    results,
  };
  console.log(JSON.stringify(summary, null, 2));
  if (summary.failed) process.exitCode = 1;
})().catch((e) => {
  global.Date = RealDate;
  console.error(e);
  process.exitCode = 1;
});
