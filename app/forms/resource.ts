import { Field, FormSpec, Row } from "../ui";
import { text, area, when, num, choose } from "./fields";
import { membersOf, assetsOf, isManager } from "./shared";

// Extraído de app/forms.ts (R4): esta especificación conserva exactamente
// el comportamiento original del caso "resource.require" dentro de makeForm. Ningún
// campo, título, descripción ni transformación fue modificado.
export function resourceRequire(
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
  title = "Definir recurso necesario";
  initial.quantity = 1;
  initial.unit = "unidad";
  fields = [
    text("name", "Recurso"),
    num("quantity", "Cantidad necesaria"),
    text("unit", "Unidad de medida"),
    when("required_by", "Debe estar disponible antes de"),
  ];
  return { kind: "resource.require", title, description, fields, initial };
}

// Extraído de app/forms.ts (R4): esta especificación conserva exactamente
// el comportamiento original del caso "resource.allocate" dentro de makeForm. Ningún
// campo, título, descripción ni transformación fue modificado.
export function resourceAllocate(
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
  title = "Asignar recurso";
  fields = [
    num("quantity", "Cantidad a asignar"),
    area("note", "Referencia del recurso y entrega"),
  ];
  return { kind: "resource.allocate", title, description, fields, initial };
}
