export const roles = {
  admin: "Administrador",
  supervisor: "Supervisor",
  tecnico: "Técnico",
  solicitante: "Solicitante",
  auditor: "Investigador / auditor",
};
export const states: Record<string, string> = {
  abierto: "Abierto",
  asignado: "Asignado",
  en_atencion: "En atención",
  en_espera: "En espera",
  resuelto: "Resuelto",
  cerrado: "Cerrado",
  pendiente: "Pendiente",
  planificada: "Planificada",
  en_curso: "En curso",
  completada: "Completada",
  cancelada: "Cancelada",
  operativo: "Operativo",
  mantenimiento: "En mantenimiento",
  fuera_servicio: "Fuera de servicio",
  retirado: "Retirado",
  abierta: "Abierta",
  cerrada: "Cerrada",
};
export const priorities = {
  critica: "Crítica",
  alta: "Alta",
  media: "Media",
  baja: "Baja",
};
export const categories = [
  "Hardware",
  "Software",
  "Conectividad",
  "Mantenimiento",
  "Instalación",
];
export const deadlines: Record<string, number> = {
  critica: 4,
  alta: 8,
  media: 24,
  baja: 72,
};
export const transitionMap: Record<string, string[]> = {
  abierto: ["asignado"],
  asignado: ["en_atencion"],
  en_atencion: ["en_espera", "resuelto"],
  en_espera: ["en_atencion"],
  resuelto: ["cerrado", "en_atencion"],
  cerrado: ["en_atencion"],
};
export type Actor = {
  id: string;
  name: string;
  role: keyof typeof roles;
  email: string;
  demo: number;
  actualAdmin?: boolean;
};
export const isManager = (a: Actor) =>
  a.role === "admin" || a.role === "supervisor";
export const indicatorDefinitions = [
  [
    "registro",
    "Tasa de tickets registrados",
    "tickets/semana",
    "Tickets creados / (días del período / 7).",
  ],
  [
    "categoria",
    "Categorización correcta",
    "%",
    "Última revisión correcta / tickets revisados. La cobertura se informa por separado.",
  ],
  [
    "actualizacion",
    "Tickets actualizados",
    "%",
    "Tickets con seguimiento, respuesta o cambio de estado / tickets creados en el período.",
  ],
  [
    "monitoreo",
    "Tickets monitoreados",
    "%",
    "Tickets con revisión explícita de monitoreo / tickets creados en el período.",
  ],
  [
    "respuesta",
    "Tiempo de primera respuesta",
    "horas",
    "Promedio entre creación y primera respuesta técnica documentada; se excluyen pendientes.",
  ],
  [
    "resolucion",
    "Tiempo de resolución",
    "horas",
    "Promedio entre creación y última resolución de tickets resueltos o cerrados al corte; se excluyen pendientes.",
  ],
  [
    "planificacion",
    "Actividades planificadas",
    "%",
    "Actividades con planificación registrada / actividades requeridas creadas en el período (excluye canceladas).",
  ],
  [
    "recursos",
    "Recursos asignados a tiempo",
    "%",
    "Líneas de recursos cubiertas antes de su fecha requerida / líneas con vencimiento en el período.",
  ],
  [
    "cronograma",
    "Cumplimiento de cronograma",
    "%",
    "Actividades completadas dentro del plazo / actividades con plazo vencido en el período; incluye pendientes vencidas.",
  ],
  [
    "ejecucion",
    "Tiempo de ejecución",
    "horas",
    "Promedio entre inicio real y finalización de actividades completadas en el período.",
  ],
  [
    "tareas",
    "Tareas ejecutadas",
    "%",
    "Actividades completadas / actividades requeridas creadas en el período (excluye canceladas).",
  ],
  [
    "metas",
    "Metas operativas cumplidas",
    "%",
    "Metas evaluadas que alcanzan su umbral / metas vencidas en el período; incluye no evaluadas.",
  ],
  [
    "desviaciones",
    "Actividades con desviaciones",
    "%",
    "Actividades con hallazgo de control / actividades revisadas explícitamente en el período. Definición propuesta; no es sensibilidad de detección.",
  ],
  [
    "correctivas",
    "Acciones correctivas oportunas",
    "%",
    "Acciones cerradas con evidencia antes del plazo / acciones con plazo vencido en el período; incluye pendientes.",
  ],
] as const;
export class DomainError extends Error {
  constructor(
    message: string,
    public status = 400,
  ) {
    super(message);
  }
}
export function ensure(
  condition: unknown,
  message: string,
  status = 400,
): asserts condition {
  if (!condition) throw new DomainError(message, status);
}
export function csv(rows: Record<string, unknown>[]) {
  const keys = Object.keys(rows[0] ?? {});
  const cell = (v: unknown) => {
    let s = v == null ? "" : String(v);
    if (/^[\s]*[=+@-]/.test(s)) s = "'" + s;
    return '"' + s.replaceAll('"', '""') + '"';
  };
  return (
    "\uFEFF" +
    [
      keys.map(cell).join(","),
      ...rows.map((r) => keys.map((k) => cell(r[k])).join(",")),
    ].join("\r\n")
  );
}
