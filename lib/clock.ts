// Puerto de reloj e identificadores, extraído de lib/service.ts.
// Hoy son funciones concretas; en R7 (Semana 3) se convertirán en un puerto
// inyectable (Clock, IdGenerator) para poder sustituirlas en las pruebas.
export const now = () => new Date().toISOString();
export const uuid = () => crypto.randomUUID();
