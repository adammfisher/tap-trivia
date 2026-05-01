import { getIdToken } from "./auth";

const BASE = import.meta.env.VITE_API_BASE;

class ApiError extends Error {
  constructor(status, code, message) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

async function call(method, path) {
  const token = await getIdToken();
  if (!token) throw new ApiError(401, "no_session", "Not signed in");

  const res = await fetch(BASE + path, {
    method,
    headers: {
      "Authorization": "Bearer " + token,
      "Accept": "application/json",
    },
  });
  let body = null;
  const text = await res.text();
  if (text) {
    try { body = JSON.parse(text); }
    catch { body = { _raw: text }; }
  }

  if (res.status === 401) {
    // Token expired or invalid — let the AuthProvider handle redirect.
    window.dispatchEvent(new CustomEvent("taptrivia:reauth-required"));
    throw new ApiError(401, "unauthorized", "Session expired");
  }
  if (res.status === 503) {
    throw new ApiError(503, "data_not_ready", body?.message || "Sync has not yet run");
  }
  if (!res.ok) {
    throw new ApiError(res.status, body?.error || "fetch_failed", body?.message || `HTTP ${res.status}`);
  }
  return body;
}

export const api = {
  get:  (p) => call("GET",  p),
  post: (p) => call("POST", p),
};

export { ApiError };
