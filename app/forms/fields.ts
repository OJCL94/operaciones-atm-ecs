// Extraído de app/forms.ts (R4): las mismas 5 fábricas de campo, sin
// cambios, compartidas por las especificaciones de app/forms/*.ts.
import { Field } from "../ui";

export const text = (key: string, label: string, required = true): Field => ({
  key,
  label,
  required,
});
export const area = (key: string, label: string, required = true): Field => ({
  key,
  label,
  type: "textarea",
  required,
  wide: true,
});
export const when = (key: string, label: string, required = true): Field => ({
  key,
  label,
  type: "datetime-local",
  required,
});
export const num = (key: string, label: string, required = true): Field => ({
  key,
  label,
  type: "number",
  required,
  min: 0,
});
export const choose = (
  key: string,
  label: string,
  options: [string, string][],
  required = true,
): Field => ({ key, label, options, required });
