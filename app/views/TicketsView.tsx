// Extraído de app/workspace.tsx (R3): este componente conserva exactamente
// el JSX original del bloque `{view === "tickets" && (...)}`. No se cambió
// ninguna marca, texto, clase ni prop; solo se movió a su propio archivo.
import { Download, X } from "lucide-react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { states, priorities, transitionMap } from "@/lib/domain";
import { Row, Choice, Button, Pager, SearchBox } from "../ui";
import { TicketRows } from "../dashboard";

export default function TicketsView({
  data,
  q,
  setQ,
  status,
  setStatus,
  priority,
  setPriority,
  assetFilter,
  setAssetFilter,
  queue,
  setQueue,
  page,
  setPage,
  download,
  openTicket,
}: {
  data: Row;
  q: string;
  setQ: (v: string) => void;
  status: string;
  setStatus: (v: string) => void;
  priority: string;
  setPriority: (v: string) => void;
  assetFilter: string;
  setAssetFilter: (v: string) => void;
  queue: string;
  setQueue: (v: string) => void;
  page: number;
  setPage: (p: number) => void;
  download: (type: string) => void;
  openTicket: (id: string) => void;
}) {
  return (
    <section className="panel">
      <div className="toolbar">
        <Tabs
          value={queue}
          onValueChange={(v) => {
            setQueue(v);
            setPage(1);
          }}
        >
          <TabsList>
            <TabsTrigger value="all">Todos</TabsTrigger>
            <TabsTrigger value="mine">Mis asignados</TabsTrigger>
            <TabsTrigger value="overdue">Fuera de plazo</TabsTrigger>
          </TabsList>
        </Tabs>
        <Button variant="outline" onClick={() => download("tickets")}>
          <Download size={16} /> Exportar
        </Button>
      </div>
      <div className="filter-row">
        <SearchBox value={q} onChange={setQ} />
        <Choice
          value={status}
          label="Filtrar por estado"
          options={[
            ["", "Todos los estados"],
            ...Object.keys(transitionMap).map(
              (v) => [v, states[v]] as [string, string],
            ),
          ]}
          onChange={(v) => {
            setStatus(v);
            setPage(1);
          }}
        />
        <Choice
          value={priority}
          label="Filtrar por prioridad"
          options={[
            ["", "Todas las prioridades"],
            ...Object.entries(priorities),
          ]}
          onChange={(v) => {
            setPriority(v);
            setPage(1);
          }}
        />
        {assetFilter && (
          <Button variant="ghost" onClick={() => setAssetFilter("")}>
            Quitar filtro de activo <X size={14} />
          </Button>
        )}
      </div>
      <TicketRows rows={data.rows} open={openTicket} />
      <Pager data={data} page={page} setPage={setPage} />
    </section>
  );
}
