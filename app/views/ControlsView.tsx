// Extraído de app/workspace.tsx (R3): este componente conserva exactamente
// el JSX original del bloque `{["controls", "goals"].includes(view) && (...)}`.
// No se cambió ninguna marca, texto, clase ni prop; solo se movió a su
// propio archivo.
import { Target } from "lucide-react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Row,
  Badge,
  Button,
  DataTable,
  TableCell,
  Pager,
  formatDate,
} from "../ui";

export default function ControlsView({
  view,
  navigate,
  research,
  manager,
  actor,
  data,
  page,
  setPage,
  setDetail,
  form,
}: {
  view: string;
  navigate: (target: string) => void;
  research: boolean | undefined;
  manager: boolean | undefined;
  actor: Row | undefined;
  data: Row;
  page: number;
  setPage: (p: number) => void;
  setDetail: (d: { type: string; id: string } | null) => void;
  form: (kind: string, row?: Row) => void;
}) {
  return (
    <>
      <Tabs value={view} onValueChange={navigate} className="section-tabs">
        <TabsList>
          <TabsTrigger value="controls">Desviaciones y acciones</TabsTrigger>
          {research && (
            <TabsTrigger value="goals">Metas operativas</TabsTrigger>
          )}
        </TabsList>
      </Tabs>
      {view === "controls" ? (
        <section className="panel">
          <div className="panel-heading">
            <div>
              <h2>Seguimiento de acciones correctivas</h2>
              <p>
                Registra nuevos hallazgos desde el detalle de una actividad.
              </p>
            </div>
            {manager && (
              <Button variant="outline" onClick={() => navigate("activities")}>
                Ir a actividades
              </Button>
            )}
          </div>
          <DataTable
            headers={[
              "Desviación / Acción",
              "Actividad",
              "Responsable",
              "Plazo",
              "Estado",
              "Seguimiento",
            ]}
            rows={data.rows}
            render={(c) => (
              <>
                <TableCell>
                  <strong className="table-title">{c.title}</strong>
                  <p className="wrap-cell">{c.finding}</p>
                  <p className="wrap-cell">
                    <b>Acción:</b> {c.action}
                  </p>
                  {c.evidence && (
                    <p className="wrap-cell">
                      <b>Evidencia:</b> {c.evidence}
                    </p>
                  )}
                </TableCell>
                <TableCell>
                  <button
                    className="text-link wrap-cell"
                    onClick={() =>
                      setDetail({ type: "activity", id: c.activity_id })
                    }
                  >
                    {c.activity_title}
                  </button>
                </TableCell>
                <TableCell>{c.owner_name}</TableCell>
                <TableCell>{formatDate(c.due_at)}</TableCell>
                <TableCell>
                  <Badge value={c.status} />
                </TableCell>
                <TableCell>
                  {c.status === "abierta" &&
                  (manager || actor?.id === c.owner_id) ? (
                    <Button
                      variant="outline"
                      onClick={() =>
                        form("control.transition", { ...c, status: "en_curso" })
                      }
                    >
                      Iniciar
                    </Button>
                  ) : c.status === "en_curso" && manager ? (
                    <Button
                      variant="outline"
                      onClick={() =>
                        form("control.transition", { ...c, status: "cerrada" })
                      }
                    >
                      Verificar cierre
                    </Button>
                  ) : (
                    <span className="muted-text">
                      {c.status === "cerrada" ? "Verificada" : "En seguimiento"}
                    </span>
                  )}
                </TableCell>
              </>
            )}
          />
          <Pager data={data} page={page} setPage={setPage} />
        </section>
      ) : (
        <div className="goals-grid">
          {data.rows.length ? (
            data.rows.map((g: Row) => (
              <section className="panel goal-card" key={g.id}>
                <div className="goal-icon">
                  <Target size={22} />
                </div>
                <h2>{g.title}</h2>
                <p className="muted-text">
                  {formatDate(g.start_at, true)} — {formatDate(g.end_at, true)}
                </p>
                <div className="goal-value">
                  {g.actual ?? "—"}{" "}
                  <span>
                    / {g.target} {g.unit}
                  </span>
                </div>
                <p className="muted-text">
                  Objetivo:{" "}
                  {g.direction === "mayor" ? "al menos" : "como máximo"}{" "}
                  {g.target}
                </p>
                <Badge
                  value={
                    g.actual === null
                      ? "Sin evaluar"
                      : (
                            g.direction === "mayor"
                              ? g.actual >= g.target
                              : g.actual <= g.target
                          )
                        ? "Meta cumplida"
                        : "Pendiente de alcanzar"
                  }
                />
                {g.evidence && <p className="evidence">{g.evidence}</p>}
                {manager && (
                  <Button
                    variant="outline"
                    onClick={() => form("goal.evaluate", g)}
                  >
                    Registrar evaluación
                  </Button>
                )}
              </section>
            ))
          ) : (
            <section className="panel empty-inline">
              Aún no hay metas. Define el objetivo antes de registrar su
              resultado.
            </section>
          )}
        </div>
      )}
    </>
  );
}
