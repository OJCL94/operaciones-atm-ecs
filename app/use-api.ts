import { useCallback, useEffect, useMemo, useState } from "react";
import { Row } from "./ui";
export function useApi(demo: number, role: string) {
  return useCallback(
    async (module: string, params: Row = {}, action?: Row): Promise<any> => {
      const search = new URLSearchParams({
        demo: String(demo),
        ...(action ? {} : { module }),
        ...Object.fromEntries(
          Object.entries(params)
            .filter(([, v]) => v !== "" && v != null)
            .map(([k, v]) => [k, String(v)]),
        ),
      });
      const res = await fetch(`/api/${action ? "actions" : "data"}?${search}`, {
        method: action ? "POST" : "GET",
        headers: {
          ...(action ? { "Content-Type": "application/json" } : {}),
          "x-demo-role": role,
        },
        ...(action ? { body: JSON.stringify(action) } : {}),
      }).catch(() => {
        throw new Error(
          "No se pudo conectar con el servidor. Comprueba tu conexión y vuelve a intentar.",
        );
      });
      if (!res.ok) {
        const data: any = await res.json();
        if (res.status === 401) window.location.assign("/");
        throw new Error(data.error ?? "Error de conexión.");
      }
      return params.module === "export" || module === "export"
        ? res
        : res.json();
    },
    [demo, role],
  );
}
export function useRemote(
  api: ReturnType<typeof useApi>,
  module: string,
  params: Row,
  revision: number,
  enabled = true,
) {
  const key = JSON.stringify(params),
    identity = useMemo(() => ({}), [api, module, key, revision, enabled]);
  const [state, setState] = useState<{
    identity: object | null;
    data: Row | null;
    loading: boolean;
    error: string;
  }>({ identity: null, data: null, loading: true, error: "" });
  useEffect(() => {
    let active = true;
    if (!enabled) {
      setState({ identity, data: null, loading: false, error: "" });
      return;
    }
    setState({ identity, data: null, loading: true, error: "" });
    api(module, JSON.parse(key))
      .then((data) => {
        if (active) setState({ identity, data, loading: false, error: "" });
      })
      .catch((e) => {
        if (active)
          setState({ identity, data: null, loading: false, error: e.message });
      });
    return () => {
      active = false;
    };
  }, [identity, api, module, key, enabled]);
  // No entregar la respuesta de la vista anterior mientras cambia la consulta.
  return state.identity === identity
    ? state
    : { data: null, loading: enabled, error: "" };
}
