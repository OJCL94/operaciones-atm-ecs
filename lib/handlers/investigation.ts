// Extraído de lib/service.ts (R1): este manejador conserva exactamente el
// comportamiento original del caso "period.create" dentro de Service.execute.
// Ningún criterio de autorización, validación ni persistencia fue modificado.
import { z } from "zod";
import { actorContext } from "./context";
import { ensure, isManager, indicatorDefinitions } from "../domain";
import type { HandlerContext, ActionResult } from "../types";
import { id, optId, short, memo, date, version } from "./shared-schemas";

export async function periodCreate(
  svc: HandlerContext,
  input: unknown,
): Promise<ActionResult> {
  const { a, d, t } = actorContext(svc);
  svc.research();
  const p = z
    .object({
      label: short,
      phase: z.enum(["pretest", "postest"]),
      start_at: date,
      end_at: date,
      notes: memo,
    })
    .parse(input);
  ensure(p.end_at >= p.start_at, "El período no es válido.");
  const clash = await svc.one(
    "SELECT id FROM study_periods WHERE demo=? AND start_at<=? AND end_at>=?",
    [d, p.end_at, p.start_at],
  );
  ensure(!clash, "Los períodos de estudio no pueden solaparse.", 409);
  const pid = svc.ids.uuid();
  await svc.create(
    "study_periods",
    { id: pid, demo: d, ...p, created_at: t },
    "periodo_creado",
    p.label,
  );
  return { id: pid };
}
export async function measurementCreate(
  svc: HandlerContext,
  input: unknown,
): Promise<ActionResult> {
  const { a, d, t } = actorContext(svc);
  svc.research();
  const p = z
    .object({
      period_id: id,
      indicator: z.enum(
        indicatorDefinitions.map((i) => i[0]) as [string, ...string[]],
      ),
      week_start: date,
      numerator: z.number().finite().nonnegative().nullable(),
      denominator: z.number().finite().nonnegative().nullable(),
      value: z.number().finite().nonnegative().nullable(),
      sample_size: z.number().int().min(0).max(10000000),
      source: short,
      evidence: memo,
    })
    .parse(input);
  const period = await svc.entity("study_periods", p.period_id);
  ensure(
    p.week_start >= period.start_at && p.week_start <= period.end_at,
    "La semana debe pertenecer al período.",
  );
  const def = indicatorDefinitions.find((i) => i[0] === p.indicator)!;
  let value = p.value;
  if (def[2] === "%") {
    ensure(
      p.numerator !== null && p.denominator !== null,
      "Registra numerador y denominador.",
    );
    ensure(
      p.numerator <= p.denominator,
      "El numerador no puede superar al denominador.",
    );
    value = p.denominator ? (100 * p.numerator) / p.denominator : null;
  } else {
    ensure(
      p.value !== null && p.sample_size > 0,
      "Registra valor y tamaño de muestra positivo.",
    );
  }
  const mid = svc.ids.uuid();
  await svc.create(
    "measurements",
    { id: mid, ...p, value, actor_id: a.id, created_at: t },
    "medicion_registrada",
    JSON.stringify({ ...p, demo: d }),
  );
  return { id: mid };
}
