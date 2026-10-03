// Extensión de R5: traduce cualquier excepción (DomainError, ZodError o
// cualquier otra) al par {status, message} que el manejador escribe en la
// respuesta. Mismo criterio exacto que tenía el bloque catch original.
import { DomainError } from "../lib/domain";
import { ZodError } from "zod";

export function describeError(e: unknown) {
  const status =
    e instanceof DomainError ? e.status : e instanceof ZodError ? 422 : 500;
  const message =
    e instanceof DomainError
      ? e.message
      : e instanceof ZodError
        ? e.issues[0]?.message
        : "No se pudo procesar la solicitud.";
  return { status, message };
}
