// R4: makeForm ya no contiene el switch de 20 casos (419 líneas originales).
// Cada formulario es ahora una especificación independiente en app/forms/,
// registrada por kind en app/forms/registry.ts.
import { Row, FormSpec } from "./ui";
import { builders } from "./forms/registry";

export function makeForm(
  kind: string,
  row: Row,
  meta: Row,
  extra: Row = {},
): FormSpec {
  const builder = builders[kind];
  if (!builder)
    return {
      kind,
      title: "Registrar información",
      fields: [],
      initial: { ...row },
    };
  return builder(row, meta, extra);
}
