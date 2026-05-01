import { useEffect, useState, useCallback } from "react";
import { api, ApiError } from "./api";

// Generic per-tab data hook — handles loading / 503 not_ready / fetch_failed
// states uniformly. The deps array re-fetches when range/compare change.
export function useFetch(path, deps = []) {
  const [state, setState] = useState({ data: null, loading: true, error: null, generatedAt: null, sources: null });

  const run = useCallback(async () => {
    setState((s) => ({ ...s, loading: true, error: null }));
    try {
      const res = await api.get(path);
      setState({
        data: res?.data ?? null,
        generatedAt: res?.generated_at ?? null,
        sources: res?.sources ?? null,
        loading: false,
        error: null,
      });
    } catch (e) {
      const isNotReady = e instanceof ApiError && e.status === 503;
      setState({
        data: null,
        generatedAt: null,
        sources: null,
        loading: false,
        error: {
          type: isNotReady ? "not_ready" : "fetch_failed",
          message: e.message || String(e),
        },
      });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  useEffect(() => { run(); }, [run]);

  return { ...state, retry: run };
}
