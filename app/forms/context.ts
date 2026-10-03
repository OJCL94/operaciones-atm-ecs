// DRY (extensión de R4): extrae el patrón que quedó repetido al inicio de
// las 20 funciones de app/forms/*.ts, análogo al que R2 corrigió para los
// manejadores de lib/handlers/ (ver app/forms/context.ts junto a
// lib/handlers/context.ts). jscpd lo detectó al medir después de R4
// (duplicación textual 0,80 % -> 3,9 %; ver el informe).
import { Field, Row } from "../ui";
import { membersOf, assetsOf, isManager } from "./shared";

export function formContext(meta: Row) {
  return {
    members: membersOf(meta),
    assets: assetsOf(meta),
    manager: isManager(meta),
  };
}

// El estado inicial que cada especificación completa o sobrescribe.
export function formDefaults(row: Row) {
  return {
    initial: { ...row } as Row,
    title: "Registrar información",
    fields: [] as Field[],
    description: undefined as string | undefined,
  };
}
