// R7 — Puerto de reloj e identificadores.
//
// Hasta R6, `now()` y `uuid()` eran funciones concretas importadas
// directamente por lib/service.ts y por los 7 manejadores de
// lib/handlers/*.ts (11 sitios de uso de uuid() + 4 de now()): una
// dependencia oculta de Date/crypto en medio de la capa de dominio, que
// SOLID (DIP) pide invertir. Nada en las reglas de negocio necesita saber
// *cómo* se genera una marca de tiempo o un identificador, solo que puede
// pedir uno.
//
// Clock e IdGenerator son esos dos puertos. HandlerContext (lib/types.ts)
// expone `clock` e `ids`; Service los recibe por constructor (ver
// lib/service.ts) con los adaptadores del sistema real como valor por
// defecto, de modo que ningún código existente tiene que cambiar su forma
// de invocar `new Service(db, actor, demo)`. Una prueba puede inyectar un
// reloj o generador de ids determinista sin tocar el reloj del sistema
// (ver tests/service.cjs, "Clock/IdGenerator inyectados").
export interface Clock {
  now(): string;
}

export interface IdGenerator {
  uuid(): string;
}

export const systemClock: Clock = {
  now: () => new Date().toISOString(),
};

export const systemIds: IdGenerator = {
  uuid: () => crypto.randomUUID(),
};

// Compatibilidad: código que todavía no pasa por el puerto (cálculos de
// duración con Date.now(), semillas de demostración) sigue pudiendo
// importar las funciones sueltas. No se usan desde la capa de dominio
// (lib/service.ts, lib/handlers/*) a partir de R7.
export const now = () => systemClock.now();
export const uuid = () => systemIds.uuid();
