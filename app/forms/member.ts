import { Field, FormSpec, Row } from "../ui";
import { text, area, when, num, choose } from "./fields";
import { formContext, formDefaults } from "./context";
import { roles } from "@/lib/domain";

// Extraído de app/forms.ts (R4): esta especificación conserva exactamente
// el comportamiento original del caso "member.password" dentro de makeForm. Ningún
// campo, título, descripción ni transformación fue modificado.
export function memberPassword(row: Row, meta: Row, extra: Row = {}): FormSpec {
  const { members, assets, manager } = formContext(meta);
  let { initial, title, fields, description } = formDefaults(row);
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
  return { kind: "member.password", title, description, fields, initial };
}

// Extraído de app/forms.ts (R4): esta especificación conserva exactamente
// el comportamiento original del caso "self.password" dentro de makeForm. Ningún
// campo, título, descripción ni transformación fue modificado.
export function selfPassword(row: Row, meta: Row, extra: Row = {}): FormSpec {
  const { members, assets, manager } = formContext(meta);
  let { initial, title, fields, description } = formDefaults(row);
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
  return { kind: "self.password", title, description, fields, initial };
}

// Extraído de app/forms.ts (R4): esta especificación conserva exactamente
// el comportamiento original del caso "member.save" dentro de makeForm. Ningún
// campo, título, descripción ni transformación fue modificado.
export function memberSave(row: Row, meta: Row, extra: Row = {}): FormSpec {
  const { members, assets, manager } = formContext(meta);
  let { initial, title, fields, description } = formDefaults(row);
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
    kind: "member.save",
    title,
    description,
    fields,
    initial,
    transform: (v) => ({ ...v, active: v.active === "true" }),
  };
}
