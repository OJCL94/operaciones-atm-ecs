import type { SqlStatement } from "./database-types";
import { Service, Row } from "./service";
import { ensure } from "./domain";
export async function seed(s: Service) {
  ensure(
    s.actor.role === "admin" && s.actor.actualAdmin !== false,
    "Solo el administrador puede cargar la demostración.",
    403,
  );
  ensure(s.demo === 1, "Los ejemplos solo se cargan en demostración.");
  if (await s.one("SELECT value FROM settings WHERE key='demo_seeded'")) return;
  const statements: SqlStatement[] = [];
  const insert = (table: string, data: Row) => {
    const keys = Object.keys(data);
    statements.push(
      s.stmt(
        `INSERT OR IGNORE INTO ${table} (${keys.join(",")}) SELECT ${keys.map(() => "?").join(",")} WHERE NOT EXISTS(SELECT 1 FROM settings WHERE key='demo_seeded')`,
        Object.values(data),
      ),
    );
  };
  const ago = (hours: number) =>
    new Date(Date.now() - hours * 3600000).toISOString();
  for (const [role, name] of [
    ["supervisor", "Andrea Ríos"],
    ["tecnico", "Lucía Torres"],
    ["solicitante", "Carlos Mendoza"],
    ["auditor", "Investigador de ejemplo"],
  ])
    insert("members", {
      id: "demo-" + role,
      email: role + "@demostracion.invalid",
      name,
      role,
      demo: 1,
      active: 1,
    });
  const places = [
    "Miraflores",
    "San Isidro",
    "Santiago de Surco",
    "San Borja",
    "La Molina",
    "Jesús María",
    "Lince",
    "Cercado de Lima",
    "Los Olivos",
    "San Miguel",
    "Barranco",
    "Pueblo Libre",
  ];
  for (let i = 1; i <= 12; i++)
    insert("assets", {
      id: "demo-atm-" + i,
      demo: 1,
      code: "ATM-" + String(i).padStart(3, "0"),
      name: "Módulo de autoservicio " + String(i).padStart(2, "0"),
      serial: "DEMO-2026-" + String(i).padStart(5, "0"),
      model: i % 2 ? "ATM TX-200" : "ATM TX-400",
      location: places[i - 1],
      status:
        i === 4
          ? "fuera_servicio"
          : i === 8 || i === 12
            ? "mantenimiento"
            : "operativo",
      notes:
        "Activo ficticio para demostración. No corresponde a una empresa real.",
      created_at: ago(720),
    });
  const titles = [
    "Lector de tarjetas sin respuesta",
    "Pérdida intermitente de conexión",
    "Atasco en módulo de impresión",
    "Actualización de software del terminal",
    "Revisión de fuente de alimentación",
    "Mantenimiento preventivo trimestral",
    "Pantalla táctil descalibrada",
    "Validación de conexión de red",
    "Sustitución de rodillos de impresión",
    "Instalación de módulo de autoservicio",
    "Diagnóstico de puerto de comunicaciones",
    "Inspección de cableado interno",
    "Ajuste de bandeja de salida",
    "Restablecimiento del sistema operativo",
    "Prueba integral del terminal",
    "Limpieza y revisión de conectores",
  ];
  for (let i = 1; i <= 16; i++) {
    const status =
      i <= 3
        ? "en_atencion"
        : i <= 6
          ? "asignado"
          : i <= 8
            ? "abierto"
            : i <= 10
              ? "en_espera"
              : i <= 13
                ? "resuelto"
                : "cerrado";
    const created = ago((i - 1) * 9 + 1);
    const resolved = i > 10 ? ago((i - 1) * 9 - 4) : null;
    const first = !["abierto", "asignado"].includes(status)
      ? ago((i - 1) * 9)
      : null;
    const assetId =
      i === 1 ? 4 : i === 2 ? 12 : i === 3 ? 8 : ((i - 1) % 12) + 1;
    insert("tickets", {
      id: "demo-ticket-" + i,
      demo: 1,
      code: "TK-26-" + String(100 + i),
      asset_id: "demo-atm-" + assetId,
      requester_id: "demo-solicitante",
      assignee_id: status === "abierto" ? null : "demo-tecnico",
      title: titles[i - 1],
      description:
        "Caso ficticio. El personal de la sede reporta una incidencia en el módulo. Se requiere diagnóstico técnico y registro de las actividades realizadas.",
      category:
        i % 4 === 0
          ? "Software"
          : i % 3 === 0
            ? "Mantenimiento"
            : i === 2
              ? "Conectividad"
              : "Hardware",
      priority:
        i === 1 ? "critica" : i < 4 ? "alta" : i > 12 ? "baja" : "media",
      status,
      created_at: created,
      updated_at: resolved ?? ago(Math.max(0, i - 2)),
      due_at: new Date(
        new Date(created).getTime() +
          (i === 1 ? 4 : i < 4 ? 8 : i > 12 ? 72 : 24) * 3600000,
      ).toISOString(),
      first_response_at: first,
      resolved_at: resolved,
      closed_at: status === "cerrado" ? ago((i - 1) * 9 - 5) : null,
      diagnosis:
        i > 10 ? "Diagnóstico de ejemplo: componente fuera de ajuste." : "",
      solution:
        i > 10
          ? "Solución de ejemplo: ajuste, limpieza y validación funcional."
          : "",
    });
    insert("events", {
      id: -i * 2,
      demo: 1,
      entity: "tickets",
      entity_id: "demo-ticket-" + i,
      ticket_id: "demo-ticket-" + i,
      actor_id: "demo-solicitante",
      action: "ticket_creado",
      detail: "Registro de demostración. " + titles[i - 1],
      created_at: created,
    });
    if (first)
      insert("events", {
        id: -i * 2 - 1,
        demo: 1,
        entity: "tickets",
        entity_id: "demo-ticket-" + i,
        ticket_id: "demo-ticket-" + i,
        actor_id: "demo-tecnico",
        action: "respuesta",
        detail:
          "Respuesta técnica ficticia: se coordinó la inspección del equipo.",
        created_at: first,
      });
    if (resolved)
      insert("events", {
        id: -1000 - i,
        demo: 1,
        entity: "tickets",
        entity_id: "demo-ticket-" + i,
        ticket_id: "demo-ticket-" + i,
        actor_id: "demo-tecnico",
        action: "estado",
        detail: JSON.stringify({
          de: "en_atencion",
          a: "resuelto",
          nota: "Resolución ficticia de demostración.",
        }),
        created_at: resolved,
      });
  }
  for (let i = 1; i <= 6; i++) {
    const complete = i > 3;
    insert("activities", {
      id: "demo-activity-" + i,
      demo: 1,
      ticket_id: null,
      asset_id: "demo-atm-" + i,
      owner_id: "demo-tecnico",
      title: [
        "Revisión del lector de tarjetas",
        "Mantenimiento preventivo ATM-002",
        "Inspección de conectividad",
        "Limpieza de módulo de impresión",
        "Validación de energía",
        "Calibración de pantalla",
      ][i - 1],
      description:
        "Actividad de demostración para verificar planificación y seguimiento.",
      status: i === 3 ? "pendiente" : "planificada",
      created_at: ago(96),
      planned_at: i === 3 ? null : ago(90),
      planned_start: i === 3 ? null : ago(24),
      planned_end: i === 3 ? null : ago(complete ? 18 : -8),
      started_at: complete || i === 2 ? ago(23) : null,
      completed_at: complete ? ago(i === 4 ? 17 : 20) : null,
      evidence: complete
        ? "Evidencia ficticia: verificación funcional satisfactoria."
        : "",
    });
    if (i !== 3) {
      insert("resource_requirements", {
        id: "demo-resource-" + i,
        demo: 1,
        activity_id: "demo-activity-" + i,
        name: "Kit de herramientas",
        quantity: 1,
        unit: "unidad",
        required_by: ago(24),
      });
      insert("resource_allocations", {
        id: "demo-allocation-" + i,
        requirement_id: "demo-resource-" + i,
        quantity: 1,
        allocated_at: ago(i === 4 ? 20 : 25),
        actor_id: "demo-supervisor",
        note: "Asignación ficticia para demostración.",
      });
    }
  }
  for (let i = 1; i <= 4; i++)
    insert("reviews", {
      id: "demo-review-" + i,
      demo: 1,
      ticket_id: "demo-ticket-" + i,
      activity_id: null,
      kind: i <= 2 ? "categoria" : "monitoreo",
      passed: i === 2 ? 0 : 1,
      evidence: "Revisión ficticia para demostrar el cálculo del indicador.",
      actor_id: "demo-supervisor",
      created_at: ago(1),
    });
  for (let i = 4; i <= 6; i++)
    insert("reviews", {
      id: "demo-op-review-" + i,
      demo: 1,
      activity_id: "demo-activity-" + i,
      kind: "operativa",
      passed: i === 4 ? 0 : 1,
      evidence: "Evaluación operativa de demostración.",
      actor_id: "demo-supervisor",
      created_at: ago(12),
    });
  insert("controls", {
    id: "demo-control-1",
    demo: 1,
    activity_id: "demo-activity-4",
    title: "Recurso entregado fuera del plazo",
    finding: "El kit de herramientas se recibió después del inicio previsto.",
    action: "Verificar disponibilidad del kit un día antes de la intervención.",
    owner_id: "demo-tecnico",
    due_at: ago(-24),
    created_at: ago(10),
    status: "en_curso",
  });
  insert("goals", {
    id: "demo-goal-1",
    demo: 1,
    title: "Completar las inspecciones programadas",
    unit: "inspecciones",
    target: 3,
    actual: 3,
    direction: "mayor",
    start_at: ago(168),
    end_at: ago(6),
    evidence: "Meta y evaluación ficticias, sin valor de resultado académico.",
    evaluated_at: ago(5),
    created_at: ago(168),
  });
  insert("events", {
    id: -2001,
    demo: 1,
    entity: "goals",
    entity_id: "demo-goal-1",
    actor_id: "demo-supervisor",
    action: "meta_evaluada",
    detail: JSON.stringify({
      actual: 3,
      evidence: "Evaluación ficticia de demostración.",
    }),
    created_at: ago(5),
  });
  for (let i = 1; i <= 6; i++)
    statements.push(
      s.stmt(
        "UPDATE activities SET status=? WHERE id=? AND demo=1 AND NOT EXISTS(SELECT 1 FROM settings WHERE key=? )",
        [
          i > 3
            ? "completada"
            : i === 3
              ? "pendiente"
              : i === 2
                ? "en_curso"
                : "planificada",
          "demo-activity-" + i,
          "demo_seeded",
        ],
      ),
    );
  insert("settings", { key: "demo_seeded", value: ago(0) });
  await s.db.batch(statements);
}
