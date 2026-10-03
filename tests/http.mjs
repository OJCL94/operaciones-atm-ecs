import test from "node:test";
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { once } from "node:events";
import { createServer } from "node:net";
import { DatabaseSync } from "node:sqlite";
import { createHash, randomBytes, scryptSync } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

// Todas las identidades y bases de esta suite son sintéticas y desechables.
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const outputRoot = path.join(root, "tests", "output");
const fixtureRoot = path.join(outputRoot, `http-${Date.now()}-${process.pid}`);
const password = "PruebaHTTP2026!";
fs.mkdirSync(fixtureRoot, { recursive: true });

async function freePort() {
  const listener = createServer();
  listener.listen(0, "127.0.0.1");
  await once(listener, "listening");
  const port = listener.address().port;
  await new Promise((resolve) => listener.close(resolve));
  return port;
}

function prepareProduction(directory) {
  fs.mkdirSync(directory, { recursive: true });
  const db = new DatabaseSync(path.join(directory, "nexo.sqlite"));
  db.exec(
    "PRAGMA foreign_keys=ON; CREATE TABLE schema_migrations(name TEXT PRIMARY KEY,checksum TEXT NOT NULL,applied_at TEXT NOT NULL)",
  );
  for (const name of fs
    .readdirSync(path.join(root, "drizzle"))
    .filter((name) => /^\d+.*\.sql$/.test(name))
    .sort()) {
    const sql = fs.readFileSync(path.join(root, "drizzle", name), "utf8");
    db.exec(sql);
    db.prepare("INSERT INTO schema_migrations VALUES(?,?,?)").run(
      name,
      createHash("sha256").update(sql).digest("hex"),
      new Date().toISOString(),
    );
  }
  const salt = randomBytes(16);
  const key = scryptSync(password, salt, 64, {
    N: 65536,
    r: 8,
    p: 2,
    maxmem: 128 * 1024 * 1024,
  });
  const encoded = `scrypt$65536$8$2$${salt.toString("hex")}$${key.toString("hex")}`;
  db.prepare(
    "INSERT INTO members(id,demo,email,name,role,active) VALUES('owner',0,'owner@test.invalid','Administrador de prueba','admin',1)",
  ).run();
  db.prepare("INSERT INTO credentials VALUES('owner',?,?)").run(
    encoded,
    new Date().toISOString(),
  );
  db.close();
}

async function startServer(name, demo = true, secure = false) {
  assert.ok(
    fs.existsSync(path.join(root, "build", "server.mjs")),
    "Ejecuta npm run build antes de las pruebas HTTP.",
  );
  const directory = path.join(fixtureRoot, name);
  if (!demo) prepareProduction(directory);
  const port = await freePort();
  const origin = `http://127.0.0.1:${port}`;
  const child = spawn(
    process.execPath,
    ["build/server.mjs", ...(demo ? ["--demo"] : [])],
    {
      cwd: root,
      windowsHide: true,
      env: {
        ...process.env,
        HOST: "127.0.0.1",
        PORT: String(port),
        APP_ORIGIN: origin,
        DATA_DIR: directory,
        DATABASE_PATH: path.join(directory, "nexo.sqlite"),
        COOKIE_SECURE: String(secure),
      },
      stdio: ["ignore", "pipe", "pipe"],
    },
  );
  let logs = "";
  const record = (chunk) => {
    logs = (logs + chunk).slice(-6000);
  };
  child.stdout.on("data", record);
  child.stderr.on("data", record);
  let ready = false;
  for (let attempt = 0; attempt < 160; attempt++) {
    if (child.exitCode !== null)
      throw new Error(`El servidor terminó antes de iniciar: ${logs}`);
    try {
      const response = await fetch(origin + "/api/auth/status");
      if (response.ok) {
        ready = true;
        break;
      }
    } catch {
      /* Espera de arranque acotada. */
    }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  if (!ready) {
    child.kill();
    throw new Error(`El servidor no inició: ${logs}`);
  }
  const request = async (route, options = {}) => {
    const method =
      options.method ?? (options.body !== undefined ? "POST" : "GET");
    const headers = {
      ...(method === "POST"
        ? { Origin: origin, "Content-Type": "application/json" }
        : {}),
      ...(options.cookie ? { Cookie: options.cookie } : {}),
      ...options.headers,
    };
    const response = await fetch(origin + route, {
      method,
      headers,
      ...(options.body === undefined
        ? {}
        : {
            body:
              typeof options.body === "string"
                ? options.body
                : JSON.stringify(options.body),
          }),
    });
    const text = await response.text();
    let data;
    try {
      data = JSON.parse(text);
    } catch {
      data = null;
    }
    return { status: response.status, headers: response.headers, data, text };
  };
  const auth = async (email, secret = password) => {
    const response = await request("/api/auth/login", {
      body: { email, password: secret },
    });
    assert.equal(
      response.status,
      200,
      "El inicio de sesión de la cuenta de prueba debe ser aceptado.",
    );
    const cookie = response.headers.get("set-cookie")?.split(";")[0];
    assert.ok(cookie, "La respuesta debe contener la cookie de sesión.");
    return { cookie, response };
  };
  const stop = async () => {
    if (child.exitCode !== null) return;
    const exited = once(child, "exit");
    child.kill("SIGTERM");
    await Promise.race([
      exited,
      new Promise((resolve) => setTimeout(resolve, 6000)),
    ]);
    if (child.exitCode === null) {
      child.kill("SIGKILL");
      await exited;
    }
  };
  return { request, auth, stop, directory, origin };
}

test(
  "HTTP: autenticación, autorización, persistencia y recorridos reales",
  { timeout: 120000 },
  async (t) => {
    const demo = await startServer("demonstration");
    const operation = await startServer("operation", false, true);
    t.after(async () => {
      await Promise.all([demo.stop(), operation.stop()]);
      const resolved = path.resolve(fixtureRoot);
      assert.ok(
        resolved.startsWith(path.resolve(outputRoot) + path.sep),
        "La limpieza solo puede alcanzar el directorio temporal de esta suite.",
      );
      fs.rmSync(resolved, { recursive: true, force: true });
    });
    let demoCookie,
      ownerCookie,
      technicianCookie,
      requesterCookie,
      auditorCookie;
    let technician, requester, auditor, outsider, asset, ticket;
    const demoAction = (kind, data = {}, headers = {}) =>
      demo.request("/api/actions?demo=1", {
        cookie: demoCookie,
        body: { kind, data },
        headers,
      });
    const action = (kind, data = {}, cookie = ownerCookie, headers = {}) =>
      operation.request("/api/actions?demo=0", {
        cookie,
        body: { kind, data },
        headers,
      });
    const data = (module, cookie = ownerCookie, query = "") =>
      operation.request(`/api/data?demo=0&module=${module}${query}`, {
        cookie,
      });

    await t.test(
      "El estado público no expone la identidad; los datos requieren sesión",
      async () => {
        const status = await demo.request("/api/auth/status");
        assert.deepEqual(status.data, {
          authenticated: false,
          demoOnly: true,
          setupNeeded: false,
        });
        assert.equal((await demo.request("/api/data?module=meta")).status, 401);
        assert.equal(
          (
            await demo.request("/api/data?module=tickets", {
              headers: { "X-Role": "admin", "X-User-Id": "owner" },
            })
          ).status,
          401,
        );
      },
    );

    await t.test(
      "Credenciales inválidas y cuenta inexistente tienen el mismo rechazo",
      async () => {
        const invalid = await demo.request("/api/auth/login", {
          body: { email: "admin@demo.local", password: "incorrecta" },
        });
        const missing = await demo.request("/api/auth/login", {
          body: { email: "missing@test.invalid", password },
        });
        assert.equal(invalid.status, 401);
        assert.equal(missing.status, 401);
        assert.equal(invalid.data.error, missing.data.error);
        assert.equal(invalid.headers.get("set-cookie"), null);
      },
    );

    await t.test(
      "La sesión válida usa cookie HttpOnly, SameSite y vencimiento limitado",
      async () => {
        const login = await demo.auth("admin@demo.local", "NexoDemo2026!");
        demoCookie = login.cookie;
        const flags = login.response.headers.get("set-cookie");
        assert.match(flags, /; HttpOnly/);
        assert.match(flags, /; SameSite=Strict/);
        assert.match(flags, /; Max-Age=28800/);
        assert.match(flags, /; Path=\//);
        assert.equal(
          (await demo.request("/api/auth/status", { cookie: demoCookie })).data
            .authenticated,
          true,
        );
        ownerCookie = (await operation.auth("owner@test.invalid")).cookie;
        assert.match(
          (await operation.auth("owner@test.invalid")).response.headers.get(
            "set-cookie",
          ),
          /; Secure/,
        );
      },
    );

    await t.test(
      "Las respuestas privadas evitan caché y aplican cabeceras de seguridad",
      async () => {
        const response = await demo.request("/api/data?module=meta", {
          cookie: demoCookie,
        });
        assert.equal(response.status, 200);
        assert.equal(response.headers.get("cache-control"), "no-store");
        assert.equal(response.headers.get("x-content-type-options"), "nosniff");
        assert.equal(response.headers.get("x-frame-options"), "DENY");
        assert.match(
          response.headers.get("content-security-policy"),
          /frame-ancestors 'none'/,
        );
        assert.equal(response.data.actor.password_hash, undefined);
        assert.equal(response.data.actor.token_hash, undefined);
        assert.equal(
          (await operation.request("/api/auth/status")).headers.get(
            "strict-transport-security",
          ),
          "max-age=31536000",
        );
      },
    );

    await t.test(
      "Demostración rechaza consultas y escrituras sobre datos reales",
      async () => {
        assert.equal(
          (
            await demo.request("/api/data?demo=0&module=meta", {
              cookie: demoCookie,
            })
          ).status,
          403,
        );
        assert.equal(
          (
            await demo.request("/api/actions?demo=0", {
              cookie: demoCookie,
              body: { kind: "demo.seed", data: {} },
            })
          ).status,
          403,
        );
        assert.equal(
          (
            await demoAction("self.password", {
              current_password: "NexoDemo2026!",
              password,
            })
          ).status,
          403,
        );
      },
    );

    await t.test(
      "Origen ajeno o ausente, JSON incorrecto y cuerpo excesivo se rechazan",
      async () => {
        assert.equal(
          (
            await demoAction(
              "demo.seed",
              {},
              { Origin: "https://ajeno.invalid" },
            )
          ).status,
          403,
        );
        assert.equal(
          (await demoAction("demo.seed", {}, { Origin: "" })).status,
          403,
        );
        assert.equal(
          (
            await demo.request("/api/actions", {
              cookie: demoCookie,
              body: {},
              headers: { "Content-Type": "text/plain" },
            })
          ).status,
          415,
        );
        assert.equal(
          (
            await demo.request("/api/actions", {
              cookie: demoCookie,
              body: "{",
            })
          ).status,
          400,
        );
        assert.equal(
          (
            await demo.request("/api/actions", {
              cookie: demoCookie,
              body: JSON.stringify({ x: "a".repeat(66000) }),
            })
          ).status,
          413,
        );
      },
    );

    await t.test(
      "La carga de ejemplos es idempotente y ofrece 14 indicadores calculados",
      async () => {
        assert.equal((await demoAction("demo.seed")).status, 200);
        const first = await demo.request("/api/data?module=tickets", {
          cookie: demoCookie,
        });
        assert.equal(first.data.total, 16);
        assert.equal((await demoAction("demo.seed")).status, 200);
        assert.equal(
          (
            await demo.request("/api/data?module=tickets", {
              cookie: demoCookie,
            })
          ).data.total,
          first.data.total,
        );
        const reports = await demo.request("/api/data?module=reports", {
          cookie: demoCookie,
        });
        assert.equal(reports.status, 200);
        assert.equal(reports.data.metrics.length, 14);
      },
    );

    await t.test(
      "La simulación aplica los permisos del rol y no permite administrar credenciales",
      async () => {
        const meta = await demo.request("/api/data?module=meta", {
          cookie: demoCookie,
          headers: { "X-Demo-Role": "tecnico" },
        });
        assert.equal(meta.data.actor.role, "tecnico");
        assert.equal(meta.data.actor.actualAdmin, false);
        assert.equal(
          (
            await demo.request("/api/data?module=members", {
              cookie: demoCookie,
              headers: { "X-Demo-Role": "tecnico" },
            })
          ).status,
          403,
        );
        assert.equal(
          (await demoAction("demo.seed", {}, { "X-Demo-Role": "auditor" }))
            .status,
          403,
        );
        assert.equal(
          (
            await demo.request("/api/data?module=meta", {
              cookie: demoCookie,
              headers: { "X-Demo-Role": "inexistente" },
            })
          ).status,
          400,
        );
      },
    );

    await t.test(
      "La consulta inválida es error de cliente y las rutas desconocidas no filtran errores internos",
      async () => {
        const invalid = await demo.request("/api/data?module=ticket", {
          cookie: demoCookie,
        });
        assert.ok(
          [400, 422].includes(invalid.status),
          `Se esperaba 400/422 para id ausente, llegó ${invalid.status}.`,
        );
        assert.equal(
          (
            await demo.request("/api/data?module=desconocido", {
              cookie: demoCookie,
            })
          ).status,
          404,
        );
        assert.equal(
          (await demo.request("/api/desconocida", { cookie: demoCookie }))
            .status,
          404,
        );
        assert.equal(
          (await demo.request("/api/auth/status", { method: "DELETE" })).status,
          405,
        );
      },
    );

    await t.test(
      "El administrador crea accesos y establece contraseñas locales",
      async () => {
        for (const [role, name] of [
          ["tecnico", "Técnico"],
          ["solicitante", "Solicitante"],
          ["auditor", "Auditor"],
          ["solicitante", "Otro solicitante"],
        ]) {
          const email =
            name === "Otro solicitante"
              ? "other@test.invalid"
              : role + "@test.invalid";
          const created = await action("member.save", {
            name: name + " de prueba",
            email,
            role,
            active: true,
          });
          assert.equal(created.status, 200);
          const record = {
            id: created.data.id,
            email,
            name: name + " de prueba",
            role,
            active: true,
            version: 1,
          };
          assert.equal(
            (await action("member.password", { id: record.id, password }))
              .status,
            200,
          );
          if (role === "tecnico") technician = record;
          else if (role === "auditor") auditor = record;
          else if (name === "Otro solicitante") outsider = record;
          else requester = record;
        }
        technicianCookie = (await operation.auth(technician.email)).cookie;
        requesterCookie = (await operation.auth(requester.email)).cookie;
        auditorCookie = (await operation.auth(auditor.email)).cookie;
        assert.equal(
          (
            await action("member.password", {
              id: technician.id,
              password: "corta",
            })
          ).status,
          422,
        );
      },
    );

    await t.test(
      "Las cabeceras no permiten elevar permisos de una cuenta real",
      async () => {
        assert.equal((await data("members", technicianCookie)).status, 403);
        const regular = await operation.request(
          "/api/data?demo=0&module=meta",
          {
            cookie: technicianCookie,
            headers: { "X-Demo-Role": "admin", "X-Role": "admin" },
          },
        );
        assert.equal(regular.data.actor.role, "tecnico");
        assert.equal(
          (
            await operation.request("/api/data?demo=1&module=meta", {
              cookie: technicianCookie,
              headers: { "X-Demo-Role": "supervisor" },
            })
          ).status,
          403,
        );
        assert.equal(
          (
            await operation.request("/api/data?demo=0&module=meta", {
              cookie: ownerCookie,
              headers: { "X-Demo-Role": "supervisor" },
            })
          ).status,
          403,
        );
        assert.equal(
          (
            await action(
              "member.password",
              { id: requester.id, password },
              technicianCookie,
            )
          ).status,
          403,
        );
      },
    );

    await t.test(
      "Activos: permisos, validación, unicidad y persistencia",
      async () => {
        const payload = {
          code: "ATM-TEST-001",
          serial: "HTTP-001",
          name: "Activo de prueba",
          model: "Modelo sintético",
          location: "Laboratorio",
          status: "operativo",
          notes: "Solo pruebas automatizadas.",
        };
        assert.equal(
          (await action("asset.save", payload, requesterCookie)).status,
          403,
        );
        assert.equal(
          (await action("asset.save", { ...payload, code: "" })).status,
          422,
        );
        const response = await action("asset.save", payload);
        assert.equal(response.status, 200);
        asset = response.data.id;
        assert.equal((await action("asset.save", payload)).status, 409);
        const read = await data("assets");
        assert.equal(read.data.total, 1);
        assert.equal(read.data.rows[0].id, asset);
      },
    );

    await t.test(
      "Solicitud de ticket, ámbito de lectura y exportación respetan permisos",
      async () => {
        const payload = {
          asset_id: asset,
          title: "Prueba de incidencia completa",
          description:
            "Descripción de prueba para verificar el recorrido HTTP.",
          category: "Hardware",
          priority: "media",
        };
        assert.equal(
          (await action("ticket.create", payload, auditorCookie)).status,
          403,
        );
        const created = await action("ticket.create", payload, requesterCookie);
        assert.equal(created.status, 200);
        ticket = created.data.id;
        assert.equal((await data("tickets", requesterCookie)).data.total, 1);
        assert.equal((await data("tickets", technicianCookie)).data.total, 0);
        assert.equal(
          (await data("ticket", technicianCookie, "&id=" + ticket)).status,
          403,
        );
        const stranger = (await operation.auth(outsider.email)).cookie;
        assert.equal((await data("tickets", stranger)).data.total, 0);
        assert.equal(
          (await data("ticket", stranger, "&id=" + ticket)).status,
          403,
        );
        const exported = await data("export", stranger, "&type=tickets");
        assert.equal(exported.status, 200);
        assert.ok(!exported.text.includes(payload.title));
        assert.equal(
          (await data("tickets", ownerCookie, "&page=1.5")).data.page,
          1,
        );
        assert.equal(
          (await data("tickets", ownerCookie, "&q=%27%20OR%201%3D1%20--")).data
            .total,
          0,
        );
      },
    );

    await t.test(
      "Asignación, primera respuesta, resolución y cierre quedan registrados",
      async () => {
        const initial = (await data("ticket", ownerCookie, "&id=" + ticket))
          .data.ticket;
        assert.equal(
          (
            await action("ticket.assign", {
              id: ticket,
              version: initial.version,
              assignee_id: technician.id,
              priority: "media",
              category: "Hardware",
              reason: "Asignación al técnico del ensayo.",
            })
          ).status,
          200,
        );
        let current = (await data("ticket", technicianCookie, "&id=" + ticket))
          .data.ticket;
        assert.equal(current.status, "asignado");
        assert.equal(
          (
            await action(
              "ticket.transition",
              {
                id: ticket,
                version: current.version,
                status: "en_atencion",
                note: "Se inicia la revisión.",
              },
              technicianCookie,
            )
          ).status,
          200,
        );
        current = (await data("ticket", technicianCookie, "&id=" + ticket)).data
          .ticket;
        const resolution = {
          id: ticket,
          version: current.version,
          status: "resuelto",
          note: "Se comprueba la solución.",
          diagnosis: "Falla de alimentación detectada.",
          solution: "Ajuste y comprobación de conexiones.",
        };
        assert.equal(
          (await action("ticket.transition", resolution, technicianCookie))
            .status,
          400,
        );
        assert.equal(
          (
            await action(
              "ticket.note",
              {
                id: ticket,
                version: current.version,
                type: "respuesta",
                note: "Primera respuesta técnica documentada.",
              },
              technicianCookie,
            )
          ).status,
          200,
        );
        assert.equal(
          (
            await action(
              "ticket.note",
              {
                id: ticket,
                version: current.version,
                type: "seguimiento",
                note: "Intento con versión obsoleta.",
              },
              technicianCookie,
            )
          ).status,
          409,
        );
        current = (await data("ticket", technicianCookie, "&id=" + ticket)).data
          .ticket;
        assert.equal(
          (
            await action(
              "ticket.transition",
              { ...resolution, version: current.version },
              technicianCookie,
            )
          ).status,
          200,
        );
        current = (await data("ticket", requesterCookie, "&id=" + ticket)).data
          .ticket;
        assert.ok(current.first_response_at);
        assert.ok(current.resolved_at);
        assert.equal(
          (
            await action(
              "ticket.transition",
              {
                id: ticket,
                version: current.version,
                status: "cerrado",
                note: "El solicitante valida el resultado.",
              },
              technicianCookie,
            )
          ).status,
          403,
        );
        assert.equal(
          (
            await action(
              "ticket.transition",
              {
                id: ticket,
                version: current.version,
                status: "cerrado",
                note: "El solicitante valida el resultado.",
              },
              requesterCookie,
            )
          ).status,
          200,
        );
        const closed = (await data("ticket", requesterCookie, "&id=" + ticket))
          .data;
        assert.equal(closed.ticket.status, "cerrado");
        assert.equal(closed.ticket.resolved_at, current.resolved_at);
        assert.ok(closed.events.some((event) => event.action === "respuesta"));
        assert.ok(closed.events.some((event) => event.action === "estado"));
      },
    );

    await t.test(
      "CSV y módulos de consulta funcionan con datos persistidos",
      async () => {
        for (const module of [
          "overview",
          "assets",
          "tickets",
          "activities",
          "controls",
          "goals",
          "members",
          "periods",
          "audit",
          "reports",
        ]) {
          assert.equal(
            (await data(module)).status,
            200,
            `El módulo ${module} debe responder correctamente.`,
          );
        }
        const exported = await data("export", ownerCookie, "&type=tickets");
        assert.equal(exported.status, 200);
        assert.match(exported.headers.get("content-type"), /text\/csv/);
        assert.match(
          exported.headers.get("content-disposition"),
          /nexo-tickets-real\.csv/,
        );
        assert.ok(exported.text.includes("Prueba de incidencia completa"));
        assert.equal(
          (await data("export", ownerCookie, "&type=desconocido")).status,
          400,
        );
        const db = new DatabaseSync(
          path.join(operation.directory, "nexo.sqlite"),
          { readOnly: true },
        );
        assert.equal(
          db
            .prepare("SELECT COUNT(*) n FROM tickets WHERE id=? AND status=?")
            .get(ticket, "cerrado").n,
          1,
        );
        assert.equal(
          db.prepare("PRAGMA integrity_check").get().integrity_check,
          "ok",
        );
        assert.equal(db.prepare("PRAGMA foreign_key_check").all().length, 0);
        const session = db
          .prepare("SELECT token_hash FROM sessions LIMIT 1")
          .get();
        assert.match(session.token_hash, /^[a-f0-9]{64}$/);
        assert.notEqual(session.token_hash, ownerCookie.split("=")[1]);
        db.close();
      },
    );

    await t.test(
      "Una cuenta desactivada pierde acceso incluso con cookie previa",
      async () => {
        assert.equal(
          (await action("member.save", { ...auditor, active: false })).status,
          200,
        );
        assert.equal((await data("overview", auditorCookie)).status, 401);
        assert.equal(
          (
            await operation.request("/api/auth/login", {
              body: { email: auditor.email, password },
            })
          ).status,
          401,
        );
        assert.equal(
          (
            await action("member.save", {
              id: "owner",
              email: "owner@test.invalid",
              name: "Administrador de prueba",
              role: "tecnico",
              active: true,
              version: 1,
            })
          ).status,
          400,
        );
      },
    );

    await t.test(
      "Cambio de contraseña valida la actual, invalida sesiones y exige la nueva",
      async () => {
        const nextPassword = "PruebaNueva2026!";
        assert.equal(
          (
            await action(
              "self.password",
              { current_password: "incorrecta", password: nextPassword },
              technicianCookie,
            )
          ).status,
          401,
        );
        const changed = await action(
          "self.password",
          { current_password: password, password: nextPassword },
          technicianCookie,
        );
        assert.equal(changed.status, 200);
        assert.equal(changed.data.signout, true);
        assert.equal((await data("tickets", technicianCookie)).status, 401);
        assert.equal(
          (
            await operation.request("/api/auth/login", {
              body: { email: technician.email, password },
            })
          ).status,
          401,
        );
        technicianCookie = (
          await operation.auth(technician.email, nextPassword)
        ).cookie;
        assert.equal((await data("tickets", technicianCookie)).status, 200);
        assert.equal(
          (await action("member.password", { id: technician.id, password }))
            .status,
          200,
        );
        assert.equal((await data("tickets", technicianCookie)).status, 401);
        technicianCookie = (await operation.auth(technician.email)).cookie;
      },
    );

    await t.test(
      "Cerrar sesión y vencer una sesión revocan el acceso",
      async () => {
        const ended = await operation.request("/api/auth/logout", {
          cookie: technicianCookie,
          body: {},
        });
        assert.equal(ended.status, 200);
        assert.match(ended.headers.get("set-cookie"), /Max-Age=0/);
        assert.equal((await data("tickets", technicianCookie)).status, 401);
        const db = new DatabaseSync(
          path.join(operation.directory, "nexo.sqlite"),
        );
        const digest = createHash("sha256")
          .update(requesterCookie.split("=")[1])
          .digest("hex");
        db.prepare("UPDATE sessions SET expires_at=0 WHERE token_hash=?").run(
          digest,
        );
        db.close();
        assert.equal((await data("tickets", requesterCookie)).status, 401);
        assert.equal(
          (
            await operation.request("/api/auth/status", {
              cookie: requesterCookie,
            })
          ).data.authenticated,
          false,
        );
      },
    );

    await t.test(
      "Cinco fallos consecutivos limitan los intentos de acceso",
      async () => {
        // El acceso válido anterior reinicia los contadores; este ensayo se ejecuta al final.
        await demo.auth("admin@demo.local", "NexoDemo2026!");
        for (let i = 0; i < 5; i++)
          assert.equal(
            (
              await demo.request("/api/auth/login", {
                body: { email: "admin@demo.local", password: "incorrecta" },
              })
            ).status,
            401,
          );
        assert.equal(
          (
            await demo.request("/api/auth/login", {
              body: { email: "admin@demo.local", password: "NexoDemo2026!" },
            })
          ).status,
          429,
        );
      },
    );

    await t.test(
      "Los archivos fuente y bases de datos no se sirven como contenido público",
      async () => {
        assert.equal((await operation.request("/server/auth.ts")).status, 404);
        assert.equal(
          (await operation.request("/data/nexo.sqlite")).status,
          404,
        );
        assert.equal((await operation.request("/.env")).status, 404);
        assert.equal((await operation.request("/")).status, 200);
        assert.equal(
          (await operation.request("/", { method: "HEAD" })).text,
          "",
        );
      },
    );
  },
);
