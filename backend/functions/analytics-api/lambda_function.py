"""
analytics-api Lambda — routes API Gateway HTTP API v2 events to handlers.

JWT authorization happens at API Gateway (Cognito JWT authorizer);
Lambda only sees authenticated requests.
"""
import logging
import re

import handlers
import response as _resp

log = logging.getLogger()
log.setLevel(logging.INFO)


_ROUTES = (
    ("GET",  re.compile(r"^/analytics/overview/?$"),    "overview"),
    ("GET",  re.compile(r"^/analytics/subscribers/?$"), "subscribers"),
    ("GET",  re.compile(r"^/analytics/bars/?$"),        "bars"),
    ("GET",  re.compile(r"^/analytics/bars/([^/]+)/?$"),"bar_drill"),
    ("GET",  re.compile(r"^/analytics/signage/?$"),     "signage"),
    ("GET",  re.compile(r"^/analytics/finance/?$"),     "finance"),
    ("GET",  re.compile(r"^/analytics/questions/?$"),   "questions"),
    ("GET",  re.compile(r"^/analytics/aws/?$"),         "aws"),
    ("POST", re.compile(r"^/analytics/refresh/?$"),     "refresh"),
)


def _route(method: str, path: str):
    for m, pat, name in _ROUTES:
        if m != method:
            continue
        match = pat.match(path)
        if match:
            return name, match.groups()
    return None, ()


def handler(event, context):
    rc = (event.get("requestContext") or {})
    http = rc.get("http") or {}
    method = (http.get("method") or event.get("httpMethod") or "").upper()
    path = http.get("path") or event.get("rawPath") or ""

    if method == "OPTIONS":
        return _resp._http(204, {})

    route, params = _route(method, path)
    if not route:
        return _resp.error(404, "not_found", f"No route for {method} {path}")

    try:
        if route == "overview":     return handlers.handle_overview(event)
        if route == "subscribers":  return handlers.handle_subscribers(event)
        if route == "bars":         return handlers.handle_bars(event)
        if route == "bar_drill":    return handlers.handle_bar_drill(event, params[0])
        if route == "signage":      return handlers.handle_signage(event)
        if route == "finance":      return handlers.handle_finance(event)
        if route == "questions":    return handlers.handle_questions(event)
        if route == "aws":          return handlers.handle_aws(event)
        if route == "refresh":      return handlers.handle_refresh(event)
    except Exception as e:
        log.exception("handler %s failed", route)
        return _resp.error(500, "internal_error", str(e))

    return _resp.error(500, "internal_error", "router fell through")
