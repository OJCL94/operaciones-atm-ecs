import { Service } from "./service";
import { ensure, indicatorDefinitions } from "./domain";
import { indicatorStrategies, type ReportContext } from "./report-indicators";
export async function report(s: Service, from: string, to: string) {
  s.research();
  ensure(
    !Number.isNaN(Date.parse(from)) && !Number.isNaN(Date.parse(to)),
    "Selecciona un período válido.",
  );
  from = new Date(from).toISOString();
  to = new Date(to).toISOString();
  ensure(to >= from, "Selecciona un período válido.");
  ensure(
    Date.parse(to) - Date.parse(from) <= 366 * 86400000,
    "El período máximo de consulta es 366 días.",
  );
  const d = s.demo,
    args = [d, from, to],
    ticket = "demo=? AND created_at>=? AND created_at<=?",
    end = to < new Date().toISOString() ? to : new Date().toISOString();
  // El plan y las cancelaciones se consultan al corte, para que una modificación posterior
  // no cambie el denominador ni el plazo histórico. La auditoría guarda ambos planes.
  const detail = "CASE WHEN json_valid(e.detail) THEN e.detail ELSE '{}' END";
  const history = `WITH activity_history AS (
 SELECT a.*,COALESCE(
   (SELECT e.detail FROM events e WHERE e.entity='activities' AND e.entity_id=a.id AND e.action IN ('actividad_creada','actividad_planificada') AND e.created_at<=? AND json_type(${detail},'$.status')='text' ORDER BY e.created_at DESC,e.id DESC LIMIT 1),
   (SELECT json_extract(${detail},'$.before') FROM events e WHERE e.entity='activities' AND e.entity_id=a.id AND e.action='actividad_planificada' AND e.created_at>? AND json_type(${detail},'$.before')='object' ORDER BY e.created_at,e.id LIMIT 1),
   json_object('planned_at',a.planned_at,'planned_start',a.planned_start,'planned_end',a.planned_end)
 ) plan FROM activities a WHERE a.demo=? AND a.created_at<=? AND (a.status!='cancelada' OR EXISTS(SELECT 1 FROM events e WHERE e.entity='activities' AND e.entity_id=a.id AND e.action='actividad_cancelada' AND e.created_at>?))
 ), activity_state AS (SELECT id,demo,created_at,status,started_at,completed_at,json_extract(plan,'$.planned_at') planned_at,json_extract(plan,'$.planned_start') planned_start,json_extract(plan,'$.planned_end') planned_end FROM activity_history)`;
  const historyArgs = [to, to, d, to, to];
  const [
    tickets,
    updates,
    category,
    monitor,
    activities,
    resources,
    schedule,
    execution,
    goals,
    controlReviews,
    corrections,
  ] = await Promise.all([
    s.one(
      `WITH cohort AS (SELECT t.created_at,t.first_response_at,CASE WHEN COALESCE((SELECT json_extract(e.detail,'$.a') FROM events e WHERE e.ticket_id=t.id AND e.action='estado' AND json_valid(e.detail) AND e.created_at<=? ORDER BY e.created_at DESC,e.id DESC LIMIT 1),t.status) IN ('resuelto','cerrado') THEN COALESCE((SELECT MAX(e.created_at) FROM events e WHERE e.ticket_id=t.id AND e.action='estado' AND json_valid(e.detail) AND json_extract(e.detail,'$.a')='resuelto' AND e.created_at<=?),CASE WHEN t.resolved_at<=? THEN t.resolved_at END) END resolved_at FROM tickets t WHERE ${ticket}) SELECT COUNT(*) n,COUNT(CASE WHEN first_response_at<=? THEN 1 END) answered,AVG(CASE WHEN first_response_at<=? THEN (julianday(first_response_at)-julianday(created_at))*24 END) response,COUNT(resolved_at) resolved,AVG((julianday(resolved_at)-julianday(created_at))*24) resolution FROM cohort`,
      [to, to, to, ...args, to, to],
    ),
    s.one(
      `SELECT COUNT(*) n FROM tickets t WHERE t.${ticket} AND EXISTS(SELECT 1 FROM events e WHERE e.ticket_id=t.id AND e.action IN ('seguimiento','respuesta','estado') AND e.created_at<=?)`,
      [...args, to],
    ),
    s.one(
      `SELECT COUNT(*) reviewed,SUM(passed) correct FROM reviews r WHERE kind='categoria' AND demo=? AND created_at>=? AND created_at<=? AND NOT EXISTS(SELECT 1 FROM reviews r2 WHERE r2.ticket_id=r.ticket_id AND r2.kind='categoria' AND r2.created_at<=? AND (r2.created_at>r.created_at OR (r2.created_at=r.created_at AND r2.rowid>r.rowid)))`,
      [...args, to],
    ),
    s.one(
      `SELECT COUNT(*) n FROM tickets t WHERE t.${ticket} AND EXISTS(SELECT 1 FROM reviews r WHERE r.ticket_id=t.id AND r.kind='monitoreo' AND r.created_at<=?)`,
      [...args, to],
    ),
    s.one(
      `${history} SELECT COUNT(*) n,COUNT(CASE WHEN planned_at<=? THEN 1 END) planned,SUM(CASE WHEN completed_at<=? THEN 1 ELSE 0 END) completed FROM activity_state WHERE created_at>=?`,
      [...historyArgs, to, to, from],
    ),
    s.one(
      `${history} SELECT COUNT(*) n,SUM(CASE WHEN COALESCE((SELECT SUM(a.quantity) FROM resource_allocations a WHERE a.requirement_id=r.id AND a.allocated_at<=r.required_by),0)>=r.quantity THEN 1 ELSE 0 END) covered FROM resource_requirements r JOIN activity_state t ON t.id=r.activity_id WHERE r.demo=? AND r.required_by>=? AND r.required_by<=? AND COALESCE((SELECT MIN(e.created_at) FROM events e WHERE e.entity='resource_requirements' AND e.entity_id=r.id AND e.action='recurso_requerido'),t.created_at)<=?`,
      [...historyArgs, d, from, end, to],
    ),
    s.one(
      `${history} SELECT COUNT(*) n,SUM(CASE WHEN completed_at<=planned_end THEN 1 ELSE 0 END) ontime FROM activity_state WHERE planned_end>=? AND planned_end<=?`,
      [...historyArgs, from, end],
    ),
    s.one(
      "SELECT COUNT(*) n,AVG((julianday(completed_at)-julianday(started_at))*24) hours FROM activities WHERE demo=? AND completed_at>=? AND completed_at<=? AND status='completada' AND started_at IS NOT NULL",
      args,
    ),
    s.one(
      "WITH evaluations AS (SELECT g.*,COALESCE((SELECT CAST(json_extract(e.detail,'$.actual') AS REAL) FROM events e WHERE e.entity='goals' AND e.entity_id=g.id AND e.action='meta_evaluada' AND json_valid(e.detail) AND e.created_at<=? ORDER BY e.created_at DESC,e.id DESC LIMIT 1),CASE WHEN g.evaluated_at<=? THEN g.actual END) cutoff_actual FROM goals g WHERE g.demo=? AND g.end_at>=? AND g.end_at<=? AND g.created_at<=?) SELECT COUNT(*) n,SUM(CASE WHEN (direction='mayor' AND cutoff_actual>=target) OR (direction='menor' AND cutoff_actual<=target) THEN 1 ELSE 0 END) achieved FROM evaluations",
      [to, to, d, from, end, to],
    ),
    s.one(
      "SELECT COUNT(DISTINCT activity_id) n,COUNT(DISTINCT CASE WHEN passed=0 THEN activity_id END) deviations FROM reviews WHERE demo=? AND kind='operativa' AND created_at>=? AND created_at<=?",
      args,
    ),
    s.one(
      "SELECT COUNT(*) n,SUM(CASE WHEN status='cerrada' AND completed_at<=due_at THEN 1 ELSE 0 END) ontime FROM controls WHERE demo=? AND due_at>=? AND due_at<=? AND created_at<=?",
      [d, from, end, to],
    ),
  ]);
  const days = Math.max(1, (Date.parse(to) - Date.parse(from) + 1) / 86400000);
  const context: ReportContext = {
    days,
    tickets,
    updates,
    category,
    monitor,
    activities,
    resources,
    schedule,
    execution,
    goals,
    controlReviews,
    corrections,
  };
  return {
    from,
    to,
    demo: d,
    generated_at: new Date().toISOString(),
    metrics: indicatorDefinitions.map(([id, label, unit, formula]) => {
      const m = indicatorStrategies[id](context);
      return {
        id,
        label,
        unit,
        formula,
        ...m,
        value: m.value == null ? null : Number(m.value.toFixed(2)),
        sample_size: m.sample_size ?? m.denominator ?? 0,
      };
    }),
  };
}
