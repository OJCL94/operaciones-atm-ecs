import { passwordAction, context } from "./auth";
import { DomainError, ensure } from "../lib/domain";
import { seed } from "../lib/seed";
import { captureWeek } from "../lib/snapshot";
import { ZodError } from "zod";
export async function POST(request: Request) {
  const requestId = crypto.randomUUID();
  try {
    ensure(
      request.headers.get("content-type")?.startsWith("application/json"),
      "Se requiere JSON.",
      415,
    );
    const origin = request.headers.get("origin");
    ensure(
      origin === new URL(request.url).origin,
      "Origen de solicitud no permitido.",
      403,
    );
    ensure(
      Number(request.headers.get("content-length") ?? 0) <= 65536,
      "Solicitud demasiado grande.",
      413,
    );
    const text = await request.text();
    ensure(text.length <= 65536, "Solicitud demasiado grande.", 413);
    let body;
    try {
      body = JSON.parse(text);
    } catch {
      throw new DomainError("JSON inválido.");
    }
    const { service: s } = await context(request);
    ensure(
      body && typeof body === "object" && !Array.isArray(body),
      "El cuerpo debe ser un objeto JSON.",
    );
    ensure(typeof body.kind === "string", "Falta la operación.");
    if (body.kind === "demo.seed") {
      await seed(s);
      return Response.json({ ok: true });
    }
    if (body.kind === "member.password" || body.kind === "self.password")
      return Response.json(
        await passwordAction(request, body.data, body.kind === "self.password"),
      );
    const result =
      body.kind === "measurement.capture"
        ? await captureWeek(s, body.data)
        : await s.execute(body.kind, body.data);
    return Response.json(result, { headers: { "Cache-Control": "no-store" } });
  } catch (e) {
    if (e instanceof DomainError)
      return Response.json(
        { error: e.message, requestId },
        { status: e.status },
      );
    if (e instanceof ZodError)
      return Response.json(
        {
          error: "Revisa los campos del formulario.",
          fields: e.issues.map((i) => ({
            field: i.path.join("."),
            message: i.message,
          })),
          requestId,
        },
        { status: 422 },
      );
    const msg = e instanceof Error ? e.message : "";
    if (msg.includes("regla:"))
      return Response.json(
        {
          error: msg
            .slice(msg.indexOf("regla:") + 6)
            .split(": SQLITE")[0]
            .trim(),
          requestId,
        },
        { status: 409 },
      );
    if (/UNIQUE constraint/i.test(msg))
      return Response.json(
        {
          error:
            "Ya existe un registro con ese código, correo o combinación de período, semana e indicador.",
          requestId,
        },
        { status: 409 },
      );
    console.error(JSON.stringify({ requestId, action: "write", error: msg }));
    return Response.json(
      {
        error: "No se pudo guardar. Los datos del formulario se conservaron.",
        requestId,
      },
      { status: 500 },
    );
  }
}
