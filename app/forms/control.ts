import { Field, FormSpec, Row } from "../ui";
import { text, area, when, num, choose } from "./fields";
import { formContext, formDefaults } from "./context";

// Extraído de app/forms.ts (R4): esta especificación conserva exactamente
// el comportamiento original del caso "control.create" dentro de makeForm. Ningún
// campo, título, descripción ni transformación fue modificado.
export function controlCreate(row: Row, meta: Row, extra: Row = {}): FormSpec {
  const { members, assets, manager } = formContext(meta);
  let { initial, title, fields, description } = formDefaults(row);
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
  return { kind: "control.create", title, description, fields, initial };
}

// Extraído de app/forms.ts (R4): esta especificación conserva exactamente
// el comportamiento original del caso "control.transition" dentro de makeForm. Ningún
// campo, título, descripción ni transformación fue modificado.
export function controlTransition(
  row: Row,
  meta: Row,
  extra: Row = {},
): FormSpec {
  const { members, assets, manager } = formContext(meta);
  let { initial, title, fields, description } = formDefaults(row);
  title =
    row.status === "cerrada"
      ? "Verificar y cerrar acción"
      : "Iniciar acción correctiva";
  fields = [area("evidence", "Evidencia de la acción")];
  return { kind: "control.transition", title, description, fields, initial };
}

// Extraído de app/forms.ts (R4): esta especificación conserva exactamente
// el comportamiento original del caso "goal.create" dentro de makeForm. Ningún
// campo, título, descripción ni transformación fue modificado.
export function goalCreate(row: Row, meta: Row, extra: Row = {}): FormSpec {
  const { members, assets, manager } = formContext(meta);
  let { initial, title, fields, description } = formDefaults(row);
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
  return { kind: "goal.create", title, description, fields, initial };
}

// Extraído de app/forms.ts (R4): esta especificación conserva exactamente
// el comportamiento original del caso "goal.evaluate" dentro de makeForm. Ningún
// campo, título, descripción ni transformación fue modificado.
export function goalEvaluate(row: Row, meta: Row, extra: Row = {}): FormSpec {
  const { members, assets, manager } = formContext(meta);
  let { initial, title, fields, description } = formDefaults(row);
  title = "Evaluar meta operativa";
  fields = [
    num("actual", "Valor observado"),
    area("evidence", "Fuente y evidencia de evaluación"),
  ];
  return { kind: "goal.evaluate", title, description, fields, initial };
}
