import { context } from "./auth";
import { DomainError, ensure, csv } from "../lib/domain";
import { report } from "../lib/reports";
import { ZodError } from "zod";
export const dynamic = "force-dynamic";
export async function GET(request: Request) {
  const requestId = crypto.randomUUID();
  try {
    const { service: s, actor, realAdmin, demoOnly } = await context(request);
    const p = new URL(request.url).searchParams;
    const module = p.get("module") ?? "overview";
    let result: any;
    if (module === "meta") {
      const members = await s.all(
        "SELECT id,name,role,active FROM members WHERE active=1 AND (demo=? OR (demo=0 AND role IN ('admin','supervisor'))) ORDER BY name",
        [s.demo],
      );
      const assets = await s.all(
        "SELECT id,code,name,location FROM assets WHERE demo=? AND status!='retirado' ORDER BY code LIMIT 1000",
        [s.demo],
      );
      result = {
        actor,
        realAdmin,
        demoOnly,
        demo: s.demo,
        members,
        assets,
        seeded: !!(await s.one(
          "SELECT value FROM settings WHERE key='demo_seeded'",
        )),
      };
    } else if (module === "overview") result = await s.overview();
    else if (module === "reports")
      result = await report(
        s,
        p.get("from") ?? new Date(Date.now() - 30 * 86400000).toISOString(),
        p.get("to") ?? new Date().toISOString(),
      );
    else if (module === "export") {
      const type = p.get("type") ?? "tickets";
      let rows: any[] = [];
      if (type === "reports") {
        const r = await report(
          s,
          p.get("from") ?? new Date(Date.now() - 30 * 86400000).toISOString(),
          p.get("to") ?? new Date().toISOString(),
        );
        rows = r.metrics.map((m: any) => ({
          entorno: s.demo ? "DEMOSTRACION" : "REAL",
          desde: r.from,
          hasta: r.to,
          indicador: m.id,
          nombre: m.label,
          unidad: m.unit,
          valor: m.value,
          numerador: m.numerator,
          denominador: m.denominator,
          n: m.sample_size,
          pendientes: m.pending,
          formula: m.formula,
          extraido: r.generated_at,
        }));
      } else if (type === "measurements") {
        s.research();
        rows = await s.all(
          "SELECT p.demo,p.label,p.phase,m.* FROM measurements m JOIN study_periods p ON p.id=m.period_id WHERE p.demo=? ORDER BY m.week_start,m.indicator LIMIT 5000",
          [s.demo],
        );
      } else if (type === "tickets") {
        const first = await s.tickets(p);
        ensure(
          first.total <= 5000,
          "Hay más de 5000 tickets. Reduce el resultado mediante filtros.",
        );
        for (let page = 1; page <= Math.ceil(first.total / 15); page++) {
          p.set("page", String(page));
          rows.push(...(await s.tickets(p)).rows);
        }
        rows = rows.map(
          ({ id, version, requester_id, assignee_id, ...r }) => r,
        );
      } else throw new DomainError("Exportación desconocida");
      return new Response(
        csv(
          rows.length
            ? rows
            : [
                {
                  entorno: s.demo ? "DEMOSTRACION" : "REAL",
                  estado: "Sin datos",
                },
              ],
        ),
        {
          headers: {
            "Content-Type": "text/csv; charset=utf-8",
            "Content-Disposition": `attachment; filename="nexo-${type}-${s.demo ? "demo" : "real"}.csv"`,
            "Cache-Control": "no-store",
            "X-Content-Type-Options": "nosniff",
          },
        },
      );
    } else result = await s.list(module, p);
    return Response.json(result, {
      headers: {
        "Cache-Control": "no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (e) {
    if (e instanceof ZodError)
      return Response.json(
        { error: "Parámetros de consulta inválidos.", requestId },
        { status: 422 },
      );
    if (e instanceof DomainError)
      return Response.json(
        { error: e.message, requestId },
        { status: e.status, headers: { "Cache-Control": "no-store" } },
      );
    console.error(
      JSON.stringify({
        requestId,
        action: "read",
        error: e instanceof Error ? e.message : "unknown",
      }),
    );
    return Response.json(
      { error: "No pudimos cargar los datos. Inténtalo de nuevo.", requestId },
      { status: 500 },
    );
  }
}
