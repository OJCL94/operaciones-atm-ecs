import { Field, FormSpec, Row } from "../ui";
import { text, area, when, num, choose } from "./fields";
import { membersOf, assetsOf, isManager } from "./shared";
import { localInput } from "../ui";

// Extraído de app/forms.ts (R4): esta especificación conserva exactamente
// el comportamiento original del caso "activity.save" dentro de makeForm. Ningún
// campo, título, descripción ni transformación fue modificado.
export function activitySave(row: Row, meta: Row, extra: Row = {}): FormSpec {
  const members = membersOf(meta),
    assets = assetsOf(meta),
    manager = isManager(meta);
  let initial: Row = { ...row };
  let title = "Registrar información";
  let fields: Field[] = [];
  let description: string | undefined;
  title = row.id ? "Planificar actividad" : "Registrar actividad";
  for (const f of ["planned_start", "planned_end"])
    initial[f] = localInput(row[f]);
  initial.owner_id = row.owner_id ?? "";
  fields = [
    text("title", "Actividad requerida"),
    choose("asset_id", "Activo ATM", [["", "Selecciona un activo"], ...assets]),
    area("description", "Alcance de la actividad", false),
    choose("owner_id", "Responsable", [["", "Sin asignar"], ...members], false),
    when("planned_start", "Inicio previsto", false),
    when("planned_end", "Fin previsto", false),
  ];
  description =
    "Puedes registrar la demanda sin planificar. Para programarla, completa responsable, inicio y fin.";
  return { kind: "activity.save", title, description, fields, initial };
}

// Extraído de app/forms.ts (R4): esta especificación conserva exactamente
// el comportamiento original del caso "activity.transition" dentro de makeForm. Ningún
// campo, título, descripción ni transformación fue modificado.
export function activityTransition(
  row: Row,
  meta: Row,
  extra: Row = {},
): FormSpec {
  const members = membersOf(meta),
    assets = assetsOf(meta),
    manager = isManager(meta);
  let initial: Row = { ...row };
  let title = "Registrar información";
  let fields: Field[] = [];
  let description: string | undefined;
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
  return { kind: "activity.transition", title, description, fields, initial };
}
