// Validadores Zod compartidos por los manejadores, extraídos de lib/service.ts (R1).
// Se mantienen sin cambios: mismos límites y mismas reglas que en el código original.
import { z } from "zod";
export const id = z.string().min(1).max(100),
  short = z.string().trim().min(3).max(160),
  memo = z.string().trim().min(5).max(5000),
  date = z
    .string()
    .datetime({ offset: true })
    .transform((v) => new Date(v).toISOString()),
  version = z.number().int().positive();
export const optId = z
  .union([id, z.literal("")])
  .optional()
  .transform((v) => v || null);
