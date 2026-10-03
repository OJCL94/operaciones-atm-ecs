import { Field, FormSpec, Row } from "../ui";
import { text, area, when, num, choose } from "./fields";
import { membersOf, assetsOf, isManager } from "./shared";
import { indicatorDefinitions } from "@/lib/domain";

// Extraído de app/forms.ts (R4): esta especificación conserva exactamente
// el comportamiento original del caso "period.create" dentro de makeForm. Ningún
// campo, título, descripción ni transformación fue modificado.
export function periodCreate(row: Row, meta: Row, extra: Row = {}): FormSpec {
  const members = membersOf(meta),
    assets = assetsOf(meta),
    manager = isManager(meta);
  let initial: Row = { ...row };
  let title = "Registrar información";
  let fields: Field[] = [];
  let description: string | undefined;
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
  return { kind: "period.create", title, description, fields, initial };
}

// Extraído de app/forms.ts (R4): esta especificación conserva exactamente
// el comportamiento original del caso "measurement.capture" dentro de makeForm. Ningún
// campo, título, descripción ni transformación fue modificado.
export function measurementCapture(
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
  return { kind: "measurement.capture", title, description, fields, initial };
}

// Extraído de app/forms.ts (R4): esta especificación conserva exactamente
// el comportamiento original del caso "measurement.create" dentro de makeForm. Ningún
// campo, título, descripción ni transformación fue modificado.
export function measurementCreate(
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
  return { kind: "measurement.create", title, description, fields, initial };
}
