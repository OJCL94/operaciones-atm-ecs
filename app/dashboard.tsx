"use client";
import {
  Ticket,
  Activity,
  Monitor,
  ShieldCheck,
  ArrowUpRight,
  ArrowRight,
} from "lucide-react";
import { Badge, DataTable, TableCell, formatDate, Row } from "./ui";
export function TicketRows({
  rows,
  open,
}: {
  rows: Row[];
  open: (id: string) => void;
}) {
  return (
    <DataTable
      headers={[
        "Ticket / Incidencia",
        "Activo",
        "Prioridad",
        "Estado",
        "Responsable",
        "Plazo objetivo",
      ]}
      rows={rows}
      render={(t) => (
        <>
          <TableCell>
            <button className="row-link" onClick={() => open(t.id)}>
              <span className="ticket-code">{t.code}</span>
              <strong className="table-title">{t.title}</strong>
            </button>
          </TableCell>
          <TableCell>
            <span className="asset-code">{t.asset_code}</span>
            <small className="subline">{t.location}</small>
          </TableCell>
          <TableCell>
            <Badge value={t.priority} />
          </TableCell>
          <TableCell>
            <Badge value={t.status} />
          </TableCell>
          <TableCell>
            <span className="person-cell">
              <span className="avatar small blue">
                {t.assignee_name
                  ?.split(" ")
                  .map((x: string) => x[0])
                  .slice(0, 2)
                  .join("") ?? "—"}
              </span>
              {t.assignee_name ?? "Sin asignar"}
            </span>
          </TableCell>
          <TableCell>
            <span
              className={
                !["resuelto", "cerrado"].includes(t.status) &&
                t.due_at < new Date().toISOString()
                  ? "overdue"
                  : ""
              }
            >
              {formatDate(t.due_at)}
            </span>
          </TableCell>
        </>
      )}
    />
  );
}
export default function Dashboard({
  data,
  open,
  navigate,
}: {
  data: Row;
  open: (id: string) => void;
  navigate: (v: string) => void;
}) {
  const { summary: s, assets, days } = data;
  const max = Math.max(
    1,
    ...days.flatMap((d: Row) => [d.created ?? 0, d.resolved ?? 0]),
  );
  return (
    <>
      <div className="metrics-grid">
        {[
          [
            "Tickets abiertos",
            s.open ?? 0,
            s.overdue
              ? `${s.overdue} fuera del plazo objetivo`
              : "Todos dentro del plazo",
            Ticket,
            "blue",
            "tickets",
          ],
          [
            "En atención",
            s.working ?? 0,
            "Intervenciones en curso",
            Activity,
            "purple",
            "tickets",
          ],
          [
            "Resueltos",
            s.resolved ?? 0,
            "Con solución documentada",
            ShieldCheck,
            "green",
            "tickets",
          ],
          [
            "Activos operativos",
            assets.operational ?? 0,
            `De ${assets.total} módulos ATM`,
            Monitor,
            "orange",
            "assets",
          ],
        ].map(([label, value, sub, Icon, color, target]: any) => (
          <button
            className="metric-card"
            key={label}
            onClick={() => navigate(target)}
          >
            <div className="metric-top">
              <span>{label}</span>
              <span className={"metric-icon " + color}>
                <Icon size={20} />
              </span>
            </div>
            <div className="metric-value">{value}</div>
            <div className="metric-foot">
              {sub}
              <ArrowUpRight size={16} />
            </div>
          </button>
        ))}
      </div>
      <div className="dashboard-grid">
        <section className="panel">
          <div className="panel-heading">
            <div>
              <h2>Actividad de tickets</h2>
              <p>Registros y resoluciones de los últimos 7 días</p>
            </div>
            <span className="soft-tag">Últimos 7 días</span>
          </div>
          <div className="chart-legend">
            <span>
              <i className="legend-blue" /> Registrados
            </span>
            <span>
              <i className="legend-light" /> Resueltos
            </span>
          </div>
          <div
            className="bar-chart"
            role="img"
            aria-label={days
              .map(
                (d: Row) =>
                  `${d.day}: ${d.created ?? 0} registrados, ${d.resolved ?? 0} resueltos`,
              )
              .join("; ")}
          >
            {days.map((d: Row) => (
              <div className="bar-group" key={d.day}>
                <div className="bar-pair">
                  <div
                    className="bar"
                    title={`${d.created ?? 0} registrados`}
                    style={{ height: ((d.created ?? 0) / max) * 153 }}
                  />
                  <div
                    className="bar light"
                    title={`${d.resolved ?? 0} resueltos`}
                    style={{ height: ((d.resolved ?? 0) / max) * 153 }}
                  />
                </div>
                <span>
                  {new Intl.DateTimeFormat("es-PE", {
                    weekday: "short",
                  }).format(new Date(d.day + "T12:00:00"))}
                </span>
              </div>
            ))}
          </div>
        </section>
        <section className="panel attention-panel">
          <div className="panel-heading">
            <div>
              <h2>Prioriza tu atención</h2>
              <p>Incidencias por prioridad y plazo objetivo</p>
            </div>
            <span className="number-tag">{data.attention.length}</span>
          </div>
          {data.attention.length ? (
            data.attention.map((t: Row) => (
              <button
                className="attention-item"
                key={t.id}
                onClick={() => open(t.id)}
              >
                <span
                  className={
                    "priority-marker " +
                    (t.priority === "critica" ? "critical" : "high")
                  }
                />
                <span>
                  <strong>{t.title}</strong>
                  <small>
                    {t.asset_code} · {t.location}
                  </small>
                </span>
                <ArrowUpRight size={17} />
              </button>
            ))
          ) : (
            <p className="empty-inline">
              No hay tickets pendientes. Tu cola está al día.
            </p>
          )}
          <button className="text-link" onClick={() => navigate("tickets")}>
            Ver cola de atención <ArrowRight size={16} />
          </button>
        </section>
      </div>
      <section className="panel">
        <div className="panel-heading">
          <div>
            <h2>Tickets recientes</h2>
            <p>Seguimiento de las últimas incidencias registradas</p>
          </div>
          <button className="text-link" onClick={() => navigate("tickets")}>
            Ver todos <ArrowRight size={16} />
          </button>
        </div>
        <TicketRows rows={data.recent} open={open} />
      </section>
    </>
  );
}
