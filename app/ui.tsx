"use client";
import { FormEvent, ReactNode, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Empty,
  EmptyHeader,
  EmptyTitle,
  EmptyDescription,
} from "@/components/ui/empty";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
} from "@/components/ui/pagination";
import {
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  LoaderCircle,
  Search,
} from "lucide-react";
import { states, priorities } from "@/lib/domain";
export type Row = Record<string, any>;
export type Field = {
  key: string;
  label: string;
  type?: string;
  required?: boolean;
  options?: [string, string][];
  hint?: string;
  min?: number;
  max?: number;
  wide?: boolean;
};
export type FormSpec = {
  title: string;
  description?: string;
  kind: string;
  fields: Field[];
  initial?: Row;
  transform?: (values: Row) => Row;
  onDone?: (result: Row) => void;
};
export function formatDate(v: any, short = false) {
  return v
    ? new Intl.DateTimeFormat("es-PE", {
        timeZone: "America/Lima",
        day: "2-digit",
        month: "short",
        ...(short ? {} : { hour: "2-digit", minute: "2-digit" }),
      }).format(new Date(v))
    : "Sin registrar";
}
export function localInput(v: any) {
  return v
    ? new Date(Date.parse(v) - 5 * 3600000).toISOString().slice(0, 16)
    : "";
}
export function Choice({
  value,
  onChange,
  options,
  label,
  id,
  disabled = false,
}: {
  value: string;
  onChange: (v: string) => void;
  options: [string, string][];
  label: string;
  id?: string;
  disabled?: boolean;
}) {
  return (
    <Select
      value={value || "__none"}
      onValueChange={(v) => onChange(v === "__none" ? "" : v)}
      disabled={disabled}
    >
      <SelectTrigger aria-label={label} id={id} className="choice">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {options.map(([v, l]) => (
          <SelectItem value={v || "__none"} key={v}>
            {l}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
export function Badge({ value }: { value: string }) {
  const color =
    (
      {
        critica: "critical",
        alta: "high",
        media: "medium",
        baja: "low",
        abierto: "blue",
        asignado: "purple",
        en_atencion: "purple",
        en_espera: "high",
        resuelto: "green",
        cerrado: "low",
        operativo: "green",
        fuera_servicio: "critical",
        mantenimiento: "high",
        completada: "green",
        en_curso: "purple",
        cerrada: "green",
        abierta: "high",
      } as Row
    )[value] ?? "low";
  return (
    <span className={"badge " + color}>
      {states[value] ?? (priorities as Row)[value] ?? value}
    </span>
  );
}
export function Pager({
  data,
  page,
  setPage,
}: {
  data: Row;
  page: number;
  setPage: (v: number) => void;
}) {
  const pages = Math.max(1, Math.ceil(data.total / data.pageSize));
  return (
    <div className="pager">
      <span>
        {data.total} registros · Página {page} de {pages}
      </span>
      <Pagination>
        <PaginationContent>
          <PaginationItem>
            <PaginationLink
              aria-label="Página anterior"
              size="icon"
              href="#"
              onClick={(e) => {
                e.preventDefault();
                if (page > 1) setPage(page - 1);
              }}
              aria-disabled={page === 1}
            >
              <ChevronLeft size={17} />
            </PaginationLink>
          </PaginationItem>
          <PaginationItem>
            <PaginationLink isActive>{page}</PaginationLink>
          </PaginationItem>
          <PaginationItem>
            <PaginationLink
              aria-label="Página siguiente"
              size="icon"
              href="#"
              onClick={(e) => {
                e.preventDefault();
                if (page < pages) setPage(page + 1);
              }}
              aria-disabled={page >= pages}
            >
              <ChevronRight size={17} />
            </PaginationLink>
          </PaginationItem>
        </PaginationContent>
      </Pagination>
    </div>
  );
}
export function DataTable({
  headers,
  rows,
  render,
  empty = "No hay registros para mostrar.",
}: {
  headers: string[];
  rows: Row[];
  render: (r: Row) => ReactNode;
  empty?: string;
}) {
  return rows.length ? (
    <Table>
      <TableHeader>
        <TableRow>
          {headers.map((h) => (
            <TableHead key={h}>{h}</TableHead>
          ))}
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((r, i) => (
          <TableRow key={r.id ?? i}>{render(r)}</TableRow>
        ))}
      </TableBody>
    </Table>
  ) : (
    <Empty>
      <EmptyHeader>
        <EmptyTitle>Todo listo para empezar</EmptyTitle>
        <EmptyDescription>{empty}</EmptyDescription>
      </EmptyHeader>
    </Empty>
  );
}
export function LoadState({
  loading,
  error,
  retry,
  children,
}: {
  loading: boolean;
  error: string;
  retry?: () => void;
  children: ReactNode;
}) {
  if (loading)
    return (
      <div
        className="loading-grid"
        aria-busy="true"
        aria-label="Cargando información"
      >
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  if (error)
    return (
      <div className="error-box" role="alert">
        <AlertCircle size={20} />
        <div>
          <strong>No pudimos completar la consulta</strong>
          <p>{error}</p>
          {retry && (
            <Button variant="outline" onClick={retry}>
              Volver a intentar
            </Button>
          )}
        </div>
      </div>
    );
  return children;
}
export function FormDialog({
  spec,
  close,
  submit,
}: {
  spec: FormSpec | null;
  close: () => void;
  submit: (kind: string, data: Row) => Promise<Row>;
}) {
  const [values, setValues] = useState<Row>({}),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  useEffect(() => {
    setValues(spec?.initial ?? {});
    setError("");
  }, [spec]);
  async function save(e: FormEvent) {
    e.preventDefault();
    if (!spec || busy) return;
    setBusy(true);
    setError("");
    try {
      const data: Row = { ...values },
        nativeValues = new FormData(e.currentTarget as HTMLFormElement);
      for (const f of spec.fields) {
        const v = f.options
          ? values[f.key]
          : (nativeValues.get(f.key) ?? values[f.key]);
        data[f.key] = v;
        if (f.required && (v === undefined || v === null || v === ""))
          throw new Error("Completa el campo «" + f.label + "».");
        if (f.type === "number")
          data[f.key] = v === "" || v === undefined ? null : Number(v);
        if (f.type === "datetime-local")
          data[f.key] = v ? new Date(v + "-05:00").toISOString() : "";
        if (f.type === "boolean") data[f.key] = v === "true" || v === true;
      }
      const result = await submit(
        spec.kind,
        spec.transform ? spec.transform(data) : data,
      );
      spec.onDone?.(result);
      close();
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo guardar.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <Dialog
      open={!!spec}
      onOpenChange={(open) => {
        if (!open && !busy) close();
      }}
    >
      <DialogContent className="form-dialog" showCloseButton={false}>
        <DialogHeader>
          <DialogTitle>{spec?.title}</DialogTitle>
          <DialogDescription>
            {spec?.description ??
              "Completa la información. Los campos con * son obligatorios. Fechas en hora de Lima."}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={save} className="form-grid">
          {spec?.fields.map((f) => (
            <div
              className={
                "form-field " + (f.wide || f.type === "textarea" ? "wide" : "")
              }
              key={f.key}
            >
              <label htmlFor={"f-" + f.key}>
                {f.label}
                {f.required ? " *" : ""}
              </label>
              {f.options ? (
                <Choice
                  label={f.label}
                  id={"f-" + f.key}
                  value={String(values[f.key] ?? f.options[0]?.[0] ?? "")}
                  onChange={(v) =>
                    setValues((current) => ({ ...current, [f.key]: v }))
                  }
                  options={f.options}
                />
              ) : f.type === "textarea" ? (
                <textarea
                  name={f.key}
                  id={"f-" + f.key}
                  value={values[f.key] ?? ""}
                  required={f.required}
                  maxLength={5000}
                  rows={4}
                  onInput={(e) => {
                    const value = e.currentTarget.value;
                    setValues((current) => ({ ...current, [f.key]: value }));
                  }}
                  onChange={(e) => {
                    const value = e.target.value;
                    setValues((current) => ({ ...current, [f.key]: value }));
                  }}
                />
              ) : (
                <input
                  name={f.key}
                  id={"f-" + f.key}
                  type={f.type ?? "text"}
                  value={values[f.key] ?? ""}
                  required={f.required}
                  min={f.min}
                  max={f.max}
                  step={f.type === "number" ? "any" : undefined}
                  maxLength={f.type === "email" ? 200 : 160}
                  onInput={(e) => {
                    const value = e.currentTarget.value;
                    setValues((current) => ({ ...current, [f.key]: value }));
                  }}
                  onChange={(e) => {
                    const value = e.target.value;
                    setValues((current) => ({ ...current, [f.key]: value }));
                  }}
                />
              )}
              {f.hint && <small>{f.hint}</small>}
            </div>
          ))}
          {error && (
            <div className="error-box wide" role="alert">
              {error}
            </div>
          )}
          <div className="form-actions wide">
            <Button
              type="button"
              variant="outline"
              onClick={close}
              disabled={busy}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={busy}>
              {busy ? (
                <>
                  <LoaderCircle className="spin" size={16} /> Guardando…
                </>
              ) : (
                "Guardar"
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
export function SearchBox({
  value,
  onChange,
  label = "Buscar por código, título o activo",
}: {
  value: string;
  onChange: (s: string) => void;
  label?: string;
}) {
  return (
    <label className="search-box">
      <Search size={17} />
      <input
        aria-label={label}
        placeholder={label}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </label>
  );
}
export { TableCell, Button };
