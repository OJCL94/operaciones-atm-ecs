"use client";
import { useEffect, useState } from "react";
import {
  LayoutDashboard,
  Ticket,
  Monitor,
  CalendarDays,
  ShieldCheck,
  ChartNoAxesCombined,
  Users,
  Plus,
  ChevronRight,
  Activity,
  LogOut,
  Download,
  RefreshCw,
  ClipboardList,
  History,
  BookOpen,
  ArrowUpRight,
  X,
  CheckCircle2,
  Target,
  ArrowLeft,
} from "lucide-react";
import {
  SidebarProvider,
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarFooter,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Toaster } from "@/components/ui/sonner";
import { toast } from "sonner";
import {
  roles,
  states,
  priorities,
  indicatorDefinitions,
  transitionMap,
} from "@/lib/domain";
import {
  Row,
  FormSpec,
  FormDialog,
  Choice,
  Badge,
  DataTable,
  TableCell,
  Button,
  Pager,
  LoadState,
  SearchBox,
  formatDate,
  EventList,
} from "./ui";
import { makeForm } from "./forms";
import { useApi, useRemote } from "./use-api";
import Dashboard, { TicketRows } from "./dashboard";
import AuditView from "./views/AuditView";
import AssetsView from "./views/AssetsView";
import TicketsView from "./views/TicketsView";
import ActivitiesView from "./views/ActivitiesView";
import ControlsView from "./views/ControlsView";
import ReportsView from "./views/ReportsView";
import InvestigationView from "./views/InvestigationView";
import MembersView from "./views/MembersView";
const nav = [
  ["overview", "Vista general", LayoutDashboard],
  ["tickets", "Tickets", Ticket],
  ["assets", "Activos ATM", Monitor],
  ["activities", "Planificación", CalendarDays],
  ["controls", "Control operativo", ShieldCheck],
  ["reports", "Indicadores", ChartNoAxesCombined],
  ["periods", "Investigación", ClipboardList],
  ["audit", "Trazabilidad", History],
  ["members", "Equipo y acceso", Users],
] as const;
const copy: Row = {
  overview: [
    "Todo bajo control.",
    "La información que necesitas para mantener tu operación en movimiento.",
  ],
  tickets: [
    "Cola de tickets",
    "Registra, prioriza y da seguimiento a cada incidencia.",
  ],
  assets: [
    "Activos ATM",
    "Cada equipo conectado a su ubicación e historial de intervenciones.",
  ],
  activities: [
    "Planificación operativa",
    "Organiza actividades, responsables y recursos antes de la intervención.",
  ],
  controls: [
    "Control operativo",
    "Convierte los hallazgos en acciones con responsables y evidencia.",
  ],
  goals: [
    "Control operativo",
    "Define metas y contrasta el resultado con evidencia verificable.",
  ],
  reports: [
    "Indicadores operativos",
    "Métricas calculadas a partir de los registros del entorno seleccionado.",
  ],
  periods: [
    "Investigación",
    "Períodos y mediciones semanales para el diseño pretest–postest.",
  ],
  audit: ["Trazabilidad", "Historial de cambios con autor, fecha y detalle."],
  members: [
    "Equipo y acceso",
    "Administra los roles y el acceso de las personas a la operación.",
  ],
};
function Menu({
  view,
  navigate,
  canResearch,
  role,
}: {
  view: string;
  navigate: (s: string) => void;
  canResearch: boolean;
  role: string;
}) {
  const sidebar = useSidebar();
  return (
    <SidebarMenu>
      {nav
        .filter(([id]) =>
          id === "members"
            ? role === "admin"
            : ["reports", "periods", "audit"].includes(id)
              ? canResearch
              : ["activities", "controls"].includes(id)
                ? role !== "solicitante"
                : true,
        )
        .map(([id, label, Icon]) => (
          <SidebarMenuItem key={id}>
            <SidebarMenuButton
              onClick={() => {
                navigate(id);
                sidebar.setOpenMobile(false);
              }}
              isActive={view === id || (view === "goals" && id === "controls")}
              className="nav-item"
            >
              <Icon size={19} />
              <span>{label}</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        ))}
    </SidebarMenu>
  );
}
export default function Workspace({
  initialDemo = 1,
}: {
  initialDemo?: number;
}) {
  const [view, setView] = useState("overview"),
    [demo, setDemo] = useState(initialDemo),
    [role, setRole] = useState("admin"),
    [revision, setRevision] = useState(0),
    [spec, setSpec] = useState<FormSpec | null>(null),
    [detail, setDetail] = useState<{ type: string; id: string } | null>(null),
    [manual, setManual] = useState(false);
  const [page, setPage] = useState(1),
    [q, setQ] = useState(""),
    [search, setSearch] = useState(""),
    [status, setStatus] = useState(""),
    [priority, setPriority] = useState(""),
    [assetFilter, setAssetFilter] = useState(""),
    [queue, setQueue] = useState("all");
  const today = new Date(Date.now() - 5 * 3600000).toISOString().slice(0, 10);
  const [from, setFrom] = useState(
      new Date(Date.now() - 29 * 86400000 - 5 * 3600000)
        .toISOString()
        .slice(0, 10),
    ),
    [to, setTo] = useState(today);
  const api = useApi(demo, role),
    metaState = useRemote(api, "meta", {}, revision),
    meta = metaState.data,
    actor = meta?.actor;
  const manager = actor && ["admin", "supervisor"].includes(actor.role),
    research = manager || actor?.role === "auditor";
  const refresh = () => setRevision((v) => v + 1);
  function navigate(target: string) {
    const safe = copy[target] ? target : "overview";
    setView(safe);
    setPage(1);
    setQ("");
    setSearch("");
    setStatus("");
    setPriority("");
    setAssetFilter("");
    setQueue("all");
    window.location.hash = safe;
    setDetail(null);
  }
  useEffect(() => {
    const sync = () => {
      const name = window.location.hash.slice(1).split("/")[0];
      if (copy[name]) {
        setView(name);
        setPage(1);
      }
    };
    sync();
    window.addEventListener("hashchange", sync);
    return () => window.removeEventListener("hashchange", sync);
  }, []);
  useEffect(() => {
    const timeout = setTimeout(() => {
      setSearch(q);
      setPage(1);
    }, 250);
    return () => clearTimeout(timeout);
  }, [q]);
  useEffect(() => {
    if (
      meta &&
      !meta.seeded &&
      meta.realAdmin &&
      role === "admin" &&
      demo === 1
    )
      api("", {}, { kind: "demo.seed", data: {} })
        .then(refresh)
        .catch((e) => toast.error(e.message));
  }, [meta?.seeded, meta?.realAdmin, role, demo, api]);
  const params: Row = {
    page,
    q: search,
    ...(view === "tickets"
      ? {
          status,
          priority,
          asset: assetFilter,
          mine: queue === "mine" ? "1" : "",
          overdue: queue === "overdue" ? "1" : "",
        }
      : {}),
    ...(view === "reports"
      ? { from: from + "T00:00:00-05:00", to: to + "T23:59:59.999-05:00" }
      : {}),
  };
  const state = useRemote(api, view, params, revision, !!meta),
    data = state.data;
  const detailState = useRemote(
    api,
    detail?.type ?? "ticket",
    { id: detail?.id },
    revision,
    !!detail,
  );
  async function submit(kind: string, values: Row) {
    const result = await api("", {}, { kind, data: values });
    refresh();
    toast.success("Información guardada correctamente.");
    if (result.signout) window.location.assign("/");
    return result;
  }
  function form(kind: string, row: Row = {}, extra: Row = {}) {
    if (!meta) return;
    const next = makeForm(kind, row, meta, extra);
    if (kind === "ticket.create")
      next.onDone = (r) => {
        navigate("tickets");
        setDetail({ type: "ticket", id: r.id });
      };
    setSpec(next);
  }
  async function download(type: string) {
    try {
      const res = await api("export", { ...params, type });
      const url = URL.createObjectURL(await res.blob());
      const a = document.createElement("a");
      a.href = url;
      a.download = `nexo-${type}-${demo ? "demo" : "real"}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
      toast.success("Exportación generada.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "No se pudo exportar.");
    }
  }
  const openTicket = (id: string) => setDetail({ type: "ticket", id });
  const initials = (actor?.name ?? "Nexo")
    .split(" ")
    .map((s: string) => s[0])
    .slice(0, 2)
    .join("");
  const primary = () => {
    if (view === "overview" || view === "tickets") form("ticket.create");
    else if (view === "assets") form("asset.save");
    else if (view === "activities") form("activity.save");
    else if (view === "goals") form("goal.create");
    else if (view === "periods") form("period.create");
    else if (view === "members") form("member.save");
  };
  const primaryLabel: Row = {
    overview: "Nuevo ticket",
    tickets: "Nuevo ticket",
    assets: "Registrar activo",
    activities: "Nueva actividad",
    goals: "Nueva meta",
    periods: "Nuevo período",
    members: "Registrar acceso",
  };
  const canPrimary =
    actor &&
    ((["overview", "tickets"].includes(view) && actor.role !== "auditor") ||
      (["assets", "activities", "goals"].includes(view) && manager) ||
      (view === "periods" && research) ||
      (view === "members" && actor.role === "admin" && !demo));
  return (
    <SidebarProvider>
      <Sidebar className="nexo-sidebar">
        <SidebarHeader>
          <a
            className="brand"
            href="#overview"
            onClick={() => navigate("overview")}
          >
            <span className="brand-mark">N</span>
            <span>
              nexo<span className="brand-sub">OPERACIONES ATM</span>
            </span>
          </a>
        </SidebarHeader>
        <SidebarContent>
          <div className="workspace-label">ESPACIO DE TRABAJO</div>
          <Menu
            view={view}
            navigate={navigate}
            canResearch={!!research}
            role={actor?.role ?? "solicitante"}
          />
          <div className="sidebar-note">
            <Activity size={20} />
            <strong>Una operación conectada</strong>
            <p>
              Cada activo, cada intervención y cada decisión, en un solo lugar.
            </p>
          </div>
          {!meta?.demoOnly && (
            <button
              className="manual-link"
              onClick={() => form("self.password")}
            >
              Cambiar mi contraseña
            </button>
          )}
          <button className="manual-link" onClick={() => setManual(true)}>
            <BookOpen size={17} /> Guía de uso
          </button>
        </SidebarContent>
        <SidebarFooter>
          <div className="profile">
            <span className="avatar blue">{initials}</span>
            <span>
              <strong>{actor?.name ?? "Cargando…"}</strong>
              <small>{actor ? (roles as Row)[actor.role] : ""}</small>
            </span>
            <button
              className="signout"
              onClick={async () => {
                await fetch("/api/auth/logout", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: "{}",
                });
                window.location.assign("/");
              }}
              aria-label="Cerrar sesión"
            >
              <LogOut size={17} />
            </button>
          </div>
        </SidebarFooter>
      </Sidebar>
      <main className="main-shell">
        <header className="topbar">
          <div className="breadcrumb">
            <SidebarTrigger />
            <span>Operaciones</span>
            <ChevronRight size={14} />
            <strong>
              {view === "goals"
                ? "Control operativo"
                : nav.find((n) => n[0] === view)?.[1]}
            </strong>
          </div>
          <div className="topbar-right">
            <Choice
              value={String(demo)}
              label="Entorno de datos"
              options={
                meta?.demoOnly
                  ? [["1", "Demostración"]]
                  : [
                      ["1", "Demostración"],
                      ["0", "Operación real"],
                    ]
              }
              onChange={(v) => {
                setDemo(Number(v));
                setRole("admin");
                setDetail(null);
                setView("overview");
                window.location.hash = "overview";
                setSpec(null);
              }}
            />
            <span className="avatar small blue">{initials}</span>
          </div>
        </header>
        <div className="content">
          <div className="page-heading">
            <div>
              <div className="eyebrow">
                {demo ? "ENTORNO DEMOSTRATIVO" : "CENTRO DE OPERACIONES"}
              </div>
              <h1>{copy[view][0]}</h1>
              <p>{copy[view][1]}</p>
            </div>
            <div className="heading-actions">
              <Button
                variant="outline"
                size="icon"
                aria-label="Actualizar información"
                onClick={refresh}
              >
                <RefreshCw size={17} />
              </Button>
              {canPrimary && (
                <Button className="primary-button" onClick={primary}>
                  <Plus size={18} />
                  {primaryLabel[view]}
                </Button>
              )}
            </div>
          </div>
          <div className="status-strip">
            <span>
              <span className="status-dot" />
              {demo
                ? "Datos ficticios · Sin valor de evidencia académica"
                : "Registros reales · Acceso según tu rol"}
            </span>
            {meta?.realAdmin && demo === 1 ? (
              <div className="demo-role">
                <span>Explorar como</span>
                <Choice
                  value={role}
                  label="Rol de demostración"
                  options={Object.entries(roles)}
                  onChange={(v) => {
                    setRole(v);
                    navigate("overview");
                    setSpec(null);
                  }}
                />
              </div>
            ) : (
              <span>Lima Metropolitana · Hora de Lima</span>
            )}
          </div>
          <LoadState
            loading={metaState.loading && !meta}
            error={metaState.error}
            retry={refresh}
          >
            <LoadState
              loading={state.loading}
              error={state.error}
              retry={refresh}
            >
              {data && (
                <>
                  {view === "overview" && (
                    <Dashboard
                      data={data}
                      open={openTicket}
                      navigate={navigate}
                    />
                  )}
                  {view === "tickets" && (
                    <TicketsView
                      data={data}
                      q={q}
                      setQ={setQ}
                      status={status}
                      setStatus={setStatus}
                      priority={priority}
                      setPriority={setPriority}
                      assetFilter={assetFilter}
                      setAssetFilter={setAssetFilter}
                      queue={queue}
                      setQueue={setQueue}
                      page={page}
                      setPage={setPage}
                      download={download}
                      openTicket={openTicket}
                    />
                  )}
                  {view === "assets" && (
                    <AssetsView
                      data={data}
                      q={q}
                      setQ={setQ}
                      page={page}
                      setPage={setPage}
                      manager={manager}
                      navigate={navigate}
                      setAssetFilter={setAssetFilter}
                      form={form}
                    />
                  )}
                  {view === "activities" && (
                    <ActivitiesView
                      data={data}
                      page={page}
                      setPage={setPage}
                      setDetail={setDetail}
                    />
                  )}
                  {["controls", "goals"].includes(view) && (
                    <ControlsView
                      view={view}
                      navigate={navigate}
                      research={research}
                      manager={manager}
                      actor={actor}
                      data={data}
                      page={page}
                      setPage={setPage}
                      setDetail={setDetail}
                      form={form}
                    />
                  )}
                  {view === "reports" && (
                    <ReportsView
                      data={data}
                      from={from}
                      setFrom={setFrom}
                      to={to}
                      setTo={setTo}
                      download={download}
                    />
                  )}
                  {view === "periods" && (
                    <InvestigationView
                      data={data}
                      form={form}
                      download={download}
                    />
                  )}
                  {view === "audit" && (
                    <AuditView
                      data={data}
                      meta={meta}
                      page={page}
                      setPage={setPage}
                    />
                  )}
                  {view === "members" && (
                    <MembersView
                      data={data}
                      demo={demo}
                      page={page}
                      setPage={setPage}
                      form={form}
                    />
                  )}
                </>
              )}
            </LoadState>
          </LoadState>
          <footer className="page-footer">
            <span>Nexo · Gestión operativa de infraestructura tecnológica</span>
            <span>Zona horaria: America/Lima</span>
          </footer>
        </div>
      </main>
      <Sheet
        open={!!detail}
        onOpenChange={(open) => {
          if (!open) setDetail(null);
        }}
      >
        <SheetContent className="detail-sheet" showCloseButton={false}>
          <button
            className="close-detail"
            aria-label="Cerrar detalle"
            onClick={() => setDetail(null)}
          >
            <X size={20} />
          </button>
          <SheetHeader>
            <SheetTitle>
              {detail?.type === "ticket"
                ? "Detalle del ticket"
                : "Detalle de actividad"}
            </SheetTitle>
            <SheetDescription>
              Información, intervenciones y trazabilidad del registro.
            </SheetDescription>
          </SheetHeader>
          <div className="detail-body">
            <LoadState
              loading={detailState.loading}
              error={detailState.error}
              retry={refresh}
            >
              {detailState.data &&
                (detail?.type === "ticket" ? (
                  <TicketDetail
                    data={detailState.data}
                    meta={meta!}
                    form={form}
                    openActivity={(id) => setDetail({ type: "activity", id })}
                  />
                ) : (
                  <ActivityDetail
                    data={detailState.data}
                    meta={meta!}
                    form={form}
                  />
                ))}
            </LoadState>
          </div>
        </SheetContent>
      </Sheet>
      <Sheet open={manual} onOpenChange={setManual}>
        <SheetContent className="detail-sheet" showCloseButton={false}>
          <button
            className="close-detail"
            aria-label="Cerrar guía"
            onClick={() => setManual(false)}
          >
            <X size={20} />
          </button>
          <SheetHeader>
            <SheetTitle>Guía de uso</SheetTitle>
            <SheetDescription>Recorridos principales de Nexo.</SheetDescription>
          </SheetHeader>
          <div className="detail-body manual">
            <p>
              <a
                className="text-link"
                href="/manual.html"
                target="_blank"
                rel="noreferrer"
              >
                Abrir el manual completo e imprimible
              </a>
            </p>
            <h3>1. Registrar y atender una incidencia</h3>
            <p>
              Registra un activo ATM y crea un ticket con categoría y prioridad.
              El supervisor asigna un técnico. El técnico inicia la atención,
              documenta la respuesta y registra el seguimiento. Para resolver se
              exige diagnóstico, solución y actividades completadas o
              canceladas. El solicitante o supervisor valida el cierre;
              supervisión puede reabrir con motivo.
            </p>
            <h3>2. Planificar una intervención</h3>
            <p>
              Crea una actividad, incluso si todavía no está programada. Define
              responsable y fechas; añade los recursos necesarios y registra sus
              asignaciones. Al iniciar se verifican los recursos. Completa la
              actividad con evidencia.
            </p>
            <h3>3. Revisar y corregir</h3>
            <p>
              El supervisor registra revisiones explícitas de categoría,
              monitoreo o ejecución. Desde una actividad puede documentar una
              desviación y su acción correctiva. El responsable la inicia y
              supervisión verifica el cierre. Las metas requieren un valor
              objetivo y una evaluación respaldada.
            </p>
            <h3>4. Medir la operación</h3>
            <p>
              Consulta los 14 indicadores con sus fórmulas y tamaños de muestra.
              Para la investigación, define períodos pretest y postest sin
              solapamiento y registra mediciones semanales con fuentes. Exporta
              CSV UTF-8 para Excel o SPSS. La validación metodológica y el
              análisis inferencial son tareas posteriores con datos reales.
            </p>
            <h3>Plazos propuestos</h3>
            <p>
              Crítica: 4 horas; alta: 8 horas; media: 24 horas; baja: 72 horas
              continuas desde el registro. Son objetivos de demostración
              propuestos, no acuerdos de servicio fijados por la empresa. Una
              reasignación no reinicia el reloj.
            </p>
            <h3>Datos y permisos</h3>
            <p>
              Demostración y Operación real conservan datos separados. Solo el
              administrador puede simular otros roles en demostración. El
              investigador consulta y registra mediciones, pero no altera
              tickets. Ningún registro de ejemplo constituye evidencia
              académica.
            </p>
          </div>
        </SheetContent>
      </Sheet>
      <FormDialog spec={spec} close={() => setSpec(null)} submit={submit} />
      <Toaster richColors position="top-right" />
    </SidebarProvider>
  );
}
function TicketDetail({
  data,
  meta,
  form,
  openActivity,
}: {
  data: Row;
  meta: Row;
  form: (k: string, r?: Row) => void;
  openActivity: (id: string) => void;
}) {
  const t = data.ticket,
    actor = meta.actor,
    manager = ["admin", "supervisor"].includes(actor.role),
    tech = actor.role === "tecnico" && t.assignee_id === actor.id,
    canWrite = actor.role !== "auditor";
  const member = (id: string) =>
    meta.members.find((m: Row) => m.id === id)?.name ?? "Sin asignar";
  return (
    <>
      <div className="detail-code">
        {t.code}
        <Badge value={t.priority} />
        <Badge value={t.status} />
      </div>
      <h2 className="detail-title">{t.title}</h2>
      <p className="description-text">{t.description}</p>
      <div className="detail-facts">
        {[
          ["Activo", data.asset.code + " · " + data.asset.location],
          ["Responsable", member(t.assignee_id)],
          ["Categoría", t.category],
          ["Registrado", formatDate(t.created_at)],
          ["Plazo objetivo", formatDate(t.due_at)],
          ["Primera respuesta", formatDate(t.first_response_at)],
          ["Resolución", formatDate(t.resolved_at)],
          ["Cierre", formatDate(t.closed_at)],
        ].map(([label, value]) => (
          <div key={label}>
            <span>{label}</span>
            <strong>{value}</strong>
          </div>
        ))}
      </div>
      <div className="detail-actions">
        {manager && !["resuelto", "cerrado"].includes(t.status) && (
          <Button variant="outline" onClick={() => form("ticket.assign", t)}>
            Asignar / clasificar
          </Button>
        )}
        {canWrite && t.status !== "cerrado" && (
          <Button onClick={() => form("ticket.note", t)}>
            Registrar intervención
          </Button>
        )}
        {(transitionMap[t.status] ?? [])
          .filter((next) =>
            next === "asignado"
              ? false
              : next === "cerrado"
                ? manager || t.requester_id === actor.id
                : ["resuelto", "cerrado"].includes(t.status)
                  ? manager
                  : manager || tech,
          )
          .map((next) => (
            <Button
              key={next}
              variant="outline"
              onClick={() =>
                form("ticket.transition", {
                  ...t,
                  status: next,
                  reopen: ["resuelto", "cerrado"].includes(t.status),
                })
              }
            >
              {["resuelto", "cerrado"].includes(t.status) &&
              next === "en_atencion"
                ? "Reabrir"
                : states[next]}
            </Button>
          ))}
        {manager && (
          <Button
            variant="outline"
            onClick={() => form("review.create", { entity_id: t.id })}
          >
            Registrar revisión
          </Button>
        )}
      </div>
      {t.solution && (
        <section className="detail-section">
          <h3>Diagnóstico y solución</h3>
          <p>{t.diagnosis}</p>
          <p>{t.solution}</p>
        </section>
      )}
      <section className="detail-section">
        <div className="inline-heading">
          <h3>Actividades vinculadas</h3>
          {manager && !["resuelto", "cerrado"].includes(t.status) && (
            <button
              className="text-link"
              onClick={() =>
                form("activity.save", { ticket_id: t.id, asset_id: t.asset_id })
              }
            >
              <Plus size={15} /> Añadir
            </button>
          )}
        </div>
        {data.activities.length ? (
          data.activities.map((a: Row) => (
            <button
              key={a.id}
              className="linked-item"
              onClick={() => openActivity(a.id)}
            >
              <span>{a.title}</span>
              <Badge value={a.status} />
            </button>
          ))
        ) : (
          <p className="muted-text">No hay actividades vinculadas.</p>
        )}
      </section>
      {data.reviews.length > 0 && (
        <section className="detail-section">
          <h3>Revisiones de supervisión</h3>
          {data.reviews.map((r: Row) => (
            <div className="review-item" key={r.id}>
              <strong>
                {r.kind === "categoria" ? "Categorización" : "Monitoreo"} ·{" "}
                {r.passed ? "Conforme" : "No conforme"}
              </strong>
              <p>{r.evidence}</p>
              <small>
                {r.actor_name} · {formatDate(r.created_at)}
              </small>
            </div>
          ))}
        </section>
      )}
      <section className="detail-section">
        <h3>Historial de intervenciones</h3>
        <EventList events={data.events} meta={meta} />
      </section>
    </>
  );
}
function ActivityDetail({
  data,
  meta,
  form,
}: {
  data: Row;
  meta: Row;
  form: (k: string, r?: Row) => void;
}) {
  const a = data.activity,
    actor = meta.actor,
    manager = ["admin", "supervisor"].includes(actor.role),
    executor = manager || (actor.role === "tecnico" && a.owner_id === actor.id);
  return (
    <>
      <div className="detail-code">
        <Badge value={a.status} />
      </div>
      <h2 className="detail-title">{a.title}</h2>
      <p className="description-text">
        {a.description || "Sin descripción adicional."}
      </p>
      <div className="detail-facts">
        {[
          ["Inicio previsto", formatDate(a.planned_start)],
          ["Fin previsto", formatDate(a.planned_end)],
          ["Inicio real", formatDate(a.started_at)],
          ["Finalización", formatDate(a.completed_at)],
        ].map(([l, v]) => (
          <div key={l}>
            <span>{l}</span>
            <strong>{v}</strong>
          </div>
        ))}
      </div>
      <div className="detail-actions">
        {manager && ["pendiente", "planificada"].includes(a.status) && (
          <Button onClick={() => form("activity.save", a)}>
            Editar planificación
          </Button>
        )}
        {executor && a.status === "planificada" && (
          <Button
            onClick={() =>
              form("activity.transition", { ...a, status: "en_curso" })
            }
          >
            Iniciar actividad
          </Button>
        )}
        {executor && a.status === "en_curso" && (
          <Button
            onClick={() =>
              form("activity.transition", { ...a, status: "completada" })
            }
          >
            Completar actividad
          </Button>
        )}
        {manager && !["completada", "cancelada"].includes(a.status) && (
          <Button
            variant="outline"
            onClick={() =>
              form("activity.transition", { ...a, status: "cancelada" })
            }
          >
            Cancelar actividad
          </Button>
        )}
        {manager && (
          <>
            <Button
              variant="outline"
              onClick={() =>
                form("review.create", { entity_id: a.id, kind: "operativa" })
              }
            >
              Registrar revisión
            </Button>
            <Button
              variant="outline"
              onClick={() => form("control.create", { activity_id: a.id })}
            >
              Registrar desviación
            </Button>
          </>
        )}
      </div>
      {a.evidence && <p className="evidence">{a.evidence}</p>}
      <section className="detail-section">
        <div className="inline-heading">
          <h3>Recursos necesarios</h3>
          {manager && ["pendiente", "planificada"].includes(a.status) && (
            <button
              className="text-link"
              onClick={() => form("resource.require", { activity_id: a.id })}
            >
              <Plus size={15} /> Definir recurso
            </button>
          )}
        </div>
        {data.resources.length ? (
          data.resources.map((r: Row) => (
            <div className="resource-item" key={r.id}>
              <div>
                <strong>{r.name}</strong>
                <p>
                  {r.allocated} / {r.quantity} {r.unit} asignados
                </p>
                <small>Necesario antes del {formatDate(r.required_by)}</small>
              </div>
              {manager &&
              r.allocated < r.quantity &&
              ["pendiente", "planificada"].includes(a.status) ? (
                <Button
                  variant="outline"
                  onClick={() =>
                    form("resource.allocate", {
                      requirement_id: r.id,
                      quantity: r.quantity - r.allocated,
                    })
                  }
                >
                  Asignar
                </Button>
              ) : r.allocated >= r.quantity ? (
                <CheckCircle2 size={21} className="green-text" />
              ) : null}
            </div>
          ))
        ) : (
          <p className="muted-text">
            No se han definido recursos materiales para esta actividad.
          </p>
        )}
      </section>
      {data.reviews.length > 0 && (
        <section className="detail-section">
          <h3>Revisiones operativas</h3>
          {data.reviews.map((r: Row) => (
            <div className="review-item" key={r.id}>
              <strong>
                {r.passed ? "Sin desviaciones" : "Con desviaciones"}
              </strong>
              <p>{r.evidence}</p>
              <small>{formatDate(r.created_at)}</small>
            </div>
          ))}
        </section>
      )}
      <section className="detail-section">
        <h3>Historial de la actividad</h3>
        <EventList events={data.events} meta={meta} />
      </section>
    </>
  );
}
