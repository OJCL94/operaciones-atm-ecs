// Extraído de app/workspace.tsx (R3): este componente conserva exactamente
// el JSX original del bloque `{view === "audit" && (...)}`. No se cambió
// ninguna marca, texto ni prop; solo se movió a su propio archivo.
import { Row, Pager } from "../ui";
import { EventList } from "../ui";

export default function AuditView({
  data,
  meta,
  page,
  setPage,
}: {
  data: Row;
  meta: Row | null | undefined;
  page: number;
  setPage: (p: number) => void;
}) {
  return (
    <section className="panel">
      <div className="panel-heading">
        <div>
          <h2>Registro de cambios</h2>
          <p>Los eventos no se editan ni se eliminan desde la aplicación.</p>
        </div>
      </div>
      <EventList events={data.rows} meta={meta} />
      <Pager data={data} page={page} setPage={setPage} />
    </section>
  );
}
