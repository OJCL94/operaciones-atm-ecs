// Extraído de app/forms.ts (R4): los tres cálculos derivados de "meta" que
// varias especificaciones necesitan. Antes se calculaban una sola vez al
// principio de makeForm, aunque el caso ejecutado no los usara; ahora cada
// especificación los pide solo si los necesita.
import { Row } from "../ui";

export const membersOf = (meta: Row): [string, string][] =>
  meta.members
    .filter((m: Row) => ["admin", "supervisor", "tecnico"].includes(m.role))
    .map((m: Row) => [m.id, m.name]);

export const assetsOf = (meta: Row): [string, string][] =>
  meta.assets.map((a: Row) => [a.id, `${a.code} · ${a.location}`]);

export const isManager = (meta: Row) =>
  ["admin", "supervisor"].includes(meta.actor.role);
