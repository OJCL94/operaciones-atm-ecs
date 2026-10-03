// Extraído de app/workspace.tsx (R3): este componente conserva exactamente
// el JSX original del bloque `{view === "assets" && (...)}`. No se cambió
// ninguna marca, texto, clase ni prop; solo se movió a su propio archivo.
import { ArrowUpRight } from "lucide-react";
import { Row, Badge, DataTable, TableCell, Pager, SearchBox } from "../ui";

export default function AssetsView({
  data,
  q,
  setQ,
  page,
  setPage,
  manager,
  navigate,
  setAssetFilter,
  form,
}: {
  data: Row;
  q: string;
  setQ: (v: string) => void;
  page: number;
  setPage: (p: number) => void;
  manager: boolean | undefined;
  navigate: (target: string) => void;
  setAssetFilter: (id: string) => void;
  form: (kind: string, row?: Row) => void;
}) {
  return (
    <section className="panel">
      <div className="toolbar">
        <SearchBox
          value={q}
          onChange={setQ}
          label="Buscar código, serie o ubicación"
        />
        <span className="muted-text">{data.total} activos registrados</span>
      </div>
      <DataTable
        headers={[
          "Activo",
          "Modelo / Serie",
          "Ubicación",
          "Estado",
          "Acciones",
        ]}
        rows={data.rows}
        render={(a) => (
          <>
            <TableCell>
              <span className="asset-code">{a.code}</span>
              <strong className="table-title">{a.name}</strong>
            </TableCell>
            <TableCell>
              {a.model}
              <small className="subline">{a.serial}</small>
            </TableCell>
            <TableCell>{a.location}</TableCell>
            <TableCell>
              <Badge value={a.status} />
            </TableCell>
            <TableCell>
              <div className="row-actions">
                <button
                  className="text-link"
                  onClick={() => {
                    navigate("tickets");
                    setAssetFilter(a.id);
                  }}
                >
                  Ver historial <ArrowUpRight size={14} />
                </button>
                {manager && (
                  <button
                    className="text-link"
                    onClick={() => form("asset.save", a)}
                  >
                    Editar
                  </button>
                )}
              </div>
            </TableCell>
          </>
        )}
      />
      <Pager data={data} page={page} setPage={setPage} />
    </section>
  );
}
