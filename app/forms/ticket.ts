import { Field, FormSpec, Row } from "../ui";
import { text, area, when, num, choose } from "./fields";
import { formContext, formDefaults } from "./context";
import { states, priorities, categories } from "@/lib/domain";

// Extraído de app/forms.ts (R4): esta especificación conserva exactamente
// el comportamiento original del caso "ticket.create" dentro de makeForm. Ningún
// campo, título, descripción ni transformación fue modificado.
export function ticketCreate(row: Row, meta: Row, extra: Row = {}): FormSpec {
  const { members, assets, manager } = formContext(meta);
  let { initial, title, fields, description } = formDefaults(row);
  title = "Registrar nuevo ticket";
  initial.category = "Hardware";
  initial.priority = "media";
  initial.assignee_id = "";
  fields = [
    text("title", "Resumen de la incidencia"),
    choose("asset_id", "Activo ATM", [["", "Selecciona un activo"], ...assets]),
    area("description", "Descripción de la incidencia"),
    choose(
      "category",
      "Categoría",
      categories.map((c) => [c, c]),
    ),
    choose("priority", "Prioridad", Object.entries(priorities)),
    ...(manager
      ? [
          choose(
            "assignee_id",
            "Responsable",
            [["", "Asignar después"], ...members],
            false,
          ),
        ]
      : []),
  ];
  description =
    "Describe lo ocurrido y vincula el equipo afectado. El plazo objetivo se calcula según la prioridad.";
  return { kind: "ticket.create", title, description, fields, initial };
}

// Extraído de app/forms.ts (R4): esta especificación conserva exactamente
// el comportamiento original del caso "ticket.assign" dentro de makeForm. Ningún
// campo, título, descripción ni transformación fue modificado.
export function ticketAssign(row: Row, meta: Row, extra: Row = {}): FormSpec {
  const { members, assets, manager } = formContext(meta);
  let { initial, title, fields, description } = formDefaults(row);
  title = "Asignar y clasificar ticket";
  fields = [
    choose("assignee_id", "Responsable", [
      ["", "Selecciona un responsable"],
      ...members,
    ]),
    choose("priority", "Prioridad", Object.entries(priorities)),
    choose(
      "category",
      "Categoría",
      categories.map((c) => [c, c]),
    ),
    area("reason", "Motivo del cambio"),
  ];
  return { kind: "ticket.assign", title, description, fields, initial };
}

// Extraído de app/forms.ts (R4): esta especificación conserva exactamente
// el comportamiento original del caso "ticket.transition" dentro de makeForm. Ningún
// campo, título, descripción ni transformación fue modificado.
export function ticketTransition(
  row: Row,
  meta: Row,
  extra: Row = {},
): FormSpec {
  const { members, assets, manager } = formContext(meta);
  let { initial, title, fields, description } = formDefaults(row);
  title =
    row.status === "cerrado"
      ? "Validar cierre"
      : row.status === "resuelto"
        ? "Resolver ticket"
        : row.reopen
          ? "Reabrir ticket"
          : "Cambiar a " + states[row.status];
  fields = [
    area("note", "Nota de la intervención"),
    ...(row.status === "resuelto"
      ? [
          area("diagnosis", "Diagnóstico"),
          area("solution", "Solución aplicada"),
        ]
      : []),
  ];
  description =
    row.status === "resuelto"
      ? "La resolución requiere primera respuesta y todas las actividades vinculadas finalizadas."
      : "Esta acción quedará registrada en el historial con tu usuario y fecha.";
  return { kind: "ticket.transition", title, description, fields, initial };
}

// Extraído de app/forms.ts (R4): esta especificación conserva exactamente
// el comportamiento original del caso "ticket.note" dentro de makeForm. Ningún
// campo, título, descripción ni transformación fue modificado.
export function ticketNote(row: Row, meta: Row, extra: Row = {}): FormSpec {
  const { members, assets, manager } = formContext(meta);
  let { initial, title, fields, description } = formDefaults(row);
  title = "Registrar intervención";
  initial.type = row.type ?? "comentario";
  fields = [
    choose(
      "type",
      "Tipo de registro",
      manager || meta.actor.role === "tecnico"
        ? [
            ["comentario", "Comentario"],
            ["respuesta", "Respuesta al solicitante"],
            ["seguimiento", "Seguimiento técnico"],
          ]
        : [["comentario", "Comentario"]],
    ),
    area("note", "Detalle"),
  ];
  description =
    "La primera respuesta se mide cuando registras una respuesta técnica al solicitante.";
  return { kind: "ticket.note", title, description, fields, initial };
}

// Extraído de app/forms.ts (R4): esta especificación conserva exactamente
// el comportamiento original del caso "review.create" dentro de makeForm. Ningún
// campo, título, descripción ni transformación fue modificado.
export function reviewCreate(row: Row, meta: Row, extra: Row = {}): FormSpec {
  const { members, assets, manager } = formContext(meta);
  let { initial, title, fields, description } = formDefaults(row);
  title =
    row.kind === "operativa"
      ? "Registrar revisión operativa"
      : "Registrar revisión de ticket";
  initial.kind = row.kind ?? "categoria";
  initial.passed = "true";
  fields = [
    ...(row.kind === "operativa"
      ? []
      : [
          choose("kind", "Tipo de revisión", [
            ["categoria", "Categorización"],
            ["monitoreo", "Monitoreo"],
          ]),
        ]),
    choose(
      "passed",
      row.kind === "operativa" ? "Resultado" : "¿Cumple la revisión?",
      [
        ["true", row.kind === "operativa" ? "Sin desviaciones" : "Sí"],
        ["false", row.kind === "operativa" ? "Con desviaciones" : "No"],
      ],
    ),
    area("evidence", "Criterio y evidencia de revisión"),
  ];
  return {
    kind: "review.create",
    title,
    fields,
    initial,
    transform: (v) => ({ ...v, passed: v.passed === "true" }),
  };
}
