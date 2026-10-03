// Registro de especificaciones de formulario (R4): sustituye el switch de
// 20 casos que vivía dentro de makeForm. Agregar un formulario nuevo
// significa añadir una entrada aquí, no modificar makeForm — Principio
// Abierto/Cerrado, igual que el registro de manejadores de R1
// (lib/handlers/registry.ts).
import type { FormSpec, Row } from "../ui";
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
import {
  periodCreate,
  measurementCapture,
  measurementCreate,
} from "./investigation";
import { memberPassword, selfPassword, memberSave } from "./member";

export type FormBuilder = (row: Row, meta: Row, extra: Row) => FormSpec;

export const builders: Record<string, FormBuilder> = {
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
  "measurement.capture": measurementCapture,
  "measurement.create": measurementCreate,
  "member.password": memberPassword,
  "self.password": selfPassword,
  "member.save": memberSave,
};
