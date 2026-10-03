// Extraído de lib/service.ts (R1): este manejador conserva exactamente el
// comportamiento original del caso "asset.save" dentro de Service.execute.
// Ningún criterio de autorización, validación ni persistencia fue modificado.
import { z } from "zod";
import { now, uuid } from "../clock";
import { ensure, isManager } from "../domain";
import type { HandlerContext, Row } from "../types";
import { id, optId, short, memo, date, version } from "./shared-schemas";

export async function assetSave(
  svc: HandlerContext,
  input: unknown,
): Promise<Row> {
  const a = svc.actor,
    d = svc.demo,
    t = now();
  svc.manage();
  const p = z
    .object({
      id: optId,
      version: version.optional(),
      code: short,
      serial: short,
      name: short,
      model: short,
      location: short,
      status: z.enum([
        "operativo",
        "mantenimiento",
        "fuera_servicio",
        "retirado",
      ]),
      notes: z.string().trim().max(3000).default(""),
    })
    .parse(input);
  const { id: aid, version: v, ...data } = p;
  if (aid) {
    const old = await svc.entity("assets", aid);
    ensure(v, "Falta versión del activo");
    await svc.update(
      "assets",
      old,
      v,
      data,
      "activo_actualizado",
      JSON.stringify({ antes: old, despues: data }),
    );
    return { id: aid };
  }
  const aid2 = uuid();
  await svc.create(
    "assets",
    { id: aid2, demo: d, ...data, created_at: t },
    "activo_creado",
    p.code,
  );
  return { id: aid2 };
}
