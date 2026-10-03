// R2 (DRY): extrae el patrón que, tras R1, quedó repetido al inicio de las
// 17 funciones de lib/handlers/*.ts: leer el actor y el modo demo del
// contexto, y tomar la marca de tiempo de la operación. Antes de R1 esto se
// calculaba una sola vez por llamada a Service.execute(); al dividir el
// método en manejadores independientes, cada uno pasó a repetirlo.
//
// jscpd lo detectó como la causa principal del aumento de duplicación
// textual medido después de R1 (0,26 % -> 1,17 %; ver el informe, 5.1.2).
import { now } from "../clock";
import type { HandlerContext } from "../types";

export function actorContext(svc: HandlerContext) {
  return { a: svc.actor, d: svc.demo, t: now() };
}
