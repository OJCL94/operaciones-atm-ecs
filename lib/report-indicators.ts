// R9 — Strategy + Registry para el cálculo de los 14 indicadores del
// panel de reportes, el mismo patrón que R1 (lib/handlers/registry.ts) y
// R4 (app/forms/registry.ts) ya aplican a "una operación por caso,
// registrada por id en vez de ramificada en una sola función".
//
// Antes de R9, lib/reports.ts tenía una sola función report() que (1)
// validaba el período, (2) lanzaba 11 consultas SQL en paralelo y (3)
// armaba, en un único objeto literal de ~70 líneas, el resultado de los
// 14 indicadores a partir de esas 11 consultas — todo en la misma
// función, con la complejidad ciclomática concentrada en los operadores
// ?? y los ternarios de percent(). Añadir un indicador nuevo exigía
// tocar ese objeto literal entero.
//
// Este módulo separa el paso (3): ReportContext es la bolsa de datos ya
// resuelta de las 11 consultas (lib/reports.ts sigue siendo el único
// responsable de construirla: la paralelización con Promise.all es una
// decisión de acceso a datos, no de cálculo, y moverla aquí no
// correspondería a Strategy sino a repetir round-trips por indicador).
// Cada entrada de indicatorStrategies es una función pura
// (contexto) -> resultado de un indicador, que no sabe nada de SQL ni de
// las otras 13. Agregar el indicador 15 es agregar una función aquí, sin
// tocar report().
import type { Row } from "./types";

export interface ReportContext {
  days: number;
  tickets: Row | null;
  updates: Row | null;
  category: Row | null;
  monitor: Row | null;
  activities: Row | null;
  resources: Row | null;
  schedule: Row | null;
  execution: Row | null;
  goals: Row | null;
  controlReviews: Row | null;
  corrections: Row | null;
}

export interface IndicatorResult {
  value: number | null;
  numerator?: number;
  denominator?: number;
  sample_size?: number;
  coverage?: number;
  pending?: number;
}

export type IndicatorStrategy = (c: ReportContext) => IndicatorResult;

const percent = (n: number | null | undefined, den: number | null | undefined) =>
  den ? Number(((100 * (n || 0)) / den).toFixed(2)) : null;

export const indicatorStrategies: Record<string, IndicatorStrategy> = {
  registro: (c) => ({
    value: Number(((c.tickets?.n ?? 0) / (c.days / 7)).toFixed(2)),
    numerator: c.tickets?.n,
    denominator: Number((c.days / 7).toFixed(4)),
    sample_size: c.tickets?.n,
  }),
  categoria: (c) => ({
    value: percent(c.category?.correct, c.category?.reviewed),
    numerator: c.category?.correct ?? 0,
    denominator: c.category?.reviewed ?? 0,
    coverage: c.category?.reviewed ?? 0,
  }),
  actualizacion: (c) => ({
    value: percent(c.updates?.n, c.tickets?.n),
    numerator: c.updates?.n,
    denominator: c.tickets?.n,
  }),
  monitoreo: (c) => ({
    value: percent(c.monitor?.n, c.tickets?.n),
    numerator: c.monitor?.n,
    denominator: c.tickets?.n,
  }),
  respuesta: (c) => ({
    value: c.tickets?.response ?? null,
    sample_size: c.tickets?.answered ?? 0,
    pending: (c.tickets?.n ?? 0) - (c.tickets?.answered ?? 0),
  }),
  resolucion: (c) => ({
    value: c.tickets?.resolution ?? null,
    sample_size: c.tickets?.resolved ?? 0,
    pending: (c.tickets?.n ?? 0) - (c.tickets?.resolved ?? 0),
  }),
  planificacion: (c) => ({
    value: percent(c.activities?.planned, c.activities?.n),
    numerator: c.activities?.planned ?? 0,
    denominator: c.activities?.n,
  }),
  recursos: (c) => ({
    value: percent(c.resources?.covered, c.resources?.n),
    numerator: c.resources?.covered ?? 0,
    denominator: c.resources?.n,
  }),
  cronograma: (c) => ({
    value: percent(c.schedule?.ontime, c.schedule?.n),
    numerator: c.schedule?.ontime ?? 0,
    denominator: c.schedule?.n,
  }),
  ejecucion: (c) => ({
    value: c.execution?.hours ?? null,
    sample_size: c.execution?.n ?? 0,
  }),
  tareas: (c) => ({
    value: percent(c.activities?.completed, c.activities?.n),
    numerator: c.activities?.completed ?? 0,
    denominator: c.activities?.n,
  }),
  metas: (c) => ({
    value: percent(c.goals?.achieved, c.goals?.n),
    numerator: c.goals?.achieved ?? 0,
    denominator: c.goals?.n,
  }),
  desviaciones: (c) => ({
    value: percent(c.controlReviews?.deviations, c.controlReviews?.n),
    numerator: c.controlReviews?.deviations ?? 0,
    denominator: c.controlReviews?.n,
  }),
  correctivas: (c) => ({
    value: percent(c.corrections?.ontime, c.corrections?.n),
    numerator: c.corrections?.ontime ?? 0,
    denominator: c.corrections?.n,
  }),
};
