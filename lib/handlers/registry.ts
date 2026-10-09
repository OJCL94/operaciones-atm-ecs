// Registro de manejadores (R1): sustituye el switch de 17 casos que vivía
// dentro de Service.execute. Agregar una acción nueva significa añadir una
// entrada aquí, no modificar execute() — Principio Abierto/Cerrado.
import type { HandlerContext, ActionResult } from "../types";
import { assetSave } from "./asset";
import {
  ticketCreate,
  ticketAssign,
  ticketTransition,
  ticketNote,
  reviewCreate,
} from "./ticket";
import { activitySave, activityTransition } from "./activity";
import { resourceRequire, resourceAllocate } from "./resource";
import {
  controlCreate,
  controlTransition,
  goalCreate,
  goalEvaluate,
} from "./control";
import { periodCreate, measurementCreate } from "./investigation";
import { memberSave } from "./member";

export type Handler = (svc: HandlerContext, input: unknown) => Promise<ActionResult>;

export const handlers: Record<string, Handler> = {
  "asset.save": assetSave,
  "ticket.create": ticketCreate,
  "ticket.assign": ticketAssign,
  "ticket.transition": ticketTransition,
  "ticket.note": ticketNote,
  "review.create": reviewCreate,
  "activity.save": activitySave,
  "activity.transition": activityTransition,
  "resource.require": resourceRequire,
  "resource.allocate": resourceAllocate,
  "control.create": controlCreate,
  "control.transition": controlTransition,
  "goal.create": goalCreate,
  "goal.evaluate": goalEvaluate,
  "period.create": periodCreate,
  "measurement.create": measurementCreate,
  "member.save": memberSave,
};
