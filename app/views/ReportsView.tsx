// Extraído de app/workspace.tsx (R3): este componente conserva exactamente
// el JSX original del bloque `{view === "reports" && (...)}`. No se cambió
// ninguna marca, texto, clase ni prop; solo se movió a su propio archivo.
import { Download } from "lucide-react";
import { Row, Button } from "../ui";

export default function ReportsView({
  data,
  from,
  setFrom,
  to,
  setTo,
  download,
}: {
  data: Row;
  from: string;
  setFrom: (v: string) => void;
  to: string;
  setTo: (v: string) => void;
  download: (type: string) => void;
}) {
  return (
    <>
      <section className="panel report-filters">
        <div>
          <label htmlFor="report-from">Desde</label>
          <input
            id="report-from"
            type="date"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
          />
        </div>
        <div>
          <label htmlFor="report-to">Hasta</label>
          <input
            id="report-to"
            type="date"
            value={to}
            onChange={(e) => setTo(e.target.value)}
          />
        </div>
        <Button variant="outline" onClick={() => download("reports")}>
          <Download size={16} /> Exportar indicadores
        </Button>
      </section>
      <p className="research-note">
        Definiciones operativas propuestas a partir del Anexo 2. Un denominador
        vacío se presenta como «Sin datos». Estos resultados describen los
        registros; no prueban la hipótesis de investigación.
      </p>
      <div className="indicator-grid">
        {data.metrics.map((m: Row) => (
          <section className="panel indicator-card" key={m.id}>
            <div className="indicator-label">{m.label}</div>
            <div className="indicator-value">
              {m.value === null
                ? "Sin datos"
                : new Intl.NumberFormat("es-PE", {
                    maximumFractionDigits: 2,
                  }).format(m.value)}
              <span>{m.value === null ? "" : m.unit}</span>
            </div>
            <div className="indicator-sample">
              {m.denominator !== undefined
                ? `${m.numerator ?? 0} / ${m.denominator} · `
                : ""}
              n = {m.sample_size}
              {m.pending !== undefined ? ` · Pendientes: ${m.pending}` : ""}
            </div>
            <details>
              <summary>Cómo se calcula</summary>
              <p>{m.formula}</p>
            </details>
          </section>
        ))}
      </div>
    </>
  );
}
