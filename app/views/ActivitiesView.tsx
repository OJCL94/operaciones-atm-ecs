// Extraído de app/workspace.tsx (R3): este componente conserva exactamente
// el JSX original del bloque `{view === "activities" && (...)}`. No se
// cambió ninguna marca, texto, clase ni prop; solo se movió a su propio
// archivo.
import { ArrowUpRight } from "lucide-react";
import { Row, Badge, DataTable, TableCell, Pager, formatDate } from "../ui";

export default function ActivitiesView({
  data,
  page,
  setPage,
  setDetail,
}: {
  data: Row;
  page: number;
  setPage: (p: number) => void;
  setDetail: (d: { type: string; id: string } | null) => void;
}) {
  return (
    <section className="panel">
      <div className="panel-heading">
        <div>
          <h2>Actividades y cronograma</h2>
          <p>
            La demanda pendiente también se conserva para medir la
            planificación.
          </p>
        </div>
      </div>
      <DataTable
        headers={[
          "Actividad",
          "Activo",
          "Responsable",
          "Estado",
          "Fin previsto",
          "Acciones",
        ]}
        rows={data.rows}
        render={(a) => (
          <>
            <TableCell>
              <button
                className="row-link"
                onClick={() => setDetail({ type: "activity", id: a.id })}
              >
                <strong className="table-title">{a.title}</strong>
                <small className="subline">
                  Requerida el {formatDate(a.created_at, true)}
                </small>
              </button>
            </TableCell>
            <TableCell>{a.asset_code}</TableCell>
            <TableCell>{a.owner_name ?? "Sin asignar"}</TableCell>
            <TableCell>
              <Badge value={a.status} />
            </TableCell>
            <TableCell>{formatDate(a.planned_end)}</TableCell>
            <TableCell>
              <button
                className="text-link"
                onClick={() => setDetail({ type: "activity", id: a.id })}
              >
                Ver actividad <ArrowUpRight size={14} />
              </button>
            </TableCell>
          </>
        )}
      />
      <Pager data={data} page={page} setPage={setPage} />
    </section>
  );
}
