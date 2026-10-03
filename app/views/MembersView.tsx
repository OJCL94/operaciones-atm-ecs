// Extraído de app/workspace.tsx (R3): este componente conserva exactamente
// el JSX original del bloque `{view === "members" && (...)}`. No se cambió
// ninguna marca, texto, clase ni prop; solo se movió a su propio archivo.
import { roles } from "@/lib/domain";
import { Row, Badge, DataTable, TableCell, Pager } from "../ui";

export default function MembersView({
  data,
  demo,
  page,
  setPage,
  form,
}: {
  data: Row;
  demo: number;
  page: number;
  setPage: (p: number) => void;
  form: (kind: string, row?: Row) => void;
}) {
  return (
    <section className="panel">
      <div className="panel-heading">
        <div>
          <h2>{demo ? "Perfiles de demostración" : "Accesos del equipo"}</h2>
          <p>
            {demo
              ? "Explora los permisos con el selector de rol. Los accesos reales se administran en Operación real."
              : "La identidad se verifica al iniciar sesión; los permisos se aplican en el servidor."}
          </p>
        </div>
      </div>
      <DataTable
        headers={["Persona", "Correo", "Rol", "Acceso", "Acciones"]}
        rows={data.rows}
        render={(m) => (
          <>
            <TableCell>
              <strong>{m.name}</strong>
            </TableCell>
            <TableCell>{m.email}</TableCell>
            <TableCell>{(roles as Row)[m.role]}</TableCell>
            <TableCell>
              <Badge value={m.active ? "Habilitado" : "Deshabilitado"} />
            </TableCell>
            <TableCell>
              {!demo && (
                <div className="row-actions">
                  <button
                    className="text-link"
                    onClick={() => form("member.save", m)}
                  >
                    Editar acceso
                  </button>
                  <button
                    className="text-link"
                    onClick={() => form("member.password", m)}
                  >
                    Establecer contraseña
                  </button>
                </div>
              )}
            </TableCell>
          </>
        )}
      />
      <Pager data={data} page={page} setPage={setPage} />
    </section>
  );
}
