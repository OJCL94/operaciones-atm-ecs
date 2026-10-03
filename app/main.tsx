import { useEffect, useState, FormEvent, Component, ReactNode } from "react";
import { createRoot } from "react-dom/client";
import { ArrowRight, CheckCircle2, ShieldCheck } from "lucide-react";
import Workspace from "./workspace";
import "./globals.css";
function App() {
  const [status, setStatus] = useState<any>(null),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  async function load() {
    setError("");
    try {
      const r = await fetch("/api/auth/status");
      if (!r.ok) throw new Error("No se pudo conectar con el servidor.");
      setStatus(await r.json());
    } catch {
      setError(
        "No se pudo conectar con el servidor. Comprueba que esté encendido y vuelve a intentar.",
      );
    }
  }
  useEffect(() => {
    load();
  }, []);
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const form = new FormData(e.currentTarget);
    try {
      const r = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: form.get("email"),
          password: form.get("password"),
        }),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error);
      await load();
    } catch (e) {
      setError(
        e instanceof TypeError
          ? "No se pudo conectar con el servidor. Comprueba tu conexión."
          : (e as Error).message,
      );
    } finally {
      setBusy(false);
    }
  }
  if (status?.authenticated)
    return <Workspace initialDemo={status.demoOnly ? 1 : 0} />;
  return (
    <main className="login-screen">
      <section className="login-story">
        <a className="brand" href="/">
          <span className="brand-mark">N</span>
          <span>
            nexo<span className="brand-sub">OPERACIONES ATM</span>
          </span>
        </a>
        <div>
          <div className="eyebrow">CONECTA TU OPERACIÓN</div>
          <h1>
            Cada incidencia.
            <br />
            Una solución.
            <br />
            Todo conectado.
          </h1>
          <p>
            Organiza el trabajo de tu equipo, da seguimiento a los módulos ATM y
            toma decisiones con información verificable.
          </p>
          <div className="login-points">
            {[
              "Tickets y activos en un solo lugar",
              "Planificación con responsables y recursos",
              "Indicadores y trazabilidad de cada intervención",
            ].map((t) => (
              <span key={t}>
                <CheckCircle2
                  size={17}
                  style={{ display: "inline", marginRight: 10 }}
                />
                {t}
              </span>
            ))}
          </div>
        </div>
        <small>Nexo · Gestión de operaciones ATM</small>
      </section>
      <section className="login-panel">
        <div style={{ width: "100%" }}>
          <ShieldCheck size={30} color="#1459e8" />
          <h2>Bienvenido a Nexo</h2>
          <p>
            {status?.demoOnly
              ? "Explora el sistema con datos ficticios."
              : "Ingresa con el acceso asignado por tu administrador."}
          </p>
          {error && (
            <p className="error-box" role="alert" style={{ marginTop: 20 }}>
              {error}
            </p>
          )}
          {!status && error && (
            <button className="login-button" onClick={load}>
              Volver a intentar
            </button>
          )}
          {!status && !error ? (
            <p role="status">Conectando con el servidor…</p>
          ) : status?.setupNeeded ? (
            <p className="evidence" style={{ marginTop: 20 }}>
              Primero crea el administrador desde la terminal con{" "}
              <code>npm run admin</code>.
            </p>
          ) : (
            <form
              onSubmit={submit}
              style={{ marginTop: 25, display: "grid", gap: 17 }}
            >
              <div className="form-field">
                <label htmlFor="email">Correo electrónico</label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="username"
                  required
                  maxLength={254}
                />
              </div>
              <div className="form-field">
                <label htmlFor="password">Contraseña</label>
                <input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  required
                  maxLength={128}
                />
              </div>
              <button
                type="submit"
                className="login-button"
                disabled={busy}
                style={{ margin: "8px 0", width: "100%", border: 0 }}
              >
                {busy ? "Ingresando…" : "Iniciar sesión"}
                <ArrowRight size={20} />
              </button>
            </form>
          )}
          {status?.demoOnly ? (
            <div className="evidence" style={{ marginTop: 20 }}>
              Acceso público de demostración:
              <br />
              <strong>admin@demo.local</strong>
              <br />
              <code>NexoDemo2026!</code>
              <br />
              Los datos no representan resultados de investigación.
            </div>
          ) : (
            <p className="login-help" style={{ marginTop: 20 }}>
              Si olvidaste tu contraseña, solicita al administrador que
              establezca una nueva.
            </p>
          )}
          <small>Acceso personal · Permisos según tu rol</small>
        </div>
      </section>
    </main>
  );
}
class ErrorBoundary extends Component<
  { children: ReactNode },
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    return this.state.failed ? (
      <main className="content">
        <h1>No pudimos mostrar esta vista</h1>
        <p className="research-note">
          Los registros guardados siguen en la base de datos. Recarga la página
          para continuar.
        </p>
        <button
          className="login-button"
          onClick={() => window.location.reload()}
        >
          Volver a cargar
        </button>
      </main>
    ) : (
      this.props.children
    );
  }
}
createRoot(document.getElementById("root")!).render(
  <ErrorBoundary>
    <App />
  </ErrorBoundary>,
);
