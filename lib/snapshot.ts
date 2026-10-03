import { z } from "zod";
import { Service } from "./service";
import { ensure } from "./domain";
import { report } from "./reports";
export async function captureWeek(s: Service, input: unknown) {
  s.research();
  const p = z
    .object({
      period_id: z.string().min(1),
      week_start: z
        .string()
        .datetime({ offset: true })
        .transform((v) => new Date(v).toISOString()),
    })
    .parse(input);
  const period = await s.entity("study_periods", p.period_id);
  const start = p.week_start,
    end = new Date(
      Math.min(Date.parse(start) + 7 * 86400000 - 1, Date.parse(period.end_at)),
    ).toISOString();
  ensure(
    start >= period.start_at && start <= period.end_at,
    "La semana debe pertenecer al período.",
  );
  ensure(
    end < new Date().toISOString(),
    "Captura únicamente semanas ya finalizadas para conservar una medición completa.",
  );
  const result = await report(s, start, end),
    at = new Date().toISOString();
  const statements = result.metrics.map((m) =>
    s.stmt(
      "INSERT INTO measurements(id,period_id,indicator,week_start,numerator,denominator,value,sample_size,source,evidence,actor_id,created_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?)",
      [
        crypto.randomUUID(),
        period.id,
        m.id,
        start,
        "numerator" in m ? m.numerator : null,
        "denominator" in m ? m.denominator : null,
        m.value,
        m.sample_size,
        "Sistema Nexo",
        JSON.stringify({
          from: start,
          to: end,
          generated_at: at,
          formula: m.formula,
          origin: s.demo ? "DEMOSTRACION" : "REAL",
          note: "Instantánea de registros disponibles al capturar. No reemplaza la validación del instrumento.",
        }),
        s.actor.id,
        at,
      ],
    ),
  );
  statements.push(
    s.event(
      "study_periods",
      period.id,
      "semana_capturada",
      JSON.stringify({ desde: start, hasta: end, indicadores: 14 }),
    ),
  );
  await s.db.batch(statements);
  return { ok: true, count: 14 };
}
