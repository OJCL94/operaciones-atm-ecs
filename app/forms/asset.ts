import { Field, FormSpec, Row } from "../ui";
import { text, area, when, num, choose } from "./fields";
import { formContext, formDefaults } from "./context";
import { states } from "@/lib/domain";

// Extraído de app/forms.ts (R4): esta especificación conserva exactamente
// el comportamiento original del caso "asset.save" dentro de makeForm. Ningún
// campo, título, descripción ni transformación fue modificado.
export function assetSave(row: Row, meta: Row, extra: Row = {}): FormSpec {
  const { members, assets, manager } = formContext(meta);
  let { initial, title, fields, description } = formDefaults(row);
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
        ["operativo", "mantenimiento", "fuera_servicio", "retirado"].includes(
          v,
        ),
      ),
    ),
    area("notes", "Observaciones", false),
  ];
  return { kind: "asset.save", title, description, fields, initial };
}
