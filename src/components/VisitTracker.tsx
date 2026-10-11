import { useEffect, useRef } from "react";
import { useRouterState } from "@tanstack/react-router";

const SESSION_KEY = "apex_visit_session";

function sessionId() {
  try {
    let id = sessionStorage.getItem(SESSION_KEY);
    if (!id) { id = crypto.randomUUID(); sessionStorage.setItem(SESSION_KEY, id); }
    return id;
  } catch { return ""; }
}

/** Logs each page load / route change in the background; never blocks or throws. */
export function VisitTracker() {
  const path = useRouterState({ select: s => s.location.pathname });
  const first = useRef(true);
  useEffect(() => {
    if (path.startsWith("/lovable")) return;
    const referrer = first.current ? document.referrer : window.location.origin + "(internal)";
    first.current = false;
    try {
      void fetch("/api/public/log-visit", {
        method: "POST",
        keepalive: true,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ page_path: path, referrer, session_id: sessionId(), client_sent_at: new Date().toISOString() }),
      }).catch(() => {});
    } catch { /* ignore */ }
  }, [path]);
  return null;
}
