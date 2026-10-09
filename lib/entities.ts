// R6 — Tipos de dominio concretos para las 13 tablas del esquema
// (drizzle/0000_peaceful_skreet.sql y migraciones posteriores).
//
// Antes de este refactor, cada entidad viajaba por lib/ y app/ como
// `Row` (= Record<string, any>): el compilador no distinguía un Ticket
// de un Activo ni detectaba un campo mal escrito o ausente. Estos tipos
// documentan la forma real de cada fila tal como la define el esquema SQL
// (incluyendo las columnas NULL-ables y los CHECK de estado/rol), y le dan
// a HandlerContext (lib/types.ts) un contrato fuerte para entity/all/one/
// create/update.
//
// Deliberadamente NO reemplazan Row en la capa de presentación (app/):
// ahí los datos llegan ya serializados por fetch() desde /api/*, que es un
// límite real no tipado por naturaleza (JSON por la red). Imponer un tipo
// de dominio ahí sería una afirmación falsa de seguridad de tipos que el
// compilador no puede verificar. Row sigue usándose también para el
// resultado de consultas SQL agregadas (COUNT, SUM, JOIN ad-hoc) que no
// corresponden a una sola tabla.

export interface Ticket {
  id: string;
  demo: number;
  version: number;
  code: string;
  asset_id: string;
  requester_id: string;
  assignee_id: string | null;
  title: string;
  description: string;
  category: string;
  priority: "critica" | "alta" | "media" | "baja";
  status:
    | "abierto"
    | "asignado"
    | "en_atencion"
    | "en_espera"
    | "resuelto"
    | "cerrado";
  diagnosis: string;
  solution: string;
  created_at: string;
  updated_at: string;
  due_at: string;
  first_response_at: string | null;
  resolved_at: string | null;
  closed_at: string | null;
}

export interface Asset {
  id: string;
  demo: number;
  version: number;
  code: string;
  name: string;
  serial: string;
  model: string;
  location: string;
  status: "operativo" | "mantenimiento" | "fuera_servicio" | "retirado";
  notes: string;
  created_at: string;
}

export interface Activity {
  id: string;
  demo: number;
  version: number;
  ticket_id: string | null;
  asset_id: string;
  owner_id: string | null;
  title: string;
  description: string;
  status: "pendiente" | "planificada" | "en_curso" | "completada" | "cancelada";
  created_at: string;
  planned_at: string | null;
  planned_start: string | null;
  planned_end: string | null;
  started_at: string | null;
  completed_at: string | null;
  evidence: string;
}

export interface Control {
  id: string;
  demo: number;
  version: number;
  activity_id: string;
  title: string;
  finding: string;
  action: string;
  owner_id: string;
  due_at: string;
  status: "abierta" | "en_curso" | "cerrada";
  evidence: string;
  created_at: string;
  completed_at: string | null;
}

export interface Goal {
  id: string;
  demo: number;
  version: number;
  title: string;
  unit: string;
  target: number;
  actual: number | null;
  direction: "mayor" | "menor";
  start_at: string;
  end_at: string;
  evidence: string;
  evaluated_at: string | null;
  created_at: string;
}

export interface Measurement {
  id: string;
  period_id: string;
  indicator: string;
  week_start: string;
  numerator: number | null;
  denominator: number | null;
  value: number | null;
  sample_size: number;
  source: string;
  evidence: string;
  actor_id: string;
  created_at: string;
}

export interface Member {
  id: string;
  demo: number;
  version: number;
  email: string;
  name: string;
  role: "admin" | "supervisor" | "tecnico" | "solicitante" | "auditor";
  active: 0 | 1;
  subject: string | null;
}

export interface StudyPeriod {
  id: string;
  demo: number;
  version: number;
  label: string;
  phase: "pretest" | "postest";
  start_at: string;
  end_at: string;
  notes: string;
  created_at: string;
}

export interface ResourceRequirement {
  id: string;
  demo: number;
  version: number;
  activity_id: string;
  name: string;
  quantity: number;
  unit: string;
  required_by: string;
}

export interface ResourceAllocation {
  id: string;
  requirement_id: string;
  quantity: number;
  allocated_at: string;
  actor_id: string;
  note: string;
}

export interface Review {
  id: string;
  demo: number;
  ticket_id: string | null;
  activity_id: string | null;
  kind: "categoria" | "monitoreo" | "operativa";
  passed: 0 | 1;
  evidence: string;
  actor_id: string;
  created_at: string;
}

export interface Event {
  id: number;
  demo: number;
  entity: string;
  entity_id: string;
  ticket_id: string | null;
  actor_id: string;
  action: string;
  detail: string;
  created_at: string;
}

export interface Setting {
  key: string;
  value: string;
}

// Tabla -> tipo de dominio, usado por Service para tipar entity()/all()/
// one() cuando el nombre de tabla es un literal conocido (ver lib/types.ts).
export interface EntityByTable {
  tickets: Ticket;
  assets: Asset;
  activities: Activity;
  controls: Control;
  goals: Goal;
  measurements: Measurement;
  members: Member;
  study_periods: StudyPeriod;
  resource_requirements: ResourceRequirement;
  resource_allocations: ResourceAllocation;
  reviews: Review;
  events: Event;
  settings: Setting;
}
