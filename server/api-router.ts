// Extraído de server/index.ts (R5): sustituye la cadena if/else-if de 5
// ramas que decidía qué ruta de /api/ atender. Agregar una ruta nueva
// significa añadir una fila a `routes`, no tocar el despachador — mismo
// patrón de tabla/registro que lib/handlers/registry.ts (R1) y
// app/forms/registry.ts (R4).
import { config } from "./config";
import { raw } from "./database";
import { login, logout, sessionMember } from "./auth";
import { GET } from "./data";
import { POST } from "./actions";
import { DomainError, ensure } from "../lib/domain";

export type ApiContext = {
  request: Request;
  rawBody: string;
  remoteAddress: string;
};
type ApiHandler = (ctx: ApiContext) => Promise<Response>;

async function authStatus({ request }: ApiContext): Promise<Response> {
  let actor = null;
  try {
    actor = sessionMember(request);
  } catch (e) {
    if (!(e instanceof DomainError)) throw e;
  }
  return Response.json({
    authenticated: !!actor,
    demoOnly: config.demo,
    setupNeeded: !raw.prepare("SELECT member_id FROM credentials").get(),
  });
}

async function authLogin({
  rawBody,
  remoteAddress,
}: ApiContext): Promise<Response> {
  let input;
  try {
    input = JSON.parse(rawBody);
  } catch {
    throw new DomainError("JSON inválido.");
  }
  const setCookie = await login(input, remoteAddress);
  return Response.json({ ok: true }, { headers: { "Set-Cookie": setCookie } });
}

async function authLogout({ request }: ApiContext): Promise<Response> {
  return Response.json(
    { ok: true },
    { headers: { "Set-Cookie": logout(request) } },
  );
}

const routes: { method: string; path: string; handler: ApiHandler }[] = [
  { method: "GET", path: "/api/auth/status", handler: authStatus },
  { method: "POST", path: "/api/auth/login", handler: authLogin },
  { method: "POST", path: "/api/auth/logout", handler: authLogout },
  { method: "GET", path: "/api/data", handler: ({ request }) => GET(request) },
  {
    method: "POST",
    path: "/api/actions",
    handler: ({ request }) => POST(request),
  },
];

export async function routeApi(ctx: ApiContext): Promise<Response> {
  const url = new URL(ctx.request.url);
  const method = ctx.request.method;
  const route = routes.find(
    (r) => r.method === method && r.path === url.pathname,
  );
  ensure(route, "Ruta no encontrada.", 404);
  return route.handler(ctx);
}
