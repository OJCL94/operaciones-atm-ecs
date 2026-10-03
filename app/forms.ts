import { Field, FormSpec, Row, localInput } from "./ui";
import {
  roles,
  states,
  priorities,
  categories,
  indicatorDefinitions,
} from "@/lib/domain";
const text = (key: string, label: string, required = true): Field => ({
  key,
  label,
  required,
});
const area = (key: string, label: string, required = true): Field => ({
  key,
  label,
  type: "textarea",
  required,
  wide: true,
});
const when = (key: string, label: string, required = true): Field => ({
  key,
  label,
  type: "datetime-local",
  required,
});
const num = (key: string, label: string, required = true): Field => ({
  key,
  label,
  type: "number",
  required,
  min: 0,
});
const choose = (
  key: string,
  label: string,
  options: [string, string][],
  required = true,
): Field => ({ key, label, options, required });
export function makeForm(
  kind: string,
  row: Row,
  meta: Row,
  extra: Row = {},
): FormSpec {
  const members: [string, string][] = meta.members
    .filter((m: Row) => ["admin", "supervisor", "tecnico"].includes(m.role))
    .map((m: Row) => [m.id, m.name]);
  const assets: [string, string][] = meta.assets.map((a: Row) => [
    a.id,
    `${a.code} · ${a.location}`,
  ]);
  const manager = ["admin", "supervisor"].includes(meta.actor.role);
  let initial: Row = { ...row };
  let fields: Field[] = [],
    title = "Registrar información",
    description: string | undefined;
  switch (kind) {
    case "ticket.create":
      title = "Registrar nuevo ticket";
      initial.category = "Hardware";
      initial.priority = "media";
      initial.assignee_id = "";
      fields = [
        text("title", "Resumen de la incidencia"),
        choose("asset_id", "Activo ATM", [
          ["", "Selecciona un activo"],
          ...assets,
        ]),
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
      break;
    case "ticket.assign":
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
      break;
    case "ticket.transition":
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
      break;
    case "ticket.note":
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
      break;
    case "review.create":
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
        kind,
        title,
        fields,
        initial,
        transform: (v) => ({ ...v, passed: v.passed === "true" }),
      };
    case "asset.save":
      title = row.id ? "Editar activo ATM" : "Registrar activo ATM";
      initial.status = row.status ?? "operativo";
      fields = [
        text("code", "Código del activo"),
        text("name", "Nombre"),
        text("serial", "Número de serie"),
        text("model", "Modelo"),
        text("location", "Sede o ubicación"),
        choose(
          "status",
          "Estado",
          Object.entries(states).filter(([v]) =>
            [
              "operativo",
              "mantenimiento",
              "fuera_servicio",
              "retirado",
            ].includes(v),
          ),
        ),
        area("notes", "Observaciones", false),
      ];
      break;
    case "activity.save":
      title = row.id ? "Planificar actividad" : "Registrar actividad";
      for (const f of ["planned_start", "planned_end"])
        initial[f] = localInput(row[f]);
      initial.owner_id = row.owner_id ?? "";
      fields = [
        text("title", "Actividad requerida"),
        choose("asset_id", "Activo ATM", [
          ["", "Selecciona un activo"],
          ...assets,
        ]),
        area("description", "Alcance de la actividad", false),
        choose(
          "owner_id",
          "Responsable",
          [["", "Sin asignar"], ...members],
          false,
        ),
        when("planned_start", "Inicio previsto", false),
        when("planned_end", "Fin previsto", false),
      ];
      description =
        "Puedes registrar la demanda sin planificar. Para programarla, completa responsable, inicio y fin.";
      break;
    case "activity.transition":
      title =
        row.status === "completada"
          ? "Completar actividad"
          : row.status === "cancelada"
            ? "Cancelar actividad"
            : "Iniciar actividad";
      fields = [
        area(
          "evidence",
          row.status === "cancelada"
            ? "Motivo de cancelación"
            : "Trabajo realizado / evidencia",
        ),
      ];
      break;
    case "resource.require":
      title = "Definir recurso necesario";
      initial.quantity = 1;
      initial.unit = "unidad";
      fields = [
        text("name", "Recurso"),
        num("quantity", "Cantidad necesaria"),
        text("unit", "Unidad de medida"),
        when("required_by", "Debe estar disponible antes de"),
      ];
      break;
    case "resource.allocate":
      title = "Asignar recurso";
      fields = [
        num("quantity", "Cantidad a asignar"),
        area("note", "Referencia del recurso y entrega"),
      ];
      break;
    case "control.create":
      title = "Registrar desviación y acción correctiva";
      initial.owner_id = "";
      fields = [
        text("title", "Resumen de la desviación"),
        area("finding", "Hallazgo"),
        area("action", "Acción correctiva propuesta"),
        choose("owner_id", "Responsable", [
          ["", "Selecciona un responsable"],
          ...members,
        ]),
        when("due_at", "Fecha límite"),
      ];
      description =
        "Vinculada a la actividad seleccionada. Registra también una revisión operativa para incluirla en la cobertura de control.";
      break;
    case "control.transition":
      title =
        row.status === "cerrada"
          ? "Verificar y cerrar acción"
          : "Iniciar acción correctiva";
      fields = [area("evidence", "Evidencia de la acción")];
      break;
    case "goal.create":
      title = "Definir meta operativa";
      initial.direction = "mayor";
      fields = [
        text("title", "Meta"),
        num("target", "Valor objetivo"),
        text("unit", "Unidad de medida"),
        choose("direction", "Criterio", [
          ["mayor", "Al menos el valor objetivo"],
          ["menor", "Como máximo el valor objetivo"],
        ]),
        when("start_at", "Inicio del período"),
        when("end_at", "Fin del período"),
      ];
      break;
    case "goal.evaluate":
      title = "Evaluar meta operativa";
      fields = [
        num("actual", "Valor observado"),
        area("evidence", "Fuente y evidencia de evaluación"),
      ];
      break;
    case "period.create":
      title = "Definir período de investigación";
      initial.phase = "pretest";
      fields = [
        text("label", "Nombre del período"),
        choose("phase", "Fase", [
          ["pretest", "Pretest"],
          ["postest", "Postest"],
        ]),
        when("start_at", "Inicio"),
        when("end_at", "Fin"),
        area("notes", "Decisión metodológica y justificación"),
      ];
      description =
        "El documento menciona cuatro y ocho semanas por fase. Registra aquí el período acordado con el asesor. No se permiten solapamientos.";
      break;
    case "measurement.capture":
      title = "Capturar indicadores de la semana";
      initial.period_id = extra.periods?.[0]?.id ?? "";
      fields = [
        choose(
          "period_id",
          "Período",
          (extra.periods ?? []).map((p: Row) => [p.id, p.label]),
        ),
        when("week_start", "Inicio de la semana"),
      ];
      description =
        "Guarda los 14 indicadores calculados como una instantánea inmutable. La semana debe haber finalizado. Conserva las fórmulas, el origen y la fecha de captura.";
      break;
    case "measurement.create":
      title = "Registrar medición semanal";
      initial.period_id = extra.periods?.[0]?.id ?? "";
      initial.indicator = "registro";
      initial.numerator = "";
      initial.denominator = "";
      initial.value = "";
      initial.sample_size = 1;
      fields = [
        choose(
          "period_id",
          "Período",
          (extra.periods ?? []).map((p: Row) => [p.id, p.label]),
        ),
        choose(
          "indicator",
          "Indicador",
          indicatorDefinitions.map((i) => [i[0], i[1]]),
        ),
        when("week_start", "Inicio de la semana"),
        num("numerator", "Numerador (porcentajes)", false),
        num("denominator", "Denominador (porcentajes)", false),
        num("value", "Valor (horas o tickets/semana)", false),
        num("sample_size", "Tamaño de muestra"),
        text("source", "Fuente de los registros"),
        area("evidence", "Referencia y evidencia verificable"),
      ];
      description =
        "Para porcentajes completa numerador y denominador; el valor se calcula. Para tiempos o tasas registra el valor observado. Esta captura no valida por sí sola la evidencia.";
      break;
    case "member.password":
      title = "Establecer contraseña";
      fields = [
        {
          ...text("password", "Nueva contraseña (12–128 caracteres)"),
          type: "password",
        },
      ];
      description =
        "Esta acción cierra las sesiones previas de la persona. No incluyas contraseñas en correos grupales ni documentos del proyecto.";
      initial = { id: row.id };
      break;
    case "self.password":
      title = "Cambiar mi contraseña";
      fields = [
        { ...text("current_password", "Contraseña actual"), type: "password" },
        {
          ...text("password", "Nueva contraseña (12–128 caracteres)"),
          type: "password",
        },
      ];
      description =
        "Al guardar se cerrará tu sesión. Ingresa de nuevo con la nueva contraseña.";
      break;
    case "member.save":
      title = row.id ? "Editar acceso" : "Registrar acceso";
      initial.active = row.active === 0 ? "false" : "true";
      initial.role = row.role ?? "tecnico";
      fields = [
        text("name", "Nombre"),
        { ...text("email", "Correo de acceso"), type: "email" },
        choose("role", "Rol", Object.entries(roles)),
        choose("active", "Acceso habilitado", [
          ["true", "Sí"],
          ["false", "No"],
        ]),
      ];
      description =
        "Registra el correo de la cuenta con la que la persona iniciará sesión. Después de guardar el acceso, usa «Establecer contraseña». Comparte la contraseña inicial con la persona por un canal privado.";
      return {
        kind,
        title,
        description,
        fields,
        initial,
        transform: (v) => ({ ...v, active: v.active === "true" }),
      };
  }
  return { kind, title, description, fields, initial };
}
