// Extraído de app/workspace.tsx (R3): este componente conserva exactamente
// el JSX original del bloque `{view === "periods" && (...)}`. No se cambió
// ninguna marca, texto, clase ni prop; solo se movió a su propio archivo.
import { Download, Plus } from "lucide-react";
import { indicatorDefinitions } from "@/lib/domain";
import { Row, Badge, Button, DataTable, TableCell, formatDate } from "../ui";

export default function InvestigationView({
  data,
  form,
  download,
}: {
  data: Row;
  form: (kind: string, row?: Row, extra?: Row) => void;
  download: (type: string) => void;
}) {
  return (
    <div className="section-stack">
      <p className="research-note">
        El período de cuatro u ocho semanas requiere una decisión metodológica
        del asesor. Aquí se registran períodos y datos observados; no se generan
        pretest, postest ni resultados estadísticos ficticios.
      </p>
      <section className="panel">
        <div className="panel-heading">
          <div>
            <h2>Períodos del estudio</h2>
            <p>Las fechas deben ser comparables y no solaparse.</p>
          </div>
          {data.rows.length > 0 && (
            <div className="heading-actions">
              <Button
                variant="outline"
                onClick={() =>
                  form("measurement.capture", {}, { periods: data.rows })
                }
              >
                Capturar semana
              </Button>
              <Button
                onClick={() =>
                  form("measurement.create", {}, { periods: data.rows })
                }
              >
                <Plus size={16} /> Medición manual
              </Button>
            </div>
          )}
        </div>
        <DataTable
          headers={["Período", "Fase", "Inicio", "Fin", "Justificación"]}
          rows={data.rows}
          render={(p) => (
            <>
              <TableCell>
                <strong>{p.label}</strong>
              </TableCell>
              <TableCell>
                <Badge value={p.phase} />
              </TableCell>
              <TableCell>{formatDate(p.start_at, true)}</TableCell>
              <TableCell>{formatDate(p.end_at, true)}</TableCell>
              <TableCell className="wrap-cell">
                <details>
                  <summary>Ver justificación</summary>
                  <p>{p.notes}</p>
                </details>
              </TableCell>
            </>
          )}
        />
      </section>
      <section className="panel">
        <div className="panel-heading">
          <div>
            <h2>Mediciones registradas</h2>
            <p>Conservan la fuente y la referencia de evidencia.</p>
          </div>
          <Button variant="outline" onClick={() => download("measurements")}>
            <Download size={16} /> CSV para Excel / SPSS
          </Button>
        </div>
        <DataTable
          headers={[
            "Semana / Fase",
            "Indicador",
            "Valor",
            "Muestra",
            "Fuente / Evidencia",
          ]}
          rows={data.measurements}
          empty="Registra una medición con información observada y su fuente."
          render={(m) => (
            <>
              <TableCell>
                {formatDate(m.week_start, true)}
                <small className="subline">
                  {m.phase} · {m.label}
                </small>
              </TableCell>
              <TableCell>
                {indicatorDefinitions.find((i) => i[0] === m.indicator)?.[1]}
              </TableCell>
              <TableCell>{m.value ?? "Sin datos"}</TableCell>
              <TableCell>{m.sample_size}</TableCell>
              <TableCell className="wrap-cell">
                <strong>{m.source}</strong>
                <details>
                  <summary>Ver evidencia</summary>
                  <p>{m.evidence}</p>
                </details>
              </TableCell>
            </>
          )}
        />
      </section>
    </div>
  );
}
